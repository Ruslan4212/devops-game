import { describe, expect, it } from "vitest";
import {
  BEARDS,
  EYESC,
  FACE,
  HAIRC,
  HAIRS_F,
  HAIRS_M,
  SKIN,
  avatarSVG,
  defaultAppearance,
  emotionOf,
  hairPath,
  hairStyles,
  migrateAppearance,
  outfitColor,
  shoeColor,
} from "../src/data/avatar";
import type { Appearance, Emotion } from "../src/data/avatar";
import { ACCESSORIES, CLOTHES } from "../src/data/shop";

const ids = (svg: string): string[] => [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);

describe("палитры и опции конструктора", () => {
  it("палитры не пусты, причёски зависят от пола", () => {
    expect(SKIN.length).toBe(5);
    expect(HAIRC.length).toBe(8);
    expect(EYESC.length).toBeGreaterThanOrEqual(6);
    expect(FACE.length).toBe(3);
    expect(BEARDS.length).toBe(3);
    expect(hairStyles("m")).toEqual(HAIRS_M);
    expect(hairStyles("f")).toEqual(HAIRS_F);
  });

  it("цвет одежды и обуви известен для каждого предмета магазина", () => {
    for (const c of CLOTHES) {
      const hex = c.slot === "top" ? outfitColor(c.id) : shoeColor(c.id);
      expect(hex, c.id).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("контур причёски находится для любого индекса", () => {
    for (const sex of ["m", "f"] as const) {
      hairStyles(sex).forEach((_, i) => expect(hairPath(sex, i)).toContain("<path"));
      expect(hairPath(sex, 99)).toContain("<path");
    }
  });
});

describe("рендер портрета", () => {
  it("корректный квадратный SVG нужного размера с градиентами", () => {
    const svg = avatarSVG(defaultAppearance(), { size: 120 });
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.endsWith("</svg>")).toBe(true);
    expect(svg).toContain('width="120" height="120"');
    expect(svg).toContain("<radialGradient");
    expect(svg).toContain("<linearGradient");
  });

  it("сэмпл всех комбинаций опций рисуется без дыр", () => {
    let n = 0;
    for (const sex of ["m", "f"] as const) {
      for (let hair = 0; hair < 3; hair++) {
        for (let skin = 0; skin < SKIN.length; skin++) {
          for (let hairc = 0; hairc < HAIRC.length; hairc += 3) {
            for (let eyes = 0; eyes < EYESC.length; eyes += 2) {
              for (let face = 0; face < FACE.length; face++) {
                const a: Appearance = {
                  ...defaultAppearance(),
                  sex,
                  hair,
                  skin,
                  hairc,
                  eyes,
                  face,
                  glasses: n % 2 === 0,
                  cap: n % 3 === 0,
                  beard: n % 4 === 0,
                  beardStyle: n % 3,
                };
                const svg = avatarSVG(a, { top: CLOTHES[n % CLOTHES.length].id });
                expect(svg.startsWith("<svg")).toBe(true);
                expect(svg).not.toMatch(/undefined|NaN/);
                n++;
              }
            }
          }
        }
      }
    }
    expect(n).toBeGreaterThan(500);
  });

  it("все причёски каждого пола рисуются по-разному", () => {
    for (const sex of ["m", "f"] as const) {
      const drawn = hairStyles(sex).map((_, i) =>
        avatarSVG({ ...defaultAppearance(), sex, hair: i }, { uid: "t" }),
      );
      expect(new Set(drawn).size).toBe(drawn.length);
    }
  });

  it("очки, кепка и борода меняют картинку; борода только у мужского", () => {
    const base = { ...defaultAppearance(), sex: "m" as const };
    const plain = avatarSVG(base, { uid: "t" });
    expect(avatarSVG({ ...base, glasses: true }, { uid: "t" })).not.toBe(plain);
    expect(avatarSVG({ ...base, cap: true }, { uid: "t" })).toContain("#2E8B7A");
    const beards = [0, 1, 2].map((beardStyle) =>
      avatarSVG({ ...base, beard: true, beardStyle }, { uid: "t" }),
    );
    expect(new Set([plain, ...beards]).size).toBe(4);
    const f = { ...defaultAppearance(), sex: "f" as const };
    expect(avatarSVG({ ...f, beard: true }, { uid: "t" })).toBe(avatarSVG(f, { uid: "t" }));
  });

  it("каждая одежда и цвет влияют на картинку", () => {
    const a = defaultAppearance();
    const tops = CLOTHES.filter((c) => c.slot === "top").map((c) => avatarSVG(a, { top: c.id, uid: "t" }));
    expect(new Set(tops).size).toBe(tops.length);
    expect(avatarSVG(a, { top: "suit" })).toContain(outfitColor("suit"));
  });

  it("каждый аксессуар магазина виден на персонаже", () => {
    expect(ACCESSORIES.length).toBeGreaterThan(5);
    const plain = avatarSVG(defaultAppearance(), { top: "tshirt", uid: "t" });
    for (const item of ACCESSORIES) {
      const worn = avatarSVG(defaultAppearance(), { top: "tshirt", accessory: item.id, uid: "t" });
      expect(worn, item.id).not.toBe(plain);
      expect(worn.length, item.id).toBeGreaterThan(plain.length);
    }
    expect(avatarSVG(defaultAppearance(), { accessory: "нет-такого", uid: "t" })).toBe(
      avatarSVG(defaultAppearance(), { uid: "t" }),
    );
  });

  it("мусорные индексы не ломают отрисовку", () => {
    const weird = { ...defaultAppearance(), skin: 99, hairc: 99, eyes: 99, face: 99, hair: 7 };
    const svg = avatarSVG(weird, { top: "???", shoes: "???" });
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain(SKIN[1]);
  });
});

describe("уникальные идентификаторы", () => {
  it("два рендера на одной странице не делят id градиентов", () => {
    const a = ids(avatarSVG(defaultAppearance()));
    const b = ids(avatarSVG(defaultAppearance()));
    expect(a.length).toBeGreaterThan(5);
    expect(new Set(a).size).toBe(a.length);
    expect(a.filter((x) => b.includes(x))).toEqual([]);
  });

  it("все url(#...) ссылаются на существующие id", () => {
    const svg = avatarSVG(
      { ...defaultAppearance(), glasses: true, cap: true },
      { accessory: "watch", emotion: "sick" },
    );
    const have = new Set(ids(svg));
    for (const m of svg.matchAll(/url\(#([^)]+)\)/g)) expect(have.has(m[1]), m[1]).toBe(true);
  });
});

describe("миграция старых сохранений", () => {
  it("мусор и пустота → внешность по умолчанию", () => {
    for (const bad of [undefined, null, 5, "x", [], true]) {
      expect(migrateAppearance(bad)).toEqual(defaultAppearance());
    }
  });

  it("старое сохранение без новых полей загружается, id опций сохраняются", () => {
    const old = { sex: "f", name: "Аня", skin: 3, hair: 2, hairc: 6, eyes: 4, face: 2, glasses: true };
    const m = migrateAppearance(old);
    expect(m).toMatchObject({
      sex: "f",
      name: "Аня",
      skin: 3,
      hair: 2,
      hairc: 6,
      eyes: 4,
      face: 2,
      glasses: true,
    });
    expect(m.beard).toBe(false);
    expect(m.cap).toBe(false);
    expect(m.beardStyle).toBe(0);
  });

  it("неизвестные индексы заменяются значениями по умолчанию", () => {
    const m = migrateAppearance({
      sex: "q",
      skin: 42,
      hair: 7,
      hairc: -1,
      eyes: 1.5,
      face: "a",
      beardStyle: 9,
      name: 7,
    });
    const d = defaultAppearance();
    expect(m).toMatchObject({
      sex: "m",
      skin: d.skin,
      hair: 0,
      hairc: 0,
      eyes: 0,
      face: d.face,
      beardStyle: 0,
      name: "",
    });
  });

  it("имя обрезается до 24 символов; результат всегда рисуется", () => {
    const m = migrateAppearance({ name: "я".repeat(40), glasses: "yes" });
    expect(m.name).toHaveLength(24);
    expect(m.glasses).toBe(false);
    expect(avatarSVG(m).startsWith("<svg")).toBe(true);
  });
});

describe("эмоции по состоянию", () => {
  const v = (hunger: number, health: number, mood: number) => emotionOf({ hunger, health, mood });
  it("сопоставляет показатели и эмоцию", () => {
    expect(emotionOf(undefined)).toBe("calm");
    expect(v(70, 100, 60)).toBe("calm");
    expect(v(80, 100, 90)).toBe("happy");
    expect(v(70, 100, 30)).toBe("tired");
    expect(v(70, 100, 10)).toBe("sad");
    expect(v(10, 100, 60)).toBe("hungry");
    expect(v(70, 20, 60)).toBe("sick");
    expect(v(70, 100, 90)).not.toBe("sick");
  });

  it("каждая эмоция рисуется по-своему и отражается в data-emotion", () => {
    const list: Emotion[] = ["happy", "calm", "tired", "sad", "hungry", "sick"];
    const drawn = list.map((emotion) => avatarSVG(defaultAppearance(), { emotion, uid: "t" }));
    expect(new Set(drawn).size).toBe(list.length);
    list.forEach((e, i) => expect(drawn[i]).toContain(`data-emotion="${e}"`));
    expect(avatarSVG(defaultAppearance(), { vitals: { hunger: 5, health: 100, mood: 50 } })).toContain(
      'data-emotion="hungry"',
    );
  });
});
