import { $ } from "./dom";
import { ACTS, LESSONS } from "../lessons";
import type { Lesson } from "../engine/types";
import type { Progress } from "../engine/progress";

/** Урок открыт, если предыдущий по списку пройден. */
export function isUnlocked(lesson: Lesson, p: Progress): boolean {
  const ix = LESSONS.indexOf(lesson);
  return ix === 0 || !!p.done[LESSONS[ix - 1].id];
}

export function renderRail(p: Progress, curId: string | null, onPick: (id: string) => void): void {
  const el = $("#rail");
  el.innerHTML = "";

  for (const act of ACTS) {
    const items = LESSONS.filter((l) => l.act === act.id);
    if (!items.length) continue;
    const doneN = items.filter((l) => p.done[l.id]).length;

    const box = document.createElement("div");
    box.className = "act";
    const h = document.createElement("h3");
    h.innerHTML = `<span>Акт ${act.id} · ${act.name}</span><b>${doneN}/${items.length}</b>`;
    box.appendChild(h);

    for (const l of items) {
      const locked = !isUnlocked(l, p);
      const b = document.createElement("button");
      b.className = "ms" + (p.done[l.id] ? " done" : "") + (l.id === curId ? " cur" : "") + (locked ? " lock" : "");
      b.innerHTML =
        `<span class="b">${p.done[l.id] ? "✓" : locked ? "🔒" : l.id}</span>` +
        `<span>${l.title}</span>`;
      b.disabled = locked;
      b.onclick = () => onPick(l.id);
      box.appendChild(b);
    }
    el.appendChild(box);
  }
}
