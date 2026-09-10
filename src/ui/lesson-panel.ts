import { $, esc } from "./dom";
import type { LessonRun } from "../engine/lesson-run";

export interface PanelHandlers {
  onAdvance: () => void;
  onQuiz: (choice: number) => void;
  onReveal: () => void;
  /** вставить готовую команду в строку ввода терминала */
  onFill: (cmd: string) => void;
}

/**
 * Правая колонка: ОДИН текущий шаг урока, крупно.
 * Никаких списков из шести пунктов — только то, что делать прямо сейчас.
 */
export function renderLessonPanel(run: LessonRun, h: PanelHandlers): void {
  const el = $("#brief");
  const step = run.step;
  const { i, n } = run.position;
  const lesson = run.lesson;

  const head =
    `<div class="eyebrow">Акт ${lesson.act} · урок ${lesson.id}</div>` +
    `<h2>${esc(lesson.title)}</h2>` +
    `<div class="lp-progress"><span>Шаг ${i} из ${n}</span>` +
    `<div class="lp-bar"><i style="width:${Math.round((i / n) * 100)}%"></i></div></div>`;

  let body = "";

  if (step.kind === "say") {
    body =
      `<div class="lp-say">${esc(step.text)}</div>` + `<button class="lp-next" id="lpNext">Дальше →</button>`;
  }

  if (step.kind === "watch") {
    body =
      (step.text ? `<div class="lp-say">${esc(step.text)}</div>` : "") +
      `<div class="lp-badge">👀 смотри в терминал слева</div>` +
      `<div class="lp-note">${esc(step.note)}</div>` +
      `<button class="lp-next" id="lpNext">Понятно, дальше →</button>`;
  }

  if (step.kind === "type") {
    body =
      `<div class="lp-badge">✍️ теперь ты — набери в терминале</div>` +
      `<div class="lp-say">${esc(step.text)}</div>` +
      `<div class="lp-cmd">${esc(step.cmd)}</div>` +
      `<button class="lp-fill" id="lpFill">Вставить в строку ввода</button>` +
      `<div class="lp-tip">Курсор мигает в чёрном окне внизу. Напечатай команду и нажми Enter.</div>`;
  }

  if (step.kind === "do") {
    body =
      `<div class="lp-badge lp-badge-do">🎯 задача — сделай сам в терминале</div>` +
      `<div class="lp-say">${esc(step.text)}</div>`;
    if (run.answerRevealed) {
      body +=
        `<div class="lp-answer"><b>Ответ:</b> набери в терминале:</div>` +
        `<div class="lp-cmd">${esc(step.answer)}</div>` +
        `<button class="lp-fill" id="lpFill">Вставить в строку ввода</button>`;
    } else {
      body += `<button class="lp-reveal" id="lpReveal">Не получается — показать ответ</button>`;
    }
  }

  if (step.kind === "quiz") {
    body =
      `<div class="lp-badge">🤔 вопрос — выбери ответ</div>` +
      `<div class="lp-say">${esc(step.text)}</div>` +
      `<div class="lp-opts">` +
      step.options.map((o, k) => `<button class="lp-opt" data-k="${k}">${esc(o)}</button>`).join("") +
      `</div>`;
  }

  el.innerHTML = head + body;

  const next = document.getElementById("lpNext");
  if (next) next.onclick = h.onAdvance;

  const fill = document.getElementById("lpFill");
  if (fill) {
    fill.onclick = () =>
      h.onFill(step.kind === "do" ? (step as { answer: string }).answer : (step as { cmd: string }).cmd);
  }

  const reveal = document.getElementById("lpReveal");
  if (reveal) reveal.onclick = h.onReveal;

  el.querySelectorAll<HTMLButtonElement>(".lp-opt").forEach((b) => {
    b.onclick = () => h.onQuiz(Number(b.dataset.k));
  });
}
