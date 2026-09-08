// Загружает собранный index.html в jsdom для юнит-тестов игровой логики.
// Внешние <script src> (Supabase, xterm.js) и внешний Google Fonts <link> вырезаются —
// они не нужны для тестов чистой логики (diffAnswer, levenshtein, rank, totals и т.п.)
// и без них тесты быстрые и не зависят от сети.
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

function loadGame() {
  const htmlPath = path.join(__dirname, "..", "..", "index.html");
  let html = fs.readFileSync(htmlPath, "utf8");
  html = html.replace(/<script src="https:\/\/[^"]+"><\/script>/g, "");
  html = html.replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^"]*">/g, "");

  const dom = new JSDOM(html, {
    url: "https://ruslan4212.github.io/devops-game/",
    runScripts: "dangerously",
    pretendToBeVisual: true,
    beforeParse(window) {
      // window.localStorage работает в jsdom из коробки, но код игры также
      // трогает Notification/matchMedia/serviceWorker — подставляем безобидные заглушки,
      // чтобы top-level код (реагирующий на них при загрузке) не падал.
      window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {} }));
    },
  });

  return dom;
}

// Выполняет код внутри реалма страницы (та же лексическая область видимости,
// где живут top-level let/const игры — они НЕ становятся свойствами window,
// поэтому обращаться к diffAnswer/rank/totals/skillMeta нужно через eval
// внутри window, а не через window.foo).
function evalInGame(dom, src) {
  return dom.window.eval(src);
}

module.exports = { loadGame, evalInGame };
