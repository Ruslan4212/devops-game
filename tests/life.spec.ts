import { describe, expect, it } from "vitest";
import { buy, defaultLife, eat, mergeLife, onLessonComplete, xpEarnBonusPct } from "../src/engine/life";
import { mergeProgress } from "../src/sync/merge";
import type { Progress } from "../src/engine/progress";

const P = (o: Partial<Progress> = {}): Progress => ({ xp: 0, done: {}, cur: null, hints: {}, ...o });

describe("жизнь — базовое состояние", () => {
  it("стартовый кошелёк и потребности", () => {
    const l = defaultLife();
    expect(l.money).toBe(8000);
    expect(l.hunger).toBe(70);
    expect(l.health).toBe(100);
    expect(l.wear).toEqual({ top: "tshirt", shoes: "sneakers_old" });
  });
});

describe("жизнь — еда и покупки", () => {
  it("еда стоит денег и возвращает сытость", () => {
    const l = defaultLife();
    l.hunger = 40;
    const r = eat(l, "grechka");
    expect(r.ok).toBe(true);
    expect(l.money).toBe(8000 - 180);
    expect(l.hunger).toBe(66);
    expect(l.totalSpent).toBe(180);
  });

  it("нельзя купить, если не хватает денег", () => {
    const l = defaultLife();
    l.money = 100;
    const r = buy(l, "tech", "laptop");
    expect(r).toEqual({ ok: false, error: "не хватает денег" });
    expect(l.tech).toEqual([]);
  });

  it("техника покупается один раз и даёт бонус к XP", () => {
    const l = defaultLife();
    l.money = 50000;
    expect(buy(l, "tech", "monitor").ok).toBe(true);
    expect(l.tech).toEqual(["monitor"]);
    expect(buy(l, "tech", "monitor")).toEqual({ ok: false, error: "уже куплено" });
    expect(xpEarnBonusPct(l)).toBeGreaterThanOrEqual(5);
  });

  it("одежда: куплена — потом только надевается, повторно не списывает деньги", () => {
    const l = defaultLife();
    l.money = 20000;
    expect(buy(l, "clothes", "hoodie").ok).toBe(true);
    const afterBuy = l.money;
    l.wear.top = "tshirt";
    expect(buy(l, "clothes", "hoodie").ok).toBe(true);
    expect(l.money).toBe(afterBuy);
    expect(l.wear.top).toBe("hoodie");
  });
});

describe("жизнь — начисление за урок", () => {
  it("без оффера платят меньше, потребности слегка убывают", () => {
    const l = defaultLife();
    const { credited } = onLessonComplete(l, 30, false);
    expect(credited).toBeGreaterThan(0);
    expect(l.money).toBe(8000 + credited);
    expect(l.hunger).toBe(64);
  });

  it("с оффером начисление больше", () => {
    const withJob = onLessonComplete(defaultLife(), 30, true).credited;
    const noJob = onLessonComplete(defaultLife(), 30, false).credited;
    expect(withJob).toBeGreaterThan(noJob);
  });

  it("потребности не уходят ниже нуля", () => {
    const l = defaultLife();
    l.hunger = 2;
    for (let i = 0; i < 10; i++) onLessonComplete(l, 20, false);
    expect(l.hunger).toBeGreaterThanOrEqual(0);
    expect(l.mood).toBeGreaterThanOrEqual(0);
    expect(l.health).toBeGreaterThanOrEqual(0);
  });
});

describe("жизнь — слияние устройств", () => {
  it("берётся версия, дальше ушедшая по заработку", () => {
    const a = { ...defaultLife(), totalEarned: 5000, money: 1000 };
    const b = { ...defaultLife(), totalEarned: 12000, money: 300 };
    expect(mergeLife(a, b)).toBe(b);
    expect(mergeLife(undefined, a)).toBe(a);
    expect(mergeLife(undefined, undefined)).toBeUndefined();
  });

  it("mergeProgress переносит life", () => {
    const life = { ...defaultLife(), totalEarned: 999 };
    const m = mergeProgress(P({ life }), P());
    expect(m.life?.totalEarned).toBe(999);
  });
});
