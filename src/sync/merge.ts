import { mergeLife } from "../engine/life";
import type { Progress } from "../engine/progress";

/**
 * Слияние двух версий прогресса — например, локальной и облачной,
 * или прогресса с двух устройств после офлайна.
 *
 * Ключевое свойство: слияние КОНФЛИКТ-БЕЗОПАСНО и никогда не теряет данные.
 * Это возможно потому, что прогресс монотонен — движется только вперёд:
 *   - XP только растёт;
 *   - пройденный урок не становится непройденным;
 *   - число открытых подсказок по уроку только увеличивается;
 *   - капстоун, отмеченный пройденным, таким и остаётся.
 *
 * Поэтому не нужны ни версии-таймстемпы, ни ручное разрешение конфликтов:
 *   xp       = максимум из двух
 *   done     = объединение (истина побеждает)
 *   hints    = поэлементный максимум
 *   capstone = логическое ИЛИ (пройдено хоть на одном устройстве — пройдено)
 *   cur      = указатель того, кто дальше по программе (больше пройдено),
 *              при равенстве — у кого свежее updatedAt
 *
 * Функция чистая: не мутирует входные объекты и не имеет побочных эффектов.
 */
export function mergeProgress(a: Progress, b: Progress): Progress {
  const done: Record<string, boolean> = {};
  for (const id of new Set([...Object.keys(a.done ?? {}), ...Object.keys(b.done ?? {})])) {
    if (a.done?.[id] || b.done?.[id]) done[id] = true;
  }

  const hints: Record<string, number> = {};
  for (const id of new Set([...Object.keys(a.hints ?? {}), ...Object.keys(b.hints ?? {})])) {
    hints[id] = Math.max(a.hints?.[id] ?? 0, b.hints?.[id] ?? 0);
  }

  const jobs: Record<string, boolean> = {};
  for (const id of new Set([...Object.keys(a.jobs ?? {}), ...Object.keys(b.jobs ?? {})])) {
    if (a.jobs?.[id] || b.jobs?.[id]) jobs[id] = true;
  }

  const aDone = Object.keys(a.done ?? {}).length;
  const bDone = Object.keys(b.done ?? {}).length;
  let cur: string | null;
  if (aDone !== bDone) cur = aDone > bDone ? a.cur : b.cur;
  else cur = (a.updatedAt ?? 0) >= (b.updatedAt ?? 0) ? a.cur : b.cur;

  return {
    xp: Math.max(a.xp ?? 0, b.xp ?? 0),
    done,
    hints,
    cur: cur ?? a.cur ?? b.cur ?? null,
    updatedAt: Math.max(a.updatedAt ?? 0, b.updatedAt ?? 0) || Date.now(),
    capstone: Boolean(a.capstone || b.capstone),
    jobs,
    life: mergeLife(a.life, b.life),
    legacyImported: Boolean(a.legacyImported || b.legacyImported),
  };
}

/** Публичная витрина для лидерборда — только то, что не жалко показать всем. */
export interface PublicStats {
  xp: number;
  rank_name: string;
  missions_done: number;
}

export function publicStatsOf(p: Progress, rankOf: (xp: number) => string): PublicStats {
  return {
    xp: p.xp,
    rank_name: rankOf(p.xp),
    missions_done: Object.keys(p.done).length,
  };
}
