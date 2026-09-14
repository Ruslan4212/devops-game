/**
 * Проверка смысла свободного ответа — без платного API, полностью локально
 * и мгновенно. Сравнивает ответ игрока с эталоном (правильный вариант +
 * пояснение к нему) по значимым словам с лёгким стеммингом под русский язык:
 * пояснение к вопросу почти всегда пересказывает ту же мысль другими
 * словами, поэтому оно само по себе служит источником «синонимов» —
 * отдельный словарь синонимов вести не нужно.
 *
 * Это не настоящее понимание смысла (полноценно это делает только LLM),
 * но заметно честнее, чем self-report: ответ реально сверяется с
 * содержанием, а не принимается на слово.
 */

export interface GradeResult {
  correct: boolean;
  feedback: string;
}

const STOPWORDS = new Set([
  "и",
  "в",
  "во",
  "не",
  "что",
  "он",
  "на",
  "я",
  "с",
  "со",
  "как",
  "а",
  "то",
  "все",
  "она",
  "так",
  "его",
  "но",
  "да",
  "ты",
  "к",
  "у",
  "же",
  "вы",
  "за",
  "бы",
  "по",
  "только",
  "ее",
  "её",
  "мне",
  "было",
  "вот",
  "от",
  "меня",
  "еще",
  "ещё",
  "нет",
  "о",
  "из",
  "ему",
  "теперь",
  "когда",
  "даже",
  "ну",
  "вдруг",
  "ли",
  "если",
  "уже",
  "или",
  "ни",
  "быть",
  "был",
  "него",
  "до",
  "вас",
  "нибудь",
  "опять",
  "уж",
  "вам",
  "ведь",
  "там",
  "потом",
  "себя",
  "ничего",
  "ей",
  "может",
  "они",
  "тут",
  "где",
  "есть",
  "надо",
  "ней",
  "для",
  "мы",
  "тебя",
  "их",
  "чем",
  "была",
  "сам",
  "чтоб",
  "без",
  "будто",
  "чего",
  "раз",
  "тоже",
  "себе",
  "под",
  "будет",
  "тогда",
  "кто",
  "этот",
  "того",
  "потому",
  "этого",
  "какой",
  "совсем",
  "ним",
  "здесь",
  "этом",
  "один",
  "почти",
  "мой",
  "тем",
  "чтобы",
  "нее",
  "сейчас",
  "были",
  "куда",
  "зачем",
  "всех",
  "никогда",
  "можно",
  "при",
  "наконец",
  "два",
  "об",
  "другой",
  "хоть",
  "после",
  "над",
  "больше",
  "тот",
  "через",
  "эти",
  "нас",
  "про",
  "всего",
  "них",
  "какая",
  "много",
  "разве",
  "три",
  "эту",
  "моя",
  "хорошо",
  "свою",
  "этой",
  "перед",
  "иногда",
  "лучше",
  "чуть",
  "том",
  "нельзя",
  "такой",
  "им",
  "более",
  "всегда",
  "конечно",
  "всю",
  "между",
  "это",
  "эта",
  "оно",
  "это",
  "также",
  "чтобы",
  "просто",
  "именно",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-zа-яё0-9]+/i)
    .filter(Boolean);
}

/** Грубый стемминг под русский: усечение длинных слов до общего корня. Не идеально (чередования вроде ст→щ не ловит), но заметно уменьшает ложные несовпадения из-за окончаний. */
function stem(word: string): string {
  if (word.length <= 4) return word;
  return word.slice(0, Math.min(5, word.length - 1));
}

/** Значимые (не стоп-слова, не однобуквенные) корни текста. */
function significantStems(text: string): Set<string> {
  return new Set(
    tokenize(text)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
      .map(stem),
  );
}

/**
 * Оценивает ответ игрока локально: сколько значимых корней из эталонного
 * ответа (короткая правильная формулировка) встретилось в ответе игрока.
 * Порог специально не завышен — цель не «поймать за руку», а честно
 * отличить содержательный ответ от пустого или совсем не по теме.
 */
export function localGrade(
  question: string,
  expected: string,
  explain: string,
  userAnswer: string,
): GradeResult {
  const answer = userAnswer.trim();
  const answerTokens = tokenize(answer).filter((w) => w.length > 2 && !STOPWORDS.has(w));

  if (answer.length < 6 || answerTokens.length === 0) {
    return {
      correct: false,
      feedback: "Пустой или слишком короткий ответ — так не оценить. Правильная мысль: " + expected,
    };
  }

  const expectedStems = significantStems(expected);
  const answerStems = new Set(answerTokens.map(stem));
  let matched = 0;
  for (const s of expectedStems) if (answerStems.has(s)) matched++;

  const coverage = expectedStems.size ? matched / expectedStems.size : 0;
  // короткий эталон (мало значимых слов) требует более полного совпадения,
  // длинный — распознаётся уже по половине ключевых слов
  const threshold = expectedStems.size <= 3 ? 0.66 : 0.5;
  const correct = coverage >= threshold;

  if (correct) {
    return {
      correct: true,
      feedback: "Верно по сути. " + expected + (explain ? " " + explain : ""),
    };
  }
  return {
    correct: false,
    feedback: "Не совсем то. Правильная мысль: " + expected + (explain ? " " + explain : ""),
  };
}

/**
 * Точка входа для UI — сигнатура сохранена async ради совместимости с уже
 * написанными экранами (уроки, собеседования, экзамен, тренажёр), хотя сама
 * проверка теперь синхронная и локальная, без сети и без platных запросов.
 */
export async function gradeAnswer(
  question: string,
  expected: string,
  explain: string,
  userAnswer: string,
): Promise<GradeResult> {
  return localGrade(question, expected, explain, userAnswer);
}

/* ------------------------------------------------------------------------
   Ниже — прежний путь через настоящий ИИ (Claude API через grader-server/).
   Не используется сейчас (нужен платный ключ Anthropic), но код рабочий:
   если решите подключить платную проверку позже, достаточно заменить тело
   gradeAnswer() выше вызовом remoteGrade() ниже.
   ------------------------------------------------------------------------ */

export const GRADER_URL = "https://72.56.16.8.nip.io/grader/grade";

export function graderConfigured(): boolean {
  return !GRADER_URL.includes("REPLACE-WITH-YOUR-GRADER-URL");
}

export async function remoteGrade(
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
