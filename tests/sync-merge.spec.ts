import { describe, expect, it } from "vitest";
import { mergeProgress } from "../src/sync/merge";
import type { Progress } from "../src/engine/progress";

const P = (o: Partial<Progress> = {}): Progress => ({
  xp: 0, done: {}, cur: null, hints: {}, ...o,
});

describe("mergeProgress — слияние прогресса устройств", () => {
  it("XP берётся максимальный", () => {
    expect(mergeProgress(P({ xp: 300 }), P({ xp: 120 })).xp).toBe(300);
    expect(mergeProgress(P({ xp: 0 }), P({ xp: 999 })).xp).toBe(999);
  });

  it("пройденные уроки объединяются, ничего не теряется", () => {
    const a = P({ done: { "1.1": true, "1.2": true } });
    const b = P({ done: { "1.2": true, "2.1": true } });
    expect(mergeProgress(a, b).done).toEqual({ "1.1": true, "1.2": true, "2.1": true });
  });

  it("подсказки — поэлементный максимум", () => {
    const a = P({ hints: { "3.1": 2, "3.2": 0 } });
    const b = P({ hints: { "3.1": 1, "3.2": 3, "3.3": 1 } });
    expect(mergeProgress(a, b).hints).toEqual({ "3.1": 2, "3.2": 3, "3.3": 1 });
  });

  it("cur — у того, кто дальше по программе", () => {
    const ahead = P({ done: { a: true, b: true, c: true }, cur: "5.4" });
    const behind = P({ done: { a: true }, cur: "2.1" });
    expect(mergeProgress(ahead, behind).cur).toBe("5.4");
    expect(mergeProgress(behind, ahead).cur).toBe("5.4");
  });

  it("при равном прогрессе cur — у более свежего updatedAt", () => {
    const older = P({ done: { a: true }, cur: "3.1", updatedAt: 1000 });
    const newer = P({ done: { b: true }, cur: "3.9", updatedAt: 2000 });
    expect(mergeProgress(older, newer).cur).toBe("3.9");
  });

  it("не мутирует входные объекты", () => {
    const a = P({ xp: 10, done: { x: true } });
    const b = P({ xp: 20, done: { y: true } });
    const aCopy = structuredClone(a);
    const bCopy = structuredClone(b);
    mergeProgress(a, b);
    expect(a).toEqual(aCopy);
    expect(b).toEqual(bCopy);
  });

  it("устойчив к пустым и частичным объектам", () => {
    const r = mergeProgress(P(), {} as Progress);
    expect(r.xp).toBe(0);
    expect(r.done).toEqual({});
    expect(r.cur).toBeNull();
  });

  it("монотонность: слияние никогда не уменьшает прогресс", () => {
    const local = P({ xp: 450, done: { a: true, b: true, c: true }, hints: { a: 2 } });
    const cloud = P({ xp: 200, done: { a: true, d: true }, hints: { a: 1, d: 3 } });
    const m = mergeProgress(local, cloud);
    expect(m.xp).toBeGreaterThanOrEqual(local.xp);
    expect(Object.keys(m.done).length).toBeGreaterThanOrEqual(Object.keys(local.done).length);
    for (const [k, v] of Object.entries(local.hints)) expect(m.hints[k]).toBeGreaterThanOrEqual(v);
  });

  it("идемпотентность и коммутативность", () => {
    const a = P({ xp: 300, done: { a: true, b: true }, hints: { a: 1 }, updatedAt: 5 });
    const b = P({ xp: 150, done: { b: true, c: true }, hints: { c: 2 }, updatedAt: 9 });
    const ab = mergeProgress(a, b);
    const ba = mergeProgress(b, a);
    expect(ab.xp).toBe(ba.xp);
    expect(ab.done).toEqual(ba.done);
    expect(ab.hints).toEqual(ba.hints);
    const self = mergeProgress(ab, structuredClone(ab));
    expect(self.xp).toBe(ab.xp);
    expect(self.done).toEqual(ab.done);
  });

  it("сценарий: играл офлайн на телефоне и на ноутбуке, потом синхронизация", () => {
    const start = P({ xp: 100, done: { "1.1": true, "1.2": true }, cur: "1.3", updatedAt: 1000 });
    const phone = mergeProgress(start, P());
    phone.xp = 160;
    phone.done = { ...phone.done, "1.3": true };
    phone.cur = "1.4";
    phone.updatedAt = 2000;
    const laptop = { ...start, xp: 130, done: { ...start.done, "2.1": true }, cur: "2.2", updatedAt: 3000 };
    const merged = mergeProgress(phone, laptop);
    expect(merged.xp).toBe(160);
    expect(merged.done).toEqual({ "1.1": true, "1.2": true, "1.3": true, "2.1": true });
    expect(merged.cur).toBe("2.2");
  });
});
