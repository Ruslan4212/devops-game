/**
 * Иконки интерфейса — Phosphor Icons, вес duotone (MIT, см. phosphor.ts).
 *
 * Один набор на всё приложение: общая сетка 256, у каждой иконки контур
 * (`currentColor`) и мягкая подложка `.ico-tone` в акцентном цвете. Тема
 * переключает только цвета в CSS, разметка одна.
 */
import { PHOSPHOR } from "./phosphor";

/** Имя в интерфейсе → имя Phosphor. Старые имена сохранены для вызывающего кода. */
const UI_ICONS: Record<string, string> = {
  book: "book-open",
  user: "user",
  bag: "shopping-bag",
  briefcase: "briefcase",
  medal: "medal",
  chat: "chat-circle-text",
  award: "certificate",
  cloud: "cloud",
  bolt: "lightning",
  help: "question",
  reset: "arrow-counter-clockwise",
  more: "dots-three",
  repeat: "repeat",
  eye: "eye",
  keyboard: "keyboard",
  target: "target",
  brain: "brain",
  check: "check",
  x: "x",
  warning: "warning",
  bulb: "lightbulb",
  lock: "lock",
  calendar: "calendar-blank",
  mentor: "chalkboard-teacher",
  map: "map-trifold",
  bug: "bug",
  trophy: "trophy",
  party: "confetti",
  sync: "arrows-clockwise",
  heart: "heart",
  flag: "flag",
  moon: "moon",
  sun: "sun",
  download: "download-simple",
  terminal: "terminal-window",
  cap: "graduation-cap",
  coins: "coins",
  fire: "fire",
  star: "star",
  smile: "smiley",
  code: "code",
  wallet: "wallet",
  arrow: "arrow-right",
  up: "arrow-up",
  info: "info",
  ok: "check-circle",
  fail: "x-circle",
  clock: "clock",
  robot: "robot",
  rocket: "rocket-launch",
  search: "magnifying-glass",
  rank: "ranking",
  food: "fork-knife",
  health: "thermometer",
  chart: "chart-bar",
  gear: "gear",
  menu: "list",
  contrast: "circle-half",
};

/** Иконка Phosphor по её собственному имени (магазин, плитки). Неизвестное имя — пустая строка. */
export function phIcon(name: string, size = 18): string {
  const g = PHOSPHOR[name];
  if (!g) return "";
  return (
    `<svg class="ico" viewBox="0 0 256 256" width="${size}" height="${size}" fill="currentColor" ` +
    `aria-hidden="true" focusable="false"><path class="ico-tone" d="${g.tone}"/><path d="${g.line}"/></svg>`
  );
}

/**
 * Иконка по имени интерфейса; `size` — сторона квадрата в пикселях (16/20/24
 * выровнены по сетке). Цвет контура наследуется от текста.
 */
export function icon(name: string, size = 18): string {
  const ph = UI_ICONS[name];
  return ph ? phIcon(ph, size) : "";
}

export const iconNames = Object.keys(UI_ICONS);

/** Подставляет значки в статическую разметку: `<span data-ico="map" data-ico-size="20">`. */
export function hydrateIcons(root: ParentNode = document): void {
  for (const el of root.querySelectorAll<HTMLElement>("[data-ico]")) {
    el.innerHTML = icon(el.dataset.ico ?? "", Number(el.dataset.icoSize) || 20);
  }
}
