export interface Progress {
  xp: number;
  done: Record<string, boolean>;
  cur: string | null;
  hints: Record<string, number>;
  /** момент последнего изменения, мс эпохи — нужен для конфликт-безопасного слияния устройств */
  updatedAt?: number;
}

const KEY = "devops_terminal_rpg_v1";

export const RANKS: [number, string][] = [
  [0, "Стажёр"], [120, "Junior"], [350, "Junior+"],
  [650, "Middle−"], [1000, "Middle"], [1380, "Крепкий Middle"],
];

export const rankOf = (xp: number): string => {
  let r = RANKS[0][1];
  for (const q of RANKS) if (xp >= q[0]) r = q[1];
  return r;
};
export const nextRank = (xp: number) => RANKS.find((q) => xp < q[0]);

export function loadProgress(): Progress {
  const empty: Progress = { xp: 0, done: {}, cur: null, hints: {} };
  try { return Object.assign(empty, JSON.parse(localStorage.getItem(KEY) || "{}")); }
  catch { return empty; }
}
export function saveProgress(p: Progress): void {
  p.updatedAt = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* приватный режим — просто не сохраняем */ }
}
export function clearProgress(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
