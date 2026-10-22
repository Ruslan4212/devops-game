import { describe, expect, it } from "vitest";
import {
  BEARDS,
  EYESC,
  HAIRC,
  SKIN,
  avatarSVG,
  defaultAppearance,
  hairStyles,
  migrateAppearance,
} from "../src/data/avatar";
import type { Appearance } from "../src/data/avatar";
import { ACCESSORIES, CLOTHES } from "../src/data/shop";

/**
 * Покупка и настройка обязаны быть ВИДНЫ на персонаже: проверяем не валидность
 * SVG, а то, что каждая опция меняет картинку. uid фиксирован, чтобы два рендера
 * отличались только содержимым, а не счётчиком id градиентов.
 */
const draw = (a: Partial<Appearance> = {}, o: Parameters<typeof avatarSVG>[1] = {}): string =>
  avatarSVG({ ...defaultAppearance(), ...a }, { top: "tshirt", uid: "t", ...o });

describe("каждый купленный аксессуар виден на персонаже", () => {
  const plain = draw();
  it("в магазине есть аксессуары", () => {
    expect(ACCESSORIES.length).toBeGreaterThan(5);
  });
  for (const item of ACCESSORIES) {
    it(`«${item.n}» меняет картинку персонажа`, () => {
      const worn = draw({}, { accessory: item.id });
      expect(worn, `аксессуар ${item.id} ничего не рисует`).not.toBe(plain);
      expect(worn.length).toBeGreaterThan(plain.length);
    });
  }
  it("аксессуар рисуется, только когда указан", () => {
    expect(draw({}, { accessory: null })).toBe(plain);
    expect(draw({}, { accessory: undefined })).toBe(plain);
  });
});

describe("каждая одежда из магазина меняет персонажа", () => {
  for (const c of CLOTHES.filter((x) => x.slot === "top" && x.id !== "tshirt")) {
    it(`верх «${c.n}» отличается от футболки`, () => {
      expect(draw({}, { top: c.id })).not.toBe(draw());
    });
  }
  const shoes = CLOTHES.filter((x) => x.slot === "shoes");
  for (const c of shoes) {
    it(`обувь «${c.n}» видна на персонаже`, () => {
      expect(draw({}, { shoes: c.id })).not.toBe(draw());
    });
  }
  it("разные пары обуви рисуются по-разному", () => {
    const drawn = shoes.map((c) => draw({}, { shoes: c.id }));
    expect(new Set(drawn).size).toBe(shoes.length);
  });
});

describe("причёски и борода", () => {
  for (const sex of ["m", "f"] as const) {
    it(`${sex === "m" ? "мужские" : "женские"} причёски все разные`, () => {
      const drawn = hairStyles(sex).map((_, i) => draw({ sex, hair: i }));
      expect(new Set(drawn).size).toBe(drawn.length);
    });
  }
  it("каждый стиль бороды даёт свою картинку", () => {
    const drawn = BEARDS.map((_, i) => draw({ sex: "m", beard: true, beardStyle: i }));
    expect(new Set(drawn).size).toBe(BEARDS.length);
  });
  it("каждый цвет волос, кожи и глаз меняет картинку", () => {
    for (const [key, pal] of [
      ["hairc", HAIRC],
      ["skin", SKIN],
      ["eyes", EYESC],
    ] as const) {
      const drawn = pal.map((_, i) => draw({ [key]: i }));
      expect(new Set(drawn).size, key).toBe(pal.length);
    }
  });
  it("лицо не закрыто: глаза (радужка) рисуются при любой причёске, кепке и очках", () => {
    for (const sex of ["m", "f"] as const) {
      hairStyles(sex).forEach((name, i) => {
        for (const extra of [{}, { cap: true, glasses: true }]) {
          const svg = draw({ sex, hair: i, ...extra });
          expect(svg.match(/url\(#tir\)/g)?.length ?? 0, `${name}: глаза не найдены`).toBeGreaterThanOrEqual(
            2,
          );
        }
      });
    }
  });
});

describe("устойчивость к старым и битым сохранениям", () => {
  it("выдерживает выход индексов за границы палитр", () => {
    const svg = draw({ skin: 99, hair: -3, hairc: 1e6, eyes: NaN, face: 42, beardStyle: 77, beard: true });
    expect(svg).toContain("<svg");
    expect(svg).not.toMatch(/undefined|NaN/);
  });
  it("старое сохранение после миграции рисуется так же, как явные значения", () => {
    const old = {
      sex: "m",
      name: "Ivan",
      skin: 2,
      hair: 1,
      hairc: 3,
      eyes: 1,
      face: 0,
      glasses: true,
      beard: false,
      cap: false,
    };
    const m = migrateAppearance(old);
    expect(m).toMatchObject(old);
    expect(avatarSVG(m, { uid: "t" })).not.toMatch(/undefined|NaN/);
  });
});
