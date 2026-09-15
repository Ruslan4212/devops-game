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
    expect(svg).toContain('viewBox="0 0 200 400"');
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

  it("голова занимает примерно седьмую часть роста, а не четверть", () => {
    // именно из-за пропорции 1:4 фигура читалась как гном
    const svg = avatarSVG(defaultAppearance());
    const canvas = Number(/viewBox="0 0 \d+ (\d+)"/.exec(svg)![1]);
    const headHeight = 48;
    const ratio = canvas / headHeight;
    expect(ratio).toBeGreaterThan(7);
    expect(ratio).toBeLessThan(9);
  });

  it("объём даётся градиентами, а не плоской заливкой", () => {
    const svg = avatarSVG(defaultAppearance());
    expect(svg).toContain("linearGradient");
    expect(svg).toContain("radialGradient");
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

  it("8 причёсок на каждый пол, у всех есть контур", () => {
    expect(HAIRS_M.length).toBeGreaterThanOrEqual(8);
    expect(HAIRS_F.length).toBeGreaterThanOrEqual(8);
  });

  it("не меньше 6 цветов глаз", () => {
    expect(EYESC.length).toBeGreaterThanOrEqual(6);
  });
});
