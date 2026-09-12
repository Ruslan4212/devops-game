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
  /** id вакансии, которая сейчас является основным местом работы (или null) */
  currentJob: string | null;
  /** игрок прошёл собеседование в компанию */
  onHire: (jobId: string) => void;
  /** сделать одну из полученных вакансий текущей работой (или null — уволиться) */
  onSetCurrentJob: (jobId: string | null) => void;
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
    const isCurrent = d.currentJob === job.id;
    const need = blockers(job, d);
    const state = got
      ? isCurrent
        ? `<span class="cr-got">✓ текущая работа</span> <button class="cr-quit" data-quit="1">Уволиться</button>`
        : `<span class="cr-got">✓ оффер получен</span> <button class="cr-go" data-take="${job.id}">Сделать текущей работой</button>`
      : need.length
        ? `<span class="cr-lock">🔒 ${esc(need.join("; "))}</span>`
        : `<button class="cr-go" data-job="${job.id}">Пройти собеседование</button>`;
    return (
      `<div class="cr-job${got ? " cr-job-done" : ""}${isCurrent ? " cr-job-current" : ""}">` +
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

  const current = d.currentJob ? JOBS.find((j) => j.id === d.currentJob) : null;
  body.innerHTML =
    `<h1>💼 Карьера</h1>` +
    `<p>Ранг по курсу: <b>${esc(d.rankName)}</b>. Офферов получено: <b>${hired.length} / ${JOBS.length}</b>` +
    (hired.length ? `, максимальный грейд: <b>${esc(topGrade)}</b>` : "") +
    `.<br>` +
    (current
      ? `Текущая работа: <b>${esc(current.name)}</b> — ${esc(current.pay)}/мес приходит за пройденные уроки.`
      : `Текущей работы нет — платят только подработки за уроки. Выбери одну из полученных вакансий ниже.`) +
    `</p>` +
    `<div class="cr-jobs">${jobsHtml}</div>` +
    `<h2 class="cr-h2">Сюжет</h2>${storyHtml}` +
    `<button class="sec" id="crClose">Закрыть</button>`;

  $("#crClose").onclick = () => $("#modOv").classList.add("hide");
  body.querySelectorAll<HTMLButtonElement>("[data-job]").forEach((b) => {
    b.onclick = () => {
      const job = JOBS.find((j) => j.id === b.dataset.job);
      if (job) runInterview(job, d);
    };
  });
  body.querySelectorAll<HTMLButtonElement>("[data-take]").forEach((b) => {
    b.onclick = () => {
      const job = JOBS.find((j) => j.id === b.dataset.take);
      if (!job) return;
      d.onSetCurrentJob(job.id);
      toast("Теперь ты работаешь в «" + job.name + "» — зарплата " + job.pay + "/мес");
      renderList(d);
    };
  });
  body.querySelectorAll<HTMLButtonElement>("[data-quit]").forEach((b) => {
    b.onclick = () => {
      d.onSetCurrentJob(null);
      toast("Ты уволился. Пока платят только подработки за уроки.");
      renderList(d);
    };
  });
}

/** Имена тех-лидов/интервьюеров по вакансии — для ощущения живого диалога. */
const INTERVIEWERS: Record<string, string> = {
  pelmeni: "Марат, основатель",
  bait: "Игорь, техдиректор",
  pixel: "Аня, тимлид",
  dovoz: "Слава, CTO",
  stavka: "Дежурный инженер",
  oblako: "Панель из двух интервьюеров",
  polka: "Тимлид платформы",
  granit: "Лид SRE-команды",
  stream: "Архитектор платформы",
};

/** Один пузырь чата: кто говорит и что. */
function bubble(who: "lead" | "me", html: string): string {
  return (
    `<div class="iv-msg iv-msg-${who}">` +
    `<div class="iv-avatar">${who === "lead" ? "🧑‍💻" : "🙂"}</div>` +
    `<div class="iv-bubble">${html}</div>` +
    `</div>`
  );
}

function scrollChatToEnd(): void {
  const el = document.querySelector(".iv-chat");
  if (el) el.scrollTop = el.scrollHeight;
}

function runInterview(job: Job, d: CareerDeps): void {
  // ~60% технических вопросов по темам вакансии + ~40% поведенческих —
  // это ровно тот набор тем, который спрашивают на реальном собеседовании на эту роль
  const nTech = Math.max(1, Math.round(job.questions * 0.6));
  const tech = pickTechQuestions(jobTopics(job), nTech);
  const soft = pickQuestions(job.questions - tech.length);
  const qs: IvQuestion[] = shuffled([...tech, ...soft]).slice(0, job.questions);
  const interviewer = INTERVIEWERS[job.id] ?? "Тех-лид";
  let i = 0;
  let correct = 0;
  const transcript: string[] = [bubble("lead", esc(job.intro))];

  const header = (): string =>
    `<h1>${esc(job.name)}</h1><div class="cr-progress">Собеседует: ${esc(interviewer)} · вопрос ${Math.min(i + 1, qs.length)} из ${qs.length}</div>`;

  const finish = (): void => {
    const ratio = correct / qs.length;
    const passed = ratio >= job.pass;
    if (passed && !d.jobsGot[job.id]) {
      d.jobsGot[job.id] = true;
      d.onHire(job.id);
    }
    transcript.push(
      bubble(
        "lead",
        `<b>${passed ? "Оффер!" : "Не в этот раз."}</b> ${correct} из ${qs.length} верно (нужно ${Math.ceil(job.pass * qs.length)}).<br>` +
          (passed
            ? "Поздравляем — тебя берут."
            : "Пройди недостающие акты и вернись увереннее — расскажу, что смотрели."),
      ),
    );
    $("#modBody").innerHTML =
      header() +
      `<div class="iv-chat">${transcript.join("")}</div>` +
      `<button class="sec" id="crBack">К списку вакансий</button>`;
    if (passed) toast("Оффер: " + job.name + " ✓");
    $("#crBack").onclick = () => renderList(d);
    scrollChatToEnd();
  };

  const step = (): void => {
    if (i >= qs.length) return finish();
    const q: IvQuestion = qs[i];
    transcript.push(bubble("lead", esc(q.q)));
    $("#modBody").innerHTML =
      header() +
      `<div class="iv-chat">${transcript.join("")}</div>` +
      `<div class="cr-opts">` +
      q.options.map((o, k) => `<button class="lp-opt" data-k="${k}">${esc(o)}</button>`).join("") +
      `</div>`;
    $("#modBody")
      .querySelectorAll<HTMLButtonElement>(".lp-opt")
      .forEach((btn) => {
        btn.onclick = () => {
          const k = Number(btn.dataset.k);
          const ok = k === q.answer;
          if (ok) correct++;
          transcript.push(bubble("me", esc(q.options[k])));
          transcript.push(bubble("lead", `<b>${ok ? "Верно." : "Не совсем."}</b> ${esc(q.why)}`));
          $("#modBody").innerHTML =
            header() +
            `<div class="iv-chat">${transcript.join("")}</div>` +
            `<button class="prim" id="crNext">${i + 1 < qs.length ? "Дальше →" : "Итог"}</button>`;
          $("#crNext").onclick = () => {
            i++;
            step();
          };
          scrollChatToEnd();
        };
      });
    scrollChatToEnd();
  };

  step();
}
