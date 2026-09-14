/**
 * Проверка смысла свободного ответа — локально, мгновенно, без платного API.
 *
 * Главное отличие от подсчёта совпавших слов: у вопроса есть не только
 * правильный вариант, но и НЕправильные. Если ответ игрока ближе к неверному
 * варианту, чем к верному, мы знаем не просто «не угадал», а какое именно
 * заблуждение у человека в голове — и разбираем именно его.
 *
 * Что делает разбор осмысленным, а не пословным:
 *   - стемминг под русский, чтобы «процессы» и «процессу» были одним словом;
 *   - словарь синонимов предметной области: «папка», «каталог», «директория» —
 *     одно понятие, поэтому пересказ своими словами засчитывается;
 *   - вес по редкости: слово, встречающееся во всех вариантах, ничего не
 *     различает и почти не влияет, а редкое и точное — решает;
 *   - отрицания: «опасно» и «не опасно» перестают быть одним и тем же.
 *
 * Длина ответа не ограничивается: одно точное слово — полноценный ответ.
 */

export interface GradeResult {
  correct: boolean;
  feedback: string;
}

export interface GradeInput {
  question: string;
  /** все варианты ответа, включая неверные — по ним узнаём заблуждение игрока */
  options: string[];
  /** индекс верного варианта в options */
  answerIx: number;
  /** пояснение к верному варианту: пересказ той же мысли другими словами */
  explain: string;
  userAnswer: string;
}

/* -------------------------------------------------------------------------
   Язык: нормализация, стемминг, синонимы
   ------------------------------------------------------------------------- */

const STOPWORDS = new Set(
  (
    "и в во что он на я с со как а то все она так его но да ты к у же вы за бы по только ее мне было вот от меня " +
    "еще о из ему теперь когда даже ну вдруг ли если уже или быть был него до вас нибудь опять уж вам ведь " +
    "там потом себя ничего ей может они тут где есть надо ней для мы тебя их чем была сам чтоб будто чего раз тоже " +
    "себе под будет тогда кто этот того потому этого какой совсем ним здесь этом один почти мой тем чтобы нее сейчас " +
    "были куда зачем всех можно при наконец два об другой хоть после над больше тот через эти нас про всего " +
    "них какая много разве три эту моя хорошо свою этой перед иногда лучше чуть том такой им более всегда конечно всю " +
    "между это эта оно также просто именно свои свой своего который которая которые нужно будут"
  ).split(" "),
);

/** Слова, переворачивающие смысл следующего за ними понятия. */
const NEGATORS = new Set(["не", "нет", "нельзя", "никогда", "без", "невозможно", "незачем", "ни"]);

/**
 * Синонимы предметной области: разные слова про одно понятие сводим к одному
 * ключу, чтобы пересказ своими словами засчитывался наравне с формулировкой из
 * учебника. Канонический ключ — первый член группы.
 */
const SYNONYM_GROUPS: string[][] = [
  ["пользователь", "юзер", "user", "аккаунт", "учетка"],
  ["папка", "каталог", "директория", "директорий"],
  ["удалить", "удаление", "стереть", "убрать", "снести", "сносить", "грохнуть", "rm"],
  ["создать", "создание", "завести", "новый"],
  ["скопировать", "копия", "копирование", "cp"],
  ["переместить", "перенести", "перемещение", "mv", "переименовать"],
  ["права", "доступ", "разрешение", "chmod", "режим"],
  ["владелец", "хозяин", "собственник", "chown"],
  ["процесс", "программа", "приложение", "демон", "сервис", "служба"],
  ["запустить", "запуск", "стартовать", "старт", "поднять"],
  ["остановить", "завершить", "убить", "прибить", "kill", "прекратить"],
  ["память", "озу", "ram", "оперативка"],
  ["диск", "накопитель", "хранилище", "раздел"],
  ["сеть", "сетевой", "интернет"],
  ["лог", "логи", "журнал", "логирование"],
  ["ошибка", "сбой", "падение", "авария", "проблема", "баг", "инцидент"],
  ["найти", "поиск", "искать", "отфильтровать", "фильтр", "grep", "find"],
  ["вывод", "вывести", "напечатать", "показать", "отобразить", "печать", "echo"],
  ["переменная", "переменные", "env", "окружение", "окружения"],
  ["секрет", "пароль", "токен", "ключ"],
  ["git", "гит", "репозиторий", "репа", "коммит"],
  ["контейнер", "docker", "докер", "образ"],
  ["бэкап", "бекап", "резервный", "backup", "архив"],
  ["восстановить", "восстановление", "вернуть", "откатить", "откат"],
  ["сервер", "машина", "хост", "нода", "узел"],
  ["безопасно", "безопасность", "защита", "защитить", "надежно"],
  ["опасно", "риск", "рискованно", "угроза", "уязвимость"],
  ["утечь", "утечка", "слить", "раскрыть", "засветить"],
  ["перезапись", "перезаписать", "затереть", "потерять", "потеря", "испортить"],
  ["добавить", "дописать", "дополнить"],
  ["отдельно", "отдельный", "изолировать", "изоляция", "раздельно"],
  ["автоматически", "автоматом", "автоматизация"],
  ["проверить", "проверка", "убедиться", "контроль"],
  ["быстро", "быстрее", "скорость", "производительность"],
  ["место", "размер", "объем", "занимать"],
  ["корень", "корневой", "root"],
  ["домашний", "домашняя", "home"],
  ["путь", "адрес", "расположение"],
  ["строка", "строки", "текст", "содержимое"],
  ["команда", "команды", "утилита", "инструмент"],
  ["подряд", "цепочка", "последовательно", "очередь"],
  ["перенаправить", "перенаправление", "редирект", "поток"],
];

const VOWELS = "аеиоуыэюя";

/**
 * Стеммер под русский: снимает окончания существительных, прилагательных и
 * глаголов. Точность здесь важнее полноты — лучше оставить лишнюю букву, чем
 * склеить разные слова в одно понятие.
 */
function stem(original: string): string {
  let w = original;
  const cut = (ends: string[], minRest = 4): void => {
    const hit = ends.find((e) => w.length - e.length >= minRest && w.endsWith(e));
    if (hit) w = w.slice(0, -hit.length);
  };
  cut(["ившись", "ывшись", "вшись", "ивши", "ывши", "вши", "ующ", "ивш", "ывш", "ющ", "ущ", "ящ", "ащ"]);
  cut([
    "ается",
    "яется",
    "ялось",
    "илось",
    "алось",
    "ялся",
    "ился",
    "ается",
    "лось",
    "лся",
    "ают",
    "яют",
    "еют",
    "ает",
    "яет",
    "еет",
    "аем",
    "яем",
    "ет",
    "ились",
    "илась",
    "ется",
    "ются",
    "ейте",
    "уйте",
    "ила",
    "ыла",
    "ена",
    "ите",
    "или",
    "ыли",
    "ило",
    "ыло",
    "ено",
    "ены",
    "ует",
    "уют",
    "ить",
    "ыть",
    "ать",
    "ять",
    "ешь",
    "ишь",
    "ете",
    "йте",
    "ят",
    "ют",
    "ат",
    "ит",
    "ыт",
    "ен",
    "ил",
    "ыл",
    "ла",
    "на",
    "ть",
  ]);
  // окончания прилагательных снимаем только с длинной основы: иначе «системУ»
  // теряет «ему» и превращается в «сист», расходясь с «системы» → «систем»
  cut(["ого", "его", "ому", "ему"], 5);
  cut([
    "иями",
    "ями",
    "ами",
    "ыми",
    "ими",
    "ах",
    "ях",
    "ов",
    "ев",
    "ие",
    "ые",
    "ое",
    "ая",
    "яя",
    "ую",
    "юю",
    "ия",
    "ья",
    "ью",
    "ам",
    "ям",
    "ей",
    "ой",
    "ий",
    "ый",
    "ом",
    "ем",
    "ым",
    "им",
    "ы",
    "и",
    "а",
    "я",
    "о",
    "е",
    "у",
    "ю",
  ]);
  if (w.endsWith("ь")) w = w.slice(0, -1);
  if (w.length < 3 || ![...w].some((c) => VOWELS.includes(c))) return original;
  return w;
}

/**
 * Словарь синонимов индексируем и по слову, и по его корню: иначе «удалил»
 * (корень «удал») не нашёл бы группу, записанную как «удалить».
 * Канонический ключ группы — тоже корень, чтобы совпадали любые формы.
 */
const SYNONYM: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const group of SYNONYM_GROUPS) {
    const canon = stem(group[0]);
    for (const word of group) {
      m.set(word, canon);
      m.set(stem(word), canon);
    }
  }
  return m;
})();

/** Одно понятие из текста: корень слова и знак — утверждение или отрицание. */
interface Concept {
  key: string;
  negated: boolean;
  /** слово, как оно написано в тексте: разбор показывают человеку, а не корни */
  word: string;
}

function tokenize(text: string): string[] {
  return (
    text
      .toLowerCase()
      .replace(/ё/g, "е")
      .split(/[^a-zа-я0-9_.-]+/i)
      // ведущий дефис сохраняем: «-r» — это флаг команды и нередко вся суть
      // ответа, а не мусор; срезаем только точки по краям и хвостовые дефисы
      .map((t) => t.replace(/^\.+|[.-]+$/g, ""))
      .filter(Boolean)
  );
}

/** Стоп-слова сверяем по корню: иначе «которым» и «которого» проскакивают как понятия. */
const STOP_STEMS = new Set(
  [...STOPWORDS, "котор", "чьег", "чей", "кажд", "мочь", "являт", "значит"].map(stem),
);

/** Понятия текста: синонимы сведены к одному ключу, отрицания помечены. */
export function conceptsOf(text: string): Concept[] {
  const out: Concept[] = [];
  // отрицание действует только внутри своей части фразы: в «не опасно, файл
  // сохранится» второе утверждение положительное
  for (const clause of text.split(/[,;:!?\n]+|\.\s/)) {
    let negateFor = 0;
    for (const word of tokenize(clause)) {
      if (NEGATORS.has(word)) {
        // отрицание относится к ближайшему значимому слову: в «нет корзины — rm
        // стирает сразу» оно про корзину, а не про всё, что идёт следом
        negateFor = 1;
        continue;
      }
      const root = stem(word);
      // служебные слова окно отрицания не тратят: «не нужно удалять» — про удаление
      if (word.length < 2 || STOPWORDS.has(word) || STOP_STEMS.has(root)) continue;
      out.push({ key: SYNONYM.get(word) ?? SYNONYM.get(root) ?? root, negated: negateFor > 0, word });
      negateFor = 0;
    }
  }
  return out;
}

/* -------------------------------------------------------------------------
   Сравнение по смыслу
   ------------------------------------------------------------------------- */

/** Вес понятия: то, что есть во всех вариантах ответа, ничего не различает. */
function weights(docs: string[][]): Map<string, number> {
  const df = new Map<string, number>();
  for (const doc of docs) for (const key of new Set(doc)) df.set(key, (df.get(key) ?? 0) + 1);
  const w = new Map<string, number>();
  for (const [key, n] of df) w.set(key, Math.log(1 + docs.length / n));
  return w;
}

interface Match {
  /** доля веса эталонных понятий, покрытая ответом */
  score: number;
  matched: string[];
  missing: string[];
  /** понятия, которые игрок утверждает в обратную сторону */
  contradicted: string[];
}

/** Понятие -> в каких знаках оно встречалось (утверждение и/или отрицание). */
function polarities(list: Concept[]): Map<string, Set<boolean>> {
  const m = new Map<string, Set<boolean>>();
  for (const c of list) {
    const set = m.get(c.key) ?? new Set<boolean>();
    set.add(c.negated);
    m.set(c.key, set);
  }
  return m;
}

/**
 * Стеммер неизбежно расходится на родственных словах: «отказ» и «откажется»,
 * «держит» и «удерживается». Считаем такие корни одним понятием, если один
 * входит в другой или они совпадают достаточно длинным началом.
 */
function akin(a: string, b: string): boolean {
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (short.length < 4) return false;
  if (long.includes(short)) return true;
  let i = 0;
  while (i < short.length && short[i] === long[i]) i++;
  return i >= 4;
}

function compare(reference: Concept[], answer: Concept[], w: Map<string, number>, fuzzy = true): Match {
  const stated = polarities(answer);
  const wanted = polarities(reference);

  let total = 0;
  let got = 0;
  const matched: string[] = [];
  const missing: string[] = [];
  const contradicted: string[] = [];

  for (const [key, signs] of wanted) {
    const weight = w.get(key) ?? 1;
    total += weight;
    const said = stated.get(key);
    // Точного корня нет — пробуем родственный: «удерживается» про «держит».
    // Засчитываем так только в пользу игрока; обвинять в заблуждении по
    // приблизительному совпадению нельзя, поэтому для неверных вариантов fuzzy выключен.
    const viaKin = said || !fuzzy ? null : [...stated.keys()].find((k) => akin(k, key));
    const heard = said ?? (viaKin ? stated.get(viaKin) : undefined);
    if (!heard) {
      missing.push(key);
    } else if ([...heard].some((s) => signs.has(s))) {
      // хотя бы в одном знаке совпало — этого довольно: в длинной фразе одно и
      // то же понятие законно встречается и с отрицанием, и без
      got += weight;
      matched.push(key);
    } else {
      // понятие названо строго в обратную сторону — хуже, чем промолчать о нём
      got -= weight * 0.5;
      contradicted.push(key);
    }
  }
  return { score: total > 0 ? Math.max(0, got / total) : 0, matched, missing, contradicted };
}

/* -------------------------------------------------------------------------
   Оценка и разбор
   ------------------------------------------------------------------------- */

/** Самые весомые понятия — их и называем игроку, чтобы разбор был коротким. */
const top = (keys: string[], w: Map<string, number>): string[] =>
  [...keys].sort((a, b) => (w.get(b) ?? 1) - (w.get(a) ?? 1)).slice(0, 3);

/**
 * Корень понятия -> слово, как оно написано в исходном тексте. Разбор читает
 * человек, поэтому в нём должно стоять «постмортем», а не обрубок «постморт».
 */
function surfaceForms(...lists: Concept[][]): Map<string, string> {
  const m = new Map<string, string>();
  for (const list of lists) {
    for (const c of list) {
      const known = m.get(c.key);
      // из нескольких форм выбираем самую длинную: она обычно и есть словарная
      if (!known || c.word.length > known.length) m.set(c.key, c.word);
    }
  }
  return m;
}

export function localGrade(input: GradeInput): GradeResult {
  const { options, answerIx, explain, userAnswer } = input;
  const expected = options[answerIx] ?? "";
  const answerConcepts = conceptsOf(userAnswer);

  if (answerConcepts.length === 0) {
    return {
      correct: false,
      feedback:
        (userAnswer.trim() ? "В ответе нет ни одного слова по теме, разбирать нечего. " : "Ответ пустой. ") +
        "Правильная мысль: " +
        expected,
    };
  }

  const explainConcepts = conceptsOf(explain);
  const w = weights([
    ...options.map((o) => conceptsOf(o).map((c) => c.key)),
    explainConcepts.map((c) => c.key),
  ]);

  // Обязателен только верный вариант. Пояснение пересказывает ту же мысль
  // другими словами — по нему ответ тоже засчитывается, но требовать пересказа
  // ещё и пояснения нельзя: так отвергались бы правильные короткие ответы.
  const required = conceptsOf(expected);
  const byExpected = compare(required, answerConcepts, w);
  const byExplain = compare(explainConcepts, answerConcepts, w);
  const best =
    byExplain.score > byExpected.score
      ? { ...byExplain, missing: byExpected.missing, matched: byExpected.matched.concat(byExplain.matched) }
      : byExpected;
  // Противоречия считаем только по верному варианту: пояснение — вспомогательный
  // текст, расхождение с его формулировкой ещё не означает ошибку в мысли.
  best.contradicted = byExpected.contradicted;

  // к какому из неверных вариантов ответ ближе всего — это и есть заблуждение
  let rivalIx = -1;
  let rivalScore = 0;
  for (let i = 0; i < options.length; i++) {
    if (i === answerIx) continue;
    const s = compare(conceptsOf(options[i]), answerConcepts, w, false).score;
    if (s > rivalScore) {
      rivalScore = s;
      rivalIx = i;
    }
  }

  // Главный признак правильности — не абсолютный процент совпадения (тогда
  // короткий точный ответ проигрывал бы многословному эталону), а то, что ответ
  // ближе к верному варианту, чем к любому из заблуждений.
  // в разборе показываем слова из эталона, а не внутренние корни
  const words = surfaceForms(required, explainConcepts);
  const say = (keys: string[]): string =>
    top(keys, w)
      .map((k) => words.get(k) ?? k)
      .join(", ");

  const size = new Set(required.map((c) => c.key)).size;
  const minCover = size <= 4 ? 0.35 : 0.3;
  // Короткое заблуждение легко набирает высокий процент на паре общих слов,
  // поэтому оно отменяет ответ, только если заметно ближе, а не при равенстве.
  const correct = best.score >= minCover && rivalScore <= best.score + 0.05 && best.contradicted.length === 0;

  if (correct) {
    const gap = say(best.missing);
    return {
      correct: true,
      feedback:
        "Верно по сути — главное ты назвал(а). " +
        (explain ? explain + " " : "") +
        (gap ? "Для полноты стоило упомянуть ещё: " + gap + "." : ""),
    };
  }

  if (best.contradicted.length) {
    return {
      correct: false,
      feedback:
        "Ключевое место ты утверждаешь наоборот — «" +
        say(best.contradicted) +
        "». Как на самом деле: " +
        expected +
        (explain ? " " + explain : ""),
    };
  }

  if (rivalIx >= 0 && rivalScore > best.score) {
    return {
      correct: false,
      feedback:
        "Ты описал(а) вот этот вариант: «" +
        options[rivalIx] +
        "» — это распространённое заблуждение в этом вопросе. Правильно так: " +
        expected +
        (explain ? " " + explain : ""),
    };
  }

  const gap = say(best.missing);
  return {
    correct: false,
    feedback:
      (best.matched.length ? "Начало верное (" + say(best.matched) + "), но " : "Ответ не про то: ") +
      (gap ? "не хватает главного — " + gap + ". " : "сути вопроса он не касается. ") +
      "Правильная мысль: " +
      expected +
      (explain ? " " + explain : ""),
  };
}

/** Точка входа для UI. Асинхронная ради совместимости с экранами уроков и собеседований. */
/** Адрес проверки на сервере: там настоящая модель, а не подсчёт слов. */
const GRADER_URL = "https://72.56.16.8.nip.io/grader/grade";

/** Сколько ждём сервер, прежде чем проверить локально: игрок не должен смотреть в пустоту. */
const GRADER_TIMEOUT_MS = 12_000;

async function remoteGrade(input: GradeInput): Promise<GradeResult | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), GRADER_TIMEOUT_MS);
  try {
    const res = await fetch(GRADER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        question: input.question,
        expected: input.options[input.answerIx] ?? "",
        explain: input.explain,
        userAnswer: input.userAnswer,
        options: input.options,
        answerIx: input.answerIx,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<GradeResult>;
    if (typeof data.correct !== "boolean" || typeof data.feedback !== "string") return null;
    return { correct: data.correct, feedback: data.feedback };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Точка входа для UI. Сначала спрашиваем модель на сервере — она понимает смысл,
 * а не слова. Если сервер недоступен, работает локальный разбор: игру нельзя
 * останавливать из-за сети, но и врать про «неверно» из-за неё тоже нельзя.
 */
export async function gradeAnswer(input: GradeInput): Promise<GradeResult> {
  if (!input.userAnswer.trim()) return localGrade(input);
  return (await remoteGrade(input)) ?? localGrade(input);
}
