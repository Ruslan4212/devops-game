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
import { defaultLife, onLessonComplete, xpEarnBonusPct } from "./engine/life";
import { renderLessonPanel } from "./ui/lesson-panel";
import { initEditor, openEditor } from "./ui/editor";
import { execLine } from "./engine/shell";
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

  P.cur = id;
  persist();
  run = new LessonRun(lesson);

  clearTerminal();
  print(`— Урок ${lesson.id}: ${lesson.title} —`, "ok");
  print(lesson.intro, "dim");
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

function renderPanel(): void {
  if (!run) return;
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
      const i = $<HTMLInputElement>("#cmd");
      i.value = cmd;
      i.focus();
    },
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

function completeLesson(): void {
  if (!run) return;
  const lesson = run.lesson;
  let gainedXp = lesson.xp;
  let credited = 0;
  if (!P.done[lesson.id]) {
    P.done[lesson.id] = true;
    if (!P.life) P.life = defaultLife();
    // «жизнь»: бонус к XP от техники/настроения + подработка за урок
    const bonus = Math.max(0, Math.round((lesson.xp * xpEarnBonusPct(P.life)) / 100));
    gainedXp = lesson.xp + bonus;
    P.xp += gainedXp;
    credited = onLessonComplete(P.life, lesson.xp, Object.keys(P.jobs ?? {}).length > 0).credited;
    persist();
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

  // edit открывает редактор, а не выполняется как обычная команда
  if (step.kind === "do" && /^edit\s+\S/.test(trimmed)) {
    const r = execLine(run.world, trimmed);
    if (r.edit) {
      lockInput(true);
      openEditor(run.world, r.edit, (path, content) => {
        lockInput(false);
        applyResult(run!.applyEdit(path, content));
      });
      return;
    }
  }

  if (step.kind === "type") applyResult(run.submitType(line));
  else applyResult(run.submitDo(line));
}

const input = $<HTMLInputElement>("#cmd");
const submit = (): void => {
  const v = input.value;
  input.value = "";
  handleInput(v);
};
$<HTMLFormElement>("#cmdForm").addEventListener("submit", (e) => {
  e.preventDefault();
  submit();
});
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    submit();
    return;
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    const v = history.prev();
    if (v !== null) input.value = v;
  }
  if (e.key === "ArrowDown") {
    e.preventDefault();
    const v = history.next();
    if (v !== null) input.value = v;
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
    `<div class="kb">Слева — карта уроков. Прогресс сохраняется сам.</div>` +
    `<button class="prim" id="modClose">Начать</button>`;
  $("#modOv").classList.remove("hide");
  lockInput(true);
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
$("#lifeBtn").onclick = () => {
  void import("./ui/life").then(({ openLife }) => {
    if (!P.life) P.life = defaultLife();
    openLife({ life: P.life, persist });
  });
};
$("#careerBtn").onclick = () => {
  void import("./ui/career").then(({ openCareer }) => {
    if (!P.jobs) P.jobs = {};
    openCareer({
      actDone: (act) => LESSONS.filter((l) => l.act === act).every((l) => !!P.done[l.id]),
      capstone: !!P.capstone,
      lessonsDone: Object.keys(P.done).length,
      rankName: rankOf(P.xp),
      jobsGot: P.jobs,
      onHire: () => persist(),
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
    startLesson(P.cur && lessonById(P.cur) ? P.cur : LESSONS[0].id);
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
if (!Object.keys(P.done).length) showHow();

if (!P.legacyImported) {
  const legacy = readLegacySave();
  if (legacy && worthImporting(legacy)) showLegacyImport(legacy);
}
