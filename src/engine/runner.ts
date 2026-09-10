import { applyFileEdit } from "./editor";
import { execLine } from "./shell";
import { newWorld } from "./world";
import type { CmdResult, Mission, World } from "./types";

/**
 * Один заход в задание: свой мир и состояние выполненных задач.
 *
 * Ключевая деталь — задачи «липкие»: они проверяются после каждого шага и,
 * once выполненные, больше не сбрасываются. Иначе задача «создай ветку
 * feature-cart» отвалилась бы, как только игрок по сюжету вернётся в main.
 * И игра, и тесты идут через этот класс, поэтому зачёт считается одинаково.
 */
export class MissionRun {
  readonly world: World;
  readonly mission: Mission;
  readonly done: boolean[];

  constructor(mission: Mission) {
    this.mission = mission;
    this.world = newWorld();
    mission.setup?.(this.world);
    this.done = mission.objs.map(() => false);
  }

  /** Пересчитывает задачи. Возвращает true, если появились новые выполненные. */
  check(): boolean {
    let changed = false;
    this.mission.objs.forEach((o, i) => {
      if (this.done[i]) return;
      let v = false;
      try {
        v = !!o.ok(this.world);
      } catch {
        v = false;
      }
      if (v) {
        this.done[i] = true;
        changed = true;
      }
    });
    return changed;
  }

  get complete(): boolean {
    return this.done.every(Boolean);
  }

  /** Невыполненные задачи — тесты используют их для понятного сообщения об ошибке. */
  get pending(): string[] {
    return this.mission.objs.filter((_o, i) => !this.done[i]).map((o) => o.t);
  }

  exec(line: string): CmdResult {
    const r = execLine(this.world, line);
    this.check();
    return r;
  }

  edit(path: string, content: string): void {
    applyFileEdit(this.world, path, content);
    this.check();
  }

  /** Проигрывает эталонное решение задания целиком. */
  playSolution(): void {
    for (const step of this.mission.solution) {
      if (typeof step === "string") this.exec(step);
      else this.edit(step.file, step.content);
    }
  }
}
