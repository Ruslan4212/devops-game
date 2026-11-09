import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [certificateSource, profileSource, mainBuild, nextBuild] = await Promise.all([
  readFile(new URL("../../p15.txt", import.meta.url), "utf8"),
  readFile(new URL("../../p37.txt", import.meta.url), "utf8"),
  readFile(new URL("../../index.html", import.meta.url), "utf8"),
  readFile(new URL("../../next/index.html", import.meta.url), "utf8"),
]);

test("certificate is a simulator progress summary, not a professional credential", () => {
  assert.match(certificateSource, /СВОДКА УЧЕБНОГО ПРОГРЕССА/);
  assert.match(certificateSource, /не подтверждение опыта в production/);
  assert.doesNotMatch(certificateSource, /fillText\("MIDDLE DEVOPS"/);
  assert.match(certificateSource, /Скачать сводку учебного прогресса/);
  assert.match(profileSource, /Достигнут игровой ранг Middle DevOps — доступна сводка учебного прогресса/);
  assert.doesNotMatch(profileSource, /Курс пройден полностью/);
  assert.match(certificateSource, /pipeline-devops-practice-certificate\.png/);
  assert.match(mainBuild, /Пройденные активности в учебном симуляторе/);
  assert.match(mainBuild, /не подтверждение опыта в production/);
});

test("next course labels its capstone as simulated and its certificate as progress", () => {
  assert.match(nextBuild, /Сводка учебного прогресса в симуляторе/);
  assert.match(nextBuild, /Не является профессиональной квалификацией или подтверждением опыта в production/);
  assert.match(nextBuild, /Итоговый проект в симуляторе/);
  assert.doesNotMatch(nextBuild, /Капстоун на реальном сервере/);
  assert.doesNotMatch(nextBuild, /СЕРТИФИКАТ О ПРОХОЖДЕНИИ КУРСА/);
});
