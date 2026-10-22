import { filledIconNames, icon, iconNames } from "../data/ui-icons";
import { esc } from "./dom";

/** Dev-страница `?icons`: все иконки, контур и заливка, 16/20/24 px — для проверки глазами и скриншота. */
export function renderIconsSheet(root: HTMLElement): void {
  const sizes = [16, 20, 24];
  const row = (name: string): string =>
    `<tr><td class="is-name">${esc(name)}</td>` +
    sizes.map((s) => `<td>${icon(name, s)}</td>`).join("") +
    sizes
      .map((s) => `<td>${filledIconNames.includes(name) ? icon(name, s, { filled: true }) : "·"}</td>`)
      .join("") +
    `</tr>`;
  root.innerHTML =
    `<div style="padding:24px;max-width:760px;margin:0 auto;font-family:var(--font, sans-serif);color:var(--text)">` +
    `<h1>Иконки (Tabler, MIT)</h1>` +
    `<table style="border-collapse:collapse;width:100%">` +
    `<thead><tr><th align="left">имя</th><th colspan="3">контур 16/20/24</th><th colspan="3">заливка 16/20/24</th></tr></thead>` +
    `<tbody>${iconNames.map(row).join("")}</tbody></table></div>`;
}
