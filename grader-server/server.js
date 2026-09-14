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
    "Ты опытный, доброжелательный DevOps-наставник. Ученик отвечает вслух своими словами, " +
    "как на собеседовании.\n\n" +
    "ВОПРОС: " + question + "\n\n" +
    "ВЕРНАЯ МЫСЛЬ (ориентир для тебя, не требуй дословного совпадения): " + expected + "\n\n" +
    (explain ? "ПОЯСНЕНИЕ: " + explain + "\n\n" : "") +
    (wrong.length ? "ТИПИЧНЫЕ ЗАБЛУЖДЕНИЯ: " + wrong.join(" | ") + "\n\n" : "") +
    "ОТВЕТ УЧЕНИКА: " + userAnswer + "\n\n" +
    "Как оценивать:\n" +
    "- Суди ТОЛЬКО по смыслу. Синонимы, свои формулировки, разговорный язык, опечатки, " +
    "отсутствие терминов из учебника — не ошибка. «Удерживается процессом» и «держит " +
    "открытым живой процесс» — одно и то же. «На 4 ядра претендуют 8 процессов» — верно.\n" +
    "- Короткий ответ, если он по сути верный, — полноценно верный. Длина не важна.\n" +
    "- Не требуй перечисления всех деталей ориентира: достаточно главной мысли.\n" +
    "- Неверно — только если ответ пустой, не по теме, противоречит сути или содержит " +
    "фактическую ошибку.\n" +
    "- Если ученик пересказал одно из заблуждений — скажи прямо, в чём именно он ошибается.\n\n" +
    "Верни СТРОГО JSON без markdown:\n" +
    '{"correct": true|false, "feedback": "1-3 предложения по-русски. Если верно — подтверди ' +
    "и добавь одну полезную деталь. Если нет — объясни именно его ошибку и дай верную мысль " +
    'своими словами. Обращайся на ты, без канцелярита."}';

  const isAnthropic = PROVIDER.name === "anthropic";
  const headers = isAnthropic
    ? { "content-type": "application/json", "x-api-key": PROVIDER.key, "anthropic-version": "2023-06-01" }
    : { "content-type": "application/json", authorization: "Bearer " + PROVIDER.key };
  const body = isAnthropic
    ? { model: PROVIDER.model, max_tokens: 300, messages: [{ role: "user", content: prompt }] }
    : {
        model: PROVIDER.model,
        max_tokens: 300,
        temperature: 0.2,
        messages: [{ role: "user", content: prompt }],
      };

  let apiRes;
  try {
    apiRes = await fetch(PROVIDER.url, { method: "POST", headers, body: JSON.stringify(body) });
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
