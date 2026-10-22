import indexHtml from "../index.html?raw";
import { describe, expect, it } from "vitest";
import { carIcon, shopItemIcon, shopItemIconName } from "../src/data/icons";
import { PHOSPHOR } from "../src/data/phosphor";
import { icon, iconNames, phIcon } from "../src/data/ui-icons";
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
    expect(svg).toContain("shop-tile");
  });

  it("у каждой машины есть детальная иконка по типу кузова", () => {
    for (const c of CARS) expect(carIcon(c.body)).toContain("<svg");
  });
});

describe("иконки интерфейса: Phosphor duotone", () => {
  it("каждое имя из iconNames рисует svg с подложкой и контуром", () => {
    expect(iconNames.length).toBeGreaterThan(30);
    for (const n of iconNames) {
      const svg = icon(n, 20);
      expect(svg, n).toContain("<svg");
      expect(svg, n).toContain('class="ico-tone"');
      expect(svg, n).toContain('viewBox="0 0 256 256"');
      expect(svg.match(/<path /g)?.length, n).toBe(2);
    }
  });
  it("неизвестное имя даёт пустую строку", () => {
    expect(icon("no-such-icon")).toBe("");
    expect(phIcon("no-such-icon")).toBe("");
  });
  it("размер попадает в width/height", () => {
    expect(icon("book", 24)).toContain('width="24" height="24"');
  });
  it("в наборе у каждой иконки есть и подложка, и контур", () => {
    for (const [n, g] of Object.entries(PHOSPHOR)) {
      expect(g.tone.length, n).toBeGreaterThan(5);
      expect(g.line.length, n).toBeGreaterThan(5);
    }
  });
});

describe("иконки магазина: каждый товар размечен", () => {
  const all: [Parameters<typeof shopItemIconName>[0], { id: string }[]][] = [
    ["food", FOOD],
    ["clothes", CLOTHES],
    ["accessory", ACCESSORIES],
    ["home", HOMES],
    ["tech", TECH],
    ["trip", TRIPS],
    ["comfort", COMFORT],
  ];
  it("для каждого id есть значок Phosphor из набора", () => {
    for (const [cat, items] of all) {
      for (const it of items) {
        const name = shopItemIconName(cat, it.id);
        expect(name, `${cat}/${it.id}`).toBeTruthy();
        expect(PHOSPHOR[name!], `${cat}/${it.id} → ${name}`).toBeDefined();
      }
    }
  });
  it("у каждого кузова машины есть значок", () => {
    for (const c of CARS) expect(carIcon(c.body)).toContain("ico-tone");
  });
});

describe("в интерфейсе нет эмодзи вместо иконок", () => {
  // Исключены: src/lessons и src/missions (тексты курса), src/commands (имитация вывода
  // настоящих утилит — там ⚠/✓ часть «логов»), а также src/sandbox/capstone.ts не исключён.
  const EXCLUDE = [/src\/lessons\//, /src\/missions\//, /src\/commands\//];
  const PICTO = /\p{Extended_Pictographic}/u;
  const sources = import.meta.glob<string>("/src/**/*.{ts,css}", {
    query: "?raw",
    import: "default",
    eager: true,
  });
  it("src/ (кроме текстов уроков и вывода команд) и index.html", () => {
    const files = Object.entries(sources).filter(([f]) => !EXCLUDE.some((r) => r.test(f)));
    files.push(["index.html", indexHtml]);
    const bad: string[] = [];
    for (const [f, text] of files) {
      text.split("\n").forEach((l, i) => {
        if (PICTO.test(l)) bad.push(`${f}:${i + 1}: ${l.trim().slice(0, 80)}`);
      });
    }
    expect(bad).toEqual([]);
  });
});
