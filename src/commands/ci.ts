import { def, E, O } from "./registry";
import { readFile, resolvePath } from "../engine/vfs";
import type { World } from "../engine/types";

/** Запускается из `git push`: собирает результат пайплайна из содержимого workflow и кода. */
export function runPipeline(w: World): string {
  const y = w.ci.workflow || "";
  const hasTrigger = /on:\s*push/.test(y) || /on:\s*\n?\s*(push|\[)/.test(y);
  const hasTest = /npm test|pytest|go test|make test/.test(y);
  const hardcoded =
    /(token|password|secret)\s*[:=]\s*["']?[A-Za-z0-9_-]{8,}/i.test(y) && !/secrets\./.test(y);
  const codeBroken = /return a - b/.test(readFile(w, resolvePath(w, "src/sum.js")) || "");

  const stages: [string, string][] = [
    ["checkout", "ok"],
    ["install", "ok"],
  ];
  if (hasTest) stages.push(["test", codeBroken ? "FAILED" : "ok"]);
  const failed = stages.some((s) => s[1] === "FAILED") || !hasTrigger;
  stages.push(["deploy", failed ? "skipped" : "ok"]);

  const run = {
    n: w.ci.runs.length + 1,
    stages,
    ok: !failed,
    secretLeak: hardcoded,
    log: codeBroken
      ? ["> npm test", "  sum(2,3) ожидалось 5, получено -1", "  1 тест провален"]
      : ["> npm test", "  все тесты пройдены (3/3)"],
  };
  w.ci.runs.push(run);

  return (
    "\n\n[CI] Пайплайн #" +
    run.n +
    " запущен → " +
    (run.ok ? "ЗЕЛЁНЫЙ" : "КРАСНЫЙ") +
    (hardcoded ? "\n[CI] ⚠ security: в workflow найден секрет открытым текстом" : "") +
    "\n[CI] подробности: ci status"
  );
}

def("ci", (a, w) => {
  const [sub, ...rest] = a;

  if (sub === "status") {
    if (!w.ci.runs.length) return O("Запусков ещё не было. Сделай git push с готовым workflow.");
    const r = w.ci.runs[w.ci.runs.length - 1];
    return O(
      "Пайплайн #" +
        r.n +
        " — " +
        (r.ok ? "ЗЕЛЁНЫЙ ✓" : "КРАСНЫЙ ✗") +
        "\n\n" +
        r.stages
          .map(
            (s) =>
              "  " +
              s[0].padEnd(10) +
              " " +
              (s[1] === "ok" ? "✓ ok" : s[1] === "FAILED" ? "✗ FAILED" : "— пропущен"),
          )
          .join("\n") +
        "\n\nЛоги: ci logs",
    );
  }
  if (sub === "logs") {
    if (!w.ci.runs.length) return E("нет запусков");
    return O(w.ci.runs[w.ci.runs.length - 1].log.join("\n"));
  }
  if (sub === "secret") {
    if (rest[0] === "add") {
      w.ci.secrets.push(rest[1]);
      return O("Секрет " + rest[1] + " сохранён в хранилище CI (в коде его больше нет)");
    }
    return O(w.ci.secrets.join("\n") || "(секретов нет)");
  }
  return E("ci: status | logs | secret add ИМЯ");
});
