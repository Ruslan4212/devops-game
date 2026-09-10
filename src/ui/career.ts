import { $, esc, toast } from "./dom";
import { JOBS, STORY, jobTopics, pickQuestions } from "../data/careers";
import type { Job, SoftQuestion } from "../data/careers";
import { pickTechQuestions } from "../data/interview";
import type { TechQuestion } from "../data/interview";

type IvQuestion = SoftQuestion | TechQuestion;

function shuffled<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface CareerDeps {
  /** пройден ли акт N целиком */
  actDone: (act: number) => boolean;
  /** выполнен ли капстоун */
  capstone: boolean;
  /** сколько уроков курса пройдено (для сюжетных вех) */
  lessonsDone: number;
  /** текущий ранг игрока */
  rankName: string;
  /** какие вакансии уже получены */
  jobsGot: Record<string, boolean>;
  /** игрок прошёл собеседование в компанию */
  onHire: (jobId: string) => void;
}

const GRADE_RU: Record<Job["grade"], string> = {
  intern: "стажёр",
  junior: "junior",
  "junior+": "junior+",
  "middle-": "middle−",
  middle: "middle",
};

/** Чего не хватает для вакансии — человекочитаемо. Пусто, если всё готово. */
function blockers(job: Job, d: CareerDeps): string[] {
  const missing = job.reqActs.filter((a) => !d.actDone(a));
  const out: string[] = [];
  if (missing.length) out.push("пройди акт" + (missing.length > 1 ? "ы" : "") + " " + missing.join(", "));
  if (job.reqCapstone && !d.capstone) out.push("выполни капстоун");
  return out;
}

export function openCareer(d: CareerDeps): void {
  renderList(d);
  $("#modOv").classList.remove("hide");
}

function renderList(d: CareerDeps): void {
  const body = $("#modBody");
  const hired = JOBS.filter((j) => d.jobsGot[j.id]);
  const topGrade = hired.length ? GRADE_RU[hired[hired.length - 1].grade] : "—";

  const jobsHtml = JOBS.map((job) => {
    const got = !!d.jobsGot[job.id];
    const need = blockers(job, d);
    const state = got
      ? `<span class="cr-got">✓ оффер получен</span>`
      : need.length
        ? `<span class="cr-lock">🔒 ${esc(need.join("; "))}</span>`
        : `<button class="cr-go" data-job="${job.id}">Пройти собеседование</button>`;
    return (
      `<div class="cr-job${got ? " cr-job-done" : ""}">` +
      `<div class="cr-job-h"><b>${esc(job.name)}</b><span>${esc(GRADE_RU[job.grade])} · ${esc(job.pay)}</span></div>` +
      `<div class="cr-job-tag">${esc(job.tag)}</div>` +
      `<div class="cr-job-desc">${esc(job.desc)}</div>` +
      `<div class="cr-job-req">Требования: акты ${job.reqActs.join(", ")}${job.reqCapstone ? " + капстоун" : ""}</div>` +
      state +
      `</div>`
    );
  }).join("");

  const storyHtml = STORY.map((s) => {
    const open = d.lessonsDone >= s.needLessons;
    return (
      `<details class="cr-story"${open ? "" : " data-locked"}>` +
      `<summary>${open ? "" : "🔒 "}${esc(s.act)} · ${esc(s.title)}</summary>` +
      (open
        ? `<p>${esc(s.body)}</p>`
        : `<p class="cr-lock">Откроется после ${s.needLessons} пройденных уроков.</p>`) +
      `</details>`
    );
  }).join("");

  body.innerHTML =
    `<h1>💼 Карьера</h1>` +
    `<p>Ранг по курсу: <b>${esc(d.rankName)}</b>. Офферов получено: <b>${hired.length} / ${JOBS.length}</b>` +
    (hired.length ? `, максимальный грейд: <b>${esc(topGrade)}</b>` : "") +
    `.</p>` +
    `<div class="cr-jobs">${jobsHtml}</div>` +
    `<h2 class="cr-h2">Сюжет</h2>${storyHtml}` +
    `<button class="sec" id="crClose">Закрыть</button>`;

  $("#crClose").onclick = () => $("#modOv").classList.add("hide");
  body.querySelectorAll<HTMLButtonElement>(".cr-go").forEach((b) => {
    b.onclick = () => {
      const job = JOBS.find((j) => j.id === b.dataset.job);
      if (job) runInterview(job, d);
    };
  });
}

function runInterview(job: Job, d: CareerDeps): void {
  // ~60% технических вопросов по темам вакансии + ~40% поведенческих
  const nTech = Math.max(1, Math.round(job.questions * 0.6));
  const tech = pickTechQuestions(jobTopics(job), nTech);
  const soft = pickQuestions(job.questions - tech.length);
  const qs: IvQuestion[] = shuffled([...tech, ...soft]).slice(0, job.questions);
  let i = 0;
  let correct = 0;

  const finish = (): void => {
    const ratio = correct / qs.length;
    const passed = ratio >= job.pass;
    if (passed && !d.jobsGot[job.id]) {
      d.jobsGot[job.id] = true;
      d.onHire(job.id);
    }
    $("#modBody").innerHTML =
      `<h1>${esc(job.name)}</h1>` +
      `<div class="cr-verdict ${passed ? "cr-ok" : "cr-no"}">` +
      `${passed ? "Оффер!" : "Не в этот раз"} — ${correct} из ${qs.length} верно ` +
      `(нужно ${Math.ceil(job.pass * qs.length)})</div>` +
      `<p>${passed ? "Поздравляем — тебя берут." : "Пройди недостающие акты и вернись увереннее."}</p>` +
      `<button class="sec" id="crBack">К списку вакансий</button>`;
    if (passed) toast("Оффер: " + job.name + " ✓");
    $("#crBack").onclick = () => renderList(d);
  };

  const step = (): void => {
    if (i >= qs.length) return finish();
    const q: IvQuestion = qs[i];
    $("#modBody").innerHTML =
      `<h1>${esc(job.name)}</h1>` +
      `<p class="cr-intro">${esc(job.intro)}</p>` +
      `<div class="cr-progress">Вопрос ${i + 1} из ${qs.length}</div>` +
      `<div class="cr-q">${esc(q.q)}</div>` +
      `<div class="cr-opts">` +
      q.options.map((o, k) => `<button class="lp-opt" data-k="${k}">${esc(o)}</button>`).join("") +
      `</div>`;
    $("#modBody")
      .querySelectorAll<HTMLButtonElement>(".lp-opt")
      .forEach((btn) => {
        btn.onclick = () => {
          const ok = Number(btn.dataset.k) === q.answer;
          if (ok) correct++;
          $("#modBody").innerHTML =
            `<h1>${esc(job.name)}</h1>` +
            `<div class="cr-verdict ${ok ? "cr-ok" : "cr-no"}">${ok ? "Верно" : "Не тот ответ"}</div>` +
            `<div class="cr-why">${esc(q.why)}</div>` +
            `<button class="prim" id="crNext">${i + 1 < qs.length ? "Дальше →" : "Итог"}</button>`;
          $("#crNext").onclick = () => {
            i++;
            step();
          };
        };
      });
  };

  step();
}
