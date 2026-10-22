import { describe, expect, it } from "vitest";
import { filledIconNames, icon, iconNames } from "../src/data/ui-icons";

describe("ui-icons (Tabler)", () => {
  it("каждая иконка отдаёт валидный svg в трёх размерах", () => {
    for (const n of iconNames)
      for (const s of [16, 20, 24]) {
        const svg = icon(n, s);
        expect(svg.startsWith("<svg")).toBe(true);
        expect(svg.endsWith("</svg>")).toBe(true);
        expect(svg).toContain(`width="${s}"`);
        expect(svg).toContain('stroke="currentColor"');
        expect(svg).not.toMatch(/#[0-9a-f]{3,6}/i);
      }
  });
  it("заливная форма есть там, где объявлена, и красится currentColor", () => {
    expect(filledIconNames.length).toBeGreaterThan(10);
    for (const n of filledIconNames) {
      const svg = icon(n, 20, { filled: true });
      expect(svg).toContain('fill="currentColor"');
      expect(svg).not.toContain("stroke=");
    }
  });
  it("без заливной формы — откат на контур; неизвестное имя — пусто", () => {
    expect(icon("check", 16, { filled: true })).toContain("stroke=");
    expect(icon("nope")).toBe("");
  });
  it("в исходниках интерфейса нет эмодзи", () => {
    // ✓ ✗ ✔ — текстовые знаки, не эмодзи; аватар и уроки ведёт отдельная работа
    const re = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B50}]|\u{FE0F}/u;
    const files = import.meta.glob(["../src/**/*.{ts,css}", "../index.html"], {
      query: "?raw",
      import: "default",
      eager: true,
    });
    const skip = ["/lessons/", "/ui/character.ts", "/data/avatar.ts"];
    const bad: string[] = [];
    for (const [path, src] of Object.entries(files as Record<string, string>)) {
      if (skip.some((x) => path.includes(x))) continue;
      src.split("\n").forEach((line: string, i: number) => {
        if (re.test(line.replace(/[✓✗✔✘]/g, ""))) bad.push(`${path}:${i + 1}`);
      });
    }
    expect(bad).toEqual([]);
  });
});
