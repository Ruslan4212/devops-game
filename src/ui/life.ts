import { $, esc, toast } from "./dom";
import { CARS, CLOTHES, FOOD, HOMES, TECH, TRIPS } from "../data/shop";
import { buy, eat, xpEarnBonusPct } from "../engine/life";
import type { BuyKind, Life } from "../engine/life";

export interface LifeDeps {
  life: Life;
  /** сохранить прогресс после покупки */
  persist: () => void;
}

const RUB = (n: number): string => n.toLocaleString("ru-RU") + " ₽";
const TABS = ["Еда", "Одежда", "Жильё", "Авто", "Техника", "Отдых"] as const;
type Tab = (typeof TABS)[number];

export function openLife(d: LifeDeps): void {
  let tab: Tab = "Еда";

  const render = (): void => {
    const l = d.life;
    const body = $("#modBody");
    body.innerHTML =
      `<h1>🎒 Жизнь</h1>` +
      `<div class="lf-wallet">${RUB(l.money)}` +
      `<span>+${xpEarnBonusPct(l)}% к XP · заработано ${RUB(l.totalEarned)}</span></div>` +
      bar("Сытость", l.hunger) +
      bar("Здоровье", l.health) +
      bar("Настроение", l.mood) +
      `<div class="lf-tabs">` +
      TABS.map(
        (t) => `<button class="lf-tab${t === tab ? " lf-tab-on" : ""}" data-tab="${t}">${t}</button>`,
      ).join("") +
      `</div>` +
      `<div class="lf-items">${itemsHtml(tab, l)}</div>` +
      `<button class="sec" id="lfClose">Закрыть</button>`;

    $("#lfClose").onclick = () => $("#modOv").classList.add("hide");
    body.querySelectorAll<HTMLButtonElement>(".lf-tab").forEach((b) => {
      b.onclick = () => {
        tab = b.dataset.tab as Tab;
        render();
      };
    });
    body.querySelectorAll<HTMLButtonElement>("[data-buy]").forEach((b) => {
      b.onclick = () => {
        const [kind, id] = (b.dataset.buy ?? "").split("|");
        const r = kind === "eat" ? eat(l, id) : buy(l, kind as BuyKind, id);
        if (r.ok) {
          d.persist();
          render();
        } else {
          toast(r.error);
        }
      };
    });
  };

  render();
  $("#modOv").classList.remove("hide");
}

function bar(label: string, v: number): string {
  const w = Math.max(0, Math.min(100, v));
  return `<div class="lf-bar"><span>${label}</span><i><b style="width:${w}%"></b></i><em>${Math.round(v)}</em></div>`;
}

function card(name: string, price: string, desc: string, actionHtml: string): string {
  return (
    `<div class="lf-card">` +
    `<div class="lf-card-h"><b>${esc(name)}</b><span>${esc(price)}</span></div>` +
    `<div class="lf-card-d">${esc(desc)}</div>` +
    actionHtml +
    `</div>`
  );
}

const btn = (kind: string, id: string, label: string): string =>
  `<button class="lf-buy" data-buy="${kind}|${id}">${esc(label)}</button>`;
const dead = (label: string): string => `<button class="lf-buy" disabled>${esc(label)}</button>`;

function itemsHtml(tab: Tab, l: Life): string {
  if (tab === "Еда") {
    return FOOD.map((f) => card(f.n, RUB(f.p), `${f.d} (+${f.h} сытость)`, btn("eat", f.id, "Съесть"))).join(
      "",
    );
  }
  if (tab === "Одежда") {
    return CLOTHES.map((c) => {
      const owned = c.owned || l.own.includes("cl:" + c.id);
      const worn = l.wear[c.slot] === c.id;
      const label = owned ? "Надеть" : "Купить и надеть";
      return card(
        c.n + (c.slot === "top" ? " · верх" : " · обувь"),
        owned ? "есть" : RUB(c.p),
        c.d + (c.iv ? ` (+${c.iv} к собеседованию)` : ""),
        worn ? dead("Надето") : btn("clothes", c.id, label),
      );
    }).join("");
  }
  if (tab === "Жильё") {
    return HOMES.map((h) => {
      if (l.home === h.id) {
        return card(h.n, h.buy ? RUB(h.buy) : `${RUB(h.rent)}/мес`, h.d, dead("Ты здесь живёшь"));
      }
      const actions =
        (h.rent ? btn("rent", h.id, `Снять (${RUB(h.rent * 2)})`) : "") +
        (h.buy ? btn("buyHome", h.id, `Купить (${RUB(h.buy)})`) : "");
      return card(
        h.n,
        h.buy ? RUB(h.buy) : `${RUB(h.rent)}/мес`,
        `${h.d} (${h.mood >= 0 ? "+" : ""}${h.mood} к настроению)`,
        actions,
      );
    }).join("");
  }
  if (tab === "Авто") {
    return CARS.map((c) =>
      card(
        c.n,
        RUB(c.p),
        c.d + (c.xp ? ` (+${c.xp}% к XP)` : ""),
        l.car === c.id ? dead("Уже есть") : btn("car", c.id, "Купить"),
      ),
    ).join("");
  }
  if (tab === "Техника") {
    return TECH.map((t) =>
      card(t.n, RUB(t.p), t.d, l.tech.includes(t.id) ? dead("Куплено") : btn("tech", t.id, "Купить")),
    ).join("");
  }
  return TRIPS.map((t) =>
    card(
      t.n,
      RUB(t.p),
      `${t.d} (+${t.m} к настроению)`,
      btn("trip", t.id, l.trips.includes(t.id) ? "Съездить ещё раз" : "Купить поездку"),
    ),
  ).join("");
}
