import { describe, expect, it } from "vitest";
import { execLine } from "../src/engine/shell";
import { newWorld } from "../src/engine/world";
import { getNode, writeFile } from "../src/engine/vfs";
import type { World } from "../src/engine/types";

/** Записывает исполняемый bash-скрипт: пишет содержимое и сразу выставляет +x. */
function makeExecutable(w: World, path: string, body: string): void {
  writeFile(w, path, "#!/bin/bash\n" + body);
  const n = getNode(w, path);
  if (n && n.type === "file") n.mode = "rwxr-xr-x";
}

describe("runScript: позиционные параметры, set -e, exit", () => {
  it("передаёт $1, $2 и $# внутрь скрипта", () => {
    const w = newWorld();
    makeExecutable(w, "/home/devops/args.sh", "echo $1 $2 всего:$#\n");
    const r = execLine(w, "./args.sh prod east");
    expect(r.out.trim()).toBe("prod east всего:2");
  });

  it("без set -e и exit скрипт всегда возвращает код 0, даже если команда внутри упала", () => {
    const w = newWorld();
    makeExecutable(w, "/home/devops/soft.sh", "cat /нет/такого/файла\necho после\n");
    const r = execLine(w, "./soft.sh");
    expect(r.code).toBe(0);
    expect(r.out).toContain("после");
  });

  it("set -e останавливает скрипт на первой ошибке и возвращает ненулевой код", () => {
    const w = newWorld();
    makeExecutable(w, "/home/devops/strict.sh", "set -e\ncat /нет/такого/файла\necho после\n");
    const r = execLine(w, "./strict.sh");
    expect(r.code).not.toBe(0);
    expect(r.out).not.toContain("после");
  });

  it("exit N завершает скрипт немедленно с этим кодом", () => {
    const w = newWorld();
    makeExecutable(w, "/home/devops/e.sh", "echo начало\nexit 3\necho не должно выполниться\n");
    const r = execLine(w, "./e.sh");
    expect(r.code).toBe(3);
    expect(r.out).toContain("начало");
    expect(r.out).not.toContain("не должно выполниться");
  });

  it("позиционные параметры не утекают в команды после завершения скрипта", () => {
    const w = newWorld();
    makeExecutable(w, "/home/devops/args2.sh", "echo внутри:$1\n");
    execLine(w, "./args2.sh only-arg");
    const r = execLine(w, "echo снаружи:$1");
    expect(r.out.trim()).toBe("снаружи:");
  });

  it('guard-паттерн без if: [ -z "$1" ] && exit 1 — останавливает скрипт даже внутри && (без set -e)', () => {
    const w = newWorld();
    makeExecutable(
      w,
      "/home/devops/guard.sh",
      'echo старт\n[ -z "$1" ] && echo "нужен аргумент" && exit 1\necho продолжаю с $1\n',
    );
    const noArg = execLine(w, "./guard.sh");
    expect(noArg.code).toBe(1);
    expect(noArg.out).toContain("нужен аргумент");
    expect(noArg.out).not.toContain("продолжаю");

    const w2 = newWorld();
    makeExecutable(
      w2,
      "/home/devops/guard.sh",
      'echo старт\n[ -z "$1" ] && echo "нужен аргумент" && exit 1\necho продолжаю с $1\n',
    );
    const withArg = execLine(w2, "./guard.sh prod");
    expect(withArg.code).toBe(0);
    expect(withArg.out).toContain("продолжаю с prod");
  });

  it("set -e не путает guard-паттерн [ ] && ... с настоящей ошибкой (как в реальном bash)", () => {
    const w = newWorld();
    makeExecutable(
      w,
      "/home/devops/deploy.sh",
      'set -e\n[ -z "$1" ] && echo "используй: deploy.sh ОКРУЖЕНИЕ" && exit 1\necho Деплою в $1\necho готово\n',
    );
    // аргумент передан — [ -z "$1" ] ложно, короткое замыкание && не должно быть принято
    // за «настоящую» ошибку строки под set -e, скрипт обязан дойти до конца
    const r = execLine(w, "./deploy.sh prod");
    expect(r.code).toBe(0);
    expect(r.out).toContain("Деплою в prod");
    expect(r.out).toContain("готово");
  });
});
