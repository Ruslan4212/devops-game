import { def } from "./registry";
import { getNode, resolvePath } from "../engine/vfs";
import type { World } from "../engine/types";

const NUM_OPS: Record<string, (x: number, y: number) => boolean> = {
  "-eq": (x, y) => x === y,
  "-ne": (x, y) => x !== y,
  "-lt": (x, y) => x < y,
  "-le": (x, y) => x <= y,
  "-gt": (x, y) => x > y,
  "-ge": (x, y) => x >= y,
};

/**
 * Простая, но настоящая проверка условия — то же самое, что делает  test / [ ]  в bash.
 * Используется вместе с  &&  и  ||  прямо в скрипте, например:
 *   [ -z "$1" ] && echo "нужен аргумент"
 * Полноценный if/then/fi этот тренажёр не разбирает (нет построчного парсера ветвлений),
 * но однострочные проверки через  [ ] && / ||  — ровно то, чем в реальном bash часто
 * обходятся без if.
 */
function evalTest(a: string[], w: World): boolean {
  const args = a[a.length - 1] === "]" ? a.slice(0, -1) : a;

  if (args.length === 1) return args[0] !== "";
  if (args.length === 2 && args[0] === "-z") return args[1] === "";
  if (args.length === 2 && args[0] === "-n") return args[1] !== "";
  if (args.length === 2 && (args[0] === "-f" || args[0] === "-d")) {
    const n = getNode(w, resolvePath(w, args[1]));
    return !!n && n.type === (args[0] === "-f" ? "file" : "dir");
  }
  if (args.length === 3 && args[1] === "=") return args[0] === args[2];
  if (args.length === 3 && args[1] === "!=") return args[0] !== args[2];
  if (args.length === 3 && args[1] in NUM_OPS) return NUM_OPS[args[1]](Number(args[0]), Number(args[2]));
  return false;
}

def("test", (a, w) => ({ out: "", code: evalTest(a, w) ? 0 : 1 }));
def("[", (a, w) => ({ out: "", code: evalTest(a, w) ? 0 : 1 }));
