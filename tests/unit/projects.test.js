import test from "node:test";
import assert from "node:assert/strict";
import { CAPSTONE, PROJECTS, PROJECT_REVIEWS, projectDataIsValid } from "../../next/projects.js";

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
