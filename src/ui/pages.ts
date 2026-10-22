import { icon } from "../data/ui-icons";
import { esc } from "./dom";
import { ACTS, LESSONS } from "../lessons";
import type { Progress } from "../engine/progress";
import { nextRank, rankOf, RANKS } from "../engine/progress";
import type { LessonRun } from "../engine/lesson-run";
import { isDue, isWrongItem, MAX_BOX } from "../engine/review";
import type { ReviewItem } from "../engine/review";
import { allLessonsDone, expandAct } from "./rail";
import { initThemeSwitch } from "./theme";
import { avatarCardHtml } from "./character";
import { defaultLife } from "../engine/life";

/**
 * Страницы разделов бокового меню (как в english-b2): «Сегодня», «Карта курса»,
 * «Уроки», «Терминал-тренажёр», «Повторение», «Мои ошибки», «Собеседование»,
 * «Карьера и жизнь», «Прогресс», «Настройки». Урок — отдельный экран (#lessonView),
 * сюда не входит. Окна (собеседование, карьера, повторение…) открываются из страниц
 * теми же модалками, что и раньше.
 */
export type Route =
  | "today"
  | "map"
  | "lessons"
  | "terminal"
  | "review"
  | "errors"
  | "interview"
  | "career"
  | "progress"
  | "settings"
  | "lesson";

export const ROUTES: readonly Route[] = [
  "today",
  "map",
  "lessons",
  "terminal",
  "review",
  "errors",
  "interview",
  "career",
  "progress",
  "settings",
  "lesson",
];

export interface PageDeps {
  progress: () => Progress;
  run: () => LessonRun | null;
  /** пул повторения из пройденного — для счётчиков и «Моих ошибок» */
  reviewPool: () => ReviewItem[];
  continueLesson: () => void;
  startLesson: (id: string) => void;
  openCapstone: () => void;
  openReview: (onlyWrong: boolean) => void;
  openInterview: () => void;
  openCareer: () => void;
  openLife: () => void;
  openCharacter: () => void;
  openGlossary: () => void;
  openRating: () => void;
  openCertificate: () => void;
  openAccount: () => void;
  showHow: () => void;
  confirmReset: () => void;
  setStrict: (on: boolean) => void;
  /** «Терминал-тренажёр»: встроить терминал в страницу и включить свободный режим */
  mountSandbox: (host: HTMLElement) => void;
  renderLessonList: () => void;
}

/* ----------------------------- дневная цель ----------------------------- */
const DAILY_KEY = "ops_daily";
const GOAL_KEY = "ops_goal";

const today = (): string => new Date().toISOString().slice(0, 10);

function readJson<T>(key: string, def: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : def;
  } catch {
    return def;
  }
}
function writeJson(key: string, v: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* приватный режим */
  }
}

/** Сколько уроков сегодня хочется пройти (по умолчанию 3). */
export const dailyGoal = (): number => Math.max(1, Number(readJson<number>(GOAL_KEY, 3)) || 3);
/** Пройдено новых уроков за сегодня. */
export function doneToday(): number {
  const d = readJson<{ day: string; n: number }>(DAILY_KEY, { day: "", n: 0 });
  return d.day === today() ? d.n : 0;
}
/** Вызывается, когда урок пройден впервые. */
export function countLessonToday(): void {
  writeJson(DAILY_KEY, { day: today(), n: doneToday() + 1 });
}

/* ------------------------------ счётчики ------------------------------ */
export function reviewCounts(
  pool: readonly ReviewItem[],
  p: Progress,
): { due: number; fresh: number; wrong: number } {
  const stats = p.reviewStats ?? {};
  const now = Date.now();
  return {
    due: pool.filter((it) => stats[it.key] && isDue(stats[it.key], now)).length,
    fresh: pool.filter((it) => !stats[it.key]).length,
    wrong: pool.filter((it) => isWrongItem(stats[it.key])).length,
  };
}

const pct = (a: number, b: number): number => (b ? Math.round((a / b) * 100) : 0);
const bar = (v: number, cls = ""): string => `<div class="bar${cls}"><i style="width:${v}%"></i></div>`;

function head(title: string, sub: string): string {
  return `<h1 class="page-title">${title}</h1><p class="page-sub">${sub}</p>`;
}

/* ------------------------------ страницы ------------------------------ */
function today_(el: HTMLElement, d: PageDeps): void {
  const p = d.progress();
  const run = d.run();
  const lesson = run?.lesson ?? LESSONS.find((l) => !p.done[l.id]) ?? LESSONS[0];
  const act = ACTS.find((a) => a.id === lesson.act);
  const counts = reviewCounts(d.reviewPool(), p);
  const goal = dailyGoal();
  const got = doneToday();
  const total = LESSONS.length;
  const doneN = Object.keys(p.done).length;
  const step = run && !run.finished ? run.position : null;
  const allDone = allLessonsDone(p);

  const reviewN = counts.due + counts.wrong;
  el.innerHTML =
    head("Сегодня", `Ранг: <b>${rankOf(p.xp)}</b> · пройдено ${doneN} из ${total} уроков`) +
    `<div class="card today-hero">` +
    `<div class="eyebrow">${allDone ? "Курс пройден" : step ? "Продолжить урок" : "Следующий урок"}</div>` +
    `<h2>${allDone ? "Финал · Капстоун на реальном сервере" : `${esc(lesson.id)} · ${esc(lesson.title)}`}</h2>` +
    `<p class="muted">${allDone ? "Все уроки и экзамены позади." : `Акт ${lesson.act} · ${esc(act?.name ?? "")}`}` +
    (step ? ` · шаг ${step.i} из ${step.n}` : "") +
    `</p>` +
    (step ? bar(pct(step.i, step.n)) : "") +
    `<button class="btn primary big" id="tdGo" type="button">${allDone ? "К капстоуну" : step ? "Продолжить →" : "Начать урок →"}</button>` +
    `</div>` +
    `<div class="today-grid">` +
    `<div class="card task-card">` +
    `<div class="tc-ico" aria-hidden="true">${icon("target", 28)}</div><div class="tc-body"><b>Цель на день</b>` +
    `<div class="muted">${got} из ${goal} уроков</div>${bar(Math.min(100, pct(got, goal)), got >= goal ? " ok" : "")}` +
    (got >= goal ? `<div class="tc-done">Цель выполнена — отличная работа!</div>` : "") +
    `</div></div>` +
    `<div class="card task-card">` +
    `<div class="tc-ico" aria-hidden="true">${icon("repeat", 28)}</div><div class="tc-body"><b>Повторение</b>` +
    `<div class="muted">${reviewN ? `пора повторить: <b>${reviewN}</b>` : counts.fresh ? `новых вопросов: ${counts.fresh}` : "пока нечего повторять"}</div>` +
    (counts.due + counts.wrong + counts.fresh
      ? `<button class="btn" id="tdReview" type="button">Повторить</button>`
      : `<div class="muted small">Вопросы появятся после первого урока.</div>`) +
    `</div></div>` +
    `<div class="card task-card">` +
    `<div class="tc-ico" aria-hidden="true">${icon("bug", 28)}</div><div class="tc-body"><b>Мои ошибки</b>` +
    `<div class="muted">${counts.wrong ? `ждут разбора: <b>${counts.wrong}</b>` : "ошибок нет"}</div>` +
    (counts.wrong ? `<a class="btn" href="#/errors">Открыть</a>` : "") +
    `</div></div>` +
    `</div>`;

  el.querySelector<HTMLButtonElement>("#tdGo")!.onclick = () =>
    allDone ? d.openCapstone() : d.continueLesson();
  const rv = el.querySelector<HTMLButtonElement>("#tdReview");
  if (rv) rv.onclick = () => d.openReview(false);
}

function map(el: HTMLElement, d: PageDeps): void {
  const p = d.progress();
  const run = d.run();
  el.innerHTML =
    head(
      "Карта курса",
      "14 актов — от первой команды в Linux до дежурства по проду. Нажми на акт, чтобы открыть его уроки.",
    ) +
    `<div class="map-grid">` +
    ACTS.map((a) => {
      const items = LESSONS.filter((l) => l.act === a.id);
      if (!items.length) return "";
      const n = items.filter((l) => p.done[l.id]).length;
      const cur = run?.lesson.act === a.id;
      const state = n === items.length ? "done" : cur ? "cur" : n ? "part" : "";
      return (
        `<button class="card map-act ${state}" type="button" data-act="${a.id}">` +
        `<span class="map-n">Акт ${a.id}</span><b>${esc(a.name)}</b>` +
        `<span class="muted">${n} из ${items.length} уроков${cur ? " · ты здесь" : ""}</span>` +
        bar(pct(n, items.length), n === items.length ? " ok" : "") +
        `</button>`
      );
    }).join("") +
    `<button class="card map-act final" type="button" id="mapCap"><span class="map-n">Финал</span>` +
    `<b>Капстоун на реальном сервере</b><span class="muted">${p.capstone ? "пройден" : allLessonsDone(p) ? "открыт" : "после всех уроков"}</span></button>` +
    `</div>`;
  el.querySelectorAll<HTMLButtonElement>("[data-act]").forEach((b) => {
    b.onclick = () => {
      expandAct(Number(b.dataset.act));
      location.hash = "#/lessons";
    };
  });
  el.querySelector<HTMLButtonElement>("#mapCap")!.onclick = d.openCapstone;
}

function lessons(el: HTMLElement, d: PageDeps): void {
  el.innerHTML =
    head("Уроки", "Все уроки по актам. Следующий открывается, когда пройден предыдущий.") +
    `<div class="card rail" id="rail"></div>`;
  d.renderLessonList();
}

function terminal(el: HTMLElement, d: PageDeps): void {
  el.innerHTML =
    head(
      "Терминал-тренажёр",
      "Свободная песочница: пробуй любые команды, ничего не сломаешь. Задания урока здесь не проверяются.",
    ) +
    `<div class="card sandbox-card"><div id="sandboxHost"></div></div>` +
    `<div class="card"><b>Не помнишь команду?</b> <span class="muted">Справочник команд с примерами — всё, что знает симулятор.</span> ` +
    `<button class="btn" id="tmGlos" type="button">Открыть справочник</button></div>`;
  d.mountSandbox(el.querySelector<HTMLElement>("#sandboxHost")!);
  el.querySelector<HTMLButtonElement>("#tmGlos")!.onclick = d.openGlossary;
}

function review(el: HTMLElement, d: PageDeps): void {
  const p = d.progress();
  const pool = d.reviewPool();
  const counts = reviewCounts(pool, p);
  const stats = p.reviewStats ?? {};
  const boxes = Array.from(
    { length: MAX_BOX },
    (_, i) => pool.filter((it) => stats[it.key]?.box === i + 1).length,
  );
  el.innerHTML =
    head(
      "Повторение",
      "Интервальное повторение по коробкам Лейтнера: верный ответ отправляет вопрос в следующую коробку (спросим реже), ошибка — обратно в первую.",
    ) +
    (pool.length
      ? `<div class="stat-row">` +
        `<div class="card stat"><b>${counts.due}</b><span>пора повторить</span></div>` +
        `<div class="card stat"><b>${counts.fresh}</b><span>новых</span></div>` +
        `<div class="card stat"><b>${counts.wrong}</b><span>ошибок</span></div>` +
        `<div class="card stat"><b>${pool.length}</b><span>всего вопросов</span></div>` +
        `</div>` +
        `<div class="card"><b>Коробки</b><div class="box-row">` +
        boxes.map((n, i) => `<div class="box-cell"><span>${i + 1}</span><b>${n}</b></div>`).join("") +
        `</div><button class="btn primary big" id="rvGo" type="button">Начать повторение</button></div>`
      : `<div class="card empty">Пока нечего повторять — пройди хотя бы один урок с вопросами.</div>`);
  const go = el.querySelector<HTMLButtonElement>("#rvGo");
  if (go) go.onclick = () => d.openReview(false);
}

function errors(el: HTMLElement, d: PageDeps): void {
  const p = d.progress();
  const stats = p.reviewStats ?? {};
  const wrong = d
    .reviewPool()
    .filter((it) => isWrongItem(stats[it.key]))
    .sort((a, b) => (stats[b.key]?.last ?? 0) - (stats[a.key]?.last ?? 0));
  el.innerHTML =
    head(
      "Мои ошибки",
      "Вопросы, на которых ты ошибся и ещё не закрепил. Ответь верно — и вопрос уйдёт отсюда.",
    ) +
    (wrong.length
      ? `<button class="btn primary big" id="erGo" type="button">Повторить ошибки (${wrong.length})</button>` +
        wrong
          .map(
            (it) =>
              `<div class="card err-item"><div class="muted small">${esc(it.topic)}</div>` +
              `<b>${esc(it.q)}</b><div class="err-ans">✓ ${esc(it.options[it.answer])}</div>` +
              (it.why ? `<div class="muted">${esc(it.why)}</div>` : "") +
              `</div>`,
          )
          .join("")
      : `<div class="card empty">Ошибок нет. Они появятся здесь после повторения, если что-то не вспомнится.</div>`);
  const go = el.querySelector<HTMLButtonElement>("#erGo");
  if (go) go.onclick = () => d.openReview(true);
}

function interview(el: HTMLElement, d: PageDeps): void {
  el.innerHTML =
    head(
      "Собеседование",
      "Тренировка к техническому собеседованию: вопросы по темам, которые ты уже прошёл. Отвечай своими словами — наставник разберёт ответ.",
    ) +
    `<div class="card"><button class="btn primary big" id="ivGo" type="button">Начать собеседование</button></div>`;
  el.querySelector<HTMLButtonElement>("#ivGo")!.onclick = d.openInterview;
}

function career(el: HTMLElement, d: PageDeps): void {
  const p = d.progress();
  const life = p.life;
  const tile = (id: string, ico: string, title: string, sub: string): string =>
    `<button class="card tile" type="button" id="${id}"><span class="tile-ico" aria-hidden="true">${icon(ico, 28)}</span>` +
    `<b>${title}</b><span class="muted">${sub}</span></button>`;
  el.innerHTML =
    head(
      "Карьера и жизнь",
      "Уроки открывают вакансии, зарплата идёт по календарю, а персонажу нужно есть и отдыхать.",
    ) +
    `<button class="ch-card-btn" type="button" id="crCard" aria-label="Открыть персонажа">${avatarCardHtml(life ?? defaultLife())}</button>` +
    (life
      ? `<div class="stat-row">` +
        `<div class="card stat"><b>${life.money.toLocaleString("ru-RU")} ₽</b><span>кошелёк</span></div>` +
        `<div class="card stat"><b>${icon("heart", 18, { filled: true })} ${Math.round(life.health)}</b><span>здоровье</span></div>` +
        `</div>`
      : "") +
    `<div class="tile-grid">` +
    tile("crJobs", "briefcase", "Карьера", "вакансии, офферы и текущая работа") +
    tile("crLife", "bag", "Жизнь", "кошелёк, жильё, покупки") +
    tile("crChar", "userCode", "Персонаж", "здоровье, сытость, настроение") +
    tile("crRating", "medal", "Рейтинг", "таблица лидеров") +
    `</div>`;
  el.querySelector<HTMLButtonElement>("#crJobs")!.onclick = d.openCareer;
  el.querySelector<HTMLButtonElement>("#crLife")!.onclick = d.openLife;
  el.querySelector<HTMLButtonElement>("#crChar")!.onclick = d.openCharacter;
  const crCard = el.querySelector<HTMLButtonElement>("#crCard");
  if (crCard) crCard.onclick = d.openCharacter;
  el.querySelector<HTMLButtonElement>("#crRating")!.onclick = d.openRating;
}

function progress(el: HTMLElement, d: PageDeps): void {
  const p = d.progress();
  const doneN = Object.keys(p.done).length;
  const nr = nextRank(p.xp);
  const prev = [...RANKS].reverse().find((q) => p.xp >= q[0])![0];
  const rankPct = nr ? pct(p.xp - prev, nr[0] - prev) : 100;
  const cert = allLessonsDone(p);
  el.innerHTML =
    head("Прогресс", "Сколько пройдено и что дальше.") +
    `<div class="stat-row">` +
    `<div class="card stat"><b>${doneN} / ${LESSONS.length}</b><span>уроков</span></div>` +
    `<div class="card stat"><b>${p.xp}</b><span>XP</span></div>` +
    `<div class="card stat"><b>${doneToday()}</b><span>уроков сегодня</span></div>` +
    `</div>` +
    `<div class="card"><b>Ранг: ${rankOf(p.xp)}</b><div class="muted">${nr ? `до «${nr[1]}» — ${nr[0] - p.xp} XP` : "высший ранг"}</div>${bar(rankPct)}</div>` +
    `<div class="card"><b>По актам</b><div class="act-bars">` +
    ACTS.map((a) => {
      const items = LESSONS.filter((l) => l.act === a.id);
      if (!items.length) return "";
      const n = items.filter((l) => p.done[l.id]).length;
      return `<div class="act-bar"><span>${a.id}. ${esc(a.name)}</span><span class="muted">${n}/${items.length}</span>${bar(pct(n, items.length), n === items.length ? " ok" : "")}</div>`;
    }).join("") +
    `</div></div>` +
    `<div class="card"><b>Сертификат</b><div class="muted">${cert ? "Курс пройден — сертификат готов." : "Откроется, когда пройдены все уроки и экзамены."}</div>` +
    `<button class="btn${cert ? " primary" : ""}" id="pgCert" type="button">Скачать сертификат</button></div>`;
  el.querySelector<HTMLButtonElement>("#pgCert")!.onclick = d.openCertificate;
}

function settings(el: HTMLElement, d: PageDeps): void {
  const p = d.progress();
  el.innerHTML =
    head("Настройки", "Тема, режим проверки, цель на день и аккаунт.") +
    `<div class="card set-row"><div><b>Тема</b><div class="muted">Системная следует настройке устройства.</div></div>` +
    `<div class="seg" role="radiogroup" aria-label="Тема">` +
    `<button type="button" role="radio" data-theme-opt="system">Системная</button>` +
    `<button type="button" role="radio" data-theme-opt="light">Светлая</button>` +
    `<button type="button" role="radio" data-theme-opt="dark">Тёмная</button></div></div>` +
    `<label class="card set-row"><div><b>Строгий режим</b><div class="muted">Задача не подсказывает ответ, пока сам не попросишь, и только после нескольких попыток.</div></div>` +
    `<input type="checkbox" class="switch" id="stStrict"${p.strict ? " checked" : ""}></label>` +
    `<div class="card set-row"><div><b>Цель на день</b><div class="muted">Сколько уроков в день хочешь проходить.</div></div>` +
    `<select id="stGoal">${[1, 2, 3, 5, 8].map((n) => `<option value="${n}"${n === dailyGoal() ? " selected" : ""}>${n}</option>`).join("")}</select></div>` +
    `<div class="card set-row"><div><b>Аккаунт</b><div class="muted">Вход нужен, чтобы прогресс был на всех устройствах.</div></div>` +
    `<button class="btn" id="stAcct" type="button">Открыть</button></div>` +
    `<div class="card set-row"><div><b>Как проходить</b><div class="muted">Коротко о шагах урока.</div></div>` +
    `<button class="btn" id="stHow" type="button">Показать</button></div>` +
    `<div class="card set-row danger-row"><div><b>Сбросить прогресс</b><div class="muted">Удалит всё, что сохранено в этом браузере.</div></div>` +
    `<button class="btn danger" id="stReset" type="button">Сбросить</button></div>`;
  initThemeSwitch(el);
  el.querySelector<HTMLInputElement>("#stStrict")!.onchange = (e) =>
    d.setStrict((e.target as HTMLInputElement).checked);
  el.querySelector<HTMLSelectElement>("#stGoal")!.onchange = (e) =>
    writeJson(GOAL_KEY, Number((e.target as HTMLSelectElement).value));
  el.querySelector<HTMLButtonElement>("#stAcct")!.onclick = d.openAccount;
  el.querySelector<HTMLButtonElement>("#stHow")!.onclick = d.showHow;
  el.querySelector<HTMLButtonElement>("#stReset")!.onclick = d.confirmReset;
}

const PAGES: Record<Exclude<Route, "lesson">, (el: HTMLElement, d: PageDeps) => void> = {
  today: today_,
  map,
  lessons,
  terminal,
  review,
  errors,
  interview,
  career,
  progress,
  settings,
};

export function renderPage(route: Exclude<Route, "lesson">, el: HTMLElement, d: PageDeps): void {
  PAGES[route](el, d);
}
