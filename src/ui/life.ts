import { $, esc, toast } from "./dom";
import { ACCESSORIES, CARS, CLOTHES, COMFORT, FOOD, HOMES, TECH, TRIPS } from "../data/shop";
import type { CarBody } from "../data/shop";
import { buy, eat, unequipAccessory, xpEarnBonusPct } from "../engine/life";
import type { BuyKind, Life } from "../engine/life";

export interface LifeDeps {
  life: Life;
  /** сохранить прогресс после покупки */
  persist: () => void;
}

const RUB = (n: number): string => n.toLocaleString("ru-RU") + " ₽";
const TABS = ["Еда", "Одежда", "Аксессуары", "Жильё", "Авто", "Техника", "Уют", "Отдых"] as const;
type Tab = (typeof TABS)[number];

/** Плоская боковая иконка машины по типу кузова — для карточки в магазине. */
function carIcon(body: CarBody): string {
  const shapes: Record<CarBody, string> = {
    bike: '<path d="M6 34a8 8 0 1 1 16 0 8 8 0 0 1-16 0zm34 0a8 8 0 1 1 16 0 8 8 0 0 1-16 0z" fill="none" stroke="#8892A6" stroke-width="3"/><path d="M14 34l10-16h8l6 10M24 18h10" fill="none" stroke="#8892A6" stroke-width="3"/>',
    moto: '<path d="M8 34a7 7 0 1 1 14 0 7 7 0 0 1-14 0zm34 0a7 7 0 1 1 14 0 7 7 0 0 1-14 0z" fill="none" stroke="#8892A6" stroke-width="3"/><path d="M15 34l8-12h14l7 12M27 22h-8" fill="none" stroke="#8892A6" stroke-width="3"/>',
    hatch:
      '<path d="M4 34a6 6 0 1 1 12 0 6 6 0 0 1-12 0zm36 0a6 6 0 1 1 12 0 6 6 0 0 1-12 0z" fill="#8892A6"/><path d="M6 30h48v-6c0-2-8-10-16-10H24c-6 0-10 4-14 10l-4 6z" fill="#4A7FB5"/>',
    sedan:
      '<path d="M4 36a6 6 0 1 1 12 0 6 6 0 0 1-12 0zm40 0a6 6 0 1 1 12 0 6 6 0 0 1-12 0z" fill="#8892A6"/><path d="M4 32h52v-6c0-2-6-8-14-8H26c-6 0-9 3-13 8l-9 4z" fill="#4A7FB5"/><path d="M22 18h20l6 8H16z" fill="#2B3446"/>',
    suv: '<path d="M6 38a6 6 0 1 1 12 0 6 6 0 0 1-12 0zm38 0a6 6 0 1 1 12 0 6 6 0 0 1-12 0z" fill="#8892A6"/><path d="M4 34h56v-14c0-3-6-10-14-10H22c-6 0-10 4-12 10l-6 14z" fill="#5B6B8C"/>',
    ev: '<path d="M4 36a6 6 0 1 1 12 0 6 6 0 0 1-12 0zm40 0a6 6 0 1 1 12 0 6 6 0 0 1-12 0z" fill="#8892A6"/><path d="M4 32h52v-6c0-2-6-8-14-8H26c-6 0-9 3-13 8l-9 4z" fill="#1F6F5C"/><path d="M30 12l-6 10h6l-4 8 12-12h-7l5-6z" fill="#D9B36B"/>',
    sport:
      '<path d="M6 38a5 5 0 1 1 10 0 5 5 0 0 1-10 0zm38 0a5 5 0 1 1 10 0 5 5 0 0 1-10 0z" fill="#8892A6"/><path d="M2 36h56l-6-14c-2-4-8-8-16-8H26c-6 0-10 2-14 8l-10 8z" fill="#C7452F"/>',
  };
  return (
    '<svg viewBox="0 0 60 44" width="60" height="44" role="img" aria-label="машина">' +
    (shapes[body] ?? shapes.hatch) +
    "</svg>"
  );
}

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
    const unequipBtn = document.getElementById("lfUnequipAcc");
    if (unequipBtn)
      unequipBtn.onclick = () => {
        unequipAccessory(l);
        d.persist();
        render();
      };
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

function card(name: string, price: string, desc: string, actionHtml: string, icon?: string): string {
  return (
    `<div class="lf-card">` +
    (icon ? `<div class="lf-card-icon">${icon}</div>` : "") +
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
  if (tab === "Аксессуары") {
    return ACCESSORIES.map((a) => {
      const owned = l.own.includes("acc:" + a.id);
      const worn = l.accessory === a.id;
      const label = owned ? "Надеть" : "Купить и надеть";
      return card(
        a.n,
        owned ? "есть" : RUB(a.p),
        a.d + (a.iv ? ` (+${a.iv} к собеседованию)` : ""),
        worn ? `<button class="lf-buy" id="lfUnequipAcc">Снять</button>` : btn("accessory", a.id, label),
      );
    }).join("");
  }
  if (tab === "Авто") {
    return CARS.map((c) =>
      card(
        c.n,
        RUB(c.p),
        c.d + (c.xp ? ` (+${c.xp}% к XP)` : "") + ` · обслуживание ${RUB(c.up)}/мес`,
        l.car === c.id ? dead("Уже есть") : btn("car", c.id, "Купить"),
        carIcon(c.body),
      ),
    ).join("");
  }
  if (tab === "Техника") {
    return TECH.map((t) =>
      card(t.n, RUB(t.p), t.d, l.tech.includes(t.id) ? dead("Куплено") : btn("tech", t.id, "Купить")),
    ).join("");
  }
  if (tab === "Уют") {
    return COMFORT.map((c) =>
      card(
        c.n,
        RUB(c.p),
        `${c.d} (+${c.m} к настроению)`,
        (l.comfort ?? []).includes(c.id) ? dead("Куплено") : btn("comfort", c.id, "Купить"),
      ),
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
