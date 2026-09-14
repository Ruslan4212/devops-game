/* =====================================================================
   Ops Academy Grader Server — проверка смысла свободных ответов
   =====================================================================
   Игрок печатает ответ своими словами на вопрос урока/собеседования.
   Раньше игра просто показывала правильный вариант и просила игрока
   самого честно решить, совпало ли — это легко обмануть (случайно
   или нет) и это не даёт наставнических комментариев.

   Этот сервер — тонкий прокси к Claude API: получает вопрос, ориентир
   правильного ответа и то, что реально написал игрок, просит модель
   оценить ответ ПО СМЫСЛУ (не требуя дословного совпадения) и вернуть
   короткий комментарий в тоне опытного наставника.

   Модель доверия:
   - Origin запроса сверяется с ALLOWED_ORIGINS — чтобы чужой сайт не
     мог тратить наш платный API-ключ Anthropic за наш счёт.
   - API-ключ Anthropic только на сервере, в браузер никогда не попадает.
   - Грубый rate-limit по IP — защита от случайного/злонамеренного шквала
     запросов, каждый из которых стоит денег.
   ===================================================================== */
"use strict";

require("dotenv").config();
const express = require("express");

const PORT = Number(process.env.PORT || 8089);
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (!ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY не задан в .env — сервер не сможет проверять ответы.");
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

  const { question, expected, explain, userAnswer } = req.body || {};
  if (typeof question !== "string" || typeof expected !== "string" || typeof userAnswer !== "string") {
    return res.status(400).json({ error: "нужны поля question, expected, userAnswer (строки)" });
  }
  // защита от чрезмерно длинного ввода — это учебный вопрос, а не эссе
  if (userAnswer.length > 2000 || question.length > 2000) {
    return res.status(400).json({ error: "слишком длинный текст" });
  }

  const prompt =
    "Ты опытный DevOps-наставник, принимающий устный ответ ученика на тренажёре.\n\n" +
    "Вопрос: " +
    question +
    "\n\n" +
    "Правильный ориентир по смыслу (не зачитывай ученику дословно): " +
    expected +
    "\n\n" +
    (explain ? "Дополнительный контекст для тебя: " + explain + "\n\n" : "") +
    "Ответ ученика (его собственными словами): " +
    userAnswer +
    "\n\n" +
    "Оцени ответ ПО СМЫСЛУ, а не по дословному совпадению — синонимы, свои формулировки, " +
    "неполные, но по сути верные ответы принимай как верные. Если ответ пустой, не по теме " +
    "или содержит грубую фактическую ошибку — это неверно.\n\n" +
    "Ответь СТРОГО в виде JSON без markdown и пояснений вокруг, ровно такой структуры:\n" +
    '{"correct": true или false, "feedback": "1-3 предложения на русском в тоне опытного ' +
    "наставника — если верно, коротко подтверди и при уместности добавь важную деталь; " +
    'если неверно или неполно, мягко укажи, чего не хватает, и сформулируй верную мысль своими словами"}';

  let anthropicRes;
  try {
    anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch (e) {
    console.error("Anthropic API недоступен:", e.message);
    return res.status(502).json({ error: "проверка временно недоступна" });
  }

  if (!anthropicRes.ok) {
    console.error("Anthropic API вернул ошибку:", anthropicRes.status, await anthropicRes.text());
    return res.status(502).json({ error: "проверка временно недоступна" });
  }

  const data = await anthropicRes.json();
  const text = data?.content?.[0]?.text || "";
  const parsed = extractJson(text);
  if (!parsed || typeof parsed.correct !== "boolean" || typeof parsed.feedback !== "string") {
    console.error("Не удалось разобрать ответ модели:", text);
    return res.status(502).json({ error: "не удалось разобрать ответ проверки" });
  }

  res.json({ correct: parsed.correct, feedback: parsed.feedback });
});

app.listen(PORT, () => {
  console.log("Grader server слушает порт " + PORT);
  console.log(
    "Разрешённые origin: " +
      (ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS.join(", ") : "любой (ALLOWED_ORIGINS не задан)"),
  );
});
