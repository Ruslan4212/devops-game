import { $, esc } from "./dom";
import { gradeAnswer } from "../engine/grader";
import type { TechQuestion } from "../data/interview";

export interface ReviewDeps {
  questions: TechQuestion[];
  /** обязательное повторение блокирует игру, пока не пройдено; необязательное — можно закрыть в любой момент */
  mandatory: boolean;
  onDone: () => void;
}

function bubble(who: "sys" | "me", html: string): string {
  return (
    `<div class="iv-msg iv-msg-${who === "sys" ? "lead" : "me"}">` +
    `<div class="iv-avatar">${who === "sys" ? "🔄" : "🙂"}</div>` +
    `<div class="iv-bubble">${html}</div>` +
    `</div>`
  );
}

/**
 * Обязательное повторение старого материала: без него курс — это только
 * движение вперёд, и то, что пройдено в акте 1, к акту 10 забывается
 * начисто. В отличие от экзамена на выживание, здесь нет порога и провала —
 * только настоящий разбор от наставника, чтобы конкретное слабое место
 * осталось в памяти, а не потерялось за общим "молодец".
 */
export function openReviewSession(d: ReviewDeps): void {
  let i = 0;
  let correct = 0;
  const qs = d.questions;
  const transcript: string[] = [
    bubble(
      "sys",
      d.mandatory
        ? `Пора освежить то, что проходили раньше — иначе старые темы забудутся раньше, чем понадобятся ` +
            `на практике. ${qs.length} вопросов из уже пройденного, от самых старых тем к новым.`
        : `Свободное повторение: ${qs.length} вопросов из уже пройденного, можно закрыть в любой момент.`,
    ),
  ];

  $("#modOv").classList.remove("hide");

  const header = (): string =>
    `<h1>🔄 Повторение</h1><div class="cr-progress">Вопрос ${Math.min(i + 1, qs.length)} из ${qs.length}</div>`;

  const closeBtn = (): string =>
    d.mandatory ? "" : `<button class="sec" id="rwClose" style="margin-left:8px">Закрыть</button>`;
  const wireClose = (): void => {
    const b = document.getElementById("rwClose");
    if (b) b.onclick = () => finish(true);
  };

  const finish = (skipped = false): void => {
    if (!skipped) {
      transcript.push(
        bubble(
          "sys",
          `<b>Готово.</b> ${correct} из ${qs.length} по существу верно. ` +
            (correct === qs.length
              ? "Всё держится в голове крепко."
              : "Разборы выше — то, что стоит освежить в первую очередь."),
        ),
      );
      $("#modBody").innerHTML =
        `<h1>🔄 Повторение</h1>` +
        `<div class="iv-chat">${transcript.join("")}</div>` +
        `<button class="prim" id="rwContinue">Продолжить</button>`;
      document.getElementById("rwContinue")!.onclick = () => {
        $("#modOv").classList.add("hide");
        d.onDone();
      };
      return;
    }
    $("#modOv").classList.add("hide");
    d.onDone();
  };

  const step = (): void => {
    if (i >= qs.length) return finish();
    const q = qs[i];
    transcript.push(bubble("sys", esc(q.q)));
    $("#modBody").innerHTML =
      header() +
      `<div class="iv-chat">${transcript.join("")}</div>` +
      `<textarea class="lp-quiz-input" id="rwAnswerInput" rows="3" placeholder="Ответь сам, своими словами…" autofocus></textarea>` +
      `<button class="prim" id="rwAnswerSend">Ответил — проверить</button>` +
      closeBtn();
    wireClose();
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
        `<button class="prim" id="rwRight">✅ У меня было верно</button>` +
        `<button class="sec" id="rwWrong">❌ Ошибся</button>` +
        `</div>` +
        closeBtn();
      wireClose();
      document.getElementById("rwRight")!.onclick = () => advance(true);
      document.getElementById("rwWrong")!.onclick = () => advance(false);
    };
    document.getElementById("rwAnswerSend")!.onclick = () => {
      const ta = document.getElementById("rwAnswerInput") as HTMLTextAreaElement | null;
      const mine = (ta?.value ?? "").trim();
      transcript.push(bubble("me", esc(mine || "(ничего не написал)")));
      transcript.push(bubble("sys", "🧑‍🏫 Проверяю ответ…"));
      $("#modBody").innerHTML = header() + `<div class="iv-chat">${transcript.join("")}</div>`;
      gradeAnswer({ question: q.q, options: q.options, answerIx: q.answer, explain: q.why, userAnswer: mine })
        .then((result) => {
          // Локальный разбор по словам может ошибочно отклонить законный
          // пересказ своими словами — здесь, в отличие от экзамена, цена
          // ошибки не в потере прогресса, но ложное "неверно" всё равно
          // отбивает желание тренироваться, поэтому даём слово и тут.
          if (result.local && !result.correct) return fallbackToSelfGrade();
          transcript.pop();
          transcript.push(
            bubble("sys", `<b>${result.correct ? "Верно." : "Не совсем."}</b> ${esc(result.feedback)}`),
          );
          $("#modBody").innerHTML =
            header() +
            `<div class="iv-chat">${transcript.join("")}</div>` +
            `<button class="prim" id="rwNext">Дальше</button>` +
            closeBtn();
          wireClose();
          document.getElementById("rwNext")!.onclick = () => advance(result.correct);
        })
        .catch(fallbackToSelfGrade);
    };
  };

  step();
}
