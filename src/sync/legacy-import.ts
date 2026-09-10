import { defaultLife } from "../engine/life";
import type { Life } from "../engine/life";
import type { Progress } from "../engine/progress";

/**
 * Перенос прогресса из прежней версии игры.
 *
 * Обе версии живут на одном домене, поэтому их сохранения лежат в одном
 * localStorage и новая версия может прочитать старое. Переносим только то,
 * что переносится ЧЕСТНО:
 *
 *   xp    — заработанный опыт,
 *   life  — кошелёк, потребности и покупки (структура совпадает),
 *   job   — полученный оффер карьерного слоя.
 *
 * Пройденные миссии НЕ отмечаем пройденными уроками: содержание разное,
 * и подделывать прохождение нечестно. Их число показываем в сводке,
 * чтобы игрок понимал, что именно переносится.
 */

const KEYS = ["pipeline_devops_v2", "pipeline_devops_v1"];

export interface LegacySave {
  xp?: number;
  mis?: Record<string, unknown>;
  labs?: Record<string, unknown>;
  boss?: Record<string, unknown>;
  badges?: unknown[];
  interviews?: unknown[];
  storySeen?: unknown[];
  job?: { id?: string } | null;
  life?: (Partial<Life> & { created?: boolean }) | null;
}

/** Читает сохранение прежней версии из localStorage. null, если его нет. */
export function readLegacySave(): LegacySave | null {
  for (const k of KEYS) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const o = JSON.parse(raw) as unknown;
      if (o && typeof o === "object") return o as LegacySave;
    } catch {
      /* битое сохранение — просто пропускаем */
    }
  }
  return null;
}

export interface LegacySummary {
  xp: number;
  missions: number;
  labs: number;
  bosses: number;
  badges: number;
  interviews: number;
  money: number | null;
  job: string | null;
}

const countKeys = (o: unknown): number => (o && typeof o === "object" ? Object.keys(o).length : 0);

/** Что нашлось в старом сохранении — для показа игроку перед переносом. */
export function summarize(s: LegacySave): LegacySummary {
  return {
    xp: Math.max(0, Math.round(Number(s.xp) || 0)),
    missions: countKeys(s.mis),
    labs: countKeys(s.labs),
    bosses: countKeys(s.boss),
    badges: Array.isArray(s.badges) ? s.badges.length : 0,
    interviews: Array.isArray(s.interviews) ? s.interviews.length : 0,
    money: s.life && typeof s.life.money === "number" ? s.life.money : null,
    job: s.job && typeof s.job.id === "string" ? s.job.id : null,
  };
}

/** Есть ли вообще что переносить. */
export function worthImporting(s: LegacySave): boolean {
  const sum = summarize(s);
  return sum.xp > 0 || sum.missions > 0 || sum.money !== null || sum.job !== null;
}

/** Переносит экономический слой: берём только знакомые поля, остальное игнорируем. */
function importLife(old: NonNullable<LegacySave["life"]>): Life {
  const base = defaultLife();
  const num = (v: unknown, d: number): number => (typeof v === "number" && Number.isFinite(v) ? v : d);
  const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);
  return {
    money: Math.max(0, num(old.money, base.money)),
    hunger: Math.max(0, Math.min(100, num(old.hunger, base.hunger))),
    health: Math.max(0, Math.min(100, num(old.health, base.health))),
    mood: Math.max(0, Math.min(100, num(old.mood, base.mood))),
    wear: {
      top: typeof old.wear?.top === "string" ? old.wear.top : base.wear.top,
      shoes: typeof old.wear?.shoes === "string" ? old.wear.shoes : base.wear.shoes,
    },
    own: arr(old.own),
    home: typeof old.home === "string" ? old.home : null,
    car: typeof old.car === "string" ? old.car : null,
    tech: arr(old.tech),
    trips: arr(old.trips),
    totalEarned: Math.max(0, num(old.totalEarned, 0)),
    totalSpent: Math.max(0, num(old.totalSpent, 0)),
  };
}

/**
 * Применяет старое сохранение к текущему прогрессу. Чистая функция:
 * входные объекты не изменяются. Ничего не теряет — XP берётся максимальный,
 * офферы объединяются.
 */
export function applyLegacy(p: Progress, s: LegacySave): Progress {
  const sum = summarize(s);
  const jobs: Record<string, boolean> = { ...(p.jobs ?? {}) };
  if (sum.job) jobs[sum.job] = true;

  const life = s.life && typeof s.life.money === "number" ? importLife(s.life) : p.life;

  return {
    ...p,
    xp: Math.max(p.xp ?? 0, sum.xp),
    jobs,
    life,
    legacyImported: true,
  };
}
