const { test, expect } = require("@playwright/test");

test("сайт открывается и показывает вкладки курса", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Pipeline/);
  await expect(page.getByRole("button", { name: "Карта" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Тренажёр" })).toBeVisible();
});

test("переключение между вкладками меняет содержимое", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Карьера" }).click();
  await expect(page.locator("#view")).toBeVisible();
  await page.getByRole("button", { name: "Магазин" }).click();
  await expect(page.locator("#view")).toBeVisible();
});
