import { describe, expect, it } from "vitest";
import { CAPSTONE_TASKS } from "../src/data/capstone-tasks";

describe("задания капстоуна", () => {
  it("по одному заданию на каждый из 14 актов, по порядку", () => {
    expect(CAPSTONE_TASKS).toHaveLength(14);
    CAPSTONE_TASKS.forEach((t, i) => {
      expect(t.startsWith(`Акт ${i + 1}.`), t).toBe(true);
      expect(t.length).toBeGreaterThan(40);
    });
  });

  it("задания на git и python не полагаются на инструменты, которых нет в песочнице", () => {
    const gitTask = CAPSTONE_TASKS[4];
    const pyTask = CAPSTONE_TASKS[13];
    expect(gitTask).toMatch(/git init/);
    expect(pyTask).toMatch(/python3/);
    // requests/pip нужны сети, которой в песочнице нет (--network none)
    expect(pyTask).not.toMatch(/pip install/);
  });

  it("задания, требующие сети или docker-in-docker, честно об этом предупреждают", () => {
    const netTask = CAPSTONE_TASKS[3]; // Акт 4: сети
    const dockerTask = CAPSTONE_TASKS[5]; // Акт 6: docker
    expect(netTask).toMatch(/сети.*нет|нет.*сети/i);
    expect(dockerTask).toMatch(/недоступен/i);
  });
});
