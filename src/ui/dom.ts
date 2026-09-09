export const $ = <T extends HTMLElement = HTMLElement>(sel: string): T =>
  document.querySelector(sel) as T;

export const esc = (s: unknown): string =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

let toastTimer: number | undefined;
export function toast(text: string): void {
  const el = $("#toast");
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove("show"), 2800);
}

/**
 * Пока открыто окно поверх, строка терминала отключается:
 * иначе набранный текст молча уходит в невидимое поле.
 */
export function lockInput(on: boolean): void {
  const i = $<HTMLInputElement>("#cmd");
  if (!i) return;
  i.disabled = on;
  if (!on) setTimeout(() => i.focus(), 30);
}
