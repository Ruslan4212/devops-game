import { describe, expect, it } from "vitest";
import { ACCESSORIES, CARS, COMFORT } from "../src/data/shop";
import { buy, defaultLife, interviewBonus, unequipAccessory } from "../src/engine/life";

describe("аксессуары: покупка, экипировка, бонус к собеседованию", () => {
  it("покупка аксессуара тратит деньги один раз и надевает его", () => {
    const l = defaultLife();
    l.money = 50000;
    const before = l.money;
    const it = ACCESSORIES[0];
    expect(buy(l, "accessory", it.id).ok).toBe(true);
    expect(l.money).toBe(before - it.p);
    expect(l.accessory).toBe(it.id);
    expect(l.own).toContain("acc:" + it.id);

    l.accessory = null;
    expect(buy(l, "accessory", it.id).ok).toBe(true);
    expect(l.money).toBe(before - it.p);
    expect(l.accessory).toBe(it.id);
  });

  it("аксессуар с iv увеличивает interviewBonus", () => {
    const l = defaultLife();
    l.money = 50000;
    const withIv = ACCESSORIES.find((a) => a.iv > 0)!;
    const base = interviewBonus(l);
    buy(l, "accessory", withIv.id);
    expect(interviewBonus(l)).toBe(base + withIv.iv);
  });

  it("unequipAccessory снимает аксессуар", () => {
    const l = defaultLife();
    l.money = 50000;
    buy(l, "accessory", ACCESSORIES[0].id);
    unequipAccessory(l);
    expect(l.accessory).toBeNull();
  });
});

describe("уют: покупается один раз, повышает настроение", () => {
  it("нельзя купить одну и ту же вещь дважды", () => {
    const l = defaultLife();
    const it = COMFORT[0];
    expect(buy(l, "comfort", it.id).ok).toBe(true);
    expect(l.comfort).toContain(it.id);
    expect(buy(l, "comfort", it.id)).toEqual({ ok: false, error: "уже куплено" });
  });
});

describe("машины: у каждой есть силуэт для иконки", () => {
  it("body задан для всех машин из допустимого набора", () => {
    const valid = new Set(["bike", "moto", "hatch", "sedan", "suv", "ev", "sport"]);
    for (const c of CARS) expect(valid.has(c.body)).toBe(true);
  });
});
