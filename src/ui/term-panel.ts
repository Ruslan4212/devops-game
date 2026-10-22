/**
 * Терминал — нижняя панель основной колонки (как плеер в english-b2 — под карточкой урока).
 * Высоту меняют перетаскиванием разделителя (мышь, тач, стрелки), панель можно свернуть
 * до заголовка; оба значения запоминаются. На шагах, где нужна команда, панель
 * раскрывается сама — строка ввода всегда видна, когда урок её просит.
 */
const H_KEY = "ops_term_h";
const C_KEY = "ops_term_collapsed";
const MIN_H = 140;
const maxH = (): number => Math.round(window.innerHeight * 0.7);
const clampH = (h: number): number => Math.max(MIN_H, Math.min(maxH(), Math.round(h)));

let panel: HTMLElement;
let toggle: HTMLButtonElement;
let curH = 0;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, v: string): void {
  try {
    localStorage.setItem(key, v);
  } catch {
    /* приватный режим */
  }
}

function setHeight(h: number, save = true): void {
  const v = clampH(h);
  curH = v;
  panel.style.setProperty("--term-h", v + "px");
  document.getElementById("termSplit")?.setAttribute("aria-valuenow", String(v));
  if (save) write(H_KEY, String(v));
}

export function setTerminalCollapsed(collapsed: boolean, save = true): void {
  panel.classList.toggle("collapsed", collapsed);
  toggle.setAttribute("aria-expanded", String(!collapsed));
  toggle.title = collapsed ? "Развернуть терминал" : "Свернуть терминал";
  if (save) write(C_KEY, collapsed ? "1" : "0");
}

/**
 * На телефоне экран делят текст и терминал: на шагах «читай»/«вопрос» терминал
 * сворачиваем до заголовка (не запоминая), чтобы текст шага было видно целиком.
 */
export function yieldToText(): void {
  if (panel && window.matchMedia("(max-width: 720px)").matches) setTerminalCollapsed(true, false);
}

/** Шаг просит команду — панель должна быть открыта (выбор пользователя не перезаписываем). */
export function revealTerminal(): void {
  if (panel?.classList.contains("collapsed")) setTerminalCollapsed(false, false);
}

export function initTermPanel(): void {
  panel = document.getElementById("termPanel")!;
  toggle = document.getElementById("termToggle") as HTMLButtonElement;
  const split = document.getElementById("termSplit")!;
  const saved = Number(read(H_KEY));
  setHeight(saved || window.innerHeight * 0.38, false);
  setTerminalCollapsed(read(C_KEY) === "1", false);
  toggle.onclick = () => setTerminalCollapsed(!panel.classList.contains("collapsed"));

  split.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    split.setPointerCapture(e.pointerId);
    if (panel.classList.contains("collapsed")) setTerminalCollapsed(false);
    const startY = e.clientY;
    const startH = curH;
    panel.classList.add("dragging");
    const move = (ev: PointerEvent): void => setHeight(startH + (startY - ev.clientY), false);
    const up = (ev: PointerEvent): void => {
      setHeight(startH + (startY - ev.clientY));
      panel.classList.remove("dragging");
      split.removeEventListener("pointermove", move);
      split.removeEventListener("pointerup", up);
    };
    split.addEventListener("pointermove", move);
    split.addEventListener("pointerup", up);
  });
  split.addEventListener("keydown", (e) => {
    const cur = curH;
    if (e.key === "ArrowUp") setHeight(cur + 24);
    else if (e.key === "ArrowDown") setHeight(cur - 24);
    else if (e.key === "Enter") setTerminalCollapsed(!panel.classList.contains("collapsed"));
    else return;
    e.preventDefault();
  });
  window.addEventListener("resize", () => setHeight(curH, false));
}
