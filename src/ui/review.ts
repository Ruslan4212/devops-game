import { icon } from "../data/ui-icons";
import { $, esc } from "./dom";
import { gradeAnswer } from "../engine/grader";
import {
  countToNumber,
  ensureMarathon,
  filterScope,
  isDue,
  isWrongItem,
  marathonSlice,
  pickSmartSession,
  recordAnswer,
  weakTopics,
  type ReviewCount,
  type ReviewItem,
  type ReviewMarathon,
  type ReviewScope,
  type ReviewStats,
} from "../engine/review";

export interface ReviewDeps {
  /** весь пул пройденного (строится движком из Progress.done) */
  pool: ReviewItem[];
  stats: () => ReviewStats;
  marathon: () => ReviewMarathon | undefined;
  /** сохраняет историю и круг «повторить всё» после каждого ответа */
  save: (stats: ReviewStats, marathon: ReviewMarathon | undefined) => void;
  /** уроки для выбора области: id, название, акт */
  lessons: { id: string; title: string; act: number }[];
  acts: { id: number; name: string }[];
  /** обязательное повторение блокирует игру, пока не пройдено; необязательное — можно закрыть в любой момент */
  mandatory: boolean;
  /** размер обязательной сессии */
  mandatorySize?: number;
  onDone: () => void;
  /** с какой области начать настройку (например, «Мои ошибки» → только ошибки) */
  scope?: ReviewScope;
}

type Mode = "smart" | "marathon";
type AnswerMode = "options" | "free";

interface Prefs {
  scope: ReviewScope;
  count: ReviewCount;
  mode: Mode;
  answer: AnswerMode;
}

const PREFS_KEY = "ops_review_prefs";
function loadPrefs(): Prefs {
  const def: Prefs = { scope: { kind: "all" }, count: 10, mode: "smart", answer: "options" };
  try {
    return { ...def, ...(JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") as Partial<Prefs>) };
  } catch {
    return def;
  }
}
function savePrefs(p: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* приватный режим */
  }
}

const close = (): void => {
  $("#modOv").classList.add("hide");
  // остальные модалки (собеседование, магазин…) — прежней ширины
  $("#modBody").classList.remove("rv-modal");
};

/**
 * Повторение пройденного. Один движок и для обязательной сессии (каждые N уроков),
 * и для свободной по кнопке: интервальное повторение по коробкам Лейтнера,
 * режим «повторить всё» по кругу, ответ вариантами (работает без сети)
 * или своими словами (ИИ-проверка с локальным запасным).
 */
export function openReviewSession(d: ReviewDeps): void {
  $("#modOv").classList.remove("hide");
  $("#modBody").classList.add("rv-modal");
  if (d.mandatory) {
    const items = pickSmartSession(d.pool, d.stats(), d.mandatorySize ?? 15, Date.now(), Math.random);
    // обязательное — вариантами: работает без сети и не застревает на самооценке
    runSession(d, items, { ...loadPrefs(), mode: "smart", answer: "options" }, "Обязательное повторение");
  } else {
    if (d.scope) savePrefs({ ...loadPrefs(), scope: d.scope });
    setup(d);
  }
}

function setup(d: ReviewDeps): void {
  const prefs = loadPrefs();
  const stats = d.stats();
  const now = Date.now();
  const due = d.pool.filter((it) => stats[it.key] && isDue(stats[it.key], now)).length;
  const fresh = d.pool.filter((it) => !stats[it.key]).length;
  const wrong = d.pool.filter((it) => isWrongItem(stats[it.key])).length;
  const boxes = [1, 2, 3, 4, 5].map((b) => d.pool.filter((it) => stats[it.key]?.box === b).length);
  const doneActs = d.acts.filter((a) => d.lessons.some((l) => l.act === a.id));
  const m = d.marathon();

  const pill = (on: boolean, attr: string, label: string): string =>
    `<button type="button" class="rv-pill${on ? " on" : ""}" ${attr}>${label}</button>`;
  const sc = prefs.scope;
  $("#modBody").innerHTML =
    `<h1>${icon("repeat", 22)}Повторение</h1>` +
    `<div class="rv-stats">` +
    `<div class="rv-stat"><b>${d.pool.length}</b><span>вопросов из пройденного</span></div>` +
    `<div class="rv-stat rv-due"><b>${due}</b><span>пора повторить</span></div>` +
    `<div class="rv-stat rv-new"><b>${fresh}</b><span>новых</span></div>` +
    `<div class="rv-stat rv-bad"><b>${wrong}</b><span>с ошибками</span></div>` +
    `</div>` +
    `<div class="rv-boxes" title="Коробки Лейтнера: верный ответ двигает вопрос правее — его спрашивают реже">` +
    boxes.map((n, i) => `<div class="rv-box"><span>коробка ${i + 1}</span><b>${n}</b></div>`).join("") +
    `</div>` +
    `<h3>Режим</h3><div class="rv-row">` +
    pill(prefs.mode === "smart", `data-mode="smart"`, "Умный: сначала то, что пора") +
    pill(
      prefs.mode === "marathon",
      `data-mode="marathon"`,
      `Повторить всё по кругу` + (m && m.pos < m.order.length ? ` · ${m.pos}/${m.order.length}` : ""),
    ) +
    `</div>` +
    `<h3>Что повторять</h3><div class="rv-row">` +
    pill(sc.kind === "all", `data-scope="all"`, "Всё пройденное") +
    pill(sc.kind === "wrong", `data-scope="wrong"`, `Только ошибки (${wrong})`) +
    `<select id="rvAct" class="rv-select"><option value="">По акту…</option>` +
    doneActs
      .map(
        (a) =>
          `<option value="${a.id}"${sc.kind === "act" && sc.act === a.id ? " selected" : ""}>Акт ${a.id}. ${esc(a.name)}</option>`,
      )
      .join("") +
    `</select>` +
    `<select id="rvLesson" class="rv-select"><option value="">По уроку…</option>` +
    d.lessons
      .map(
        (l) =>
          `<option value="${esc(l.id)}"${sc.kind === "lesson" && sc.id === l.id ? " selected" : ""}>${esc(l.id)} — ${esc(l.title)}</option>`,
      )
      .join("") +
    `</select></div>` +
    `<h3>Сколько за раз</h3><div class="rv-row">` +
    ([10, 25, 50, "all"] as ReviewCount[])
      .map((c) => pill(prefs.count === c, `data-count="${c}"`, c === "all" ? "Все" : String(c)))
      .join("") +
    `</div>` +
    `<h3>Как отвечать</h3><div class="rv-row">` +
    pill(prefs.answer === "options", `data-answer="options"`, "Выбором варианта (без сети)") +
    pill(prefs.answer === "free", `data-answer="free"`, "Своими словами (проверит наставник)") +
    `</div>` +
    `<div class="rv-scope-n" id="rvScopeN"></div>` +
    `<div class="rv-actions"><button class="prim" id="rvStart">Начать</button>` +
    `<button class="sec" id="rvClose">Закрыть</button></div>`;

  const body = $("#modBody");
  const scopeSize = (): number => filterScope(d.pool, prefs.scope, stats).length;
  const refresh = (): void => {
    savePrefs(prefs);
    setup(d);
  };
  body.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((b) => {
    b.onclick = () => ((prefs.mode = b.dataset.mode as Mode), refresh());
  });
  body.querySelectorAll<HTMLButtonElement>("[data-scope]").forEach((b) => {
    b.onclick = () => ((prefs.scope = { kind: b.dataset.scope as "all" | "wrong" }), refresh());
  });
  body.querySelectorAll<HTMLButtonElement>("[data-count]").forEach((b) => {
    const v = b.dataset.count!;
    b.onclick = () => ((prefs.count = v === "all" ? "all" : (Number(v) as ReviewCount)), refresh());
  });
  body.querySelectorAll<HTMLButtonElement>("[data-answer]").forEach((b) => {
    b.onclick = () => ((prefs.answer = b.dataset.answer as AnswerMode), refresh());
  });
  ($("#rvAct") as HTMLSelectElement).onchange = (e) => {
    const v = (e.target as HTMLSelectElement).value;
    prefs.scope = v ? { kind: "act", act: Number(v) } : { kind: "all" };
    refresh();
  };
  ($("#rvLesson") as HTMLSelectElement).onchange = (e) => {
    const v = (e.target as HTMLSelectElement).value;
    prefs.scope = v ? { kind: "lesson", id: v } : { kind: "all" };
    refresh();
  };
  const n = scopeSize();
  $("#rvScopeN").textContent = n
    ? `В выбранной области ${n} вопр.`
    : "В выбранной области пока нет вопросов.";
  ($("#rvStart") as HTMLButtonElement).disabled = !n;
  $("#rvClose").onclick = () => (close(), d.onDone());
  $("#rvStart").onclick = () => {
    const pool = filterScope(d.pool, prefs.scope, stats);
    const take = countToNumber(prefs.count, pool.length);
    let items: ReviewItem[];
    if (prefs.mode === "marathon") {
      const mar = ensureMarathon(d.marathon(), pool, prefs.scope, Math.random);
      d.save(d.stats(), mar);
      items = marathonSlice(mar, pool, take, Math.random);
    } else items = pickSmartSession(pool, stats, take, Date.now(), Math.random);
    runSession(d, items, prefs, prefs.mode === "marathon" ? "Повторить всё" : "Повторение");
  };
}

function runSession(d: ReviewDeps, items: ReviewItem[], prefs: Prefs, title: string): void {
  let i = 0;
  const results: { item: ReviewItem; correct: boolean }[] = [];
  const body = $("#modBody");

  const header = (): string => {
    const m = prefs.mode === "marathon" ? d.marathon() : undefined;
    const pct = Math.round((i / Math.max(1, items.length)) * 100);
    const box = items[i] ? (d.stats()[items[i].key]?.box ?? 0) : 0;
    return (
      `<div class="rv-head"><h1>${icon("repeat", 22)}${esc(title)}</h1>` +
      (d.mandatory ? "" : `<button class="sec rv-x" id="rvStop">Остановиться</button>`) +
      `</div>` +
      `<div class="rv-progress"><span>Вопрос ${Math.min(i + 1, items.length)} из ${items.length}` +
      (m ? ` · круг: ${m.pos} из ${m.order.length}` : "") +
      `</span><div class="bar"><i style="width:${pct}%"></i></div></div>` +
      (items[i]
        ? `<div class="rv-meta"><span class="rv-tag">${esc(items[i].topic)}</span>` +
          `<span class="rv-tag rv-tag-box">${box ? `коробка ${box}` : "новый"}</span></div>`
        : "")
    );
  };
  const wireStop = (): void => {
    const b = document.getElementById("rvStop");
    if (b) b.onclick = () => finish();
  };

  // «Остановиться» во время ИИ-проверки: запоздалый ответ не должен ни писать историю, ни перерисовывать итог
  let stopped = false;
  const record = (item: ReviewItem, ok: boolean): void => {
    if (stopped) return;
    results.push({ item, correct: ok });
    const stats = recordAnswer(d.stats(), item.key, ok, Date.now());
    const m = d.marathon();
    const inMarathon = prefs.mode === "marathon" && m && m.order[m.pos] === item.key;
    d.save(stats, inMarathon ? { ...m, pos: m.pos + 1 } : m);
  };

  const next = (): void => {
    i++;
    step();
  };

  const finish = (): void => {
    stopped = true;
    const correct = results.filter((r) => r.correct).length;
    const weak = weakTopics(results);
    const wrongItems = results.filter((r) => !r.correct).map((r) => r.item);
    const m = d.marathon();
    const more = prefs.mode === "marathon" && m && m.pos < m.order.length;
    body.innerHTML =
      `<h1>${icon("repeat", 22)}Итог</h1>` +
      `<div class="rv-score ${correct === results.length ? "ok" : ""}"><b>${correct} из ${results.length}</b> верно</div>` +
      (more
        ? `<p>Круг «повторить всё»: пройдено ${m.pos} из ${m.order.length}. Можно продолжить позже с этого места.</p>`
        : "") +
      (weak.length
        ? `<h3>Слабые темы — стоит перечитать</h3><ul class="rv-weak">${weak.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`
        : results.length
          ? `<p>Ошибок нет — всё держится крепко.</p>`
          : "") +
      `<div class="rv-actions">` +
      (wrongItems.length
        ? `<button class="prim" id="rvRetry">Повторить ошибки (${wrongItems.length})</button>`
        : "") +
      (more && !d.mandatory ? `<button class="prim" id="rvMore">Следующая порция</button>` : "") +
      (d.mandatory ? "" : `<button class="sec" id="rvSetup">К настройкам</button>`) +
      `<button class="${wrongItems.length ? "sec" : "prim"}" id="rvDone">${d.mandatory ? "Продолжить учёбу" : "Закрыть"}</button>` +
      `</div>`;
    const retry = document.getElementById("rvRetry");
    if (retry)
      retry.onclick = () => runSession(d, wrongItems, { ...prefs, mode: "smart" }, "Работа над ошибками");
    const moreBtn = document.getElementById("rvMore");
    const setupBtn = document.getElementById("rvSetup");
    if (setupBtn) setupBtn.onclick = () => setup(d);
    $("#rvDone").onclick = () => (close(), d.onDone());
    if (moreBtn)
      moreBtn.onclick = () => {
        setup(d);
        $("#rvStart").click();
      };
  };

  const explain = (item: ReviewItem, ok: boolean, text: string): string =>
    `<div class="rv-feedback ${ok ? "ok" : "bad"}"><b>${ok ? "Верно." : "Не совсем."}</b> ${text}</div>`;

  const nextBtn = (): string =>
    `<div class="rv-actions"><button class="prim" id="rvNext">${i + 1 < items.length ? "Дальше" : "К итогу"}</button></div>`;
  const wireNext = (): void => {
    const b = $("#rvNext");
    b.onclick = next;
    b.focus();
  };

  const step = (): void => {
    if (i >= items.length) return finish();
    const item = items[i];
    const q = `<div class="rv-q">${esc(item.q)}</div>`;
    if (prefs.answer === "options") {
      body.innerHTML =
        header() +
        q +
        `<div class="rv-opts">` +
        item.options
          .map((o, k) => `<button class="rv-opt" data-k="${k}"><span>${k + 1}</span>${esc(o)}</button>`)
          .join("") +
        `</div>`;
      wireStop();
      body.querySelectorAll<HTMLButtonElement>(".rv-opt").forEach((b) => {
        b.onclick = () => {
          const k = Number(b.dataset.k);
          const ok = k === item.answer;
          record(item, ok);
          body.querySelectorAll<HTMLButtonElement>(".rv-opt").forEach((x) => {
            x.disabled = true;
            const xk = Number(x.dataset.k);
            if (xk === item.answer) x.classList.add("right");
            else if (xk === k) x.classList.add("wrong");
          });
          body.insertAdjacentHTML("beforeend", explain(item, ok, esc(item.why)) + nextBtn());
          wireNext();
        };
      });
      return;
    }
    body.innerHTML =
      header() +
      q +
      `<textarea class="lp-quiz-input" id="rvAnswer" rows="3" placeholder="Ответь своими словами…"></textarea>` +
      `<div class="rv-actions"><button class="prim" id="rvSend">Проверить</button></div>`;
    wireStop();
    ($("#rvAnswer") as HTMLTextAreaElement).focus();
    const selfGrade = (): void => {
      if (stopped) return;
      body.innerHTML =
        header() +
        q +
        `<div class="rv-feedback"><b>Правильный ответ:</b> ${esc(item.options[item.answer])}<br>${esc(item.why)}</div>` +
        `<div class="callout callout-info">Сверь со своим ответом и оцени честно.</div>` +
        `<div class="rv-actions"><button class="prim" id="rvRight">${icon("check", 16)}У меня было верно</button>` +
        `<button class="sec" id="rvWrong">${icon("x", 16)}Ошибся</button></div>`;
      wireStop();
      const once = (ok: boolean) => (): void => {
        body.querySelectorAll<HTMLButtonElement>("#rvRight, #rvWrong").forEach((b) => (b.disabled = true));
        record(item, ok);
        next();
      };
      $("#rvRight").onclick = once(true);
      $("#rvWrong").onclick = once(false);
    };
    $("#rvSend").onclick = () => {
      const mine = ($("#rvAnswer") as HTMLTextAreaElement).value.trim();
      $("#rvSend").setAttribute("disabled", "");
      body.insertAdjacentHTML(
        "beforeend",
        `<div class="lp-tip lp-loading">${icon("mentor", 15)}Наставник проверяет…</div>`,
      );
      gradeAnswer({
        question: item.q,
        options: item.options,
        answerIx: item.answer,
        explain: item.why,
        userAnswer: mine,
      })
        .then((r) => {
          // локальная проверка по словам может отклонить законный пересказ — тогда даём оценить себя
          if (stopped) return;
          if (r.local && !r.correct) return selfGrade();
          record(item, r.correct);
          body.innerHTML =
            header() +
            q +
            explain(item, r.correct, esc(r.feedback)) +
            `<div class="rv-feedback"><b>Эталон:</b> ${esc(item.options[item.answer])}</div>` +
            nextBtn();
          wireStop();
          wireNext();
        })
        .catch(selfGrade);
    };
  };

  step();
}
