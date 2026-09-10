// Регрессия на реальный баг: клик по многострочному <pre> всегда искал команду
// из ПЕРВОЙ строки примера, а не из той строки, по которой кликнули на самом
// деле — "curl -fsS ..." на третьей строке блока показывал "ничего" вместо
// объяснения curl, потому что фактически искалось "mkdir" с первой строки.
// jsdom (юнит-тесты) не считает координаты клика по-настоящему, поэтому это
// можно честно проверить только в реальном браузере.
const { test, expect } = require("@playwright/test");

test("клик по третьей строке многострочного примера ищет именно её, а не первую", async ({ page }) => {
  await page.goto("/");

  // Открываем миссию l1, где первая же теоретическая карточка содержит
  // однострочный <code>ls -la /etc</code> — достаточно для базовой проверки,
  // а для многострочного <pre> явно строим DOM тем же кодом, что в игре.
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload();

  await page.evaluate(() => {
    // Прямой вызов внутренней функции игры с заведомо многострочным <pre>,
    // как в реальной карточке про &&/||: curl-строка — третья, не первая.
    const host = document.getElementById("view");
    host.innerHTML = `<div class="teach"><pre id="testpre">mkdir -p /opt/app
# комментарий

curl -fsS http://localhost/health || exit 1</pre></div>`;
  });

  const pre = page.locator("#testpre");
  const box = await pre.boundingBox();
  const fullText = await pre.textContent();
  const lines = fullText.split("\n");
  // Кликаем в вертикальную позицию четвёртой (последней) строки — там curl.
  const lineHeight = box.height / lines.length;
  const y = box.y + lineHeight * (lines.length - 0.5);
  const x = box.x + 10;

  await page.mouse.click(x, y);

  const glq = await page.evaluate(() => GLQ);
  expect(glq).toBe("curl");
});
