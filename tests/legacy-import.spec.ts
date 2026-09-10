import { describe, expect, it } from "vitest";
import { applyLegacy, summarize, worthImporting } from "../src/sync/legacy-import";
import type { LegacySave } from "../src/sync/legacy-import";
import type { Progress } from "../src/engine/progress";

const P = (o: Partial<Progress> = {}): Progress => ({ xp: 0, done: {}, cur: null, hints: {}, ...o });

const OLD: LegacySave = {
  xp: 420,
  mis: { l1: 1, l2: 1, l3: 1 },
  labs: { svcfail: 1 },
  boss: { linux: 1 },
  badges: ["lab1", "nohint"],
  interviews: [{ passed: true }],
  job: { id: "bait" },
  life: { money: 15000, hunger: 40, mood: 80, tech: ["kbd"], home: "room", totalEarned: 22000 },
};

describe("перенос старого сохранения — сводка", () => {
  it("считает всё, что нашлось", () => {
    const s = summarize(OLD);
    expect(s.xp).toBe(420);
    expect(s.missions).toBe(3);
    expect(s.labs).toBe(1);
    expect(s.bosses).toBe(1);
    expect(s.badges).toBe(2);
    expect(s.money).toBe(15000);
    expect(s.job).toBe("bait");
  });

  it("пустое сохранение переносить нечего", () => {
    expect(worthImporting({})).toBe(false);
    expect(worthImporting({ xp: 0, mis: {} })).toBe(false);
    expect(worthImporting({ xp: 10 })).toBe(true);
    expect(worthImporting(OLD)).toBe(true);
  });

  it("выдерживает мусор вместо полей", () => {
    const junk = { xp: "много", mis: null, life: 5, job: "bait" } as unknown as LegacySave;
    const s = summarize(junk);
    expect(s.xp).toBe(0);
    expect(s.missions).toBe(0);
    expect(s.money).toBeNull();
    expect(s.job).toBeNull();
  });
});

describe("перенос старого сохранения — применение", () => {
  it("переносит XP, кошелёк и оффер", () => {
    const p = applyLegacy(P(), OLD);
    expect(p.xp).toBe(420);
    expect(p.jobs).toEqual({ bait: true });
    expect(p.life?.money).toBe(15000);
    expect(p.life?.tech).toEqual(["kbd"]);
    expect(p.life?.home).toBe("room");
    expect(p.legacyImported).toBe(true);
  });

  it("не понижает уже накопленный прогресс", () => {
    const p = applyLegacy(P({ xp: 900, jobs: { pelmeni: true } }), OLD);
    expect(p.xp).toBe(900);
    expect(p.jobs).toEqual({ pelmeni: true, bait: true });
  });

  it("НЕ отмечает уроки пройденными", () => {
    const p = applyLegacy(P(), OLD);
    expect(p.done).toEqual({});
  });

  it("не мутирует исходный прогресс", () => {
    const before = P({ xp: 5 });
    const copy = structuredClone(before);
    applyLegacy(before, OLD);
    expect(before).toEqual(copy);
  });

  it("без life в старом сохранении кошелёк не создаётся", () => {
    const p = applyLegacy(P(), { xp: 100 });
    expect(p.life).toBeUndefined();
    expect(p.xp).toBe(100);
  });
});
