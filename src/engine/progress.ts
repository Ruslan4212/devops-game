import type { DrillState } from "./drill";
import type { Life } from "./life";
import type { LessonState } from "./lesson-run";
import type { ReviewMarathon, ReviewStats } from "./review";

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
  /** сколько раз персонаж «падал» (для статистики/флейвора) */
  deaths?: number;
  /** снимок незаконченного текущего урока — чтобы перезагрузка/синхронизация не откатывали его к шагу 1 */
  lessonState?: LessonState;
  /** сколько уроков пройдено с последнего обязательного повторения — триггер на REVIEW_EVERY */
  lessonsSinceReview?: number;
  /** курсор в хронологическом пуле вопросов повторения — чтобы следующая сессия продолжала, а не начинала сначала */
  reviewCursor?: number;
  /** история повторения по каждому вопросу: показан / ошибок / когда / коробка Лейтнера */
  reviewStats?: ReviewStats;
  /** незаконченный круг «повторить всё» */
  reviewMarathon?: ReviewMarathon;
  /** ежедневная практика команд: коробки по каждой команде и счётчик упражнений по дням */
  drill?: DrillState;
  /** цель на день — сколько упражнений в практике */
  drillGoal?: number;
}

/** Приводит сохранение любой давности к текущей схеме: старые сохранения без истории повторения получают пустую. */
export function migrateProgress(raw: Partial<Progress> | null | undefined): Progress {
  const p: Progress = Object.assign({ xp: 0, done: {}, cur: null, hints: {} }, raw ?? {});
  if (!p.reviewStats || typeof p.reviewStats !== "object") p.reviewStats = {};
  return p;
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
  try {
    return migrateProgress(JSON.parse(localStorage.getItem(KEY) || "{}") as Partial<Progress>);
  } catch {
    return migrateProgress(null);
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

export function clearProgress(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
