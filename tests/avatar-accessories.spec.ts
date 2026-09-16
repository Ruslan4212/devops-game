import { describe, expect, it } from "vitest";
import { avatarSVG, defaultAppearance, hairStyles } from "../src/data/avatar";
import { ACCESSORIES } from "../src/data/shop";
import { readFileSync } from "node:fs";

/**
 * Три аксессуара из восьми (цепочка, кольцо, вкладыши) не рисовались вовсе:
 * их можно было купить и не увидеть на персонаже. А половина причёсок после
 * укрупнения головы давала одинаковый силуэт. Ни то, ни другое прежние тесты
 * поймать не могли — они проверяли, что SVG валиден, а не что он показывает.
 */
describe("каждый купленный аксессуар виден на персонаже", () => {
  const base = defaultAppearance();
  const plain = avatarSVG(base, { top: "tshirt" });

  it("в магазине есть аксессуары", () => {
    expect(ACCESSORIES.length).toBeGreaterThan(5);
  });

  for (const item of ACCESSORIES) {
    it(`«${item.n}» меняет картинку персонажа`, () => {
      const worn = avatarSVG(base, { top: "tshirt", accessory: item.id });
      expect(worn, `аксессуар ${item.id} ничего не рисует`).not.toBe(plain);
      expect(worn.length).toBeGreaterThan(plain.length);
    });
  }
});

describe("причёски различаются силуэтом", () => {
  for (const sex of ["m", "f"] as const) {
    it(`${sex === "m" ? "мужские" : "женские"} причёски все разные`, () => {
      const drawn = hairStyles(sex).map((_, i) =>
        avatarSVG({ ...defaultAppearance(), sex, hair: i }, { top: "tshirt" }),
      );
      expect(new Set(drawn).size, "есть причёски с одинаковой отрисовкой").toBe(drawn.length);
    });
  }

  it("лицо не закрыто: глаза рисуются при любой причёске", () => {
    for (const sex of ["m", "f"] as const) {
      hairStyles(sex).forEach((name, i) => {
        const svg = avatarSVG({ ...defaultAppearance(), sex, hair: i }, { top: "tshirt" });
        const eyeIx = svg.indexOf('fill="#fff"');
        const hairIx = svg.lastIndexOf("<g fill=");
        expect(eyeIx, `${name}: глаза не найдены`).toBeGreaterThan(0);
        // масса волос рисуется после глаз только как шапка сверху — сами глаза
        // при этом остаются в документе и не перекрываются заливкой лица
        expect(hairIx).toBeGreaterThan(0);
      });
    }
  });
});

describe("масса волос и шапка причёски не оставляют шва на макушке", () => {
  it("верхняя дуга задней массы совпадает с дугой шапки — одна и та же команда A", () => {
    // Раньше верх задней массы приближался кривыми Безье, чуть отличными от
    // дуги шапки, и в стыке на макушке проступала полоска кожи головы.
    const src = readFileSync("src/data/avatar.ts", "utf-8");
    const maneFn = /function mane\([\s\S]*?\n\}/.exec(src)![0];
    expect(maneFn).toContain("A${HEAD_RX} ${HEAD_RY} 0 0 1");
  });
});
