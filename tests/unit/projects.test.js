import test from "node:test";
import assert from "node:assert/strict";
import { buildPortfolioMarkdown, CAPSTONE, PROJECTS, PROJECT_REVIEWS, projectDataIsValid, projectTaskCompletion } from "../../next/projects.js";

test("есть отдельный рабочий проект для каждого из 14 актов", () => {
  assert.equal(PROJECTS.length, 14);
  assert.deepEqual(PROJECTS.map((project) => project.act), Array.from({ length: 14 }, (_, index) => index + 1));
  assert.equal(new Set(PROJECTS.map((project) => project.id)).size, 14);
  assert.equal(new Set(PROJECTS.map((project) => project.directory)).size, 14);
});

test("каждый тематический проект содержит проверяемые практические шаги", () => {
  for (const project of PROJECTS) {
    assert.equal(project.tasks.length, 3, project.title);
    for (const task of project.tasks) {
      assert.doesNotThrow(() => new RegExp(task.pattern), `${project.id}: ${task.title}`);
      assert.ok(task.instruction && task.why && task.hint, `${project.id}: ${task.title}`);
    }
  }
});

test("сквозной capstone объединяет все 14 тем", () => {
  assert.equal(CAPSTONE.tasks.length, 14);
  assert.equal(new Set(CAPSTONE.tasks.map((task) => task.title.split(":")[0])).size, 14);
  assert.ok(projectDataIsValid());
});

test("каждый проект проверяет понимание решения отдельным контрольным вопросом", () => {
  assert.equal(Object.keys(PROJECT_REVIEWS).length, 15);
  for (const project of [...PROJECTS, CAPSTONE]) {
    const review = PROJECT_REVIEWS[project.id];
    assert.ok(review.question && review.explain, project.id);
    assert.equal(review.options.length, 3, project.id);
    assert.ok(review.answer >= 0 && review.answer < review.options.length, project.id);
    assert.notEqual(review.options[review.answer], review.options[(review.answer + 1) % review.options.length]);
  }
});

test("портфолио показывает только подтверждённые команды и результаты", () => {
  const projects = [...PROJECTS, CAPSTONE];
  const makeWorld = (project) => {
    const world = {
      cwd: project.directory,
      fs: { type: "dir", children: {} },
      log: project.tasks.flatMap((task) => task.hint.split("&&").map((cmd) => ({ cmd: cmd.trim(), code: 0 }))),
      toaCommandEvidence: project.tasks.map((task) => ({ command: task.hint.split("&&").at(-1).trim(), code: 0, output: "OK" })),
    };
    if (project.id === "linux" || project.id === "capstone") {
      let node = world.fs;
      for (const part of [...project.directory.slice(1).split("/"), "incident-report.txt"]) {
        node.children[part] = part === "incident-report.txt" ? { type: "file", content: "ERROR database timeout" } : { type: "dir", children: {} };
        node = node.children[part];
      }
    }
    return world;
  };
  const worlds = Object.fromEntries(projects.map((project) => [project.id, makeWorld(project)]));
  const reviews = Object.fromEntries(projects.map((project) => [project.id, true]));
  const report = buildPortfolioMarkdown({ worlds, reviews });
  assert.match(report, /# Портфолио: DevOps-практика/);
  for (const project of projects) assert.ok(report.includes(project.title), project.id);
  assert.match(report, /Проверка понимания:\*\* пройдена/);
  assert.match(report, /Результат:[\s\S]*> OK/);
});

test("Linux-проект требует сохранить и проверить реальное содержимое отчёта", () => {
  const project = PROJECTS.find((item) => item.id === "linux");
  const world = { cwd: project.directory, fs: { type: "dir", children: {} }, log: project.tasks.flatMap((task) => task.hint.split("&&").map((cmd) => ({ cmd: cmd.trim(), code: 0 }))) };
  assert.deepEqual(projectTaskCompletion(project, world), [true, true, false]);

  let node = world.fs;
  for (const part of [...project.directory.slice(1).split("/"), "incident-report.txt"]) {
    node.children[part] = part === "incident-report.txt" ? { type: "file", content: "ERROR database timeout" } : { type: "dir", children: {} };
    node = node.children[part];
  }
  world.cwd = `${project.directory}/infra`;
  assert.deepEqual(projectTaskCompletion(project, world), [true, true, true]);
});
