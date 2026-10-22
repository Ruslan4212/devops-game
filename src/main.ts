import "./style.css";
import { ACTS, LESSONS, lessonById } from "./lessons";
import { LessonRun } from "./engine/lesson-run";
import type { StepResult } from "./engine/lesson-run";
import { clearProgress, loadProgress, nextRank, rankOf, RANKS, saveProgress } from "./engine/progress";
import type { Progress } from "./engine/progress";
import { $, esc, lockInput, toast } from "./ui/dom";
import { applyLegacy, readLegacySave, summarize, worthImporting } from "./sync/legacy-import";
import type { LegacySave } from "./sync/legacy-import";
import { clearTerminal, InputHistory, print, printCommand, setPrompt } from "./ui/terminal";
import { allLessonsDone, isUnlocked, renderRail } from "./ui/rail";
import { countLessonToday, renderPage, reviewCounts, ROUTES } from "./ui/pages";
import type { Route } from "./ui/pages";
import {
  defaultLife,
  isDead,
  onLessonComplete,
  setCurrentJob,
  settleTime,
  xpEarnBonusPct,
} from "./engine/life";
import { JOBS, parseSalary } from "./data/careers";
import { TECH_TOPICS } from "./data/interview";
import { buildReviewPool, reachedActOf } from "./engine/review";
import type { ReviewScope } from "./engine/review";
import { newWorld } from "./engine/world";
import type { World } from "./engine/types";
import { toggleTheme } from "./ui/theme";
import { mountTerminal, parkTerminal } from "./ui/term-panel";
import { explainCurrentStep, renderLessonPanel, setLastAttempt, setTaskStatus } from "./ui/lesson-panel";
import { initEditor, openEditor } from "./ui/editor";
import { applyFileEdit } from "./engine/editor";
import { execLine } from "./engine/shell";
import { judgeCommand } from "./engine/grader";
import { icon } from "./data/ui-icons";
import type { DoStep } from "./engine/types";
import { initAccount } from "./sync/account";
import type { AccountApi } from "./sync/account";
import { accessToken } from "./sync/cloud";

let P: Progress = loadProgress();
let run: LessonRun | null = null;
let sync: AccountApi | null = null;
const history = new InputHistory();

/** Сохранить прогресс локально и отложенно отправить в облако (если выполнен вход). */
function persist(): void {
  saveProgress(P);
  sync?.schedulePush();
  checkDeath();
}

/** Месячный оклад текущей работы, 0 — если оффера ещё нет. */
function monthlyPay(): number {
  const job = JOBS.find((j) => j.id === P.life?.currentJob);
  return job ? parseSalary(job.pay) : 0;
}

/**
 * Свести игровое время с реальным: зарплата, квартплата и потребности идут
 * по календарю. Вызывается при запуске и после каждого урока, поэтому долгий
 * перерыв в учёбе честно отражается на кошельке и на сытости персонажа.
 */
function settleCalendar(): void {
  if (!P.life) return;
  const { credited, upkeep, gameDays } = settleTime(P.life, monthlyPay());
  if (!gameDays) return;
  const parts: string[] = [`Прошло игровых суток: ${gameDays}`];
  if (credited) parts.push(`зарплата +${credited.toLocaleString("ru-RU")} ₽`);
  if (upkeep) parts.push(`жильё и машина −${upkeep.toLocaleString("ru-RU")} ₽`);
  print("Календарь: " + parts.join(", ") + ".", "dim");
  persist();
}

/**
 * Здоровье персонажа дошло до нуля — персонаж «падает», но без наказания:
 * потребности подтягиваются до минимума, прогресс курса не трогаем.
 */
function checkDeath(): void {
  if (!P.life || !isDead(P.life)) return;
  P.deaths = (P.deaths ?? 0) + 1;
  P.life.health = 50;
  P.life.hunger = Math.max(P.life.hunger, 40);
  P.life.mood = Math.max(P.life.mood, 40);
  P.life.paidAt = Date.now();
  saveProgress(P);
  toast("Персонаж свалился без сил, но отлежался — здоровье восстановлено.");
}

/* ------------------------------- HUD / карта ------------------------------- */
/** Шапка — только компактный прогресс; кошелёк и здоровье живут в «Карьере и жизни». */
function renderHud(): void {
  const done = Object.keys(P.done).length;
  $("#progChip").innerHTML =
    `<b>${done}</b> / ${LESSONS.length} уроков` + (P.capstone ? ` · ${icon("award", 14)}` : "");
  $("#rankTxt").textContent = rankOf(P.xp);
  const nr = nextRank(P.xp);
  const prev = [...RANKS].reverse().find((q) => P.xp >= q[0])![0];
  const pct = nr ? ((P.xp - prev) / (nr[0] - prev)) * 100 : 100;
  $("#xpFill").style.width = Math.max(3, Math.min(100, pct)) + "%";
  $("#topStats").title = `Пройдено уроков: ${done} из ${LESSONS.length} · ${rankOf(P.xp)}, ${P.xp} XP`;
  const { due, wrong } = reviewCounts(reviewPool(), P);
  const badge = $("#dueBadge");
  badge.textContent = String(due + wrong);
  badge.classList.toggle("hide", !(due + wrong));
}

function reviewPool(): ReturnType<typeof buildReviewPool> {
  return buildReviewPool(LESSONS, TECH_TOPICS, P.done);
}

function renderAll(): void {
  renderRail(P, run?.lesson.id ?? null, startLesson, openCapstoneFlow);
  renderHud();
  if (route === "lesson") {
    if (run && !run.finished) renderPanel();
  } else if (route !== "terminal") showPage(route);
}

/** Финал курса: капстоун на реальном сервере. Открыт только после всех уроков и экзаменов. */
/** Кнопка в шапке терминала: тот же урок, но на настоящем сервере вместо симулятора. */
function openLiveServerFlow(): void {
  if (!run) return;
  const lesson = run.lesson;
  void import("./sandbox/live").then(({ openLiveServer, lessonCommands }) => {
    openLiveServer({
      getToken: accessToken,
      title: lesson.title,
      commands: lessonCommands(lesson.steps),
    });
  });
}

function openCapstoneFlow(): void {
  if (!allLessonsDone(P)) {
    toast("Сначала пройди все уроки и экзамены курса");
    return;
  }
  void import("./sandbox/capstone").then(({ openCapstone }) => {
    openCapstone({
      getToken: accessToken,
      toast,
      onDone: () => {
        if (P.capstone) return;
        P.capstone = true;
        persist();
        renderAll();
      },
    });
  });
}

/* -------------------------------- разделы -------------------------------- */
/** Боковое меню на узком экране — выезжающая панель (как в english-b2). */
function setRailOpen(open: boolean): void {
  document.body.classList.toggle("rail-open", open);
  $("#railToggle").setAttribute("aria-expanded", String(open));
}
$("#railToggle").onclick = () => setRailOpen(!document.body.classList.contains("rail-open"));
$("#railScrim").onclick = () => setRailOpen(false);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && document.body.classList.contains("rail-open")) setRailOpen(false);
});
$("#themeBtn").onclick = () => {
  toggleTheme();
  if (route === "settings") showPage("settings");
};

let route: Route = "today";
/** Вывод урока в терминале, пока он занят тренажёром: вернём его при выходе из тренажёра. */
let lessonOut: string | null = null;
const sandbox: { world: World | null } = { world: null };

function routeFromHash(): Route {
  const r = location.hash.replace(/^#\/?/, "") as Route;
  return ROUTES.includes(r) ? r : "today";
}

function go(r: Route): void {
  if (location.hash !== "#/" + r) location.hash = "#/" + r;
  else applyRoute();
}

function leaveSandbox(): void {
  if (lessonOut === null) return;
  $("#out").innerHTML = lessonOut;
  lessonOut = null;
  setPrompt(run?.world ?? null);
  parkTerminal();
}

function showPage(r: Exclude<Route, "lesson">): void {
  const el = $("#pageView");
  if (el.contains($("#termPanel"))) parkTerminal();
  renderPage(r, el, pageDeps);
}

/** Иконки меню, шапки и плавающей кнопки: в разметке — только data-ico, заливка у активного раздела. */
const NAV_ICO: Record<string, string> = {
  today: "calendar",
  map: "map",
  lessons: "book",
  terminal: "terminal",
  review: "repeat",
  errors: "bug",
  interview: "chat",
  career: "briefcase",
  progress: "progress",
  settings: "settings",
  glossary: "keyboard",
  rating: "trophy",
};
function paintNavIcons(): void {
  for (const a of document.querySelectorAll<HTMLAnchorElement>("#side a")) {
    const slot = a.querySelector<HTMLElement>(".si");
    const name = NAV_ICO[a.dataset.r ?? a.dataset.act ?? ""];
    if (slot && name) slot.innerHTML = icon(name, 20, { filled: a.classList.contains("active") });
  }
}
for (const el of document.querySelectorAll<HTMLElement>("[data-ico]:not(.si)"))
  el.innerHTML = icon(el.dataset.ico!, el.classList.contains("fab-ico") ? 22 : 20);

function applyRoute(): void {
  const r = routeFromHash();
  if (r !== "terminal") leaveSandbox();
  route = r === "lesson" && !run ? "today" : r;
  document.body.dataset.route = route;
  setRailOpen(false);
  for (const a of document.querySelectorAll<HTMLAnchorElement>("#side a")) {
    const on = a.dataset.r === route || (route === "lesson" && a.dataset.r === "lessons");
    a.classList.toggle("active", on);
    if (on) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  }
  paintNavIcons();
  $("#lessonView").classList.toggle("hide", route !== "lesson");
  $("#pageView").classList.toggle("hide", route === "lesson");
  $("#mentorFab").classList.toggle("hide", route !== "lesson" || !run || run.finished);
  if (route === "lesson") {
    if (run && !run.finished) enterView();
    else renderPanel();
  } else showPage(route);
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", applyRoute);

/** Урок снова на экране: перерисовать карточку (терминал вернётся в неё, если шагу нужен). */
function enterView(): void {
  if (!run || run.finished) return;
  renderPanel();
  const k = run.step.kind;
  if (k === "type" || k === "do") {
    lockInput(false);
    $("#cmd").focus();
  }
}

$("#mentorFab").onclick = explainCurrentStep;

/* --------------------------------- урок --------------------------------- */
function startLesson(id: string, show = true): void {
  const lesson = lessonById(id);
  if (!lesson) return;
  setRailOpen(false);
  if (!isUnlocked(lesson, P)) {
    toast("Сначала пройди предыдущий урок");
    return;
  }

  // снимок читаем ДО persist(): дальше P.cur перезапишется и снимок другого урока станет неактуален
  const snap = P.lessonState?.id === id ? P.lessonState : undefined;
  // шаги «смотри»/«читай» не выполняют команд, поэтому actions может быть пуст —
  // признак незаконченного прохождения это stepIx, а не число действий
  const restoring = !!snap && (snap.stepIx > 0 || snap.actions.length > 0);

  P.cur = id;
  run = restoring
    ? LessonRun.fromState(lesson, snap!, { strict: !!P.strict })
    : new LessonRun(lesson, { strict: !!P.strict });
  P.lessonState = run.snapshot();
  persist();

  clearTerminal();
  print(`— Урок ${lesson.id}: ${lesson.title} —`, "ok");
  print(lesson.intro, "dim");
  if (restoring) print(`↺ Прогресс восстановлен — продолжаем с шага ${run.stepIx + 1}.`, "dim");
  print("");
  setPrompt(run.world);
  if (show && route !== "lesson") {
    route = "lesson";
    go("lesson");
  }
  enterStep();
  renderAll();
}

/** Вход в текущий шаг: «смотри» проигрываем в терминал, ввод включаем только для «повтори»/«сделай». */
function enterStep(): void {
  if (!run || run.finished) return;
  const step = run.step;

  if (step.kind === "watch") {
    const { cmd, out, note } = run.runWatch();
    printCommand(run.world, cmd);
    if (out) print(out);
    print("↑ " + note, "dim");
    setPrompt(run.world);
  }

  const needsTyping = step.kind === "type" || step.kind === "do";
  lockInput(!needsTyping);
  renderPanel();
  if (needsTyping) $("#cmd").focus();
}

/** Сохраняет снимок незаконченного урока — вызывается на каждое изменение шага/попытки. */
function persistLessonState(): void {
  if (!run || run.finished) return;
  P.lessonState = run.snapshot();
  persist();
}

function renderPanel(): void {
  if (!run || run.finished) return;
  persistLessonState();
  renderLessonPanel(run, {
    onAdvance: () => {
      run!.ackAndAdvance();
      afterStep();
    },
    onQuiz: (k) => applyResult(run!.submitQuiz(k)),
    onReveal: () => {
      run!.forceReveal();
      renderPanel();
    },
    onFill: (cmd) => {
      const i = $<HTMLTextAreaElement>("#cmd");
      i.value = cmd;
      i.style.height = "auto";
      i.style.height = `${i.scrollHeight}px`;
      i.focus();
    },
    onFillEditor: (path, content) => openFileEditor(path, content),
  });
}

function applyResult(res: StepResult): void {
  if (res.status === "advance") {
    if (res.printOut) print(res.printOut, res.printTone ?? null);
    afterStep();
  } else {
    print(res.feedback, "warn");
    if (run) setTaskStatus(run, { kind: "failed", reason: res.feedback });
    renderPanel();
    $("#cmd").focus();
  }
}

function afterStep(): void {
  if (!run) return;
  if (run.finished) completeLesson();
  else enterStep();
}

/** Раз в столько пройденных уроков — обязательное повторение старого материала. */
const REVIEW_EVERY_LESSONS = 10;
/** Сколько вопросов в одной сессии повторения (10-20, чтобы не растягивать надолго). */
const REVIEW_SESSION_SIZE = 15;

/** Самый поздний акт, до которого игрок реально дошёл — дальше спрашивать нечестно. */
function reachedAct(): number {
  return reachedActOf(LESSONS, P.done);
}

/** Повторение — один движок для обязательной сессии и для кнопки «повторение». */
function openReview(mandatory: boolean, onDone: () => void, scope?: ReviewScope): boolean {
  const pool = buildReviewPool(LESSONS, TECH_TOPICS, P.done);
  if (!pool.length) return false;
  void import("./ui/review").then(({ openReviewSession }) => {
    openReviewSession({
      pool,
      stats: () => P.reviewStats ?? {},
      marathon: () => P.reviewMarathon,
      save: (stats, marathon) => {
        P.reviewStats = stats;
        P.reviewMarathon = marathon;
        persist();
      },
      lessons: LESSONS.filter((l) => P.done[l.id]).map((l) => ({ id: l.id, title: l.title, act: l.act })),
      acts: ACTS,
      mandatory,
      mandatorySize: REVIEW_SESSION_SIZE,
      onDone,
      scope,
    });
  });
  return true;
}

function showNextLessonScreen(
  lesson: (typeof LESSONS)[number],
  next: (typeof LESSONS)[number] | undefined,
): void {
  const el = $("#brief");
  parkTerminal();
  $("#mentorFab").classList.add("hide");
  if (next) {
    el.innerHTML =
      `<div class="lp-done">${icon("confetti", 40, { filled: true })}</div>` +
      `<div class="lp-say">Урок «${lesson.title}» пройден.\n\nСледующий: ${next.id} — ${next.title}</div>` +
      `<button class="lp-next" id="lpGoNext">Следующий урок →</button>`;
    document.getElementById("lpGoNext")!.onclick = () => {
      startLesson(next.id);
      $("#mentorFab").classList.remove("hide");
    };
  } else {
    el.innerHTML =
      `<div class="lp-done">${icon("trophy", 40, { filled: true })}</div>` +
      `<div class="lp-say">Ты прошёл всю программу!\nРанг: ${rankOf(P.xp)}</div>` +
      `<button class="lp-next" id="lpGetCert">Получить сертификат</button>`;
    document.getElementById("lpGetCert")!.onclick = openCertificate;
  }
}

/** Обязательное повторение: без него материал первых актов забывается задолго до конца курса. */
function maybeShowMandatoryReview(
  lesson: (typeof LESSONS)[number],
  next: (typeof LESSONS)[number] | undefined,
): void {
  if (!next || (P.lessonsSinceReview ?? 0) < REVIEW_EVERY_LESSONS) {
    showNextLessonScreen(lesson, next);
    return;
  }
  const el = $("#brief");
  parkTerminal();
  $("#mentorFab").classList.add("hide");
  el.innerHTML =
    `<div class="lp-done">${icon("refresh", 40)}</div>` +
    `<div class="lp-say">Урок «${lesson.title}» пройден.\n\n` +
    `Пройдено ${REVIEW_EVERY_LESSONS} уроков — самое время освежить старый материал, пока он не забылся.</div>` +
    `<button class="lp-next" id="lpGoReview">Начать повторение →</button>`;
  document.getElementById("lpGoReview")!.onclick = () => {
    const finish = (): void => {
      P.lessonsSinceReview = 0;
      persist();
      showNextLessonScreen(lesson, next);
    };
    if (!openReview(true, finish)) finish();
  };
}

function completeLesson(): void {
  if (!run) return;
  // урок закончен — сохранённый снимок незаконченного прохождения больше не нужен
  if (P.lessonState?.id === run.lesson.id) P.lessonState = undefined;
  const lesson = run.lesson;
  let gainedXp = lesson.xp;
  let credited = 0;
  if (!P.done[lesson.id]) {
    P.done[lesson.id] = true;
    countLessonToday();
    P.lessonsSinceReview = (P.lessonsSinceReview ?? 0) + 1;
    if (!P.life) P.life = defaultLife();
    // «жизнь»: бонус к XP от техники/настроения + подработка за урок
    const bonus = Math.max(0, Math.round((lesson.xp * xpEarnBonusPct(P.life)) / 100));
    gainedXp = lesson.xp + bonus;
    P.xp += gainedXp;
    credited = onLessonComplete(P.life, lesson.xp, monthlyPay()).credited;
    persist();
    // время идёт и во время учёбы: зарплата, квартплата и голод — по календарю
    settleCalendar();
  }
  print("");
  print(
    `✔ Урок пройден: ${lesson.title}  (+${gainedXp} XP` +
      (credited ? `, +${credited.toLocaleString("ru-RU")} ₽` : "") +
      `)`,
    "ok",
  );
  toast(`+${gainedXp} XP${credited ? ` · +${credited.toLocaleString("ru-RU")} ₽` : ""}`);
  lockInput(true);

  const next = LESSONS[LESSONS.indexOf(lesson) + 1];
  maybeShowMandatoryReview(lesson, next);
  renderRail(P, lesson.id, startLesson, openCapstoneFlow);
  renderHud();
}

/* --------------------------------- ввод --------------------------------- */
/** «Терминал-тренажёр»: команды выполняются в своём мире, урок не проверяется. */
function handleSandbox(line: string): void {
  const w = (sandbox.world ??= newWorld());
  printCommand(w, line);
  const t = line.trim();
  if (!t) return;
  history.push(line);
  if (t === "clear") return clearTerminal();
  if (/^(edit|nano|vim)\s+\S/.test(t)) {
    const r = execLine(w, t);
    if (r.edit) {
      openEditor(w, r.edit, (p, content) => {
        applyFileEdit(w, p, content);
        print("файл сохранён: " + p, "dim");
      });
      return;
    }
  }
  const r = execLine(w, t);
  if (r.out) print(r.out, r.err ? "err" : null);
  setPrompt(w);
}

function mountSandbox(host: HTMLElement): void {
  if (lessonOut === null) {
    lessonOut = $("#out").innerHTML;
    clearTerminal();
    print(
      "Песочница: пробуй что угодно. help в уроке подскажет служебные команды; clear — очистить экран.",
      "dim",
    );
  }
  setPrompt((sandbox.world ??= newWorld()));
  mountTerminal(host);
  lockInput(false);
  $("#cmd").focus();
}

function handleInput(line: string): void {
  if (route === "terminal") return handleSandbox(line);
  if (!run) return;
  printCommand(run.world, line);
  const trimmed = line.trim();
  if (!trimmed) return;
  history.push(line);

  if (trimmed === "next") {
    const nx = LESSONS[LESSONS.indexOf(run.lesson) + 1];
    if (run.finished && nx) startLesson(nx.id);
    else if (!run.finished) print("Сначала пройди текущий урок до конца.", "warn");
    else print("Это был последний урок.", "warn");
    return;
  }
  if (trimmed === "help") {
    print(
      "Тебе не нужно помнить команды — карточка урока всегда пишет, что набрать сейчас.\n\n" +
        "Служебное:\n" +
        "  next   — следующий урок (когда текущий пройден)\n" +
        "  clear  — очистить экран\n" +
        "  ↑ / ↓  — прошлые команды",
      "info",
    );
    return;
  }
  if (trimmed === "clear") {
    clearTerminal();
    return;
  }

  if (run.finished) {
    print("Урок пройден. Набери  next  или выбери урок в разделе «Уроки».", "dim");
    return;
  }

  const step = run.step;
  if (step.kind !== "type" && step.kind !== "do") {
    print("Сейчас печатать не нужно — нажми кнопку в карточке урока.", "dim");
    return;
  }

  // edit/nano/vim открывают редактор, а не выполняются как обычная команда
  if (step.kind === "do" && /^(edit|nano|vim)\s+\S/.test(trimmed)) {
    const r = execLine(run.world, trimmed);
    if (r.edit) {
      openFileEditor(r.edit);
      return;
    }
  }

  if (step.kind === "type") return applyResult(run.submitType(line));

  const res = run.submitDo(line);
  // Прибитая проверка знает один верный ответ, а их обычно больше. Прежде чем
  // сказать «не закрыто», показываем решение наставнику-ИИ: он видит команду и
  // её настоящий вывод и засчитывает любое решение, которое делает дело.
  if (res.status === "advance") return applyResult(res);
  // что ввёл игрок и что ответил терминал — для кнопки «объясни подробнее»
  setLastAttempt(run, line, res.out ?? "");
  void askMentor(step.text, (step as DoStep).answer, line, res.out ?? "", res);
}

/**
 * Открыть редактор файла и сохранить результат через тот же путь, что и при
 * ручном "edit <файл>" в терминале. Опциональный preset — готовый ответ,
 * который подставляют кнопкой "Открыть редактор с готовым ответом": раньше
 * эта кнопка вместо этого вставляла содержимое файла (может быть в несколько
 * строк) в ОБЫЧНУЮ командную строку терминала — там это никогда не было
 * осмысленной командой, задача не засчитывалась никогда, и человек застревал
 * в цикле "файл сохранён, но задача не закрыта", даже точно скопировав ответ.
 */
function openFileEditor(path: string, preset?: string): void {
  if (!run) return;
  const step = run.step;
  lockInput(true);
  openEditor(run.world, path, (p, content) => {
    lockInput(false);
    const edited = run!.applyEdit(p, content);
    if (edited.status === "advance") applyResult(edited);
    else if (step.kind === "do")
      void askMentor(step.text, step.answer, "сохранил файл " + p, content, edited);
  });
  if (preset !== undefined) $<HTMLTextAreaElement>("#edText").value = preset;
}

/** Второе мнение по практическому заданию: судит модель, а не совпадение строк. */
async function askMentor(
  task: string,
  expected: string,
  command: string,
  output: string,
  fallback: Extract<StepResult, { status: "retry" }>,
): Promise<void> {
  if (!run) return;
  const lesson = run.lesson;
  lockInput(true);
  print("Наставник смотрит, что получилось…", "dim");
  setTaskStatus(run, { kind: "checking" });
  renderPanel();

  const verdict = await judgeCommand({ lesson: lesson.title, task, expected, command, output });
  if (!run || run.lesson.id !== lesson.id) return; // урок успели сменить
  lockInput(false);

  if (verdict?.correct) {
    print("Наставник: " + verdict.feedback, "ok");
    run.acceptStep();
    afterStep();
    return;
  }
  // наставник не засчитал или недоступен — показываем его разбор либо обычную подсказку
  applyResult(verdict ? { ...fallback, feedback: "Наставник: " + verdict.feedback } : fallback);
}

const input = $<HTMLTextAreaElement>("#cmd");
const resizeInput = (): void => {
  input.style.height = "auto";
  input.style.height = `${input.scrollHeight}px`;
};
const submit = (): void => {
  const v = input.value;
  input.value = "";
  resizeInput();
  handleInput(v);
};
$<HTMLFormElement>("#cmdForm").addEventListener("submit", (e) => {
  e.preventDefault();
  submit();
});
input.addEventListener("input", resizeInput);
input.addEventListener("keydown", (e) => {
  // Plain Enter отправляет команду — как в обычном терминале. Shift+Enter
  // вставляет перенос строки: часть заданий ждёт многострочный ответ прямо
  // в командной строке (не только через отдельный редактор edit/nano), и
  // раньше это было физически невозможно — #cmd был однострочным <input>,
  // который переносы строк просто не может содержать вне зависимости от
  // того, как обрабатывать нажатия клавиш.
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    submit();
    return;
  }
  if (e.key === "Enter" && e.shiftKey && !e.isComposing) {
    e.preventDefault();
    const s = input.selectionStart;
    const en = input.selectionEnd;
    input.value = input.value.slice(0, s) + "\n" + input.value.slice(en);
    input.selectionStart = input.selectionEnd = s + 1;
    resizeInput();
    return;
  }
  // История команд по стрелкам — только когда курсор уже на первой/последней
  // строке многострочного содержимого, иначе стрелки листают строки внутри
  // самого поля, как в любом обычном многострочном текстовом поле.
  if (e.key === "ArrowUp" && !input.value.slice(0, input.selectionStart).includes("\n")) {
    e.preventDefault();
    const v = history.prev();
    if (v !== null) {
      input.value = v;
      resizeInput();
    }
  }
  if (e.key === "ArrowDown" && !input.value.slice(input.selectionEnd).includes("\n")) {
    e.preventDefault();
    const v = history.next();
    if (v !== null) {
      input.value = v;
      resizeInput();
    }
  }
});
$("#out").addEventListener("click", () => {
  if (!input.disabled) input.focus();
});

/* -------------------------------- окна -------------------------------- */
function showHow(): void {
  $("#modBody").innerHTML =
    `<h1>${icon("help", 22)}Как проходить</h1>` +
    `<p>Это не курс с лекциями. Ты идёшь маленькими шагами. Карточка урока всегда говорит ровно одно действие.</p>` +
    `<ul class="how-list">` +
    `<li>${icon("eye", 16)}<span><b>Смотри</b> — команда выполняется сама, ты читаешь, что вышло, и объяснение.</span></li>` +
    `<li>${icon("keyboard", 16)}<span><b>Повтори</b> — набери ту же команду в чёрном окне прямо в карточке. Кнопка «Вставить» напечатает её за тебя.</span></li>` +
    `<li>${icon("target", 16)}<span><b>Задача</b> — сделай похожее сам. Ошибёшься — появится подсказка, потом готовый ответ. Провалить нельзя.</span></li>` +
    `<li>${icon("brain", 16)}<span><b>Вопрос</b> — ответь своими словами, наставник проверит по смыслу.</span></li>` +
    `</ul>` +
    `<label class="how-strict"><input type="checkbox" id="strictChk"${P.strict ? " checked" : ""}> ` +
    `<b>Строгий режим</b> — задача не подсказывает ответ, пока сам не попросишь, и только после нескольких попыток. ` +
    `Так курс реально готовит к собеседованию. Можно включать и выключать в любой момент.</label>` +
    `<div class="kb">Слева — разделы: «Сегодня», уроки, повторение. Застрял — кнопка «Спросить наставника» внизу справа. Прогресс сохраняется сам.</div>` +
    `<button class="prim" id="modClose">Начать</button>`;
  $("#modOv").classList.remove("hide");
  lockInput(true);
  $<HTMLInputElement>("#strictChk").onchange = (e) => {
    P.strict = (e.target as HTMLInputElement).checked;
    setStrict(P.strict);
  };
  $("#modClose").onclick = () => {
    $("#modOv").classList.add("hide");
    if (run && !run.finished && (run.step.kind === "type" || run.step.kind === "do")) {
      lockInput(false);
      $("#cmd").focus();
    }
  };
}

/** Строгий режим меняет правила шага — текущий урок перезапускаем с сохранённого места. */
function setStrict(on: boolean): void {
  P.strict = on;
  persist();
  if (run && !run.finished) startLesson(run.lesson.id, route === "lesson");
}

const openGlossary = (): void => void import("./ui/glossary").then((m) => m.openGlossary());
const openCharacter = (): void => {
  void import("./ui/character").then(({ openCharacter }) => {
    if (!P.life) P.life = defaultLife();
    openCharacter({ life: P.life, persist });
  });
};
const openLife = (): void => {
  void import("./ui/life").then(({ openLife }) => {
    if (!P.life) P.life = defaultLife();
    openLife({ life: P.life, persist });
  });
};
const openCareer = (): void => {
  void import("./ui/career").then(({ openCareer }) => {
    if (!P.jobs) P.jobs = {};
    if (!P.life) P.life = defaultLife();
    openCareer({
      actDone: (act) => LESSONS.filter((l) => l.act === act).every((l) => !!P.done[l.id]),
      capstone: !!P.capstone,
      lessonsDone: Object.keys(P.done).length,
      rankName: rankOf(P.xp),
      jobsGot: P.jobs,
      currentJob: P.life.currentJob ?? null,
      onHire: () => persist(),
      onSetCurrentJob: (jobId) => {
        setCurrentJob(P.life!, jobId);
        persist();
      },
    });
  });
};
const openRating = (): void => {
  void import("./ui/leaderboard").then(({ openLeaderboard }) => void openLeaderboard());
};
/** Справочник команд и рейтинг — окна, а не разделы: открываем их из меню, не меняя текущий экран. */
for (const a of document.querySelectorAll<HTMLAnchorElement>("#side a[data-act]")) {
  a.onclick = (e) => {
    e.preventDefault();
    setRailOpen(false);
    if (a.dataset.act === "glossary") openGlossary();
    else openRating();
  };
}
const openInterviewFlow = (): void => {
  void import("./ui/interview").then(({ openInterview }) => openInterview(reachedAct()));
};
function openCertificate(): void {
  if (!allLessonsDone(P)) {
    toast("Сертификат откроется, когда пройдены все уроки и экзамены");
    return;
  }
  void import("./ui/certificate").then(({ downloadCertificate }) => {
    downloadCertificate({
      xp: P.xp,
      rank: rankOf(P.xp),
      lessonsDone: Object.keys(P.done).length,
      lessonsTotal: LESSONS.length,
      capstone: !!P.capstone,
      path: ACTS.map((a) => a.name),
      date: new Date().toLocaleDateString("ru-RU", { year: "numeric", month: "long", day: "numeric" }),
    });
  });
}

/* Иконка кнопки «настоящий сервер» — из общего набора, как во всей игре. */
{
  const b = $("#liveBtn");
  const label = b.textContent!.trim();
  b.innerHTML = icon("bolt", 16) + `<span class="tlabel">${label}</span>`;
  b.title ||= label;
  b.setAttribute("aria-label", label);
}
$("#liveBtn").onclick = openLiveServerFlow;

/** Модалка закрылась — вернуть ввод, если шаг урока его ждёт. */
function unlockAfterModal(): void {
  if (route === "terminal") lockInput(false);
  else if (run && !run.finished && (run.step.kind === "type" || run.step.kind === "do")) lockInput(false);
}

function confirmReset(): void {
  const done = Object.keys(P.done).length;
  $("#modBody").innerHTML =
    `<h1>Сбросить прогресс?</h1>` +
    `<p>Будет удалено всё, что сохранено в этом браузере:</p>` +
    `<ul>` +
    `<li>пройденные уроки — сейчас их <b>${done}</b>, и <b>${P.xp} XP</b>;</li>` +
    `<li>кошелёк, покупки, работа и состояние персонажа;</li>` +
    `<li>курсор повторения и незаконченный урок.</li>` +
    `</ul>` +
    `<div class="callout callout-warning">Если ты вошёл в аккаунт, облачная копия вернёт прогресс при следующей ` +
    `синхронизации. Чтобы начать заново везде, сначала выйди из аккаунта.</div>` +
    `<div class="modal-actions">` +
    `<button class="sec" id="rsNo" type="button">Отмена</button>` +
    `<button class="danger" id="rsYes" type="button">Сбросить прогресс</button>` +
    `</div>`;
  $("#modOv").classList.remove("hide");
  lockInput(true);
  $("#rsNo").focus();
  $("#rsNo").onclick = () => {
    $("#modOv").classList.add("hide");
    unlockAfterModal();
  };
  $("#rsYes").onclick = () => {
    $("#modOv").classList.add("hide");
    clearProgress();
    P = { xp: 0, done: {}, cur: null, hints: {} };
    startLesson(LESSONS[0].id, false);
    go("today");
    toast("Прогресс сброшен");
  };
}

const pageDeps = {
  progress: () => P,
  run: () => run,
  reviewPool,
  continueLesson: () => {
    if (run && !run.finished) go("lesson");
    else {
      const nx = LESSONS.find((l) => !P.done[l.id] && isUnlocked(l, P)) ?? LESSONS[0];
      startLesson(nx.id);
    }
  },
  startLesson: (id: string) => startLesson(id),
  openCapstone: openCapstoneFlow,
  openReview: (onlyWrong: boolean) => {
    const ok = openReview(false, () => renderAll(), onlyWrong ? { kind: "wrong" } : undefined);
    if (!ok) toast("Пока нечего повторять — пройди хотя бы один урок");
  },
  openInterview: openInterviewFlow,
  openCareer,
  openLife,
  openCharacter,
  openGlossary,
  openRating,
  openCertificate,
  openAccount: () => $("#acctBtn").click(),
  showHow,
  confirmReset,
  setStrict,
  mountSandbox,
  renderLessonList: () => renderRail(P, run?.lesson.id ?? null, startLesson, openCapstoneFlow),
};

/* --------------------------------- старт --------------------------------- */
initEditor();
sync = initAccount({
  getProgress: () => P,
  applyMerged: (merged) => {
    P = merged;
    saveProgress(P);
    const target = P.cur && lessonById(P.cur) ? P.cur : LESSONS[0].id;
    const cloudStep = P.lessonState?.id === target ? P.lessonState.stepIx : 0;
    // урок перезапускаем, только если облако принесло другой урок или продвинулось дальше;
    // иначе синхронизация стирала бы текущее прохождение
    if (!run || run.lesson.id !== target || cloudStep > run.stepIx) startLesson(target, route === "lesson");
    else renderAll();
  },
  rankOf,
  toast,
});

/** Предложение перенести прогресс прежней версии игры (обе живут на одном домене). */
function showLegacyImport(save: LegacySave): void {
  const s = summarize(save);
  const rows: string[] = [];
  if (s.xp) rows.push(`<li><b>${s.xp}</b> XP</li>`);
  if (s.money !== null) rows.push(`<li>кошелёк: <b>${s.money.toLocaleString("ru-RU")} ₽</b> и покупки</li>`);
  if (s.job) rows.push(`<li>полученный оффер: <b>${esc(s.job)}</b></li>`);

  $("#modBody").innerHTML =
    `<h1>Нашёлся прогресс прежней версии</h1>` +
    `<p>В этом браузере сохранено прохождение старой версии игры` +
    (s.missions ? ` — миссий пройдено: <b>${s.missions}</b>` : "") +
    `. Перенести то, что переносится честно?</p>` +
    (rows.length ? `<ul>${rows.join("")}</ul>` : "") +
    `<div class="kb">Пройденные миссии <b>не</b> засчитываются уроками: материал здесь другой, ` +
    `и отмечать его пройденным было бы обманом. Старое сохранение останется на месте.</div>` +
    `<button class="prim" id="lgYes">Перенести</button> ` +
    `<button class="sec" id="lgNo">Не переносить</button>`;
  $("#modOv").classList.remove("hide");
  lockInput(true);

  const close = (): void => {
    $("#modOv").classList.add("hide");
    unlockAfterModal();
  };
  $("#lgYes").onclick = () => {
    P = applyLegacy(P, save);
    persist();
    renderAll();
    close();
    toast("Прогресс перенесён");
  };
  $("#lgNo").onclick = () => {
    P.legacyImported = true;
    persist();
    close();
  };
}

startLesson(P.cur && lessonById(P.cur) ? P.cur : LESSONS[0].id, false);
applyRoute();
settleCalendar();
if (!Object.keys(P.done).length) showHow();
checkDeath();

if (!P.legacyImported) {
  const legacy = readLegacySave();
  if (legacy && worthImporting(legacy)) showLegacyImport(legacy);
}

if (new URLSearchParams(location.search).has("icons")) {
  void import("./ui/icons-sheet").then((m) => m.renderIconsSheet(document.body));
}
