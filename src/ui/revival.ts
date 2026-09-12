import { $, esc } from "./dom";
import { ACT_TO_TOPIC } from "../data/careers";
import { TECH_TOPICS, pickTechQuestions } from "../data/interview";
import type { TechQuestion } from "../data/interview";

export interface RevivalDeps {
  /** номера актов, в которых пройден хотя бы один урок — определяют банк вопросов */
  doneActs: number[];
  /** экзамен сдан: здоровье будет восстановлено вызывающей стороной */
  onPass: () => void;
  /** экзамен провален: прогресс будет сброшен вызывающей стороной */
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
  const poolSize = topicIds.reduce(
    (n, id) => n + (TECH_TOPICS.find((t) => t.id === id)?.questions.length ?? 0),
    0,
  );
  const n = questionCount(poolSize || 1);
  const qs: TechQuestion[] = topicIds.length
    ? pickTechQuestions(topicIds, n)
    : shuffled(TECH_TOPICS[0].questions).slice(0, 3);

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
    transcript.push(
      bubble(
        "sys",
        passed
          ? `<b>Выкарабкался.</b> ${correct} из ${qs.length} верно. Здоровье восстановлено — но это был звонок: следи за сытостью и настроением, это не разовая проверка.`
          : `<b>Не хватило.</b> ${correct} из ${qs.length} верно, нужно было ${Math.ceil(PASS_RATIO * qs.length)}. Прогресс придётся начать заново — на этот раз крепче.`,
      ),
    );
    $("#modBody").innerHTML =
      header() +
      `<div class="iv-chat">${transcript.join("")}</div>` +
      `<button class="${passed ? "prim" : "sec"}" id="rvContinue">${passed ? "Продолжить" : "Начать заново"}</button>`;
    $("#rvContinue").onclick = () => {
      $("#modOv").classList.add("hide");
      if (passed) d.onPass();
      else d.onFail();
    };
  };

  const step = (): void => {
    if (i >= qs.length) return finish();
    const q = qs[i];
    const order = q.options.map((_, k) => k);
    for (let a = order.length - 1; a > 0; a--) {
      const b = Math.floor(Math.random() * (a + 1));
      [order[a], order[b]] = [order[b], order[a]];
    }
    transcript.push(bubble("sys", esc(q.q)));
    $("#modBody").innerHTML =
      header() +
      `<div class="iv-chat">${transcript.join("")}</div>` +
      `<div class="cr-opts">` +
      order.map((oi, k) => `<button class="lp-opt" data-k="${k}">${esc(q.options[oi])}</button>`).join("") +
      `</div>`;
    $("#modBody")
      .querySelectorAll<HTMLButtonElement>(".lp-opt")
      .forEach((btn) => {
        btn.onclick = () => {
          const chosen = order[Number(btn.dataset.k)];
          const ok = chosen === q.answer;
          if (ok) correct++;
          transcript.push(bubble("me", esc(q.options[chosen])));
          transcript.push(bubble("sys", `<b>${ok ? "Верно." : "Неверно."}</b> ${esc(q.why)}`));
          $("#modBody").innerHTML =
            header() +
            `<div class="iv-chat">${transcript.join("")}</div>` +
            `<button class="prim" id="rvNext">${i + 1 < qs.length ? "Дальше →" : "Итог"}</button>`;
          $("#rvNext").onclick = () => {
            i++;
            step();
          };
        };
      });
  };

  step();
}
