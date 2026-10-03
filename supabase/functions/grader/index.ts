/* =====================================================================
   Grader — проверка ответов игрока через ИИ (Supabase Edge Function)
   =====================================================================
   Три адреса, те же, что были у прежнего grader-server на VPS:
     POST /grader/grade    — свободный ответ на вопрос: верно ли по смыслу
     POST /grader/command  — практическое задание: решает ли команда задачу
     POST /grader/explain  — «объясни подробнее» с разными примерами

   Ключ провайдера живёт только в секретах Supabase и в браузер не попадает. Страница игры статическая, поэтому вызвать функцию
   может кто угодно — защита: белый список Origin, лимит запросов с одного
   адреса, ограничение длины текста. Потолок расходов ставится в консоли
   Anthropic (Settings → Limits) — это последняя и надёжная линия.
   ===================================================================== */

import Anthropic from "npm:@anthropic-ai/sdk";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk/helpers/zod";
import { z } from "npm:zod";

/**
 * Провайдер выбирается по тому, какой секрет задан в Supabase. Первые два
 * бесплатные и без карты — для учебной игры их лимитов хватает с запасом;
 * Claude платный и даёт самые точные разборы.
 *   GROQ_API_KEY       console.groq.com/keys
 *   GEMINI_API_KEY     aistudio.google.com/apikey
 *   ANTHROPIC_API_KEY  console.anthropic.com
 */
const env = (n: string): string => (Deno.env.get(n) ?? "").trim();
type Provider =
  { name: "anthropic"; model: string } | { name: "groq" | "gemini"; model: string; url: string; key: string };

function pickProvider(): Provider | null {
  if (env("GROQ_API_KEY"))
    return {
      name: "groq",
      url: "https://api.groq.com/openai/v1/chat/completions",
      key: env("GROQ_API_KEY"),
      model: env("GROQ_MODEL") || "llama-3.3-70b-versatile",
    };
  if (env("GEMINI_API_KEY"))
    return {
      name: "gemini",
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      key: env("GEMINI_API_KEY"),
      model: env("GEMINI_MODEL") || "gemini-2.5-flash",
    };
  if (env("ANTHROPIC_API_KEY"))
    return { name: "anthropic", model: env("ANTHROPIC_MODEL") || "claude-opus-5-5" };
  return null;
}
const PROVIDER = pickProvider();

/** Модели по убыванию пригодности: русский язык и следование инструкции. */
const PREFERRED: Record<string, string[]> = {
  groq: ["llama-3.3-70b-versatile", "openai/gpt-oss-120b", "qwen/qwen3-32b", "openai/gpt-oss-20b"],
  gemini: ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"],
};

/**
 * Провайдеры переименовывают и снимают модели — захардкоженное имя однажды
 * отвечает 404, и проверка молча ломается. Один раз спрашиваем список
 * доступных и берём первую подходящую (если не задана явно через *_MODEL).
 */
let modelReady: Promise<void> | null = null;
function resolveModel(): Promise<void> {
  if (!PROVIDER || PROVIDER.name === "anthropic") return Promise.resolve();
  const p = PROVIDER;
  modelReady ??= (async () => {
    try {
      const res = await fetch(p.url.replace(/\/chat\/completions$/, "/models"), {
        headers: { authorization: "Bearer " + p.key },
      });
      if (!res.ok) return;
      const ids: string[] = ((await res.json())?.data ?? []).map((m: { id: string }) =>
        String(m.id).replace(/^models\//, ""),
      );
      if (!ids.length || ids.includes(p.model)) return;
      const better = (PREFERRED[p.name] ?? []).find((m) => ids.includes(m));
      p.model = better ?? ids.find((m) => !/whisper|guard|tts|embed|image|vision/i.test(m)) ?? p.model;
    } catch {
      /* оставляем модель по умолчанию */
    }
  })();
  return modelReady;
}
const anthropic = PROVIDER?.name === "anthropic" ? new Anthropic({ apiKey: env("ANTHROPIC_API_KEY") }) : null;

/** Откуда можно звать функцию: живая игра и локальная разработка. */
const ALLOWED_ORIGINS = (
  Deno.env.get("ALLOWED_ORIGINS") ??
  "https://ruslan4212.github.io,http://localhost:5199,http://localhost:5173"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/* ------------------------------ rate limit ------------------------------ */
// Память одного экземпляра функции — грубая защита от шквала, не учёт.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_PER_IP = 20;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > RATE_MAX_PER_IP;
}

/* -------------------------------- ответы -------------------------------- */
function corsHeaders(origin: string | null): Record<string, string> {
  const h: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
    Vary: "Origin",
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) h["Access-Control-Allow-Origin"] = origin;
  return h;
}

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...corsHeaders(origin) },
  });
}

/* ------------------------------- вердикты ------------------------------- */
const Verdict = z.object({
  claim: z.string().optional().describe("Что утверждает ученик, одной фразой"),
  correct: z.boolean(),
  feedback: z.string().describe("1-3 предложения по-русски, на ты"),
});
const CommandVerdict = z.object({
  correct: z.boolean(),
  feedback: z.string().describe("1-2 предложения по-русски, на ты"),
});
const Explanation = z.object({
  explanation: z.string().describe("Подробное объяснение с примерами, по-русски, чистый текст"),
});

/** Первый JSON-объект из текста — модель может обернуть ответ словами или markdown. */
function extractJson(text: string): unknown {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

/**
 * Один вызов модели со структурированным ответом. Проверка ответа — короткая
 * классификация с разбором, поэтому Claude идёт с effort low (быстро и
 * дёшево). null — провайдер отказал или ответ не разобрался: игра тогда
 * честно откатится на свой локальный разбор.
 */
/** Последний неразобранный ответ модели — уходит в поле detail, чтобы причину сбоя было видно. */
let lastRaw = "";

async function ask<T extends z.ZodTypeAny>(
  prompt: string,
  schema: T,
  effort: "low" | "medium",
): Promise<z.infer<T> | null> {
  if (!PROVIDER) throw new Error("не задан ни один ключ: GROQ_API_KEY, GEMINI_API_KEY или ANTHROPIC_API_KEY");
  if (PROVIDER.name === "anthropic" && anthropic) {
    const response = await anthropic.messages.parse({
      model: PROVIDER.model,
      max_tokens: 8000,
      output_config: { effort, format: zodOutputFormat(schema) },
      messages: [{ role: "user", content: prompt }],
    });
    if (response.stop_reason === "refusal") return null;
    return response.parsed_output ?? null;
  }
  await resolveModel();
  const p = PROVIDER as Exclude<Provider, { name: "anthropic" }>;
  // схема — в тексте промпта: json-режим бесплатных провайдеров гарантирует
  // лишь «валидный JSON», а какие в нём поля — решает инструкция
  const shape = JSON.stringify(
    Object.fromEntries(
      Object.keys((schema as unknown as z.ZodObject<z.ZodRawShape>).shape).map((k) => [k, "…"]),
    ),
  );
  const call = async (): Promise<z.infer<T> | null> => {
    const res = await fetch(p.url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + p.key },
      body: JSON.stringify({
        model: p.model,
        max_tokens: 1500,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: `${prompt}

Верни СТРОГО один JSON-объект с полями ${shape}, без markdown.`,
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`${p.name} ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    const parsed = schema.safeParse(extractJson(data?.choices?.[0]?.message?.content ?? ""));
    if (!parsed.success) {
      lastRaw = String(data?.choices?.[0]?.message?.content ?? "").slice(0, 600);
      console.error("не тот формат ответа модели:", lastRaw);
    }
    return parsed.success ? parsed.data : null;
  };
  // модель иногда отвечает не тем форматом — второй заход обычно проходит
  return (await call()) ?? (await call());
}

function gradePrompt(b: Record<string, unknown>): string | null {
  const { question, expected, explain, userAnswer, options, answerIx } = b;
  if (typeof question !== "string" || typeof expected !== "string" || typeof userAnswer !== "string")
    return null;
  if (userAnswer.length > 2000 || question.length > 2000) return null;
  // неверные варианты — материал для разбора: если ученик пересказал один из
  // них, это конкретное заблуждение, и назвать его полезнее, чем «не совсем»
  const wrong = Array.isArray(options)
    ? options.filter((o, i) => typeof o === "string" && i !== answerIx).map((o) => String(o).slice(0, 300))
    : [];
  return (
    "Ты строгий, но справедливый экзаменатор по DevOps. Твоя задача — проверить, " +
    "СОВПАДАЕТ ЛИ ПО СМЫСЛУ ответ ученика с верной мыслью. Ты не пересказываешь верный " +
    "ответ и не хвалишь за старание — ты выносишь вердикт.\n\n" +
    "ОТВЕТ УЧЕНИКА (именно его надо оценить): " +
    userAnswer +
    "\n\n" +
    "ВОПРОС: " +
    question +
    "\n\n" +
    "ВЕРНАЯ МЫСЛЬ: " +
    expected +
    "\n\n" +
    (typeof explain === "string" && explain ? "ПОЯСНЕНИЕ: " + explain.slice(0, 1500) + "\n\n" : "") +
    (wrong.length ? "ЗАВЕДОМО НЕВЕРНЫЕ ВАРИАНТЫ: " + wrong.join(" | ") + "\n\n" : "") +
    "Порядок работы: сформулируй, что именно УТВЕРЖДАЕТ ученик (поле claim), сравни это " +
    "с верной мыслью и вынеси вердикт.\n\n" +
    "Верно (correct=true), если ученик выразил ту же мысль — любыми словами, кратко, " +
    "с опечатками, без терминов из учебника. «Удерживается процессом» = «держит открытым " +
    "живой процесс». «На 4 ядра претендуют 8 процессов» = верно. Достаточно главной мысли, " +
    "перечислять все детали не нужно.\n\n" +
    "Неверно (correct=false), если утверждение ученика ПРОТИВОРЕЧИТ верной мысли, " +
    "совпадает с одним из заведомо неверных вариантов, не отвечает на вопрос, пустое или " +
    "содержит фактическую ошибку. Пример: если верно «ssh откажется работать с ключом», " +
    "то ответ «ничего, просто подключится медленнее» — НЕВЕРНО, даже если звучит уверенно.\n\n" +
    "feedback: если верно — подтверди и добавь одну полезную деталь; если неверно — назови " +
    "именно его ошибку и дай верную мысль. Пиши по-русски, на ты, без markdown."
  );
}

function commandPrompt(b: Record<string, unknown>): string | null {
  const { task, expected, command, output, lesson } = b;
  if (typeof task !== "string" || typeof command !== "string") return null;
  if (command.length > 1000 || task.length > 2000) return null;
  return (
    "Ты преподаватель Linux и DevOps, проверяешь практическое задание в тренажёре-терминале.\n\n" +
    (typeof lesson === "string" && lesson ? "УРОК: " + lesson.slice(0, 200) + "\n" : "") +
    "ЗАДАНИЕ: " +
    task +
    "\n\n" +
    (typeof expected === "string" && expected
      ? "ЭТАЛОННОЕ РЕШЕНИЕ (один из вариантов, НЕ единственно верный): " + expected.slice(0, 1000) + "\n\n"
      : "") +
    "УЧЕНИК ВВЁЛ: " +
    command +
    "\n\n" +
    "ВЫВОД ТЕРМИНАЛА:\n" +
    String(output || "(пусто)").slice(0, 1500) +
    "\n\n" +
    "Главное правило: засчитывай ЛЮБОЕ решение, которое выполняет задание, даже если оно " +
    "не совпадает с эталонным. Другие флаги, другой порядок, другая утилита с тем же " +
    "результатом, более точный или более подробный вариант — всё это верно. Например, " +
    "если эталон «ss -ltn», то «ss -tlpn», «ss -tulpn | grep :80» и «netstat -ltnp» тоже " +
    "верны, а «ss -tlpn sport :80» даже точнее.\n\n" +
    "Не засчитывай, если: команда не выполняет задание, завершилась ошибкой и цель не " +
    "достигнута, решает другую задачу или это случайный ввод.\n\n" +
    "Если в выводе видно, что команды нет в тренажёре, — это ограничение тренажёра, а не " +
    "ошибка ученика: скажи об этом прямо и предложи доступную альтернативу.\n\n" +
    "feedback: если верно — подтверди и, если решение отличается от эталонного, отметь, чем " +
    "оно хорошо или в чём разница. Если нет — объясни, что именно не так, и подскажи " +
    "направление, не выдавая ответ целиком. По-русски, на ты, без markdown."
  );
}

function explainPrompt(b: Record<string, unknown>): string | null {
  const { lesson, topic, context } = b;
  if (typeof topic !== "string" || !topic.trim()) return null;
  if (topic.length > 1500 || String(context ?? "").length > 1500) return null;
  return (
    "Ты опытный DevOps-наставник. Ученик проходит урок и открыл шаг ниже, но " +
    "штатного объяснения ему не хватило — он попросил рассказать подробнее.\n\n" +
    (typeof lesson === "string" && lesson ? "УРОК: " + lesson.slice(0, 200) + "\n\n" : "") +
    "ТЕМА ШАГА: " +
    topic +
    "\n\n" +
    (typeof context === "string" && context
      ? "УЖЕ БЫЛО ПОКАЗАНО В УРОКЕ (не повторяй это дословно, иди глубже): " + context + "\n\n"
      : "") +
    "Требования к ответу:\n" +
    "1. Объясни суть темы своими словами — понятнее и подробнее, чем то, что уже показано.\n" +
    "2. Приведи минимум 3 РАЗНЫХ практических примера: не вариации одного и того же " +
    "случая, а разные ситуации, где это применяется на практике.\n" +
    "3. Если у темы есть типичная ошибка новичка, коротко её назови.\n" +
    "4. Пиши простым языком, без канцелярита, на ты.\n" +
    "5. Чистый текст без markdown-разметки: абзацы и примеры разделяй пустой строкой."
  );
}

/* --------------------------------- вход --------------------------------- */
Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "только POST" }, 405, origin);
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) return json({ error: "origin не разрешён" }, 403, origin);

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) return json({ error: "слишком много запросов, подожди немного" }, 429, origin);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "нужен JSON" }, 400, origin);
  }

  const route = new URL(req.url).pathname.split("/").pop();
  try {
    if (route === "grade") {
      const prompt = gradePrompt(body);
      if (!prompt) return json({ error: "нужны поля question, expected, userAnswer" }, 400, origin);
      const v = await ask(prompt, Verdict, "low");
      if (!v) return json({ error: "проверка не дала вердикта", detail: lastRaw }, 502, origin);
      return json({ correct: v.correct, feedback: v.feedback }, 200, origin);
    }
    if (route === "command") {
      const prompt = commandPrompt(body);
      if (!prompt) return json({ error: "нужны поля task и command" }, 400, origin);
      const v = await ask(prompt, CommandVerdict, "low");
      if (!v) return json({ error: "проверка не дала вердикта", detail: lastRaw }, 502, origin);
      return json({ correct: v.correct, feedback: v.feedback }, 200, origin);
    }
    if (route === "explain") {
      const prompt = explainPrompt(body);
      if (!prompt) return json({ error: "нужно поле topic" }, 400, origin);
      const v = await ask(prompt, Explanation, "medium");
      if (!v || !v.explanation.trim()) return json({ error: "объяснение не получилось" }, 502, origin);
      return json({ explanation: v.explanation }, 200, origin);
    }
    return json({ error: "неизвестный адрес" }, 404, origin);
  } catch (e) {
    // ошибки API (лимиты, перегрузка, неверный ключ) — в лог функции; игроку
    // достаточно знать, что вердикта нет: игра откатится на локальный разбор
    if (e instanceof Anthropic.APIError) console.error("Anthropic API", e.status, e.message);
    else console.error("grader", e instanceof Error ? e.message : e);
    return json({ error: "проверка временно недоступна" }, 502, origin);
  }
});
