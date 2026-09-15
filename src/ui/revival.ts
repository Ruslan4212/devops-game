import { $, esc } from "./dom";
import { gradeAnswer } from "../engine/grader";
import { ACT_TO_TOPIC } from "../data/careers";
import { TECH_TOPICS, pickTechQuestions } from "../data/interview";
import type { TechQuestion } from "../data/interview";

export interface RevivalDeps {
  /** номера актов, в которых пройден хотя бы один урок — определяют банк вопросов */
  doneActs: number[];
  /** сколько попыток ещё осталось, включая текущую */
  attemptsLeft: number;
  /** экзамен сдан: здоровье будет восстановлено вызывающей стороной */
  onPass: () => void;
  /** попытка провалена, но есть ещё: вызывающая сторона учтёт её и откроет экзамен заново */
  onAttemptFailed: () => void;
  /** попытки кончились: вызывающая сторона откатит прогресс */
  onFail: () => void;
}

const PASS_RATIO = 0.7;
const MAX_QUESTIONS = 12;

/** Порог: сколько вопросов задавать в зависимости от размера банка (не пусто, не перебор). */
function questionCount(poolSize: number): number {
  return Math.max(3, Math.min(MAX_QUESTIONS, poolSize));
}

function shuffled<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function bubble(who: "sys" | "me", html: string): string {
  return (
    `<div class="iv-msg iv-msg-${who === "sys" ? "lead" : "me"}">` +
    `<div class="iv-avatar">${who === "sys" ? "⚠️" : "🙂"}</div>` +
    `<div class="iv-bubble">${html}</div>` +
    `</div>`
  );
}

/**
 * Экзамен на выживание: здоровье персонажа дошло до нуля. Единственный способ
 * продолжить без сброса прогресса — доказать, что материал пройденных актов
 * реально усвоен, а не просто отмечен галочкой.
 */
export function openRevivalExam(d: RevivalDeps): void {
  const topicIds = [...new Set(d.doneActs.map((a) => ACT_TO_TOPIC[a]).filter((t): t is string => !!t))];
  // одна тема покрывает несколько актов («linux» — акты 1-3), поэтому мало выбрать
  // тему: спрашивать можно только до самого позднего пройденного акта
  const maxAct = d.doneActs.length ? Math.max(...d.doneActs) : 1;
  const poolSize = topicIds.reduce(
    (n, id) =>
      n + (TECH_TOPICS.find((t) => t.id === id)?.questions.filter((q) => q.act <= maxAct).length ?? 0),
    0,
  );
  const n = questionCount(poolSize || 1);
  const qs: TechQuestion[] = poolSize
    ? pickTechQuestions(topicIds, n, Math.random, maxAct)
    : shuffled(TECH_TOPICS[0].questions.filter((q) => q.act <= maxAct)).slice(0, 3);

  let i = 0;
  let correct = 0;
  const transcript: string[] = [
    bubble(
      "sys",
      "Здоровье на нуле. Несколько ночей без сна доконали. Ты можешь продолжить обучение — " +
        "но только если докажешь, что материал реально у тебя в голове, а не просто отмечен " +
        `галочкой. ${qs.length} вопросов по всему, что уже пройдено, порог — ${Math.round(PASS_RATIO * 100)}%.`,
    ),
  ];

  $("#modOv").classList.remove("hide");

  const header = (): string =>
    `<h1>⚠️ Экзамен на выживание</h1><div class="cr-progress">Вопрос ${Math.min(i + 1, qs.length)} из ${qs.length}</div>`;

  const finish = (): void => {
    const ratio = qs.length ? correct / qs.length : 0;
    const passed = ratio >= PASS_RATIO;
    const retryLeft = d.attemptsLeft - 1;
    transcript.push(
      bubble(
        "sys",
        passed
          ? `<b>Выкарабкался.</b> ${correct} из ${qs.length} верно. Здоровье восстановлено — но это был звонок: следи за сытостью и настроением, это не разовая проверка.`
          : retryLeft > 0
            ? `<b>Не хватило.</b> ${correct} из ${qs.length} верно, нужно было ${Math.ceil(PASS_RATIO * qs.length)}. ` +
              `Осталось попыток: ${retryLeft}. Материал тот же — соберись.`
            : `<b>Попытки кончились.</b> ${correct} из ${qs.length} верно, нужно было ${Math.ceil(PASS_RATIO * qs.length)}. ` +
              `Часть пройденного придётся повторить.`,
      ),
    );
    $("#modBody").innerHTML =
      header() +
      `<div class="iv-chat">${transcript.join("")}</div>` +
      `<button class="${passed || retryLeft > 0 ? "prim" : "sec"}" id="rvContinue">` +
      `${passed ? "Продолжить" : retryLeft > 0 ? "Ещё попытка" : "Принять последствия"}</button>`;
    $("#rvContinue").onclick = () => {
      $("#modOv").classList.add("hide");
      if (passed) d.onPass();
      else if (retryLeft > 0) d.onAttemptFailed();
      else d.onFail();
    };
  };

  const step = (): void => {
    if (i >= qs.length) return finish();
    const q = qs[i];
    transcript.push(bubble("sys", esc(q.q)));
    $("#modBody").innerHTML =
      header() +
      `<div class="iv-chat">${transcript.join("")}</div>` +
      `<textarea class="lp-quiz-input" id="rvAnswerInput" rows="3" placeholder="Ответь сам, своими словами…" autofocus></textarea>` +
      `<button class="prim" id="rvAnswerSend">Ответил — проверить</button>`;
    const advance = (ok: boolean): void => {
      if (ok) correct++;
      i++;
      step();
    };
    const fallbackToSelfGrade = (): void => {
      transcript.pop();
      transcript.push(
        bubble("sys", `<b>Правильный вариант:</b> ${esc(q.options[q.answer])}<br>${esc(q.why)}`),
      );
      $("#modBody").innerHTML =
        header() +
        `<div class="iv-chat">${transcript.join("")}</div>` +
        `<div class="lp-selfgrade">` +
        `<button class="prim" id="rvRight">✅ У меня было верно</button>` +
        `<button class="sec" id="rvWrong">❌ Ошибся</button>` +
        `</div>`;
      $("#rvRight").onclick = () => advance(true);
      $("#rvWrong").onclick = () => advance(false);
    };
    $("#rvAnswerSend").onclick = () => {
      const ta = document.getElementById("rvAnswerInput") as HTMLTextAreaElement | null;
      const mine = (ta?.value ?? "").trim();
      transcript.push(bubble("me", esc(mine || "(ничего не написал)")));
      transcript.push(bubble("sys", "🧑‍🏫 Проверяю ответ…"));
      $("#modBody").innerHTML = header() + `<div class="iv-chat">${transcript.join("")}</div>`;
      gradeAnswer({ question: q.q, options: q.options, answerIx: q.answer, explain: q.why, userAnswer: mine })
        .then((result) => {
          transcript.pop();
          transcript.push(
            bubble("sys", `<b>${result.correct ? "Верно." : "Не совсем."}</b> ${esc(result.feedback)}`),
          );
          $("#modBody").innerHTML =
            header() +
            `<div class="iv-chat">${transcript.join("")}</div>` +
            `<button class="prim" id="rvNext">Дальше</button>`;
          $("#rvNext").onclick = () => advance(result.correct);
        })
        .catch(fallbackToSelfGrade);
    };
  };

  step();
}
