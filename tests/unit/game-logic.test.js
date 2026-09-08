const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { loadGame, evalInGame } = require("./loadGame");

let dom;

before(() => {
  dom = loadGame();
});

after(() => {
  dom.window.close();
});

test("levenshtein: расстояние между одинаковыми строками — 0", () => {
  assert.equal(evalInGame(dom, `levenshtein("docker ps","docker ps")`), 0);
});

test("levenshtein: одна опечатка — расстояние 1", () => {
  assert.equal(evalInGame(dom, `levenshtein("dcoker ps","docker ps")`), 2);
  assert.equal(evalInGame(dom, `levenshtein("docker ps","docker psx")`), 1);
});

test("diffAnswer: пустой ввод просит начать печатать", () => {
  const msg = evalInGame(dom, `diffAnswer("", ["docker ps"])`);
  assert.match(msg, /ничего не ввёл/);
});

test("diffAnswer: точный правильный ответ не считается опечаткой", () => {
  const msg = evalInGame(dom, `diffAnswer("docker ps", ["docker ps"])`);
  assert.equal(typeof msg, "string");
  assert.doesNotMatch(msg, /опечат/i);
});

test("diffAnswer: одна опечатка рядом с верным ответом распознаётся как близкий промах", () => {
  const msg = evalInGame(dom, `diffAnswer("dockerp s", ["docker ps"])`);
  assert.match(msg, /близк/i);
});

test("skillMeta: известный навык возвращает свои метаданные", () => {
  const result = evalInGame(dom, `JSON.stringify(skillMeta("linux"))`);
  const parsed = JSON.parse(result);
  assert.equal(parsed.id, "linux");
  assert.notEqual(parsed.n, "linux", "у известного навыка должно быть человекочитаемое имя, а не сырой id");
});

test("skillMeta: неизвестный id не роняет игру, а возвращает заглушку", () => {
  const result = evalInGame(dom, `JSON.stringify(skillMeta("совершенно-новый-несуществующий-навык"))`);
  const parsed = JSON.parse(result);
  assert.equal(parsed.id, "совершенно-новый-несуществующий-навык");
  assert.equal(parsed.ic, "•");
});

test("rank: свежий игрок с нулевым прогрессом получает стартовый ранг", () => {
  const result = evalInGame(dom, `JSON.stringify(rank())`);
  const parsed = JSON.parse(result);
  assert.equal(parsed.min, 0, "ранг с порогом 0 должен существовать и подходить нулевому прогрессу");
});

test("totals: возвращает согласованные ненулевые счётчики контента игры", () => {
  const result = evalInGame(dom, `JSON.stringify(totals())`);
  const t = JSON.parse(result);
  assert.ok(t.m > 0, "должны быть миссии");
  assert.ok(t.l > 0, "должны быть лабораторные");
  assert.ok(t.b > 0, "должны быть миры/боссы");
});

test("hasRealProgress: пустое состояние — прогресса нет", () => {
  assert.equal(evalInGame(dom, `hasRealProgress({xp:0,mis:{}})`), false);
  assert.equal(evalInGame(dom, `hasRealProgress(null)`), false);
});

test("hasRealProgress: ненулевой XP или пройденные миссии — прогресс есть", () => {
  assert.equal(evalInGame(dom, `hasRealProgress({xp:50,mis:{}})`), true);
  assert.equal(evalInGame(dom, `hasRealProgress({xp:0,mis:{"linux:1":true}})`), true);
});
