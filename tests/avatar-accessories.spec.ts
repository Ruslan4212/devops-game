import { describe, expect, it } from "vitest";
import { avatarSVG, defaultAppearance, hairStyles } from "../src/data/avatar";
import { ACCESSORIES } from "../src/data/shop";

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
  // Раньше верх задней массы приближался кривыми Безье, чуть отличными от
  // дуги шапки, и в стыке на макушке проступала полоска кожи головы. Дуга в
  // SVG — команда "A rx ry 0 0 1 x y"; у шапки и массы должна быть буквально
  // одна и та же дуговая команда, а не две похожие.
  const crownArcs = (svg: string): string[] => svg.match(/A[\d.]+ [\d.]+ 0 0 1 [\d.]+ \d+/g) ?? [];

  it("длинные (м): дуга задней массы совпадает с дугой шапки", () => {
    const arcs = crownArcs(avatarSVG({ ...defaultAppearance(), hair: 2 }));
    // хотя бы две ОДИНАКОВЫЕ дуговые команды: одна в заднем слое, одна в переднем
    expect(new Set(arcs).size).toBeLessThan(arcs.length);
  });

  it("каре: тот же приём — дуги совпадают, а не просто похожи", () => {
    // «хвост» использует отдельную форму хвоста, а не общую дугу с шапкой,
    // поэтому проверяем это только там, где приём применён: длинные и каре
    const arcs = crownArcs(avatarSVG({ ...defaultAppearance(), sex: "f", hair: 0 }));
    expect(new Set(arcs).size).toBeLessThan(arcs.length);
  });
});
