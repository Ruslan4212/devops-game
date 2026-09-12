import { describe, expect, it } from "vitest";
import { defaultLife, isDead } from "../src/engine/life";
import { ACT_TO_TOPIC } from "../src/data/careers";
import { TECH_TOPICS, pickTechQuestions } from "../src/data/interview";

describe("isDead: здоровье на нуле — персонаж «падает»", () => {
  it("жив, пока здоровье больше нуля", () => {
    const l = defaultLife();
    l.health = 1;
    expect(isDead(l)).toBe(false);
  });

  it("мёртв при здоровье 0 или меньше", () => {
    const l = defaultLife();
    l.health = 0;
    expect(isDead(l)).toBe(true);
  });
});

describe("банк вопросов для экзамена на выживание", () => {
  it("ACT_TO_TOPIC покрывает все 14 актов курса", () => {
    for (let act = 1; act <= 14; act++) {
      expect(ACT_TO_TOPIC[act]).toBeTruthy();
      expect(TECH_TOPICS.some((t) => t.id === ACT_TO_TOPIC[act])).toBe(true);
    }
  });

  it("по списку пройденных актов собирается непустой банк вопросов", () => {
    const acts = [1, 2, 3];
    const topics = [...new Set(acts.map((a) => ACT_TO_TOPIC[a]))];
    const qs = pickTechQuestions(topics, 12);
    expect(qs.length).toBeGreaterThan(0);
    expect(qs.length).toBeLessThanOrEqual(12);
  });
});
