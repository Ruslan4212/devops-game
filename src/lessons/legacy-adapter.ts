import type { DoStep, Lesson, Mission, Step } from "../engine/types";

/** Убирает html-разметку из учебного текста старых заданий. */
const strip = (s: string): string =>
  s.replace(/<code>/g, "").replace(/<\/code>/g, "").replace(/<[^>]+>/g, "").replace(/\s+\n/g, "\n").trim();

/**
 * Пока акты 2–10 не переписаны вручную, показываем их в новой пошаговой оболочке:
 *   1) экран «зачем это нужно» (текст why старого задания);
 *   2) по одному «сделай»-шагу на каждую цель, с авто-подсказкой и авто-ответом.
 *
 * Ничего из старого контента не теряется, а игрок больше не видит
 * простыню из шести целей сразу и всегда может добраться до ответа.
 */
export function missionToLesson(m: Mission): Lesson {
  const steps: Step[] = [{ kind: "say", text: strip(m.why) }];

  m.objs.forEach((obj, i) => {
    // Поле d в старых целях — это, как правило, готовая команда-ответ.
    const answer = obj.d;
    const hint = m.hints[i] ?? m.hints[m.hints.length - 1] ?? `Нужно: ${obj.d}`;
    const step: DoStep = { kind: "do", text: obj.t, check: obj.ok, answer, hint };
    steps.push(step);
  });

  return {
    id: m.id,
    act: m.act,
    title: m.title + (m.incident ? " ⚡" : ""),
    intro: strip(m.why).split(/(?<=[.!?])\s/)[0],
    xp: m.xp,
    setup: m.setup,
    steps,
    replay: m.solution,
  };
}

export const missionsToLessons = (missions: Mission[]): Lesson[] => missions.map(missionToLesson);
