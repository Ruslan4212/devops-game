/**
 * Проверка смысла свободного ответа через прокси к Claude API (grader-server/,
 * разворачивается отдельно на своём сервере — см. grader-server/README.md).
 * Ключ Anthropic никогда не попадает в браузер — только сюда, на публичный
 * адрес прокси.
 */

// Развёрнут на VPS (grader-server/), проксируется через Caddy по пути /grader/
// на том же домене, что и sandbox-server.
export const GRADER_URL = "https://72.56.16.8.nip.io/grader/grade";

export interface GradeResult {
  correct: boolean;
  feedback: string;
}

/** true, пока GRADER_URL не заменили на реальный адрес — тогда сразу используем fallback. */
export function graderConfigured(): boolean {
  return !GRADER_URL.includes("REPLACE-WITH-YOUR-GRADER-URL");
}

/**
 * Просит наставника (ИИ) оценить ответ игрока по смыслу.
 * Бросает исключение при любой сетевой/серверной проблеме — вызывающий код
 * обязан подстраховаться откатом на самооценку, чтобы сервер вне сети
 * никогда не блокировал прохождение игры.
 */
export async function gradeAnswer(
  question: string,
  expected: string,
  explain: string,
  userAnswer: string,
): Promise<GradeResult> {
  if (!graderConfigured()) throw new Error("grader не настроен");
  const res = await fetch(GRADER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, expected, explain, userAnswer }),
  });
  if (!res.ok) throw new Error("grader вернул ошибку " + res.status);
  const data = (await res.json()) as Partial<GradeResult>;
  if (typeof data.correct !== "boolean" || typeof data.feedback !== "string")
    throw new Error("grader вернул неожиданный ответ");
  return { correct: data.correct, feedback: data.feedback };
}
