/* =====================================================================
   Ops Academy Grader Server — проверка смысла свободных ответов
   =====================================================================
   Игрок печатает ответ своими словами. Подсчёт совпавших слов смысл не
   ловит: «удерживается процессом» и «держит открытым процесс» — одна
   мысль, но ни одного общего корня. Поэтому судит настоящая модель.

   Провайдер выбирается по тому, какой ключ задан в .env. Все, кроме
   Anthropic, имеют бесплатный тариф, которого для учебной игры хватает
   с запасом:

     GROQ_API_KEY       console.groq.com/keys        бесплатно, быстро
     GEMINI_API_KEY     aistudio.google.com/apikey   бесплатно
     OPENROUTER_API_KEY openrouter.ai/keys           бесплатные модели
     ANTHROPIC_API_KEY  console.anthropic.com        платно

   Модель доверия:
   - Origin сверяется с ALLOWED_ORIGINS — чужой сайт не потратит наш лимит.
   - Ключ живёт только на сервере и в браузер никогда не попадает.
   - Грубый rate-limit по IP — защита от шквала запросов.
   ===================================================================== */
"use strict";

require("dotenv").config();
const express = require("express");

const PORT = Number(process.env.PORT || 8089);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/** Ключ считается настоящим, только если это ASCII-строка разумной длины:
 *  случайно вставленный в .env русский текст не должен «занимать» провайдера. */
const key = (name) => {
  const v = (process.env[name] || "").trim();
  return v.length >= 20 && /^[ -~]+$/.test(v) ? v : "";
};

/** Первый провайдер, для которого задан настоящий ключ. Порядок — от бесплатного к платному. */
function pickProvider() {
  if (key("GROQ_API_KEY")) {
    return {
      name: "groq",
      url: "https://api.groq.com/openai/v1/chat/completions",
      key: key("GROQ_API_KEY"),
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    };
  }
  if (key("GEMINI_API_KEY")) {
    return {
      name: "gemini",
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      key: key("GEMINI_API_KEY"),
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
    };
  }
  if (key("OPENROUTER_API_KEY")) {
    return {
      name: "openrouter",
      url: "https://openrouter.ai/api/v1/chat/completions",
      key: key("OPENROUTER_API_KEY"),
      model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free",
    };
  }
  if (key("ANTHROPIC_API_KEY")) {
    return {
      name: "anthropic",
      url: "https://api.anthropic.com/v1/messages",
      key: key("ANTHROPIC_API_KEY"),
      model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",
    };
  }
  return null;
}

/** Модели по убыванию пригодности: русский язык и следование инструкции. */
const PREFERRED = {
  groq: ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "qwen/qwen3.6-27b", "openai/gpt-oss-20b", "groq/compound"],
  gemini: ["gemini-2.0-flash", "gemini-1.5-flash"],
  openrouter: ["meta-llama/llama-3.3-70b-instruct:free", "qwen/qwen-2.5-72b-instruct:free"],
  anthropic: [],
};

/**
 * Провайдеры переименовывают и снимают модели — захардкоженное имя однажды
 * отвечает 404 и проверка молча ломается. Поэтому при старте спрашиваем
 * список доступных и берём первую подходящую.
 */
async function resolveModel(provider) {
  if (provider.name === "anthropic") return provider.model;
  const listUrl = provider.url.replace(/\/chat\/completions$/, "/models");
  try {
    const res = await fetch(listUrl, { headers: { authorization: "Bearer " + provider.key } });
    if (!res.ok) return provider.model;
    const data = await res.json();
    const ids = (data?.data || []).map((m) => m.id);
    if (!ids.length) return provider.model;
    if (ids.includes(provider.model)) return provider.model;
    const better = (PREFERRED[provider.name] || []).find((m) => ids.includes(m));
    if (better) return better;
    // последний шанс: любая инструктивная модель, не распознавание речи
    return ids.find((m) => !/whisper|guard|tts|embed/i.test(m)) || provider.model;
  } catch {
    return provider.model;
  }
}

const PROVIDER = pickProvider();
if (!PROVIDER) {
  console.error(
    "Не задан ни один ключ. Добавьте в .env один из: GROQ_API_KEY, GEMINI_API_KEY, " +
      "OPENROUTER_API_KEY, ANTHROPIC_API_KEY — и перезапустите сервис.",
  );
  process.exit(1);
}

/* ------------------------------ rate limit ------------------------------ */
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_PER_IP = 30;
const hits = new Map(); // ip -> timestamps[]

function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > RATE_MAX_PER_IP;
}

/* -------------------------------- CORS ---------------------------------- */
function cors(req, res) {
  const origin = req.headers.origin;
  if (!ALLOWED_ORIGINS.length || (origin && ALLOWED_ORIGINS.includes(origin))) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "10kb" }));
app.use((req, res, next) => {
  cors(req, res);
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.get("/health", (_req, res) => res.json({ ok: true }));

/** Достаёт первый валидный JSON-объект из текста ответа модели — на случай лишних слов вокруг. */
function extractJson(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

app.post("/grade", async (req, res) => {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  if (rateLimited(ip)) return res.status(429).json({ error: "слишком много запросов, подожди немного" });

  const { question, expected, explain, userAnswer, options, answerIx } = req.body || {};
  if (typeof question !== "string" || typeof expected !== "string" || typeof userAnswer !== "string") {
    return res.status(400).json({ error: "нужны поля question, expected, userAnswer (строки)" });
  }
  if (userAnswer.length > 2000 || question.length > 2000) {
    return res.status(400).json({ error: "слишком длинный текст" });
  }

  // неверные варианты — материал для разбора: если ученик пересказал один из
  // них, это конкретное заблуждение, и назвать его полезнее, чем «не совсем»
  const wrong = Array.isArray(options)
    ? options.filter((o, i) => typeof o === "string" && i !== answerIx)
    : [];

  const prompt =
    "Ты строгий, но справедливый экзаменатор по DevOps. Твоя задача — проверить, " +
    "СОВПАДАЕТ ЛИ ПО СМЫСЛУ ответ ученика с верной мыслью. Ты не пересказываешь верный " +
    "ответ и не хвалишь за старание — ты выносишь вердикт.\n\n" +
    "ОТВЕТ УЧЕНИКА (именно его надо оценить): " + userAnswer + "\n\n" +
    "ВОПРОС: " + question + "\n\n" +
    "ВЕРНАЯ МЫСЛЬ: " + expected + "\n\n" +
    (explain ? "ПОЯСНЕНИЕ: " + explain + "\n\n" : "") +
    (wrong.length ? "ЗАВЕДОМО НЕВЕРНЫЕ ВАРИАНТЫ: " + wrong.join(" | ") + "\n\n" : "") +
    "Порядок работы:\n" +
    "1. Сформулируй своими словами, что именно УТВЕРЖДАЕТ ученик.\n" +
    "2. Сравни это утверждение с верной мыслью.\n" +
    "3. Вынеси вердикт.\n\n" +
    "Верно (correct=true), если ученик выразил ту же мысль — любыми словами, кратко, " +
    "с опечатками, без терминов из учебника. «Удерживается процессом» = «держит открытым " +
    "живой процесс». «На 4 ядра претендуют 8 процессов» = верно. Достаточно главной мысли, " +
    "перечислять все детали не нужно.\n\n" +
    "Неверно (correct=false), если утверждение ученика ПРОТИВОРЕЧИТ верной мысли, " +
    "совпадает с одним из заведомо неверных вариантов, не отвечает на вопрос, пустое или " +
    "содержит фактическую ошибку. Пример: если верно «ssh откажется работать с ключом», " +
    "то ответ «ничего, просто подключится медленнее» — НЕВЕРНО, даже если звучит уверенно.\n\n" +
    "Верни СТРОГО один JSON-объект, без markdown и текста вокруг:\n" +
    '{"claim": "что утверждает ученик, одной фразой", "correct": true или false, ' +
    '"feedback": "1-3 предложения по-русски, на ты. Если верно — подтверди и добавь одну ' +
    'полезную деталь. Если неверно — назови именно его ошибку и дай верную мысль."}';

  const isAnthropic = PROVIDER.name === "anthropic";
  const headers = isAnthropic
    ? { "content-type": "application/json", "x-api-key": PROVIDER.key, "anthropic-version": "2023-06-01" }
    : { "content-type": "application/json", authorization: "Bearer " + PROVIDER.key };
  const body = isAnthropic
    ? { model: PROVIDER.model, max_tokens: 800, messages: [{ role: "user", content: prompt }] }
    : {
        model: PROVIDER.model,
        max_tokens: 800,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      };

  let apiRes;
  try {
    apiRes = await fetch(PROVIDER.url, { method: "POST", headers, body: JSON.stringify(body) });
    // строгий json-режим иногда упирается в лимит токенов и отдаёт 400 —
    // тогда просим то же самое обычным текстом и достаём JSON регуляркой
    if (!apiRes.ok && body.response_format) {
      const retry = { ...body };
      delete retry.response_format;
      apiRes = await fetch(PROVIDER.url, { method: "POST", headers, body: JSON.stringify(retry) });
    }
  } catch (e) {
    console.error(PROVIDER.name + " недоступен:", e.message);
    return res.status(502).json({ error: "проверка временно недоступна" });
  }
  if (!apiRes.ok) {
    console.error(PROVIDER.name + " вернул ошибку:", apiRes.status, await apiRes.text());
    return res.status(502).json({ error: "проверка временно недоступна" });
  }

  const data = await apiRes.json();
  const text = isAnthropic ? data?.content?.[0]?.text || "" : data?.choices?.[0]?.message?.content || "";
  const parsed = extractJson(text);
  if (!parsed || typeof parsed.correct !== "boolean" || typeof parsed.feedback !== "string") {
    console.error("Не удалось разобрать ответ модели:", text);
    return res.status(502).json({ error: "не удалось разобрать ответ проверки" });
  }

  res.json({ correct: parsed.correct, feedback: parsed.feedback });
});

void (async () => {
  PROVIDER.model = await resolveModel(PROVIDER);
})();

/* --------- проверка практического задания в терминале ---------------------
   У шага урока есть прибитый эталонный ответ, но верных решений почти всегда
   больше одного: «ss -ltn» и «ss -tlpn sport :80» решают одну задачу, причём
   второе точнее. Здесь модель смотрит на саму задачу, на введённую команду и
   на её настоящий вывод — и решает, выполнено ли задание по существу.
   ------------------------------------------------------------------------ */
app.post("/command", async (req, res) => {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  if (rateLimited(ip)) return res.status(429).json({ error: "слишком много запросов, подожди немного" });

  const { task, expected, command, output, lesson } = req.body || {};
  if (typeof task !== "string" || typeof command !== "string") {
    return res.status(400).json({ error: "нужны поля task и command (строки)" });
  }
  if (command.length > 1000 || task.length > 2000) {
    return res.status(400).json({ error: "слишком длинный текст" });
  }

  const prompt =
    "Ты преподаватель Linux и DevOps, проверяешь практическое задание в тренажёре-терминале.\n\n" +
    (lesson ? "УРОК: " + lesson + "\n" : "") +
    "ЗАДАНИЕ: " + task + "\n\n" +
    (expected ? "ЭТАЛОННОЕ РЕШЕНИЕ (один из вариантов, НЕ единственно верный): " + expected + "\n\n" : "") +
    "УЧЕНИК ВВЁЛ: " + command + "\n\n" +
    "ВЫВОД ТЕРМИНАЛА:\n" + String(output || "(пусто)").slice(0, 1500) + "\n\n" +
    "Главное правило: засчитывай ЛЮБОЕ решение, которое выполняет задание, даже если оно " +
    "не совпадает с эталонным. Другие флаги, другой порядок, другая утилита с тем же " +
    "результатом, более точный или более подробный вариант — всё это верно. Например, " +
    "если эталон «ss -ltn», то «ss -tlpn», «ss -tulpn | grep :80» и «netstat -ltnp» тоже " +
    "верны, а «ss -tlpn sport :80» даже точнее.\n\n" +
    "Не засчитывай, если: команда не выполняет задание, завершилась ошибкой и цель не " +
    "достигнута, решает другую задачу или это случайный ввод.\n\n" +
    "Если в выводе видно, что команды нет в тренажёре, — это ограничение тренажёра, а не " +
    "ошибка ученика: скажи об этом прямо и предложи доступную альтернативу.\n\n" +
    "Верни СТРОГО один JSON-объект без markdown:\n" +
    '{"correct": true или false, "feedback": "1-2 предложения по-русски, на ты. Если верно — ' +
    "подтверди и, если решение отличается от эталонного, отметь чем оно хорошо или в чём " +
    'разница. Если нет — объясни, что именно не так, и подскажи направление, не выдавая ответ целиком."}';

  const isAnthropic = PROVIDER.name === "anthropic";
  const headers = isAnthropic
    ? { "content-type": "application/json", "x-api-key": PROVIDER.key, "anthropic-version": "2023-06-01" }
    : { "content-type": "application/json", authorization: "Bearer " + PROVIDER.key };
  const body = isAnthropic
    ? { model: PROVIDER.model, max_tokens: 800, messages: [{ role: "user", content: prompt }] }
    : {
        model: PROVIDER.model,
        max_tokens: 800,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      };

  let apiRes;
  try {
    apiRes = await fetch(PROVIDER.url, { method: "POST", headers, body: JSON.stringify(body) });
    // строгий json-режим иногда упирается в лимит токенов и отдаёт 400 —
    // тогда просим то же самое обычным текстом и достаём JSON регуляркой
    if (!apiRes.ok && body.response_format) {
      const retry = { ...body };
      delete retry.response_format;
      apiRes = await fetch(PROVIDER.url, { method: "POST", headers, body: JSON.stringify(retry) });
    }
  } catch (e) {
    console.error(PROVIDER.name + " недоступен:", e.message);
    return res.status(502).json({ error: "проверка временно недоступна" });
  }
  if (!apiRes.ok) {
    console.error(PROVIDER.name + " вернул ошибку:", apiRes.status, await apiRes.text());
    return res.status(502).json({ error: "проверка временно недоступна" });
  }
  const data = await apiRes.json();
  const text = isAnthropic ? data?.content?.[0]?.text || "" : data?.choices?.[0]?.message?.content || "";
  const parsed = extractJson(text);
  if (!parsed || typeof parsed.correct !== "boolean" || typeof parsed.feedback !== "string") {
    console.error("Не удалось разобрать ответ модели:", text);
    return res.status(502).json({ error: "не удалось разобрать ответ проверки" });
  }
  res.json({ correct: parsed.correct, feedback: parsed.feedback });
});

app.listen(PORT, () => {
  console.log("Grader server слушает порт " + PORT + ", проверяет через " + PROVIDER.name + " (" + PROVIDER.model + ")");
  console.log(
    "Разрешённые origin: " +
      (ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS.join(", ") : "любой (ALLOWED_ORIGINS не задан)"),
  );
});
