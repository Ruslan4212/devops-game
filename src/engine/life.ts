/**
 * Экономический слой («жизнь»): кошелёк, потребности, покупки.
 * Перенесён из прежней версии, но без привязки ко времени и без «смерти»:
 * потребности убывают на каждом пройденном уроке, а не по календарю —
 * так поведение детерминировано и не зависит от того, когда игрок заходил.
 */
import {
  ACCESSORIES,
  CARS,
  CLOTHES,
  COMFORT,
  FOOD,
  HOMES,
  NO_JOB_FACTOR,
  REWARD_PER_XP,
  TECH,
  TRIPS,
} from "../data/shop";
import { defaultAppearance } from "../data/avatar";
import type { Appearance } from "../data/avatar";

export interface Life {
  money: number;
  hunger: number;
  health: number;
  mood: number;
  wear: { top: string; shoes: string };
  /** приобретённое: "cl:hoodie", "home:studio" */
  own: string[];
  home: string | null;
  car: string | null;
  tech: string[];
  trips: string[];
  totalEarned: number;
  totalSpent: number;
  /** внешность персонажа (портрет) */
  look?: Appearance;
  /** надетый аксессуар (один слот поверх одежды): "watch", "backpack", ... */
  accessory?: string | null;
  /** купленные предметы интерьера для настроения — всегда «активны», как техника */
  comfort?: string[];
}

export type LifeResult = { ok: true } | { ok: false; error: string };
const OK: LifeResult = { ok: true };
const clamp = (v: number): number => Math.max(0, Math.min(100, v));

/** Здоровье кончилось — персонаж «падает», прогресс под угрозой (см. engine/progress.ts). */
export const isDead = (l: Life): boolean => l.health <= 0;

export function defaultLife(): Life {
  return {
    money: 8000,
    hunger: 70,
    health: 100,
    mood: 60,
    wear: { top: "tshirt", shoes: "sneakers_old" },
    own: [],
    home: null,
    car: null,
    tech: [],
    trips: [],
    totalEarned: 0,
    totalSpent: 0,
    look: defaultAppearance(),
    accessory: null,
    comfort: [],
  };
}

function spend(l: Life, sum: number): boolean {
  if (l.money < sum) return false;
  l.money -= sum;
  l.totalSpent += sum;
  return true;
}

/** +% к получаемому опыту от техники, машины и настроения. */
export function xpEarnBonusPct(l: Life): number {
  const tech = l.tech.reduce((a, id) => a + (TECH.find((t) => t.id === id)?.xp ?? 0), 0);
  const car = l.car ? (CARS.find((c) => c.id === l.car)?.xp ?? 0) : 0;
  const mood = l.mood >= 80 ? 10 : l.mood >= 40 ? 0 : l.mood >= 20 ? -10 : -25;
  return tech + car + mood;
}

/** Бонус к собеседованию от одежды и состояния. */
export function interviewBonus(l: Life): number {
  let b = 0;
  for (const slot of ["top", "shoes"] as const) {
    b += CLOTHES.find((c) => c.id === l.wear[slot])?.iv ?? 0;
  }
  if (l.accessory) b += ACCESSORIES.find((a) => a.id === l.accessory)?.iv ?? 0;
  if (l.mood >= 70) b += 3;
  if (l.mood < 25) b -= 5;
  if (l.hunger < 20) b -= 5;
  return b;
}

/**
 * Урок пройден: начисляем «подработку» (× {@link NO_JOB_FACTOR}, если нет оффера),
 * тратим немного сытости и подводим настроение к 50. Возвращаем сумму начисления.
 */
export function onLessonComplete(l: Life, lessonXp: number, hasJob: boolean): { credited: number } {
  const gross = Math.round((lessonXp / 15) * REWARD_PER_XP * (hasJob ? 1 : NO_JOB_FACTOR));
  l.money += gross;
  l.totalEarned += gross;
  l.hunger = clamp(l.hunger - 6);
  const drift = l.hunger < 25 ? -6 : -1;
  l.mood = clamp(l.mood + (l.mood > 50 ? drift : -drift));
  if (l.hunger < 10) l.health = clamp(l.health - 3);
  return { credited: gross };
}

export function eat(l: Life, id: string): LifeResult {
  const f = FOOD.find((x) => x.id === id);
  if (!f) return { ok: false, error: "нет такого блюда" };
  if (!spend(l, f.p)) return { ok: false, error: "не хватает денег" };
  l.hunger = clamp(l.hunger + f.h);
  l.mood = clamp(l.mood + f.m);
  if (l.hunger > 50) l.health = clamp(l.health + 3);
  return OK;
}

export type BuyKind = "clothes" | "tech" | "car" | "rent" | "buyHome" | "trip" | "accessory" | "comfort";

export function buy(l: Life, kind: BuyKind, id: string): LifeResult {
  switch (kind) {
    case "clothes": {
      const it = CLOTHES.find((x) => x.id === id);
      if (!it) return { ok: false, error: "нет такой вещи" };
      const owned = it.owned || l.own.includes("cl:" + id);
      if (!owned) {
        if (!spend(l, it.p)) return { ok: false, error: "не хватает денег" };
        l.own.push("cl:" + id);
      }
      l.wear[it.slot] = id;
      l.mood = clamp(l.mood + it.m);
      return OK;
    }
    case "tech": {
      const it = TECH.find((x) => x.id === id);
      if (!it) return { ok: false, error: "нет такой техники" };
      if (l.tech.includes(id)) return { ok: false, error: "уже куплено" };
      if (!spend(l, it.p)) return { ok: false, error: "не хватает денег" };
      l.tech.push(id);
      l.mood = clamp(l.mood + it.m);
      return OK;
    }
    case "car": {
      const it = CARS.find((x) => x.id === id);
      if (!it) return { ok: false, error: "нет такого транспорта" };
      if (!spend(l, it.p)) return { ok: false, error: "не хватает денег" };
      l.car = id;
      l.mood = clamp(l.mood + it.mood);
      return OK;
    }
    case "rent": {
      const it = HOMES.find((x) => x.id === id);
      if (!it || !it.rent) return { ok: false, error: "это жильё нельзя снять" };
      if (!spend(l, it.rent * 2)) return { ok: false, error: "не хватает на въезд (месяц + залог)" };
      l.home = id;
      l.own = l.own.filter((x) => !x.startsWith("home:"));
      return OK;
    }
    case "buyHome": {
      const it = HOMES.find((x) => x.id === id);
      if (!it || !it.buy) return { ok: false, error: "это жильё не продаётся" };
      if (!spend(l, it.buy)) return { ok: false, error: "не хватает денег" };
      l.home = id;
      if (!l.own.includes("home:" + id)) l.own.push("home:" + id);
      l.mood = clamp(l.mood + 15);
      return OK;
    }
    case "trip": {
      const it = TRIPS.find((x) => x.id === id);
      if (!it) return { ok: false, error: "нет такой поездки" };
      if (!spend(l, it.p)) return { ok: false, error: "не хватает денег" };
      l.trips.push(id);
      l.mood = clamp(l.mood + it.m);
      return OK;
    }
    case "accessory": {
      const it = ACCESSORIES.find((x) => x.id === id);
      if (!it) return { ok: false, error: "нет такого аксессуара" };
      const owned = l.own.includes("acc:" + id);
      if (!owned) {
        if (!spend(l, it.p)) return { ok: false, error: "не хватает денег" };
        l.own.push("acc:" + id);
      }
      l.accessory = id;
      l.mood = clamp(l.mood + it.m);
      return OK;
    }
    case "comfort": {
      const it = COMFORT.find((x) => x.id === id);
      if (!it) return { ok: false, error: "нет такой вещи" };
      const owned = (l.comfort ?? []).includes(id);
      if (owned) return { ok: false, error: "уже куплено" };
      if (!spend(l, it.p)) return { ok: false, error: "не хватает денег" };
      if (!l.comfort) l.comfort = [];
      l.comfort.push(id);
      l.mood = clamp(l.mood + it.m);
      return OK;
    }
  }
}

/** Снять аксессуар (пустой слот). Отдельно от buy(), т.к. это не покупка. */
export function unequipAccessory(l: Life): void {
  l.accessory = null;
}

/**
 * Слияние «жизни» двух устройств. Деньги не монотонны, поэтому берём ту версию,
 * что дальше по прогрессу — с большим totalEarned; при равенстве — первую.
 */
export function mergeLife(a: Life | undefined, b: Life | undefined): Life | undefined {
  if (!a) return b;
  if (!b) return a;
  return (a.totalEarned ?? 0) >= (b.totalEarned ?? 0) ? a : b;
}
