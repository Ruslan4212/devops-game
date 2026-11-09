const { test, expect } = require("@playwright/test");

test("проектные рабочие места открываются в /next и сохраняют практику", async ({ page }) => {
  await page.goto("/next/#/projects");
  if (await page.locator("#modClose").isVisible()) await page.locator("#modClose").click();
  await expect(page.locator(".toa-roadmap h2")).toHaveText("0 из 14 проектов завершено");
  await expect(page.locator(".toa-capstone-note")).toContainText("0/14 шагов");
  await expect(page.getByRole("heading", { name: "Проекты: от первой команды до production" })).toBeVisible();
  await expect(page.locator(".toa-project-card")).toHaveCount(15);

  await page.locator('[data-project="linux"]').click();
  await expect(page).toHaveURL(/#\/terminal$/);
  await expect(page.getByRole("heading", { name: "Подготовить рабочее место магазина" })).toBeVisible();
  await expect(page.locator("#cmd")).toBeVisible();

  await page.locator("#cmd").fill("pwd");
  await page.locator("#cmd").press("Enter");
  await expect(page.locator(".toa-current-task h3")).toHaveText("Составь карту файлов");
  const savedWorld = await page.evaluate(() => JSON.parse(localStorage.getItem("toa_project_world_v1:linux")));
  expect(savedWorld.cwd).toBe("/home/devops/shop-linux");
  expect(savedWorld.log.some((entry) => String(entry.cmd).trim() === "pwd" && entry.code === 0), JSON.stringify(savedWorld.log)).toBe(true);
  expect(savedWorld.toaCommandEvidence.some((entry) => entry.command === "pwd" && entry.output.includes("/home/devops/shop-linux"))).toBe(true);

  await page.reload();
  if (await page.locator("#modClose").isVisible()) await page.locator("#modClose").click();
  await expect(page.locator(".toa-workbench h2")).toHaveText("Подготовить рабочее место магазина");
  await expect(page.locator(".toa-work-progress")).toContainText("Практика: 1 из 3 шагов");

  await page.locator('[data-r="projects"]').click();
  await page.locator('[data-project="linux"]').click();
  await expect(page.locator("#cmd")).toBeEnabled();
  await page.locator("#cmd").fill("find . -type f");
  await page.locator("#cmd").press("Enter");
  await expect(page.locator(".toa-work-progress")).toContainText("Практика: 2 из 3 шагов");
  await page.locator("#cmd").fill("grep -i error logs/app.log");
  await page.locator("#cmd").press("Enter");
  await expect(page.locator(".toa-work-progress")).toContainText("Практика: 2 из 3 шагов");
  await page.locator("#cmd").fill("grep -i error logs/app.log > incident-report.txt && cat incident-report.txt");
  await page.locator("#cmd").press("Enter");
  await expect(page.locator(".toa-review")).toBeVisible();
  const report = await page.evaluate(() => JSON.parse(localStorage.getItem("toa_project_world_v1:linux")));
  expect(report.fs.children.home.children.devops.children["shop-linux"].children["incident-report.txt"].content).toContain("ERROR database timeout");
});

test("сквозной проект закрыт, пока не пройдены тематические проекты", async ({ page }) => {
  await page.goto("/next/#/projects");
  if (await page.locator("#modClose").isVisible()) await page.locator("#modClose").click();
  await expect(page.locator('[data-project="capstone"]')).toBeDisabled();
});

test("команды из практики каждого проекта выполняются в его терминале", async ({ page }) => {
  await page.goto("/next/#/projects");
  if (await page.locator("#modClose").isVisible()) await page.locator("#modClose").click();
  const projects = await page.evaluate(() => window.TOAProjects.catalog());

  for (const project of projects) {
    await page.locator(`[data-project="${project.id}"]`).click();
    await expect(page.locator(".toa-workbench h2")).toHaveText(project.title);
    for (let index = 0; index < project.tasks.length; index++) {
      await page.locator("#cmd").fill(project.tasks[index].hint);
      await page.locator("#cmd").press("Enter");
      await expect(page.locator(".toa-work-progress"), `${project.id}, шаг ${index + 1}: ${project.tasks[index].hint}`).toContainText(`Практика: ${index + 1} из ${project.tasks.length} шагов`);
    }
    const world = await page.evaluate((id) => JSON.parse(localStorage.getItem(`toa_project_world_v1:${id}`)), project.id);
    if (project.id === "git") expect(world.git.commits.some((commit) => commit.files.includes("README.md"))).toBe(true);
    if (project.id === "docker") expect(world.docker.containers.some((container) => container.image === "shop-api:dev" && container.state === "running")).toBe(true);
    if (project.id === "terraform") expect(world.tf.plan.add.length).toBeGreaterThan(0);
    if (project.id === "kubernetes") {
      expect(world.k8s.deploys.some((deployment) => deployment.name === "shop-api" && !deployment.crash)).toBe(true);
      expect(world.k8s.svcs.some((service) => service.name === "shop-api" && service.port === 3000)).toBe(true);
    }
    if (project.id === "linux") {
      await page.locator(`[data-project-answer="${project.id}"][data-answer-index="${(project.review.answer + 1) % 3}"]`).click();
      await expect(page.locator(".toa-review-feedback")).toContainText("Пока неверно");
    }
    await page.locator(`[data-project-answer="${project.id}"][data-answer-index="${project.review.answer}"]`).click();
    await expect(page.locator(".toa-finished h3")).toHaveText("Проект завершён");
    await page.locator("[data-project-home]").click();
    await expect(page.locator("#pageView")).toBeVisible();
  }

  await expect(page.locator('[data-project="capstone"]')).toBeEnabled();
  await page.locator('[data-project="capstone"]').click();
  const capstone = await page.evaluate(() => window.TOAProjects.capstoneCatalog());
  for (let index = 0; index < capstone.tasks.length; index++) {
    await page.locator("#cmd").fill(capstone.tasks[index].hint);
    await page.locator("#cmd").press("Enter");
    await expect(page.locator(".toa-work-progress"), `capstone, шаг ${index + 1}: ${capstone.tasks[index].hint}`).toContainText(`Практика: ${index + 1} из ${capstone.tasks.length} шагов`);
  }
  const capstoneWorld = await page.evaluate(() => JSON.parse(localStorage.getItem("toa_project_world_v1:capstone")));
  expect(capstoneWorld.git.commits.some((commit) => commit.files.includes("README.md"))).toBe(true);
  expect(capstoneWorld.docker.containers.some((container) => container.image === "shop-api:release" && container.state === "running")).toBe(true);
  expect(capstoneWorld.tf.plan.add.length).toBeGreaterThan(0);
  expect(capstoneWorld.k8s.deploys.some((deployment) => deployment.name === "shop-api" && !deployment.crash)).toBe(true);
  await page.locator(`[data-project-answer="capstone"][data-answer-index="${capstone.review.answer}"]`).click();
  await expect(page.locator(".toa-finished h3")).toHaveText("Проект завершён");
  await page.locator("[data-project-home]").click();
  await expect(page.locator("[data-export-portfolio]")).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.locator("[data-export-portfolio]").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("devops-portfolio-shop.md");
});
