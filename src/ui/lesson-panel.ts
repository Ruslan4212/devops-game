import { $, esc } from "./dom";
import type { LessonRun } from "../engine/lesson-run";
import { gradeAnswer, type GradeResult } from "../engine/grader";

export interface PanelHandlers {
  onAdvance: () => void;
  onQuiz: (choice: number) => void;
  onReveal: () => void;
  /** вставить готовую команду в строку ввода терминала */
  onFill: (cmd: string) => void;
}

/**
 * Свободный ответ по памяти вместо выбора из вариантов: игрок печатает свою
 * версию сам, и наставник (ИИ через grader-server) оценивает её ПО СМЫСЛУ —
 * не требуя дословного совпадения. Если сервер проверки недоступен, откат
 * на честную самооценку, чтобы это никогда не блокировало игру.
 * Состояние — какой шаг сейчас раскрыт и на какой стадии проверки — локально
 * для этого модуля.
 */
type QuizPhase =
  | { phase: "grading"; myAnswer: string }
  | { phase: "graded"; myAnswer: string; result: GradeResult }
  | { phase: "error"; myAnswer: string };
let quizState: { key: string; state: QuizPhase } | null = null;

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
    } else if (run.canReveal) {
      body += `<button class="lp-reveal" id="lpReveal">Не получается — показать ответ</button>`;
    } else {
      body += `<div class="lp-tip">Строгий режим: разбирайся сам. Подсказка появится после нескольких попыток.</div>`;
    }
  }

  const quizKey = lesson.id + ":" + i;
  if (step.kind === "quiz") {
    const grade =
      typeof step.d === "number"
        ? `<div class="lp-dgrade" style="font-size:12px;letter-spacing:3px;opacity:.6;margin-bottom:6px">` +
          "●".repeat(Math.max(1, Math.min(7, step.d))) +
          "○".repeat(7 - Math.max(1, Math.min(7, step.d))) +
          `<span style="letter-spacing:0"> · сложность ${step.d}/7</span></div>`
        : "";
    const st = quizState && quizState.key === quizKey ? quizState.state : null;

    if (!st) {
      body =
        `<div class="lp-badge">🤔 вопрос — ответь своими словами</div>` +
        grade +
        `<div class="lp-say">${esc(step.text)}</div>` +
        `<textarea class="lp-quiz-input" id="lpQuizInput" rows="3" placeholder="Напиши ответ сам, своими словами…" autofocus></textarea>` +
        `<button class="lp-next" id="lpQuizSubmit">Ответил — проверить</button>`;
    } else if (st.phase === "grading") {
      body =
        `<div class="lp-badge">🤔 ${esc(step.text)}</div>` +
        grade +
        `<div class="lp-answer"><b>Ты ответил:</b> ${esc(st.myAnswer || "(ничего не написал)")}</div>` +
        `<div class="lp-tip">🧑‍🏫 Наставник читает ответ…</div>`;
    } else if (st.phase === "graded") {
      const ok = st.result.correct;
      body =
        `<div class="lp-badge">🤔 ${esc(step.text)}</div>` +
        grade +
        `<div class="lp-answer"><b>Ты ответил:</b> ${esc(st.myAnswer || "(ничего не написал)")}</div>` +
        `<div class="lp-note" style="border-left:3px solid ${ok ? "var(--ok,#3c8)" : "var(--warn,#e94)"};padding-left:10px">` +
        `${ok ? "✅" : "✏️"} <b>Наставник:</b> ${esc(st.result.feedback)}</div>` +
        (ok ? "" : `<div class="lp-cmd">${esc(step.options[step.answer])}</div>`) +
        `<button class="lp-next" id="lpQuizNext">Дальше →</button>`;
    } else {
      body =
        `<div class="lp-badge">🤔 ${esc(step.text)}</div>` +
        grade +
        `<div class="lp-answer"><b>Ты ответил:</b> ${esc(st.myAnswer || "(ничего не написал)")}</div>` +
        `<div class="lp-cmd">${esc(step.options[step.answer])}</div>` +
        `<div class="lp-note">${esc(step.explain)}</div>` +
        `<div class="lp-tip" style="margin-bottom:10px">Не удалось связаться с проверкой — оцени себя сам, честно.</div>` +
        `<div class="lp-selfgrade">` +
        `<button class="lp-next" id="lpQuizRight">✅ У меня было по сути верно</button>` +
        `<button class="lp-reveal" id="lpQuizWrong">❌ Я ошибся, повторить вопрос</button>` +
        `</div>`;
    }
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

  const quizSubmit = document.getElementById("lpQuizSubmit");
  if (quizSubmit) {
    quizSubmit.onclick = () => {
      const qs = step as { text: string; options: string[]; answer: number; explain: string };
      const ta = document.getElementById("lpQuizInput") as HTMLTextAreaElement | null;
      const myAnswer = (ta?.value ?? "").trim();
      quizState = { key: quizKey, state: { phase: "grading", myAnswer } };
      renderLessonPanel(run, h);
      gradeAnswer({
        question: qs.text,
        options: qs.options,
        answerIx: qs.answer,
        explain: qs.explain,
        userAnswer: myAnswer,
      })
        .then((result) => {
          quizState = { key: quizKey, state: { phase: "graded", myAnswer, result } };
          renderLessonPanel(run, h);
        })
        .catch(() => {
          quizState = { key: quizKey, state: { phase: "error", myAnswer } };
          renderLessonPanel(run, h);
        });
    };
  }
  const quizNext = document.getElementById("lpQuizNext");
  if (quizNext) {
    quizNext.onclick = () => {
      const st = quizState?.state;
      quizState = null;
      const answer = (step as { answer: number }).answer;
      h.onQuiz(st && st.phase === "graded" && st.result.correct ? answer : answer === 0 ? -1 : 0);
    };
  }
  const quizRight = document.getElementById("lpQuizRight");
  if (quizRight)
    quizRight.onclick = () => {
      quizState = null;
      h.onQuiz((step as { answer: number }).answer);
    };
  const quizWrong = document.getElementById("lpQuizWrong");
  if (quizWrong)
    quizWrong.onclick = () => {
      quizState = null;
      const wrongAnswer = (step as { answer: number }).answer;
      h.onQuiz(wrongAnswer === 0 ? -1 : 0);
    };
}
