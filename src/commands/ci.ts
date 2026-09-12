import { def, E, O } from "./registry";
import { readFile, resolvePath } from "../engine/vfs";
import type { World } from "../engine/types";

/** Запускается из `git push`: собирает результат пайплайна из содержимого workflow и кода. */
export function runPipeline(w: World): string {
  const y = w.ci.workflow || "";
  const hasTrigger = /on:\s*push/.test(y) || /on:\s*\n?\s*(push|\[)/.test(y);
  const hasLint = /npm run lint|eslint/.test(y);
  const hasTest = /npm test|pytest|go test|make test/.test(y);
  const needsApproval = /environment:\s*production/.test(y);
  const hardcoded =
    /(token|password|secret)\s*[:=]\s*["']?[A-Za-z0-9_-]{8,}/i.test(y) && !/secrets\./.test(y);
  const indexJs = readFile(w, resolvePath(w, "index.js")) || "";
  const lintBroken = hasLint && /\bvar\s+\w+\s*=/.test(indexJs);
  const codeBroken = /return a - b/.test(readFile(w, resolvePath(w, "src/sum.js")) || "");

  const stages: [string, string][] = [
    ["checkout", "ok"],
    ["install", "ok"],
  ];
  if (hasLint) stages.push(["lint", lintBroken ? "FAILED" : "ok"]);
  if (hasTest && !lintBroken) stages.push(["test", codeBroken ? "FAILED" : "ok"]);
  const failed = stages.some((s) => s[1] === "FAILED") || !hasTrigger;
  const awaitingApproval = needsApproval && !failed;
  stages.push(["deploy", failed ? "skipped" : awaitingApproval ? "waiting" : "ok"]);

  const run = {
    n: w.ci.runs.length + 1,
    stages,
    ok: !failed && !awaitingApproval,
    secretLeak: hardcoded,
    awaitingApproval,
    log: lintBroken
      ? ["> npm run lint", "  index.js: 'var' объявления запрещены (no-var)", "  1 ошибка линтера"]
      : codeBroken
        ? ["> npm test", "  sum(2,3) ожидалось 5, получено -1", "  1 тест провален"]
        : ["> npm test", "  все тесты пройдены (3/3)"],
  };
  w.ci.runs.push(run);

  return (
    "\n\n[CI] Пайплайн #" +
    run.n +
    " запущен → " +
    (failed ? "КРАСНЫЙ" : awaitingApproval ? "ЖДЁТ ПОДТВЕРЖДЕНИЯ" : "ЗЕЛЁНЫЙ") +
    (hardcoded ? "\n[CI] ⚠ security: в workflow найден секрет открытым текстом" : "") +
    (awaitingApproval ? "\n[CI] деплой в production ждёт: ci approve" : "") +
    "\n[CI] подробности: ci status"
  );
}

def("ci", (a, w) => {
  const [sub, ...rest] = a;

  if (sub === "status") {
    if (!w.ci.runs.length) return O("Запусков ещё не было. Сделай git push с готовым workflow.");
    const r = w.ci.runs[w.ci.runs.length - 1];
    const verdict = r.rolledBack
      ? "ОТКАЧЕН ↩"
      : r.awaitingApproval
        ? "ЖДЁТ ПОДТВЕРЖДЕНИЯ ⏸"
        : r.ok
          ? "ЗЕЛЁНЫЙ ✓"
          : "КРАСНЫЙ ✗";
    return O(
      "Пайплайн #" +
        r.n +
        " — " +
        verdict +
        "\n\n" +
        r.stages
          .map(
            (s) =>
              "  " +
              s[0].padEnd(10) +
              " " +
              (s[1] === "ok"
                ? "✓ ok"
                : s[1] === "FAILED"
                  ? "✗ FAILED"
                  : s[1] === "waiting"
                    ? "⏸ ждёт подтверждения (ci approve)"
                    : "— пропущен"),
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
  if (sub === "approve") {
    const r = w.ci.runs[w.ci.runs.length - 1];
    if (!r || !r.awaitingApproval) return E("ci approve: нет запусков, ожидающих подтверждения");
    r.awaitingApproval = false;
    r.ok = true;
    const deployStage = r.stages.find((s) => s[0] === "deploy");
    if (deployStage) deployStage[1] = "ok";
    return O("Подтверждено. Пайплайн #" + r.n + " выкатывает в production → ЗЕЛЁНЫЙ ✓");
  }
  if (sub === "rollback") {
    if (w.ci.runs.length < 2) return E("ci rollback: нет предыдущего успешного релиза, куда откатываться");
    const cur = w.ci.runs[w.ci.runs.length - 1];
    const prev = [...w.ci.runs].reverse().find((r, ix) => ix > 0 && r.ok);
    if (!prev) return E("ci rollback: среди прошлых запусков нет ни одного зелёного");
    cur.rolledBack = true;
    return O("Откат выполнен: production вернулся к версии пайплайна #" + prev.n);
  }
  return E("ci: status | logs | secret add ИМЯ | approve | rollback");
});
