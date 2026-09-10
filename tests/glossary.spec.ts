import { describe, expect, it } from "vitest";
import { GLOSSARY, searchGlossary } from "../src/data/glossary";

describe("глоссарий — данные", () => {
  it("покрывает базовый набор инструментов симулятора", () => {
    for (const cmd of ["ls", "grep", "chmod", "systemctl", "docker", "kubectl", "git", "terraform", "curl"]) {
      expect(GLOSSARY.commands[cmd], cmd).toBeDefined();
      expect(GLOSSARY.commands[cmd].d.length).toBeGreaterThan(3);
    }
  });

  it("у каждой команды непустое описание, у флагов и подкоманд — тоже", () => {
    for (const [cmd, info] of Object.entries(GLOSSARY.commands)) {
      expect(info.d.trim().length, cmd).toBeGreaterThan(0);
      for (const [k, v] of Object.entries(info.f ?? {}))
        expect(v.trim().length, `${cmd} ${k}`).toBeGreaterThan(0);
      for (const [k, v] of Object.entries(info.sub ?? {}))
        expect(v.trim().length, `${cmd} ${k}`).toBeGreaterThan(0);
    }
  });

  it("операторы оболочки описаны", () => {
    for (const op of ["|", ">", ">>", "&&", "||", "~", ".."]) {
      expect(GLOSSARY.general[op], op).toBeTruthy();
    }
  });
});

describe("глоссарий — поиск", () => {
  it("пустой запрос возвращает заголовки всех команд", () => {
    const rows = searchGlossary("");
    expect(rows.every((r) => r.head)).toBe(true);
    expect(rows.map((r) => r.tok)).toEqual(Object.keys(GLOSSARY.commands));
  });

  it("находит команду по имени (в т.ч. как подстроку: grep → pgrep)", () => {
    const rows = searchGlossary("grep");
    expect(rows.some((r) => r.head && r.tok === "grep")).toBe(true);
    expect(rows.every((r) => r.cmd.includes("grep"))).toBe(true);
  });

  it("находит флаг по токену и по слову из объяснения", () => {
    expect(searchGlossary("grep -v").some((r) => r.tok === "-v" && r.flag)).toBe(true);
    expect(searchGlossary("рекурсивно").some((r) => r.d.toLowerCase().includes("рекурсивно"))).toBe(true);
  });

  it("операторы оболочки — только при непустом запросе", () => {
    expect(searchGlossary("").some((r) => r.cmd === "общее")).toBe(false);
    expect(searchGlossary("пайп").some((r) => r.cmd === "общее" && r.tok === "|")).toBe(true);
  });

  it("несуществующий запрос даёт пустой результат", () => {
    expect(searchGlossary("zzzzнеттакого")).toEqual([]);
  });

  it("результат ограничен 200 рядами", () => {
    expect(searchGlossary("").length).toBeLessThanOrEqual(200);
  });
});
