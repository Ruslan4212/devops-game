import { describe, expect, it } from "vitest";
import { mergeProgress } from "../src/sync/merge";
import type { Progress } from "../src/engine/progress";

const P = (o: Partial<Progress> = {}): Progress => ({ xp: 0, done: {}, cur: null, hints: {}, ...o });

/**
 * Возврат во вкладку заставляет Supabase обновить токен, и приходит повторное событие «вошёл».
 * Если слияние с облаком после этого откатит снимок урока назад, игрок увидит урок с первого шага —
 * ровно то, на что жаловались. Слияние обязано быть монотонным и по шагу внутри урока.
 */
describe("повторная синхронизация не откатывает текущий урок", () => {
  const far = P({
    cur: "1.16",
    done: { "1.1": true },
    updatedAt: 2000,
    lessonState: {
      id: "1.16",
      stepIx: 14,
      attempts: 0,
      actions: [{ kind: "cmd", cmd: "export STAGE=prod" }],
    },
  });
  const staleCloud = P({
    cur: "1.16",
    done: { "1.1": true },
    updatedAt: 1000,
    lessonState: { id: "1.16", stepIx: 2, attempts: 0, actions: [] },
  });

  it("устаревший снимок из облака не побеждает более поздний шаг", () => {
    expect(mergeProgress(far, staleCloud).lessonState?.stepIx).toBe(14);
    expect(mergeProgress(staleCloud, far).lessonState?.stepIx).toBe(14);
  });

  it("облако вовсе без снимка не стирает локальный прогресс урока", () => {
    const merged = mergeProgress(far, P({ cur: "1.16", done: { "1.1": true } }));
    expect(merged.lessonState?.stepIx).toBe(14);
  });

  it("повторное слияние того же состояния ничего не меняет", () => {
    const once = mergeProgress(far, staleCloud);
    const twice = mergeProgress(once, structuredClone(once));
    expect(twice.lessonState).toEqual(once.lessonState);
  });
});
