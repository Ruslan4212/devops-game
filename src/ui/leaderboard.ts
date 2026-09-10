import { $, esc } from "./dom";
import { fetchLeaderboard, isConfigured } from "../sync/cloud";
import type { LeaderRow } from "../sync/cloud";

/**
 * Таблица лидеров. Показывает публичную витрину: имя, ранг, XP и число
 * пройденных уроков. Ничего личного там нет — витрина открыта на чтение всем,
 * а состав полей задан в supabase_schema.sql.
 */
export async function openLeaderboard(): Promise<void> {
  const body = $("#modBody");
  const shell = (inner: string): void => {
    body.innerHTML = `<h1>🏅 Рейтинг</h1>${inner}<button class="sec" id="lbClose">Закрыть</button>`;
    $("#lbClose").onclick = () => $("#modOv").classList.add("hide");
  };

  shell(`<p>Загружаю таблицу лидеров…</p>`);
  $("#modOv").classList.remove("hide");

  if (!isConfigured) {
    shell(`<p>Облако не подключено к этой сборке, поэтому рейтинга нет.</p>`);
    return;
  }

  const res = await fetchLeaderboard(50);
  if (!res.ok) {
    shell(`<p>Не удалось загрузить рейтинг: ${esc(res.error)}</p>`);
    return;
  }

  const { rows, meId } = res.value;
  if (!rows.length) {
    shell(`<p>Пока пусто. Войди в аккаунт и пройди пару уроков — попадёшь в таблицу первым.</p>`);
    return;
  }

  const inMe = meId ? rows.findIndex((r) => r.id === meId) : -1;
  const footer = !meId
    ? `<div class="kb">Войди в аккаунт, чтобы попасть в рейтинг.</div>`
    : inMe < 0
      ? `<div class="kb">Тебя пока нет в первой полусотне — пройди ещё несколько уроков.</div>`
      : "";

  shell(
    `<p>Топ игроков по опыту. Ты попадаешь сюда автоматически, когда выполнен вход.</p>` +
      `<div class="lb-list">` +
      `<div class="lb-row lb-head"><span>#</span><span>Игрок</span><span>Ранг</span><span>Уроки</span><span>XP</span></div>` +
      rows.map((r, i) => rowHtml(r, i + 1, r.id === meId)).join("") +
      `</div>` +
      footer,
  );
}

function rowHtml(r: LeaderRow, place: number, me: boolean): string {
  const medal = place === 1 ? "🥇" : place === 2 ? "🥈" : place === 3 ? "🥉" : String(place);
  return (
    `<div class="lb-row${me ? " lb-me" : ""}">` +
    `<span>${medal}</span>` +
    `<span>${esc(r.username)}${me ? " · ты" : ""}</span>` +
    `<span>${esc(r.rank_name)}</span>` +
    `<span>${r.missions_done}</span>` +
    `<span>${r.xp}</span>` +
    `</div>`
  );
}
