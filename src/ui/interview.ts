import { $, esc } from "./dom";
import { TECH_TOPICS } from "../data/interview";
import type { TechQuestion } from "../data/interview";

/**
 * Самопроверка к собеседованию: выбираешь тему, проходишь все её вопросы,
 * видишь разбор каждого и итоговый счёт. Отдельно от карьерного слоя —
 * здесь можно тренироваться сколько угодно.
 */
export function openInterview(): void {
  menu();
  $("#modOv").classList.remove("hide");
}

function menu(): void {
  $("#modBody").innerHTML =
    `<h1>🎓 Подготовка к собеседованию</h1>` +
    `<p>Вопросы уровня реального DevOps-интервью: не «вспомни термин», а «объясни разницу» и «разбери сценарий». Выбери тему.</p>` +
    `<div class="iv-topics">` +
    TECH_TOPICS.map(
      (t) =>
        `<button class="iv-topic" data-t="${t.id}"><b>${esc(t.name)}</b>` +
        `<span>${t.questions.length} вопросов</span></button>`,
    ).join("") +
    `</div>` +
    `<button class="sec" id="ivClose">Закрыть</button>`;
  $("#ivClose").onclick = () => $("#modOv").classList.add("hide");
  $("#modBody")
    .querySelectorAll<HTMLButtonElement>(".iv-topic")
    .forEach((b) => {
      b.onclick = () => {
        const t = TECH_TOPICS.find((x) => x.id === b.dataset.t);
        if (t) run(t.name, t.questions);
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
    // варианты в банке всегда лежат правильным первым — перемешиваем, чтобы
    // самопроверка не превращалась в «жми первую кнопку».
    const order = q.options.map((_, k) => k);
    for (let a = order.length - 1; a > 0; a--) {
      const b = Math.floor(Math.random() * (a + 1));
      [order[a], order[b]] = [order[b], order[a]];
    }
    $("#modBody").innerHTML =
      `<h1>${esc(title)}</h1>` +
      `<div class="cr-progress">Вопрос ${i + 1} из ${questions.length}</div>` +
      `<div class="cr-q">${esc(q.q)}</div>` +
      `<div class="cr-opts">` +
      order.map((oi, k) => `<button class="lp-opt" data-k="${k}">${esc(q.options[oi])}</button>`).join("") +
      `</div>`;
    $("#modBody")
      .querySelectorAll<HTMLButtonElement>(".lp-opt")
      .forEach((btn) => {
        btn.onclick = () => {
          const ok = order[Number(btn.dataset.k)] === q.answer;
          if (ok) correct++;
          $("#modBody").innerHTML =
            `<h1>${esc(title)}</h1>` +
            `<div class="cr-verdict ${ok ? "cr-ok" : "cr-no"}">${
              ok ? "Верно" : "Неверно — правильный ответ ниже"
            }</div>` +
            `<div class="cr-q">${esc(q.options[q.answer])}</div>` +
            `<div class="cr-why">${esc(q.why)}</div>` +
            `<button class="prim" id="ivNext">${i + 1 < questions.length ? "Дальше →" : "Итог"}</button>`;
          $("#ivNext").onclick = () => {
            i++;
            step();
          };
        };
      });
  };

  step();
}
