import type { Life } from "./life";
import type { LessonState } from "./lesson-run";

export interface Progress {
  xp: number;
  done: Record<string, boolean>;
  cur: string | null;
  hints: Record<string, number>;
  /** момент последнего изменения, мс эпохи — нужен для конфликт-безопасного слияния устройств */
  updatedAt?: number;
  /** капстоун (финальное задание на реальном сервере) отмечен пройденным */
  capstone?: boolean;
  /** полученные офферы карьерного слоя: id вакансии -> true */
  jobs?: Record<string, boolean>;
  /** состояние экономического слоя («жизнь»): кошелёк, потребности, покупки */
  life?: Life;
  /** прогресс прежней версии игры уже перенесён (или предложение было отклонено) */
  legacyImported?: boolean;
  /** строгий режим: задачи не подсказывают ответ, пока сам не попросишь */
  strict?: boolean;
  /** здоровье дошло до нуля — нужно пройти экзамен на выживание, прежде чем продолжить */
  deathPending?: boolean;
  /** сколько раз персонаж «падал» (для статистики/флейвора) */
  deaths?: number;
  /** сколько попыток экзамена на выживание уже потрачено в текущей смерти */
  examAttempts?: number;
  /** снимок незаконченного текущего урока — чтобы перезагрузка/синхронизация не откатывали его к шагу 1 */
  lessonState?: LessonState;
}

const KEY = "devops_terminal_rpg_v1";

export const RANKS: [number, string][] = [
  [0, "Стажёр"],
  [120, "Junior"],
  [350, "Junior+"],
  [650, "Middle−"],
  [1000, "Middle"],
  [1380, "Крепкий Middle"],
];

export const rankOf = (xp: number): string => {
  let r = RANKS[0][1];
  for (const q of RANKS) if (xp >= q[0]) r = q[1];
  return r;
};
export const nextRank = (xp: number) => RANKS.find((q) => xp < q[0]);

export function loadProgress(): Progress {
  const empty: Progress = { xp: 0, done: {}, cur: null, hints: {} };
  try {
    return Object.assign(empty, JSON.parse(localStorage.getItem(KEY) || "{}"));
  } catch {
    return empty;
  }
}
export function saveProgress(p: Progress): void {
  p.updatedAt = Date.now();
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* приватный режим — просто не сохраняем */
  }
}
/** Сколько попыток даётся на экзамен после смерти. */
export const EXAM_ATTEMPTS = 3;

/**
 * Цена проваленного экзамена растёт с каждой смертью:
 *   1-я — откат на предыдущий урок,
 *   2-я — в начало предыдущего акта,
 *   3-я и дальше — курс с нуля.
 *
 * Снятые уроки перестают быть пройденными, и их XP вычитается — иначе их можно
 * было бы сдать повторно и накрутить опыт. Функция чистая: возвращает новый
 * прогресс и короткое объяснение для игрока.
 */
export function applyDeathPenalty(
  p: Progress,
  lessons: { id: string; act: number; xp: number }[],
  deaths: number,
): { progress: Progress; message: string } {
  if (deaths >= 3 || !lessons.length) {
    return {
      progress: { xp: 0, done: {}, cur: null, hints: {}, deaths, life: p.life },
      message: "Третья смерть и проваленный экзамен — курс начинается с нуля.",
    };
  }

  const curIx = Math.max(
    0,
    lessons.findIndex((l) => l.id === p.cur),
  );
  const from =
    deaths >= 2
      ? // начало предыдущего акта
        lessons.findIndex((l) => l.act === Math.max(1, lessons[curIx].act - 1))
      : Math.max(0, curIx - 1);

  const done = { ...p.done };
  let lost = 0;
  for (let i = Math.max(0, from); i < lessons.length; i++) {
    if (done[lessons[i].id]) {
      delete done[lessons[i].id];
      lost += lessons[i].xp;
    }
  }
  const target = lessons[Math.max(0, from)];
  return {
    progress: {
      ...p,
      done,
      xp: Math.max(0, p.xp - lost),
      cur: target.id,
      capstone: false,
      lessonState: undefined,
      deaths,
      examAttempts: 0,
      deathPending: false,
    },
    message:
      deaths >= 2
        ? `Вторая смерть и проваленный экзамен — возвращаемся в начало акта ${target.act}.`
        : `Экзамен провален — возвращаемся к уроку ${target.id}.`,
  };
}

export function clearProgress(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
