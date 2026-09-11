import { describe, expect, it } from "vitest";
import { execLine } from "../src/engine/shell";
import { newWorld } from "../src/engine/world";

describe("test / [ ] и && / ||", () => {
  it('[ -z "$1" ] верно, когда позиционный параметр не задан (пуст), неверно, когда задан', () => {
    const w = newWorld();
    // без аргументов $1 разворачивается в пустую строку — ровно так, как в реальном bash
    expect(execLine(w, '[ -z "$1" ]').code).toBe(0);
    w.env["1"] = "x";
    expect(execLine(w, '[ -z "$1" ]').code).toBe(1);
  });

  it('[ -n "$1" ] — противоположность -z', () => {
    const w = newWorld();
    w.env["1"] = "x";
    expect(execLine(w, '[ -n "$1" ]').code).toBe(0);
    delete w.env["1"];
    expect(execLine(w, '[ -n "$1" ]').code).toBe(1);
  });

  it("строковое и числовое сравнение", () => {
    const w = newWorld();
    expect(execLine(w, "[ prod = prod ]").code).toBe(0);
    expect(execLine(w, "[ prod != staging ]").code).toBe(0);
    expect(execLine(w, "[ 5 -gt 3 ]").code).toBe(0);
    expect(execLine(w, "[ 5 -lt 3 ]").code).toBe(1);
  });

  it("&& выполняет правую часть только при успехе левой", () => {
    const w = newWorld();
    const r = execLine(w, '[ -z "$1" ] && echo пусто');
    expect(r.out.trim()).toBe("пусто");
    w.env["1"] = "x";
    const r2 = execLine(w, '[ -z "$1" ] && echo не должно печататься');
    expect(r2.out.trim()).toBe("");
  });

  it("|| выполняет правую часть только при ошибке левой", () => {
    const w = newWorld();
    w.env["1"] = "x";
    const r = execLine(w, '[ -z "$1" ] || echo запасной вариант');
    expect(r.out.trim()).toBe("запасной вариант");
  });

  it("одиночный | (труба) продолжает работать как раньше", () => {
    const w = newWorld();
    const r = execLine(w, "echo привет | wc -l");
    expect(r.out.trim()).toBe("1");
  });
});
