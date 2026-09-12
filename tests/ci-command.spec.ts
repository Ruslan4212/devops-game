import { describe, expect, it } from "vitest";
import { execLine } from "../src/engine/shell";
import { newWorld } from "../src/engine/world";
import { writeFile } from "../src/engine/vfs";
import { runPipeline } from "../src/commands/ci";

const WORKFLOW_APPROVAL =
  "name: CI\non: push\nenvironment: production\njobs:\n  build:\n    steps:\n      - run: npm ci\n      - run: npm test\n";

const WORKFLOW_LINT =
  "name: CI\non: push\njobs:\n  build:\n    steps:\n      - run: npm ci\n      - run: npm run lint\n      - run: npm test\n";

describe("ci: подтверждение production, откат, lint", () => {
  it("environment: production переводит деплой в waiting, пока не вызван ci approve", () => {
    const w = newWorld();
    writeFile(w, "/home/devops/src/sum.js", "function sum(a, b) {\n  return a + b;\n}\n");
    w.ci.workflow = WORKFLOW_APPROVAL;
    runPipeline(w);
    const last = w.ci.runs[w.ci.runs.length - 1];
    expect(last.awaitingApproval).toBe(true);
    expect(last.ok).toBe(false);

    const denied = execLine(w, "ci status");
    expect(denied.out).toContain("ЖДЁТ ПОДТВЕРЖДЕНИЯ");

    const approved = execLine(w, "ci approve");
    expect(approved.code).toBe(0);
    expect(w.ci.runs[w.ci.runs.length - 1].ok).toBe(true);
    expect(w.ci.runs[w.ci.runs.length - 1].awaitingApproval).toBe(false);
  });

  it("ci rollback возвращает production к предыдущему зелёному запуску", () => {
    const w = newWorld();
    w.ci.workflow = "name: CI\non: push\njobs:\n  build:\n    steps:\n      - run: npm ci\n";
    runPipeline(w); // #1 зелёный (нет тестов — просто install)
    runPipeline(w); // #2 тоже зелёный
    const r = execLine(w, "ci rollback");
    expect(r.code).toBe(0);
    expect(w.ci.runs[w.ci.runs.length - 1].rolledBack).toBe(true);
  });

  it("lint-стадия падает на var и блокирует test", () => {
    const w = newWorld();
    writeFile(w, "/home/devops/index.js", "var x = 1;\nconsole.log(x);\n");
    w.ci.workflow = WORKFLOW_LINT;
    runPipeline(w);
    const last = w.ci.runs[w.ci.runs.length - 1];
    expect(last.ok).toBe(false);
    expect(last.stages.find((s) => s[0] === "lint")?.[1]).toBe("FAILED");
    expect(last.stages.find((s) => s[0] === "test")).toBeUndefined();
  });
});
