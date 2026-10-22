import { describe, expect, it } from "vitest";
import {
  EYESC,
  HAIRC,
  HAIRS_F,
  HAIRS_M,
  SKIN,
  avatarSVG,
  defaultAppearance,
  hairPath,
  hairStyles,
  outfitColor,
  shoeColor,
} from "../src/data/avatar";

describe("персонаж — палитры", () => {
  it("палитры непустые и без дублей", () => {
    for (const list of [SKIN, HAIRC]) {
      expect(list.length).toBeGreaterThan(2);
      expect(new Set(list).size).toBe(list.length);
    }
  });

  it("причёски зависят от пола", () => {
    expect(hairStyles("m")).toEqual(HAIRS_M);
    expect(hairStyles("f")).toEqual(HAIRS_F);
  });

  it("для любой причёски находится контур", () => {
    for (const sex of ["m", "f"] as const) {
      hairStyles(sex).forEach((_, i) => {
        expect(hairPath(sex, i)).toContain("<path");
      });
    }
    expect(hairPath("m", 99)).toContain("<path");
  });

  it("цвет одежды известен для каждого предмета верха", () => {
    for (const top of ["tshirt", "hoodie", "shirt", "suit"]) {
      expect(outfitColor(top)).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
    expect(outfitColor(undefined)).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});

describe("персонаж — портрет", () => {
  it("рисует корректный SVG нужного размера", () => {
    const svg = avatarSVG(defaultAppearance(), { size: 120 });
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.endsWith("</svg>")).toBe(true);
    expect(svg).toContain('width="120"');
    expect(svg).toContain('viewBox="0 0 200 252"');
    expect(svg).toContain("<path");
  });

  it("детали появляются только когда включены", () => {
    const base = defaultAppearance();
    expect(avatarSVG(base)).not.toContain('stroke="#2A3342"');
    expect(avatarSVG({ ...base, glasses: true })).toContain('stroke="#2A3342"');
    expect(avatarSVG({ ...base, cap: true })).toContain("#2E8B7A");
  });

  it("борода рисуется только у мужского персонажа", () => {
    // сравниваем один и тот же персонаж с бородой и без: длину строки сравнивать
    // нельзя — у женских причёсок есть свой слой волос за головой
    const m = { ...defaultAppearance(), sex: "m" as const };
    expect(avatarSVG({ ...m, beard: true, beardStyle: 1 })).not.toBe(avatarSVG(m));
    const f = { ...defaultAppearance(), sex: "f" as const };
    expect(avatarSVG({ ...f, beard: true, beardStyle: 1 })).toBe(avatarSVG(f));
  });

  it("каждый стиль бороды даёт свой контур", () => {
    const of = (beardStyle: number) =>
      avatarSVG({ ...defaultAppearance(), sex: "m", beard: true, beardStyle });
    expect(new Set([of(0), of(1), of(2)]).size).toBe(3);
  });

  it("это портрет по пояс, а не фигура в полный рост", () => {
    const svg = avatarSVG(defaultAppearance());
    const [, w, h] = /viewBox="0 0 (\d+) (\d+)"/.exec(svg)!.map(Number);
    expect(h / w).toBeGreaterThan(1);
    expect(h / w).toBeLessThan(1.4);
  });

  it("рисунок красится плоско, без градиентов, с тёмным контуром", () => {
    const svg = avatarSVG(defaultAppearance());
    expect(svg).not.toContain("Gradient");
    expect(svg).toContain('stroke="#1f2a37"');
    expect(svg).toContain('stroke-linecap="round"');
  });

  it("одежда влияет на цвет", () => {
    const a = defaultAppearance();
    expect(avatarSVG(a, { top: "suit" })).toContain(outfitColor("suit"));
    expect(avatarSVG(a, { top: "hoodie" })).toContain(outfitColor("hoodie"));
  });

  it("выдерживает выход индексов за границы палитр", () => {
    const weird = { ...defaultAppearance(), skin: 99, hairc: 99, eyes: 99, face: 99 };
    const svg = avatarSVG(weird);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain(SKIN[1]);
  });

  it("обувь красится по слоту обуви", () => {
    expect(avatarSVG(defaultAppearance(), { shoes: "boots" })).toContain(shoeColor("boots"));
    expect(avatarSVG(defaultAppearance(), { shoes: "sneakers" })).toContain(shoeColor("sneakers"));
  });

  it("аксессуар рисуется, только когда указан", () => {
    const base = defaultAppearance();
    expect(avatarSVG(base)).not.toContain('#2E8B7A" opacity=".9"');
    expect(avatarSVG(base, { accessory: "backpack" })).toContain("#2E8B7A");
    expect(avatarSVG(base, { accessory: "sunglasses" })).toContain("#1A1F29");
    expect(avatarSVG(base, { accessory: null })).not.toContain("#1A1F29");
  });

  it("по три простые причёски на каждый пол", () => {
    // намеренно мало: каждая — один чистый силуэт по дуге черепа, без прядей,
    // которые «летали» рядом с головой
    expect(HAIRS_M).toHaveLength(3);
    expect(HAIRS_F).toHaveLength(3);
  });

  it("сохранённый индекс старой причёски не ломает отрисовку", () => {
    // в облаке могут лежать индексы 3..7 от прежних восьми стилей
    expect(avatarSVG({ ...defaultAppearance(), hair: 7 }).startsWith("<svg")).toBe(true);
  });

  it("борода рисуется поверх лица, но под волосами", () => {
    for (const beardStyle of [0, 1, 2]) {
      const svg = avatarSVG({ ...defaultAppearance(), beard: true, beardStyle });
      const faceIx = svg.indexOf('fill="#fff"');
      const beardIx = svg.search(/d="M(60 10[46]|58 100)C/);
      const hairIx = svg.indexOf(`fill="${HAIRC[0]}" stroke`);
      expect(beardIx).toBeGreaterThan(faceIx);
      expect(hairIx).toBeGreaterThan(beardIx);
    }
  });

  it("не меньше 6 цветов глаз", () => {
    expect(EYESC.length).toBeGreaterThanOrEqual(6);
  });
});
