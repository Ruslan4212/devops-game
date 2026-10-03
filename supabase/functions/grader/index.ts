/* =====================================================================
   Grader — проверка ответов игрока через Claude (Supabase Edge Function)
   =====================================================================
   Три адреса, те же, что были у прежнего grader-server на VPS:
     POST /grader/grade    — свободный ответ на вопрос: верно ли по смыслу
     POST /grader/command  — практическое задание: решает ли команда задачу
     POST /grader/explain  — «объясни подробнее» с разными примерами

   Ключ Anthropic живёт только в секретах Supabase (ANTHROPIC_API_KEY) и в
   браузер не попадает. Страница игры статическая, поэтому вызвать функцию
   может кто угодно — защита: белый список Origin, лимит запросов с одного
   адреса, ограничение длины текста. Потолок расходов ставится в консоли
   Anthropic (Settings → Limits) — это последняя и надёжная линия.
   ===================================================================== */

import Anthropic from "npm:@anthropic-ai/sdk";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk/helpers/zod";
import { z } from "npm:zod";

const MODEL = "claude-opus-5-5";

const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });

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
  claim: z.string().describe("Что утверждает ученик, одной фразой"),
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

/**
 * Один вызов Claude со структурированным ответом. Проверка ответа — это
 * классификация с коротким разбором, поэтому effort low: быстро и дёшево,
 * а качества для такой задачи хватает. null — модель отказала или ответ не
 * разобрался: игра тогда честно откатится на свой локальный разбор.
 */
async function ask<T extends z.ZodTypeAny>(
  prompt: string,
  schema: T,
  effort: "low" | "medium",
): Promise<z.infer<T> | null> {
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 8000,
    output_config: { effort, format: zodOutputFormat(schema) },
    messages: [{ role: "user", content: prompt }],
  });
  if (response.stop_reason === "refusal") return null;
  return response.parsed_output ?? null;
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
      if (!v) return json({ error: "проверка не дала вердикта" }, 502, origin);
      return json({ correct: v.correct, feedback: v.feedback }, 200, origin);
    }
    if (route === "command") {
      const prompt = commandPrompt(body);
      if (!prompt) return json({ error: "нужны поля task и command" }, 400, origin);
      const v = await ask(prompt, CommandVerdict, "low");
      if (!v) return json({ error: "проверка не дала вердикта" }, 502, origin);
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
    else console.error("grader", e);
    return json({ error: "проверка временно недоступна" }, 502, origin);
  }
});
