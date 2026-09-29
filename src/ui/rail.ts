import { $ } from "./dom";
import { ACTS, LESSONS } from "../lessons";
import type { Lesson } from "../engine/types";
import type { Progress } from "../engine/progress";
import { icon } from "../data/ui-icons";

/** Урок открыт, если предыдущий по списку пройден. */
export function isUnlocked(lesson: Lesson, p: Progress): boolean {
  const ix = LESSONS.indexOf(lesson);
  return ix === 0 || !!p.done[LESSONS[ix - 1].id];
}

/** Все уроки и экзамены курса пройдены — открывается капстоун. */
export function allLessonsDone(p: Progress): boolean {
  return LESSONS.every((l) => !!p.done[l.id]);
}

/**
 * Какие акты игрок развернул руками. 283 урока одним списком не читаются,
 * поэтому по умолчанию открыт только акт текущего урока, а ручной выбор
 * переживает перерисовку рельса после каждого шага.
 */
const toggled = new Map<number, boolean>();

export function renderRail(
  p: Progress,
  curId: string | null,
  onPick: (id: string) => void,
  onCapstone: () => void,
): void {
  const el = $("#rail");
  el.innerHTML = "";
  const curAct = LESSONS.find((l) => l.id === curId)?.act;

  for (const act of ACTS) {
    const items = LESSONS.filter((l) => l.act === act.id);
    if (!items.length) continue;
    const doneN = items.filter((l) => p.done[l.id]).length;
    const open = toggled.get(act.id) ?? act.id === curAct;

    const box = document.createElement("div");
    box.className = "act" + (open ? " act-open" : "") + (doneN === items.length ? " act-done" : "");
    const h = document.createElement("h3");
    const tg = document.createElement("button");
    tg.type = "button";
    tg.className = "act-toggle";
    tg.setAttribute("aria-expanded", String(open));
    tg.innerHTML =
      `<span class="act-chev" aria-hidden="true"></span>` +
      `<span class="act-name">Акт ${act.id} · ${act.name}</span><b>${doneN}/${items.length}</b>`;
    tg.onclick = () => {
      const next = !box.classList.contains("act-open");
      toggled.set(act.id, next);
      box.classList.toggle("act-open", next);
      tg.setAttribute("aria-expanded", String(next));
    };
    h.appendChild(tg);
    box.appendChild(h);

    for (const l of items) {
      const locked = !isUnlocked(l, p);
      const b = document.createElement("button");
      b.className =
        "ms" + (p.done[l.id] ? " done" : "") + (l.id === curId ? " cur" : "") + (locked ? " lock" : "");
      b.innerHTML =
        `<span class="b">${p.done[l.id] ? icon("check", 14) : locked ? icon("lock", 14) : l.id}</span>` +
        `<span>${l.title}</span>`;
      b.disabled = locked;
      b.onclick = () => onPick(l.id);
      box.appendChild(b);
    }
    el.appendChild(box);
  }

  el.appendChild(renderCapstoneCard(p, curId, onCapstone));
  el.querySelector(".ms.cur")?.scrollIntoView({ block: "nearest" });
}

/** Финальная карточка рельса: капстоун на реальном сервере. */
function renderCapstoneCard(p: Progress, curId: string | null, onCapstone: () => void): HTMLElement {
  const ready = allLessonsDone(p);
  const passed = !!p.capstone;

  const box = document.createElement("div");
  box.className = "act act-open act-final";
  const h = document.createElement("h3");
  h.innerHTML = `<span class="act-name">Финал · Капстоун</span><b>${passed ? "1/1" : "0/1"}</b>`;
  box.appendChild(h);

  const b = document.createElement("button");
  b.className =
    "ms" + (passed ? " done" : "") + (curId === "capstone" ? " cur" : "") + (ready ? "" : " lock");
  b.innerHTML =
    `<span class="b">${passed ? icon("check", 14) : ready ? icon("award", 14) : icon("lock", 14)}</span>` +
    `<span>${ready ? "Капстоун на реальном сервере" : "Пройди все уроки и экзамены"}</span>`;
  b.disabled = !ready;
  b.onclick = onCapstone;
  box.appendChild(b);

  return box;
}
