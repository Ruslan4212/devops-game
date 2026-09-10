import { $, esc } from "./dom";
import type { MissionRun } from "../engine/runner";

export interface BriefingHandlers {
  onHint: () => void;
  onRestart: () => void;
}

/** Правая колонка: зачем это нужно, что сделать, какие команды и подсказки. */
export function renderBriefing(run: MissionRun | null, hintsUsed: number, h: BriefingHandlers): void {
  const el = $("#brief");
  if (!run) {
    el.innerHTML = "";
    return;
  }
  const m = run.mission;

  el.innerHTML =
    `<div class="eyebrow">Акт ${m.act} · задание ${m.id}${m.incident ? " · ИНЦИДЕНТ" : ""}</div>` +
    `<h2>${esc(m.title)}</h2>` +
    // why содержит намеренную разметку (<b>, <code>) — это часть учебного текста
    `<div class="why">${m.why}</div>` +
    `<div class="sect">Что нужно сделать</div>` +
    `<ul class="obj">` +
    m.objs
      .map(
        (o, i) =>
          `<li class="${run.done[i] ? "ok" : ""}"><span class="mk">✓</span>` +
          `<span class="tx">${esc(o.t)}<small>${esc(o.d)}</small></span></li>`,
      )
      .join("") +
    `</ul>` +
    `<div class="sect">Команды этого задания</div>` +
    `<div class="cheat">` +
    m.cheat.map((c) => `<div><b>${esc(c[0])}</b><span>${esc(c[1])}</span></div>`).join("") +
    `</div>` +
    (hintsUsed
      ? `<div class="sect">Подсказки</div><div class="hintbox">` +
        m.hints
          .slice(0, hintsUsed)
          .map((x) => `<div class="h">💡 ${esc(x)}</div>`)
          .join("") +
        `</div>`
      : "") +
    `<button class="abtn" id="hintBtn">💡 Подсказка (${hintsUsed}/${m.hints.length})</button>` +
    `<button class="abtn" id="restartBtn">↻ Начать задание заново</button>`;

  $("#hintBtn").onclick = h.onHint;
  $("#restartBtn").onclick = h.onRestart;
}
