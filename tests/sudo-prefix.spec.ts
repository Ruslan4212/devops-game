import { describe, expect, it } from "vitest";
import { newWorld } from "../src/engine/world";
import { execLine } from "../src/engine/shell";
import { ran, ranAny } from "../src/missions/helpers";
import { LESSONS } from "../src/lessons";
import type { DoStep, World } from "../src/engine/types";

/**
 * Реальный случай из урока 2.9: игрок набрал «sudo ss -tlpn sport :80» — решение
 * не хуже эталонного «ss -ltn», а местами точнее. Проверка шага искала команду,
 * начинающуюся с «ss», и привычный префикс sudo её ломал.
 */
describe("привычный sudo не ломает проверку задания", () => {
  const withCmd = (cmd: string): World => {
    const w = newWorld();
    execLine(w, cmd);
    return w;
  };

  it("шаблон срабатывает и на команде с sudo", () => {
    expect(ran(/^ss\b/)(withCmd("ss -ltn"))).toBe(true);
    expect(ran(/^ss\b/)(withCmd("sudo ss -tlpn sport :80"))).toBe(true);
  });

  it("то же для проверки без учёта кода возврата", () => {
    expect(ranAny(/^systemctl\b/)(withCmd("sudo systemctl status nginx"))).toBe(true);
  });

  it("обычная команда под sudo засчитывается", () => {
    expect(ran(/^whoami\b/)(withCmd("sudo whoami"))).toBe(true);
  });

  it("чужая команда под sudo по-прежнему не засчитывается", () => {
    expect(ran(/^ss\b/)(withCmd("sudo ls -l"))).toBe(false);
  });

  it("шаг урока 2.9 про порты принимает вариант игрока", () => {
    const lesson = LESSONS.find((l) => l.id === "2.9")!;
    const step = lesson.steps.find((s): s is DoStep => s.kind === "do" && /слушают порты/.test(s.text))!;
    const w = newWorld();
    lesson.setup?.(w);
    execLine(w, "sudo ss -tlpn sport :80");
    expect(step.check(w)).toBe(true);
  });
});
