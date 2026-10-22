/**
 * Терминал не висит под уроком всё время: на шагах «смотри»/«повтори»/«задача»
 * он встраивается прямо в карточку урока (в место #termSlot), в «Терминале-тренажёре» —
 * на его страницу, а в остальное время ждёт в скрытой «парковке» #termPark.
 * Узел переносится целиком, поэтому вывод, ввод и обработчики не теряются.
 */
const panel = (): HTMLElement => document.getElementById("termPanel")!;

/** Убрать терминал в парковку — до того, как контейнер, где он стоял, перерисуют через innerHTML. */
export function parkTerminal(): void {
  const p = panel();
  const park = document.getElementById("termPark")!;
  if (p.parentElement !== park) park.appendChild(p);
}

/** Встроить терминал в указанный контейнер (место в карточке урока или страница тренажёра). */
export function mountTerminal(host: HTMLElement): void {
  host.appendChild(panel());
  const out = document.getElementById("out");
  if (out) out.scrollTop = out.scrollHeight;
}
