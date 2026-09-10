import { describe, expect, it } from "vitest";
import { allLessonsDone } from "../src/ui/rail";
import { LESSONS } from "../src/lessons";
import type { Progress } from "../src/engine/progress";

const P = (o: Partial<Progress> = {}): Progress => ({ xp: 0, done: {}, cur: null, hints: {}, ...o });
const allDone = (): Record<string, boolean> => Object.fromEntries(LESSONS.map((l) => [l.id, true]));

describe("allLessonsDone — гейт капстоуна", () => {
  it("false, пока пройдено не всё", () => {
    expect(allLessonsDone(P())).toBe(false);
    const almost = allDone();
    delete almost[LESSONS[LESSONS.length - 1].id];
    expect(allLessonsDone(P({ done: almost }))).toBe(false);
  });

  it("true, когда пройдены все уроки и экзамены", () => {
    expect(allLessonsDone(P({ done: allDone() }))).toBe(true);
  });

  it("экзамены входят в гейт наравне с уроками", () => {
    expect(LESSONS.some((l) => l.id.startsWith("экз"))).toBe(true);
    const withoutExams = Object.fromEntries(
      LESSONS.filter((l) => !l.id.startsWith("экз")).map((l) => [l.id, true]),
    );
    expect(allLessonsDone(P({ done: withoutExams }))).toBe(false);
  });
});
