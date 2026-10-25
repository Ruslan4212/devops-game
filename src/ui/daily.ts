import { icon } from "../data/ui-icons";
import { DRILL_UNITS } from "../data/drills";
import {
  addToday,
  applyAnswer,
  buildSession,
  countToday,
  currentUnit,
  DEFAULT_GOAL,
  emptyDrill,
  isCorrect,
  makeExercise,
  streak,
  totals,
  unitViews,
  type Exercise,
} from "../engine/drill";
import { esc } from "./dom";
import type { PageDeps } from "./pages";

/** Сколько упражнений в одном заходе. */
const SESSION_SIZE = 10;

interface Session {
  queue: Exercise[];
  total: number;
  ok: number;
  wrong: number;
  retried: Set<string>;
  focus?: string;
  /** ответ уже проверен — показываем разбор */
  result?: { good: boolean; given: string };
  /** build: выбранные фишки по порядку */
  picked: number[];
}

let session: Session | null = null;

const pct = (a: number, b: number): number => (b ? Math.round((a / b) * 100) : 0);
const bar = (v: number, cls = ""): string => `<div class="bar${cls}"><i style="width:${v}%"></i></div>`;

export const drillGoalOf = (d: PageDeps): number => d.progress().drillGoal ?? DEFAULT_GOAL;

function state(d: PageDeps) {
  const p = d.progress();
  return (p.drill ??= emptyDrill());
}

/** Сводка для карточки на «Сегодня». */
export function dailySummary(d: PageDeps): {
  got: number;
  goal: number;
  streak: number;
  learned: number;
  total: number;
} {
  const s = state(d);
  const now = Date.now();
  return {
    got: countToday(s, now),
    goal: drillGoalOf(d),
    streak: streak(s.days, now),
    ...totals(DRILL_UNITS, s),
  };
}

export function renderDaily(el: HTMLElement, d: PageDeps): void {
  if (session) renderSession(el, d);
  else renderMap(el, d);
}

/* ───────────────────────────── карта ───────────────────────────── */

function renderMap(el: HTMLElement, d: PageDeps): void {
  const s = state(d);
  const now = Date.now();
  const views = unitViews(DRILL_UNITS, s, now);
  const sum = dailySummary(d);
  const cur = currentUnit(views);
  const dueAll = views.reduce((n, v) => n + v.due, 0);
  const done = sum.got >= sum.goal;

  el.innerHTML =
    `<h1 class="page-title">Ежедневная практика</h1>` +
    `<p class="page-sub">Короткие упражнения на команды: от <code>pwd</code> до <code>kubectl</code>. Каждый день — понемногу, пока пальцы не запомнят.</p>` +
    `<div class="card dl-hero">` +
    `<div class="dl-stats">` +
    `<div class="dl-stat"><span class="dl-ico" aria-hidden="true">${icon("bolt", 22, { filled: true })}</span><b>${sum.streak}</b><span class="muted">${plural(sum.streak, "день", "дня", "дней")} подряд</span></div>` +
    `<div class="dl-stat"><span class="dl-ico" aria-hidden="true">${icon("target", 22)}</span><b>${sum.got} / ${sum.goal}</b><span class="muted">упражнений сегодня</span></div>` +
    `<div class="dl-stat"><span class="dl-ico" aria-hidden="true">${icon("check", 22)}</span><b>${sum.learned} / ${sum.total}</b><span class="muted">команд выучено</span></div>` +
    `</div>` +
    bar(Math.min(100, pct(sum.got, sum.goal)), done ? " ok" : "") +
    `<div class="dl-actions">` +
    `<button class="btn primary big" id="dlGo" type="button">${done ? "Ещё один заход" : sum.got ? "Продолжить практику" : "Начать практику"}</button>` +
    (dueAll ? `<span class="muted">пора повторить: <b>${dueAll}</b></span>` : "") +
    `</div>` +
    (done ? `<div class="tc-done">Цель на сегодня выполнена — серия продолжается!</div>` : "") +
    `</div>` +
    `<div class="dl-path" role="list">` +
    views
      .map((v, i) => {
        const p = pct(v.learned, v.total);
        const isCur = cur?.unit.id === v.unit.id && v.status === "open";
        return (
          `<div class="dl-step ${i % 2 ? "r" : "l"}" role="listitem">` +
          `<button class="dl-node ${v.status}${isCur ? " cur" : ""}" type="button" data-u="${v.unit.id}"` +
          ` style="--p:${p}%" ${v.status === "locked" ? "disabled" : ""}` +
          ` aria-label="${esc(v.unit.title)}: выучено ${v.learned} из ${v.total}${v.status === "locked" ? ", закрыто" : ""}">` +
          `<span class="dl-disc">${icon(v.status === "locked" ? "lock" : v.status === "learned" ? "check" : v.unit.icon, 28)}</span>` +
          `</button>` +
          `<div class="dl-label"><b>${esc(v.unit.title)}</b>` +
          `<span class="muted">${esc(v.unit.blurb)}</span>` +
          `<span class="dl-meta">${
            v.status === "locked"
              ? "откроется после предыдущей станции"
              : `${v.learned} из ${v.total} выучено` + (v.due ? ` · <b>повторить: ${v.due}</b>` : "")
          }</span></div></div>`
        );
      })
      .join("") +
    `</div>`;

  el.querySelector<HTMLButtonElement>("#dlGo")!.onclick = () => start(el, d);
  for (const b of el.querySelectorAll<HTMLButtonElement>(".dl-node:not(:disabled)"))
    b.onclick = () => start(el, d, b.dataset.u);
}

function plural(n: number, a: string, b: string, c: string): string {
  const m = n % 100;
  const k = n % 10;
  if (m > 10 && m < 20) return c;
  return k === 1 ? a : k >= 2 && k <= 4 ? b : c;
}

/* ───────────────────────────── сессия ───────────────────────────── */

function start(el: HTMLElement, d: PageDeps, focus?: string): void {
  const queue = buildSession(DRILL_UNITS, state(d), SESSION_SIZE, Date.now(), Math.random, focus);
  if (!queue.length) return;
  session = { queue, total: queue.length, ok: 0, wrong: 0, retried: new Set(), focus, picked: [] };
  renderSession(el, d);
}

function leave(el: HTMLElement, d: PageDeps): void {
  session = null;
  renderMap(el, d);
}

function renderSession(el: HTMLElement, d: PageDeps): void {
  const s = session!;
  const ex = s.queue[0];
  if (!ex) return renderDone(el, d);
  const answered = s.ok + s.wrong;
  const shown = Math.min(s.total, answered);

  const head =
    `<div class="dl-top"><button class="btn ghost" id="dlExit" type="button" aria-label="Выйти из практики">${icon("x", 18)}</button>` +
    bar(pct(shown, s.total)) +
    `<span class="muted dl-count">${s.ok} верно</span></div>`;

  const q =
    ex.kind === "explain"
      ? `<div class="eyebrow">Что делает команда?</div><div class="dl-cmd" aria-label="команда">${esc(ex.cmd)}</div>`
      : `<div class="eyebrow">${KIND_LABEL[ex.kind]}</div><h2 class="dl-ask">${esc(ex.ask)}</h2>`;

  let body = "";
  if (ex.options) {
    body =
      `<div class="dl-opts">` +
      ex.options
        .map((o, i) => {
          const cls = s.result ? (i === ex.answer ? " good" : i === pickedOpt ? " bad" : "") : "";
          const mono = ex.kind === "pick" ? " mono" : "";
          return `<button class="dl-opt${mono}${cls}" type="button" data-i="${i}" ${s.result ? "disabled" : ""}>${esc(o)}</button>`;
        })
        .join("") +
      `</div>`;
  } else if (ex.kind === "build") {
    const tokens = ex.tokens ?? [];
    body =
      `<div class="dl-line" id="dlLine" aria-label="собранная команда">` +
      (s.picked.length
        ? s.picked
            .map(
              (t) =>
                `<button class="dl-chip" type="button" data-un="${t}" ${s.result ? "disabled" : ""}>${esc(tokens[t])}</button>`,
            )
            .join("")
        : `<span class="muted">нажимай на слова ниже по порядку</span>`) +
      `</div><div class="dl-bank">` +
      tokens
        .map(
          (t, i) =>
            `<button class="dl-chip" type="button" data-t="${i}" ${s.picked.includes(i) || s.result ? "disabled" : ""}>${esc(t)}</button>`,
        )
        .join("") +
      `</div>` +
      (s.result
        ? ""
        : `<button class="btn primary" id="dlCheck" type="button" ${s.picked.length ? "" : "disabled"}>Проверить</button>`);
  } else {
    body =
      `<div class="dl-type"><span class="dl-prompt" aria-hidden="true">$</span>` +
      `<input id="dlIn" class="dl-input" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"` +
      ` aria-label="команда" ${s.result ? `disabled value="${esc(s.result.given)}"` : ""}></div>` +
      (s.result
        ? ""
        : `<div class="dl-row"><button class="btn primary" id="dlCheck" type="button">Проверить</button>` +
          `<button class="btn ghost" id="dlSkip" type="button">Не знаю</button></div>`);
  }

  const fb = s.result
    ? `<div class="dl-fb ${s.result.good ? "good" : "bad"}" role="status">` +
      `<b>${s.result.good ? "Верно!" : "Не совсем"}</b>` +
      (s.result.good && ex.kind !== "explain"
        ? ""
        : `<div class="dl-ans">Правильно: <code>${esc(ex.cmd)}</code></div>`) +
      `<div class="muted">${esc(ex.teach)}</div>` +
      `<button class="btn primary" id="dlNext" type="button">Дальше</button></div>`
    : "";

  el.innerHTML = head + `<div class="card dl-card">${q}${body}</div>` + fb;

  el.querySelector<HTMLButtonElement>("#dlExit")!.onclick = () => leave(el, d);
  wire(el, d, ex);
}

const KIND_LABEL: Record<Exercise["kind"], string> = {
  pick: "Выбери команду",
  explain: "Что делает команда?",
  build: "Собери команду",
  type: "Набери команду",
};

/** Номер выбранного варианта — нужен, чтобы подсветить ошибочный выбор. */
let pickedOpt = -1;

function wire(el: HTMLElement, d: PageDeps, ex: Exercise): void {
  const s = session!;
  if (s.result) {
    const next = el.querySelector<HTMLButtonElement>("#dlNext")!;
    next.onclick = () => {
      s.queue.shift();
      s.result = undefined;
      s.picked = [];
      pickedOpt = -1;
      renderSession(el, d);
    };
    next.focus();
    return;
  }

  if (ex.options) {
    for (const b of el.querySelectorAll<HTMLButtonElement>(".dl-opt"))
      b.onclick = () => {
        const i = Number(b.dataset.i);
        pickedOpt = i;
        finish(el, d, ex, i === ex.answer, ex.options![i]);
      };
    return;
  }

  if (ex.kind === "build") {
    const tokens = ex.tokens ?? [];
    for (const b of el.querySelectorAll<HTMLButtonElement>("[data-t]"))
      b.onclick = () => {
        s.picked.push(Number(b.dataset.t));
        renderSession(el, d);
      };
    for (const b of el.querySelectorAll<HTMLButtonElement>("[data-un]"))
      b.onclick = () => {
        s.picked = s.picked.filter((t) => t !== Number(b.dataset.un));
        renderSession(el, d);
      };
    el.querySelector<HTMLButtonElement>("#dlCheck")!.onclick = () => {
      const given = s.picked.map((t) => tokens[t]).join(" ");
      finish(el, d, ex, isCorrect(itemOf(ex), given), given);
    };
    return;
  }

  const input = el.querySelector<HTMLInputElement>("#dlIn")!;
  const check = () => finish(el, d, ex, isCorrect(itemOf(ex), input.value), input.value);
  input.onkeydown = (e) => {
    if (e.key === "Enter" && input.value.trim()) check();
  };
  el.querySelector<HTMLButtonElement>("#dlCheck")!.onclick = () => input.value.trim() && check();
  el.querySelector<HTMLButtonElement>("#dlSkip")!.onclick = () => finish(el, d, ex, false, "");
  input.focus();
}

/** Эталон упражнения в форме, которую понимает проверка (альтернативные записи ищем в данных). */
function itemOf(ex: Exercise): { cmd: string; alts?: string[] } {
  const [uid, idx] = ex.key.split(":");
  const item = DRILL_UNITS.find((u) => u.id === uid)?.items[Number(idx)];
  return item ?? { cmd: ex.cmd };
}

function finish(el: HTMLElement, d: PageDeps, ex: Exercise, good: boolean, given: string): void {
  const s = session!;
  const st = state(d);
  const now = Date.now();
  applyAnswer(st, ex.key, good, now);
  addToday(st, now);
  d.persist();
  if (good) s.ok++;
  else {
    s.wrong++;
    // ошибку возвращаем в конец сессии — один раз, уже в упрощённом виде
    if (!s.retried.has(ex.key)) {
      s.retried.add(ex.key);
      const [uid, idx] = ex.key.split(":");
      const unit = DRILL_UNITS.find((u) => u.id === uid);
      if (unit) {
        s.queue.push(makeExercise(DRILL_UNITS, unit, Number(idx), st, Math.random));
        s.total++;
      }
    }
  }
  s.result = { good, given };
  renderSession(el, d);
}

function renderDone(el: HTMLElement, d: PageDeps): void {
  const s = session!;
  const sum = dailySummary(d);
  const acc = pct(s.ok, s.ok + s.wrong);
  el.innerHTML =
    `<div class="card dl-end">` +
    `<div class="dl-end-ico" aria-hidden="true">${icon("trophy", 44, { filled: true })}</div>` +
    `<h2>Заход завершён</h2>` +
    `<p class="muted">Верно: <b>${s.ok}</b> из ${s.ok + s.wrong} (${acc}%). Сегодня: ${sum.got} из ${sum.goal}. Серия: ${sum.streak} ${plural(sum.streak, "день", "дня", "дней")}.</p>` +
    bar(Math.min(100, pct(sum.got, sum.goal)), sum.got >= sum.goal ? " ok" : "") +
    `<div class="dl-row"><button class="btn primary big" id="dlAgain" type="button">Ещё заход</button>` +
    `<button class="btn" id="dlMap" type="button">К карте</button></div></div>`;
  const focus = s.focus;
  el.querySelector<HTMLButtonElement>("#dlAgain")!.onclick = () => {
    session = null;
    start(el, d, focus);
  };
  el.querySelector<HTMLButtonElement>("#dlMap")!.onclick = () => leave(el, d);
}
