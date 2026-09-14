import { $, esc } from "./dom";
import { gradeAnswer } from "../engine/grader";
import { TECH_TOPICS } from "../data/interview";
import type { TechQuestion } from "../data/interview";

/**
 * Самопроверка к собеседованию: выбираешь тему, проходишь все её вопросы,
 * видишь разбор каждого и итоговый счёт. Отдельно от карьерного слоя —
 * здесь можно тренироваться сколько угодно.
 */
/** До какого акта дошёл игрок: возврат «к темам» должен помнить это же ограничение. */
let reachedAct = Infinity;

export function openInterview(maxAct = Infinity): void {
  reachedAct = maxAct;
  menu();
  $("#modOv").classList.remove("hide");
}

/** Русское склонение после числа: 1 вопрос, 2 вопроса, 5 вопросов. */
function plural(n: number, one: string, few: string, many: string): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  const mod10 = n % 10;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

/** Вопросы темы, до которых игрок уже дошёл по программе. */
const openQuestions = (t: (typeof TECH_TOPICS)[number]): TechQuestion[] =>
  t.questions.filter((q) => q.act <= reachedAct);

function menu(): void {
  // спрашивать можно только пройденное: иначе на Акте 1 экран предлагает
  // Kubernetes и Terraform, которых игрок ещё даже не открывал
  const open = TECH_TOPICS.map((t) => ({ t, qs: openQuestions(t) })).filter((x) => x.qs.length);
  const hidden = TECH_TOPICS.length - open.length;

  $("#modBody").innerHTML =
    `<h1>🎓 Подготовка к собеседованию</h1>` +
    `<p>Вопросы уровня реального DevOps-интервью: не «вспомни термин», а «объясни разницу» и «разбери сценарий». Выбери тему.</p>` +
    (open.length
      ? `<div class="iv-topics">` +
        open
          .map(
            ({ t, qs }) =>
              `<button class="iv-topic" data-t="${t.id}"><b>${esc(t.name)}</b>` +
              `<span>${qs.length} ${plural(qs.length, "вопрос", "вопроса", "вопросов")}</span></button>`,
          )
          .join("") +
        `</div>`
      : `<p class="kb">Пройди первые уроки — и здесь появятся вопросы по тому, что ты уже знаешь.</p>`) +
    (hidden
      ? `<div class="kb">Ещё ${hidden} ${plural(hidden, "тема", "темы", "тем")} впереди — откроются по мере прохождения актов.</div>`
      : "") +
    `<button class="sec" id="ivClose">Закрыть</button>`;
  $("#ivClose").onclick = () => $("#modOv").classList.add("hide");
  $("#modBody")
    .querySelectorAll<HTMLButtonElement>(".iv-topic")
    .forEach((b) => {
      b.onclick = () => {
        const t = TECH_TOPICS.find((x) => x.id === b.dataset.t);
        if (t) run(t.name, openQuestions(t));
      };
    });
}

function run(title: string, questions: TechQuestion[]): void {
  let i = 0;
  let correct = 0;

  const finish = (): void => {
    const pct = Math.round((correct / questions.length) * 100);
    $("#modBody").innerHTML =
      `<h1>${esc(title)}</h1>` +
      `<div class="cr-verdict ${pct >= 70 ? "cr-ok" : "cr-no"}">${correct} из ${questions.length} · ${pct}%</div>` +
      `<p>${
        pct >= 70
          ? "Хороший уровень по этой теме. На собеседовании такие вопросы не застанут врасплох."
          : "Есть пробелы — вернись к соответствующему акту и пройди тему ещё раз."
      }</p>` +
      `<button class="prim" id="ivAgain">Ещё раз</button> <button class="sec" id="ivMenu">К темам</button>`;
    $("#ivAgain").onclick = () => run(title, questions);
    $("#ivMenu").onclick = menu;
  };

  const step = (): void => {
    if (i >= questions.length) return finish();
    const q = questions[i];
    $("#modBody").innerHTML =
      `<h1>${esc(title)}</h1>` +
      `<div class="cr-progress">Вопрос ${i + 1} из ${questions.length}</div>` +
      `<div class="cr-q">${esc(q.q)}</div>` +
      `<textarea class="lp-quiz-input" id="ivAnswerInput" rows="3" placeholder="Ответь сам, своими словами…" autofocus></textarea>` +
      `<button class="prim" id="ivAnswerSend">Ответил — проверить</button>`;
    const advance = (ok: boolean): void => {
      if (ok) correct++;
      i++;
      step();
    };
    const fallbackToSelfGrade = (): void => {
      $("#modBody").innerHTML =
        `<h1>${esc(title)}</h1>` +
        `<div class="cr-q">${esc(q.options[q.answer])}</div>` +
        `<div class="cr-why">${esc(q.why)}</div>` +
        `<div class="lp-tip" style="margin-bottom:10px">Не удалось связаться с проверкой — оцени себя сам, честно.</div>` +
        `<div class="lp-selfgrade">` +
        `<button class="prim" id="ivRight">✅ У меня было верно</button>` +
        `<button class="sec" id="ivWrong">❌ Ошибся</button>` +
        `</div>`;
      $("#ivRight").onclick = () => advance(true);
      $("#ivWrong").onclick = () => advance(false);
    };
    $("#ivAnswerSend").onclick = () => {
      const ta = document.getElementById("ivAnswerInput") as HTMLTextAreaElement | null;
      const mine = (ta?.value ?? "").trim();
      $("#modBody").innerHTML =
        `<h1>${esc(title)}</h1>` +
        `<div class="cr-q">${esc(q.q)}</div>` +
        `<div class="lp-tip">🧑‍🏫 Наставник проверяет ответ…</div>`;
      gradeAnswer({ question: q.q, options: q.options, answerIx: q.answer, explain: q.why, userAnswer: mine })
        .then((result) => {
          $("#modBody").innerHTML =
            `<h1>${esc(title)}</h1>` +
            `<div class="cr-q">${esc(q.options[q.answer])}</div>` +
            `<div class="cr-why"><b>${result.correct ? "Верно." : "Не совсем."}</b> ${esc(result.feedback)}</div>` +
            `<button class="prim" id="ivNext">Дальше</button>`;
          $("#ivNext").onclick = () => advance(result.correct);
        })
        .catch(fallbackToSelfGrade);
    };
  };

  step();
}
