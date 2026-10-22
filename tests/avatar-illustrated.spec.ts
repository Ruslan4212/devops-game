import { describe, expect, it } from "vitest";
import {
  BEARDS,
  EYESC,
  FACE,
  HAIRC,
  SKIN,
  avatarSVG,
  defaultAppearance,
  hairStyles,
  normalizeAppearance,
  outfitColor,
  shoeColor,
} from "../src/data/avatar";
import { ACCESSORIES, CLOTHES } from "../src/data/shop";

describe("иллюстрированный персонаж", () => {
  it("каждая причёска каждого пола рисуется по-своему", () => {
    for (const sex of ["m", "f"] as const) {
      const drawn = hairStyles(sex).map((_, i) => avatarSVG({ ...defaultAppearance(), sex, hair: i }));
      expect(new Set(drawn).size).toBe(hairStyles(sex).length);
    }
  });

  it("каждый цвет волос, кожи и глаз попадает в рисунок", () => {
    const d = defaultAppearance();
    HAIRC.forEach((c, i) => expect(avatarSVG({ ...d, hairc: i })).toContain(`fill="${c}"`));
    SKIN.forEach((c, i) => expect(avatarSVG({ ...d, skin: i })).toContain(`fill="${c}"`));
    EYESC.forEach((c, i) => expect(avatarSVG({ ...d, eyes: i })).toContain(`fill="${c}"`));
  });

  it("выражения лица и стили бороды различаются", () => {
    const d = defaultAppearance();
    expect(new Set(FACE.map((_, face) => avatarSVG({ ...d, face }))).size).toBe(FACE.length);
    expect(new Set(BEARDS.map((_, beardStyle) => avatarSVG({ ...d, beard: true, beardStyle }))).size).toBe(
      BEARDS.length,
    );
  });

  it("все аксессуары магазина видны, у каждого своя картинка", () => {
    const d = defaultAppearance();
    const plain = avatarSVG(d);
    const all = ACCESSORIES.map((x) => avatarSVG(d, { accessory: x.id }));
    all.forEach((svg) => expect(svg).not.toBe(plain));
    expect(new Set(all).size).toBe(ACCESSORIES.length);
  });

  it("каждая вещь одежды и обуви из магазина меняет рисунок", () => {
    const d = defaultAppearance();
    const tops = CLOTHES.filter((c) => c.slot === "top").map((c) => avatarSVG(d, { top: c.id }));
    expect(new Set(tops).size).toBe(tops.length);
    for (const c of CLOTHES.filter((c) => c.slot === "shoes")) {
      expect(avatarSVG(d, { shoes: c.id })).toContain(shoeColor(c.id));
    }
    for (const c of CLOTHES.filter((c) => c.slot === "top")) {
      expect(avatarSVG(d, { top: c.id })).toContain(outfitColor(c.id));
    }
  });

  it("очки, борода и кепка видны на портрете", () => {
    const d = defaultAppearance();
    const plain = avatarSVG(d);
    expect(avatarSVG({ ...d, glasses: true })).not.toBe(plain);
    expect(avatarSVG({ ...d, beard: true, beardStyle: 1 })).not.toBe(plain);
    expect(avatarSVG({ ...d, cap: true })).not.toBe(plain);
  });

  it("усталость, грусть, болезнь и радость меняют лицо", () => {
    const d = defaultAppearance();
    const calm = avatarSVG(d, { hunger: 70, health: 100, mood: 55 });
    const tired = avatarSVG(d, { hunger: 10, health: 100, mood: 55 });
    const sad = avatarSVG(d, { hunger: 70, health: 100, mood: 10 });
    const sick = avatarSVG(d, { hunger: 70, health: 20, mood: 55 });
    const happy = avatarSVG(d, { hunger: 70, health: 100, mood: 95 });
    expect(new Set([calm, tired, sad, sick, happy]).size).toBe(5);
    expect(sick).toContain("#9fdcff"); // капля пота
    expect(happy).toContain("#ffe7a3"); // тёплое свечение
    // без показателей лицо нейтральное и совпадает со спокойным состоянием
    expect(avatarSVG(d)).toBe(avatarSVG(d, {}));
  });

  it("старые сохранения: пропуски и индексы за границами приводятся к допустимым", () => {
    const old = normalizeAppearance({ sex: "f", skin: 99, hair: 7, hairc: -3, eyes: "x", face: 1.5 });
    expect(old.sex).toBe("f");
    expect(old.skin).toBe(defaultAppearance().skin);
    expect(old.hair).toBe(0);
    expect(old.hairc).toBe(0);
    expect(old.eyes).toBe(0);
    expect(old.glasses).toBe(false);
    expect(old.beardStyle).toBeGreaterThanOrEqual(0);
    for (const junk of [null, undefined, 42, "str", [], {}]) {
      const n = normalizeAppearance(junk);
      expect(n).toEqual(normalizeAppearance(n)); // идемпотентно
      expect(() => avatarSVG(junk as never)).not.toThrow();
    }
    expect(avatarSVG({ sex: "m" } as never).startsWith("<svg")).toBe(true);
  });
});
