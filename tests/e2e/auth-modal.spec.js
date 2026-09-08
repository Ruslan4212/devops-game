// Регрессионный тест на реальный баг из продакшена: onclick="event.stopPropagation()"
// на .modal когда-то блокировал вообще все клики внутри окна аккаунта — не работали
// ни "Зарегистрироваться", ни "Войти", ни "Закрыть". Баг был не виден по коду с первого
// взгляда и обнаружился только вживую, поэтому здесь закреплён явным тестом.
const { test, expect } = require("@playwright/test");

test("кнопка Аккаунт открывает модалку входа", async ({ page }) => {
  await page.goto("/");
  await page.getByTitle("Аккаунт").click();
  await expect(page.getByPlaceholder("email")).toBeVisible();
  await expect(page.getByRole("button", { name: "Войти" })).toBeVisible();
});

test("ссылка Зарегистрироваться переключает форму на регистрацию", async ({ page }) => {
  await page.goto("/");
  await page.getByTitle("Аккаунт").click();
  await page.getByRole("link", { name: "Зарегистрироваться" }).click();
  await expect(page.getByRole("button", { name: "Создать аккаунт" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Войти" })).toBeVisible();
});

test("кнопка Закрыть закрывает модалку", async ({ page }) => {
  await page.goto("/");
  await page.getByTitle("Аккаунт").click();
  await expect(page.getByPlaceholder("email")).toBeVisible();
  await page.getByRole("button", { name: "Закрыть ✕" }).click();
  await expect(page.getByPlaceholder("email")).toBeHidden();
});

test("клик по тёмному фону вне окна тоже закрывает модалку", async ({ page }) => {
  await page.goto("/");
  await page.getByTitle("Аккаунт").click();
  await expect(page.getByPlaceholder("email")).toBeVisible();
  // клик в верхний левый угол экрана — заведомо на фон, а не на саму карточку окна
  await page.mouse.click(5, 5);
  await expect(page.getByPlaceholder("email")).toBeHidden();
});
