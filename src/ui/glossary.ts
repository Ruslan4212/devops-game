import { $, esc } from "./dom";
import { searchGlossary } from "../data/glossary";
import type { GlossaryRow } from "../data/glossary";

/**
 * Глоссарий команд и флагов в модальном окне. Открывается кнопкой «📖 команды»
 * в шапке и доступен из любого места курса. Поиск — по имени команды, флагу
 * или слову из объяснения.
 */
export function openGlossary(): void {
  const body = $("#modBody");
  body.innerHTML =
    `<h1>📖 Глоссарий команд</h1>` +
    `<p>Все команды симулятора с флагами и подкомандами. Ищи по названию, флагу или смыслу.</p>` +
    `<input id="glosQ" class="glos-q" placeholder="например: grep -v  или  откатить коммит" autocomplete="off" spellcheck="false" />` +
    `<div class="glos-list" id="glosList"></div>` +
    `<button class="sec" id="glosClose">Закрыть</button>`;

  const list = $("#glosList");
  const render = (q: string): void => {
    const rows = searchGlossary(q);
    list.innerHTML = rows.length
      ? rows.map(rowHtml).join("")
      : `<div class="glos-empty">Ничего не найдено</div>`;
  };
  render("");

  const q = $<HTMLInputElement>("#glosQ");
  q.oninput = () => render(q.value);

  $("#modOv").classList.remove("hide");
  $("#glosClose").onclick = () => $("#modOv").classList.add("hide");
  q.focus();
}

function rowHtml(r: GlossaryRow): string {
  if (r.head) {
    return `<div class="glos-head"><code>${esc(r.tok)}</code><span>${esc(r.d)}</span></div>`;
  }
  const cls = r.flag ? "glos-row glos-flag" : "glos-row";
  return `<div class="${cls}"><code>${esc(r.tok)}</code><span>${esc(r.d)}</span></div>`;
}
