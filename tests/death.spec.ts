import { describe, expect, it } from "vitest";
import { defaultLife, isDead } from "../src/engine/life";
import { ACT_TO_TOPIC } from "../src/data/careers";
import { TECH_TOPICS } from "../src/data/interview";

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

describe("ACT_TO_TOPIC", () => {
  it("покрывает все 14 актов курса", () => {
    for (let act = 1; act <= 14; act++) {
      expect(ACT_TO_TOPIC[act]).toBeTruthy();
      expect(TECH_TOPICS.some((t) => t.id === ACT_TO_TOPIC[act])).toBe(true);
    }
  });
});
