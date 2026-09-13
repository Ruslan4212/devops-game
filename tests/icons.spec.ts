import { describe, expect, it } from "vitest";
import { carIcon, shopItemIcon } from "../src/data/icons";
import { ACCESSORIES, CARS, CLOTHES, COMFORT, FOOD, HOMES, TECH, TRIPS } from "../src/data/shop";

describe("иконки магазина: у каждого товара есть своя отрисовка", () => {
  it("еда", () => {
    for (const f of FOOD) expect(shopItemIcon("food", f.id)).toContain("<svg");
  });
  it("одежда/обувь", () => {
    for (const c of CLOTHES) expect(shopItemIcon("clothes", c.id)).toContain("<svg");
  });
  it("аксессуары", () => {
    for (const a of ACCESSORIES) expect(shopItemIcon("accessory", a.id)).toContain("<svg");
  });
  it("жильё", () => {
    for (const h of HOMES) expect(shopItemIcon("home", h.id)).toContain("<svg");
  });
  it("техника", () => {
    for (const t of TECH) expect(shopItemIcon("tech", t.id)).toContain("<svg");
  });
  it("поездки", () => {
    for (const t of TRIPS) expect(shopItemIcon("trip", t.id)).toContain("<svg");
  });
  it("уют", () => {
    for (const c of COMFORT) expect(shopItemIcon("comfort", c.id)).toContain("<svg");
  });

  it("неизвестный id не падает, отдаёт плейсхолдер", () => {
    const svg = shopItemIcon("food", "no-such-id");
    expect(svg).toContain("<svg");
    expect(svg).toContain("<rect");
  });

  it("у каждой машины есть детальная иконка по типу кузова", () => {
    for (const c of CARS) expect(carIcon(c.body)).toContain("<svg");
  });
});
