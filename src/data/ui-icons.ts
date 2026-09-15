/**
 * Иконки интерфейса: шапка, панель урока, служебные состояния.
 *
 * Раньше здесь стояли эмодзи. Они выглядят чужеродно — каждая система рисует
 * их по-своему, у всех разный вес и цвет, и палитре игры они не подчиняются.
 * Это один контурный набор: общая сетка 24×24, одна толщина линии, цвет
 * наследуется от текста через `currentColor`, поэтому иконка одинаково живёт
 * и в активной кнопке, и в приглушённой.
 */

const ICONS: Record<string, string> = {
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19a1 1 0 0 1 1 1v13.5"/><path d="M6.5 16H20v3.5a1.5 1.5 0 0 1-1.5 1.5H6.5A2.5 2.5 0 0 1 4 18.5v-13"/><path d="M8 7.5h7"/>',
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M5.5 20.5a6.5 6.5 0 0 1 13 0"/>',
  bag: '<path d="M5 10.5A4.5 4.5 0 0 1 9.5 6h5A4.5 4.5 0 0 1 19 10.5V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M9 6V5a3 3 0 0 1 6 0v1"/><path d="M9 14h6"/>',
  briefcase:
    '<rect x="3" y="7.5" width="18" height="12.5" rx="2.2"/><path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5"/><path d="M3 12.5h18"/>',
  medal:
    '<circle cx="12" cy="14.5" r="5"/><path d="M8.5 9.8L6 3h12l-2.5 6.8"/><path d="M12 12.4l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2L8.8 14.7l2.2-.3z"/>',
  chat: '<path d="M20 15a2.5 2.5 0 0 1-2.5 2.5H9l-4.5 3.5V6.5A2.5 2.5 0 0 1 7 4h10.5A2.5 2.5 0 0 1 20 6.5z"/><path d="M9 9h7M9 12.5h4.5"/>',
  award: '<circle cx="12" cy="9.5" r="5.5"/><path d="M8.5 14.2L7 21l5-2.4 5 2.4-1.5-6.8"/>',
  cloud: '<path d="M7.5 19a4.5 4.5 0 0 1-.5-8.97A6 6 0 0 1 18.6 10.4 4.3 4.3 0 0 1 17.8 19z"/>',
  bolt: '<path d="M13.5 3L5 13.5h6L10.5 21 19 10.5h-6z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.1-2.4 3.8"/><path d="M12 17.2h.01"/>',
  reset: '<path d="M4 12a8 8 0 1 1 2.6 5.9"/><path d="M4 19v-5h5"/>',
  eye: '<path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  keyboard:
    '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M9.5 10h.01M13 10h.01M16.5 10h.01M8 14h8"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  brain:
    '<path d="M12 5.5a3 3 0 0 0-5.7 1.3A3 3 0 0 0 5 12a3 3 0 0 0 1.7 2.7A3 3 0 0 0 12 18.5z"/><path d="M12 5.5a3 3 0 0 1 5.7 1.3A3 3 0 0 1 19 12a3 3 0 0 1-1.7 2.7A3 3 0 0 1 12 18.5z"/><path d="M12 5.5v13"/>',
  check: '<path d="M4.5 12.5l5 5 10-11"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.4"/><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7"/>',
  calendar:
    '<rect x="3.5" y="5.5" width="17" height="15" rx="2.2"/><path d="M3.5 10h17M8.5 3.5v4M15.5 3.5v4"/>',
  mentor:
    '<circle cx="12" cy="7.5" r="3.2"/><path d="M6 20.5a6 6 0 0 1 12 0"/><path d="M17.5 4.5l3-1.5-1 3"/>',
};

/**
 * Иконка по имени; `size` — сторона квадрата в пикселях. Цвет не задаётся
 * намеренно: иконка наследует цвет текста, поэтому для состояний кнопки
 * не нужны отдельные варианты.
 */
export function icon(name: string, size = 18): string {
  const body = ICONS[name];
  if (!body) return "";
  return (
    `<svg class="ico" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" ` +
    `stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ` +
    `aria-hidden="true" focusable="false">${body}</svg>`
  );
}

export const iconNames = Object.keys(ICONS);
