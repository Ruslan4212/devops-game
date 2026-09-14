import { describe, expect, it } from "vitest";
import { newWorld } from "../src/engine/world";
import { execLine } from "../src/engine/shell";

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
