import "./style.css";
import { ACTS, LESSONS, lessonById } from "./lessons";
import { LessonRun } from "./engine/lesson-run";
import type { StepResult } from "./engine/lesson-run";
import {
  applyDeathPenalty,
  clearProgress,
  EXAM_ATTEMPTS,
  loadProgress,
  nextRank,
  rankOf,
  RANKS,
  saveProgress,
} from "./engine/progress";
import type { Progress } from "./engine/progress";
import { $, esc, lockInput, toast } from "./ui/dom";
import { applyLegacy, readLegacySave, summarize, worthImporting } from "./sync/legacy-import";
import type { LegacySave } from "./sync/legacy-import";
import { clearTerminal, InputHistory, print, printCommand, setPrompt } from "./ui/terminal";
import { allLessonsDone, isUnlocked, renderRail } from "./ui/rail";
import {
  defaultLife,
  isDead,
  onLessonComplete,
  setCurrentJob,
  settleTime,
  xpEarnBonusPct,
} from "./engine/life";
import { JOBS, parseSalary } from "./data/careers";
import { pickReviewSlice } from "./data/interview";
import { renderLessonPanel } from "./ui/lesson-panel";
import { initEditor, openEditor } from "./ui/editor";
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
  print("🗓 " + parts.join(", ") + ".", "dim");
  persist();
}

let examOpen = false;

/**
 * Здоровье персонажа дошло до нуля (или экзамен уже был назначен, но не пройден
 * до перезагрузки страницы) — блокируем ввод и открываем экзамен на выживание.
 * Прогресс либо сохраняется (сдал), либо сбрасывается полностью (провалил).
 */
function checkDeath(): void {
  if (examOpen || !P.life) return;
  if (!isDead(P.life) && !P.deathPending) return;
  // смерть засчитывается один раз: повторные заходы продолжают ту же попытку
  if (!P.deathPending) {
    P.deathPending = true;
    P.deaths = (P.deaths ?? 0) + 1;
    P.examAttempts = 0;
  }
  examOpen = true;
  saveProgress(P);
  lockInput(true);
  openRevivalFlow();
}

/** Экзамен на выживание: три попытки, дальше — откат тем тяжелее, чем больше смертей. */
function openRevivalFlow(): void {
  const doneActs = [...new Set(LESSONS.filter((l) => P.done[l.id]).map((l) => l.act))];
  void import("./ui/revival").then(({ openRevivalExam }) => {
    openRevivalExam({
      doneActs,
      attemptsLeft: EXAM_ATTEMPTS - (P.examAttempts ?? 0),
      onPass: () => {
        P.life!.health = 50;
        P.life!.hunger = Math.max(P.life!.hunger, 40);
        P.life!.mood = Math.max(P.life!.mood, 40);
        P.life!.paidAt = Date.now();
        P.deathPending = false;
        P.examAttempts = 0;
        examOpen = false;
        persist();
        toast("Ты выкарабкался — здоровье восстановлено.");
        renderAll();
        if (run && !run.finished && (run.step.kind === "type" || run.step.kind === "do")) lockInput(false);
      },
      onAttemptFailed: () => {
        P.examAttempts = (P.examAttempts ?? 0) + 1;
        examOpen = false;
        saveProgress(P);
        toast(`Попытка не засчитана. Осталось: ${EXAM_ATTEMPTS - P.examAttempts}`);
        openRevivalFlow();
        examOpen = true;
      },
      onFail: () => {
        const { progress, message } = applyDeathPenalty(P, LESSONS, P.deaths ?? 1);
        P = progress;
        // после отката персонаж жив, но впроголодь: календарь считается заново
        if (P.life) {
          P.life.health = 40;
          P.life.hunger = Math.max(P.life.hunger, 35);
          P.life.paidAt = Date.now();
        }
        examOpen = false;
        saveProgress(P);
        toast(message);
        startLesson(P.cur && lessonById(P.cur) ? P.cur : LESSONS[0].id);
        renderAll();
      },
    });
  });
}

/* ------------------------------- HUD / карта ------------------------------- */
function renderHud(): void {
  const done = Object.keys(P.done).length;
  $("#progChip").textContent = `${done} / ${LESSONS.length} уроков` + (P.capstone ? " · 🎓 капстоун" : "");
  $("#rankTxt").textContent = rankOf(P.xp);
  $("#xpTxt").textContent = `${P.xp} XP`;
  const nr = nextRank(P.xp);
  const prev = [...RANKS].reverse().find((q) => P.xp >= q[0])![0];
  const pct = nr ? ((P.xp - prev) / (nr[0] - prev)) * 100 : 100;
  $("#xpFill").style.width = Math.max(3, Math.min(100, pct)) + "%";
}

function renderAll(): void {
  renderRail(P, run?.lesson.id ?? null, startLesson, openCapstoneFlow);
  renderHud();
  if (run && !run.finished) renderPanel();
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

/* --------------------------------- урок --------------------------------- */
function startLesson(id: string): void {
  const lesson = lessonById(id);
  if (!lesson) return;
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
  if (!run) return;
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
  return Math.max(1, ...LESSONS.filter((l) => P.done[l.id]).map((l) => l.act));
}

function showNextLessonScreen(
  lesson: (typeof LESSONS)[number],
  next: (typeof LESSONS)[number] | undefined,
): void {
  const el = $("#brief");
  if (next) {
    el.innerHTML =
      `<div class="lp-done">🎉</div>` +
      `<div class="lp-say">Урок «${lesson.title}» пройден.\n\nСледующий: ${next.id} — ${next.title}</div>` +
      `<button class="lp-next" id="lpGoNext">Следующий урок →</button>`;
    document.getElementById("lpGoNext")!.onclick = () => startLesson(next.id);
  } else {
    el.innerHTML =
      `<div class="lp-done">🏆</div>` +
      `<div class="lp-say">Ты прошёл всю программу!\nРанг: ${rankOf(P.xp)}</div>`;
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
  el.innerHTML =
    `<div class="lp-done">🔄</div>` +
    `<div class="lp-say">Урок «${lesson.title}» пройден.\n\n` +
    `Пройдено ${REVIEW_EVERY_LESSONS} уроков — самое время освежить старый материал, пока он не забылся.</div>` +
    `<button class="lp-next" id="lpGoReview">Начать повторение →</button>`;
  document.getElementById("lpGoReview")!.onclick = () => {
    const { questions, nextCursor } = pickReviewSlice(reachedAct(), P.reviewCursor ?? 0, REVIEW_SESSION_SIZE);
    void import("./ui/review").then(({ openReviewSession }) => {
      openReviewSession({
        questions,
        mandatory: true,
        onDone: () => {
          P.lessonsSinceReview = 0;
          P.reviewCursor = nextCursor;
          persist();
          showNextLessonScreen(lesson, next);
        },
      });
    });
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
function handleInput(line: string): void {
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
      "Тебе не нужно помнить команды — карточка справа всегда пишет, что набрать сейчас.\n\n" +
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
    print("Урок пройден. Набери  next  или выбери урок слева.", "dim");
    return;
  }

  const step = run.step;
  if (step.kind !== "type" && step.kind !== "do") {
    print("Сейчас печатать не нужно — нажми кнопку в карточке справа.", "dim");
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
  print("🧑‍🏫 Наставник смотрит, что получилось…", "dim");

  const verdict = await judgeCommand({ lesson: lesson.title, task, expected, command, output });
  if (!run || run.lesson.id !== lesson.id) return; // урок успели сменить
  lockInput(false);

  if (verdict?.correct) {
    print("🧑‍🏫 " + verdict.feedback, "ok");
    run.acceptStep();
    afterStep();
    return;
  }
  // наставник не засчитал или недоступен — показываем его разбор либо обычную подсказку
  applyResult(verdict ? { ...fallback, feedback: "🧑‍🏫 " + verdict.feedback } : fallback);
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
    `<h1>Как проходить</h1>` +
    `<p>Это не курс с лекциями. Ты идёшь маленькими шагами. Карточка справа всегда говорит ровно одно действие.</p>` +
    `<ul>` +
    `<li>👀 <b>Смотри</b> — команда выполняется сама, ты читаешь, что вышло, и объяснение.</li>` +
    `<li>✍️ <b>Повтори</b> — набери ту же команду в чёрном окне внизу. Кнопка «Вставить» напечатает её за тебя.</li>` +
    `<li>🎯 <b>Задача</b> — сделай похожее сам. Ошибёшься — появится подсказка, потом готовый ответ. Провалить нельзя.</li>` +
    `<li>🤔 <b>Вопрос</b> — просто выбери вариант.</li>` +
    `</ul>` +
    `<label class="how-strict"><input type="checkbox" id="strictChk"${P.strict ? " checked" : ""}> ` +
    `<b>Строгий режим</b> — задача не подсказывает ответ, пока сам не попросишь, и только после нескольких попыток. ` +
    `Так курс реально готовит к собеседованию. Можно включать и выключать в любой момент.</label>` +
    `<div class="kb">Слева — карта уроков. Прогресс сохраняется сам.</div>` +
    `<button class="prim" id="modClose">Начать</button>`;
  $("#modOv").classList.remove("hide");
  lockInput(true);
  $<HTMLInputElement>("#strictChk").onchange = (e) => {
    P.strict = (e.target as HTMLInputElement).checked;
    persist();
    if (run && !run.finished) startLesson(run.lesson.id);
  };
  $("#modClose").onclick = () => {
    $("#modOv").classList.add("hide");
    if (run && !run.finished && (run.step.kind === "type" || run.step.kind === "do")) {
      lockInput(false);
      $("#cmd").focus();
    }
  };
}

$("#howBtn").onclick = showHow;
$("#glosBtn").onclick = () => void import("./ui/glossary").then((m) => m.openGlossary());
$("#charBtn").onclick = () => {
  void import("./ui/character").then(({ openCharacter }) => {
    if (!P.life) P.life = defaultLife();
    openCharacter({ life: P.life, persist });
  });
};
$("#lifeBtn").onclick = () => {
  void import("./ui/life").then(({ openLife }) => {
    if (!P.life) P.life = defaultLife();
    openLife({ life: P.life, persist });
  });
};
$("#careerBtn").onclick = () => {
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
$("#ratingBtn").onclick = () => {
  void import("./ui/leaderboard").then(({ openLeaderboard }) => void openLeaderboard());
};
$("#ivBtn").onclick = () => {
  void import("./ui/interview").then(({ openInterview }) => openInterview(reachedAct()));
};
$("#reviewBtn").onclick = () => {
  const { questions, nextCursor } = pickReviewSlice(reachedAct(), P.reviewCursor ?? 0, REVIEW_SESSION_SIZE);
  if (!questions.length) {
    toast("Пока нечего повторять — пройди хотя бы один урок");
    return;
  }
  void import("./ui/review").then(({ openReviewSession }) => {
    openReviewSession({
      questions,
      mandatory: false,
      onDone: () => {
        P.reviewCursor = nextCursor;
        persist();
      },
    });
  });
};
$("#certBtn").onclick = () => {
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
};
/* Иконки шапки ставим из кода: один набор на всю игру, палитра наследуется
   от кнопки, и эмодзи с их разнобоем по системам больше нигде нет. */
for (const [id, name] of [
  ["glosBtn", "book"],
  ["charBtn", "user"],
  ["lifeBtn", "bag"],
  ["careerBtn", "briefcase"],
  ["ratingBtn", "medal"],
  ["ivBtn", "chat"],
  ["reviewBtn", "repeat"],
  ["certBtn", "award"],
  ["howBtn", "help"],
  ["resetBtn", "reset"],
  ["liveBtn", "bolt"],
] as const) {
  const b = document.getElementById(id);
  if (b) b.innerHTML = icon(name) + "<span>" + b.textContent!.trim() + "</span>";
}

$("#liveBtn").onclick = openLiveServerFlow;
$("#resetBtn").onclick = () => {
  if (!confirm("Сбросить весь прогресс и начать с первого урока?")) return;
  clearProgress();
  P = { xp: 0, done: {}, cur: null, hints: {} };
  startLesson(LESSONS[0].id);
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
    if (!run || run.lesson.id !== target || cloudStep > run.stepIx) startLesson(target);
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
    if (run && !run.finished && (run.step.kind === "type" || run.step.kind === "do")) lockInput(false);
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

startLesson(P.cur && lessonById(P.cur) ? P.cur : LESSONS[0].id);
settleCalendar();
if (!Object.keys(P.done).length) showHow();
checkDeath();

if (!P.legacyImported) {
  const legacy = readLegacySave();
  if (legacy && worthImporting(legacy)) showLegacyImport(legacy);
}
