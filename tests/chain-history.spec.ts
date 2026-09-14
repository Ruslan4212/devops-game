import { describe, expect, it } from "vitest";
import { newWorld } from "../src/engine/world";
import { execLine } from "../src/engine/shell";
import { LESSONS } from "../src/lessons";
import type { DoStep, World } from "../src/engine/types";

describe("execLine: команды через && / || пишутся в историю по отдельности", () => {
  it('"whoami && pwd" оставляет ДВЕ отдельные записи, как если бы их набрали по очереди', () => {
    const w = newWorld();
    execLine(w, "whoami && pwd");
    expect(w.log.map((l) => l.cmd)).toEqual(["whoami", "pwd"]);
  });

  it("|| выполняет вторую часть, только если первая провалилась, и обе логируются", () => {
    const w = newWorld();
    execLine(w, "cat нет-такого-файла || echo запасной план");
    expect(w.log.map((l) => l.cmd)).toEqual(["cat нет-такого-файла", "echo запасной план"]);
  });

  it("&& останавливается на первой ошибке — вторая часть не выполняется и не логируется", () => {
    const w = newWorld();
    execLine(w, "cat нет-такого-файла && echo не должно случиться");
    expect(w.log.map((l) => l.cmd)).toEqual(["cat нет-такого-файла"]);
  });

  it("обычная команда без && / || логируется как раньше, одной записью", () => {
    const w = newWorld();
    execLine(w, "ls -l");
    expect(w.log.map((l) => l.cmd)).toEqual(["ls -l"]);
  });

  it("цепочка из трёх команд логируется как три отдельные записи по порядку", () => {
    const w = newWorld();
    execLine(w, "whoami && pwd && ls -l");
    expect(w.log.map((l) => l.cmd)).toEqual(["whoami", "pwd", "ls -l"]);
  });
});

describe("урок 1.16: шаг из трёх команд засчитывается всеми честными способами", () => {
  const lesson = LESSONS.find((l) => l.id === "1.16")!;
  const step = lesson.steps
    .filter((s) => s.kind === "do")
    .find((s) => /Практика 4\/6/.test(s.text))! as DoStep;

  const play = (lines: string[]): World => {
    const w = newWorld();
    lesson.setup?.(w);
    for (const l of lines) execLine(w, l);
    return w;
  };

  it("три команды по очереди", () => {
    expect(step.check(play(["export STAGE=prod", "echo $STAGE", "env | grep STAGE"]))).toBe(true);
  });

  it("те же три команды одной строкой через && — как в настоящем bash", () => {
    expect(step.check(play(["export STAGE=prod && echo $STAGE && env | grep STAGE"]))).toBe(true);
  });

  it("лишние пробелы вокруг пайпа не ломают проверку", () => {
    expect(step.check(play(["export STAGE=prod", "echo $STAGE", "env|grep STAGE"]))).toBe(true);
  });

  it("не засчитывается, если третьей командой отфильтровали другую переменную", () => {
    expect(step.check(play(["export STAGE=prod", "echo $STAGE", "env | grep DB_URL"]))).toBe(false);
  });

  it("подсказка называет команду, на которой игрок застрял", () => {
    const w = play(["export STAGE=prod", "echo $STAGE"]);
    expect(step.feedback?.(w)).toContain("env | grep STAGE");
    expect(step.feedback?.(w)).toContain("2 из 3");
  });
});
