import { describe, expect, it } from "vitest";
import {
  buy,
  defaultLife,
  eat,
  mergeLife,
  onLessonComplete,
  settleTime,
  setCurrentJob,
  xpEarnBonusPct,
} from "../src/engine/life";
import { mergeProgress } from "../src/sync/merge";
import { FOOD } from "../src/data/shop";
import type { Progress } from "../src/engine/progress";

const P = (o: Partial<Progress> = {}): Progress => ({ xp: 0, done: {}, cur: null, hints: {}, ...o });

describe("жизнь — базовое состояние", () => {
  it("стартовый кошелёк и потребности", () => {
    const l = defaultLife();
    expect(l.money).toBe(8000);
    expect(l.hunger).toBe(70);
    expect(l.health).toBe(100);
    expect(l.wear).toEqual({ top: "tshirt", shoes: "sneakers_old" });
  });
});

describe("жизнь — еда и покупки", () => {
  it("еда стоит денег и возвращает сытость", () => {
    const l = defaultLife();
    l.hunger = 40;
    const r = eat(l, "grechka");
    expect(r.ok).toBe(true);
    expect(l.money).toBe(8000 - 180);
    expect(l.hunger).toBe(66);
    expect(l.totalSpent).toBe(180);
  });

  it("нельзя купить, если не хватает денег", () => {
    const l = defaultLife();
    l.money = 100;
    const r = buy(l, "tech", "laptop");
    expect(r).toEqual({ ok: false, error: "не хватает денег" });
    expect(l.tech).toEqual([]);
  });

  it("техника покупается один раз и даёт бонус к XP", () => {
    const l = defaultLife();
    l.money = 50000;
    expect(buy(l, "tech", "monitor").ok).toBe(true);
    expect(l.tech).toEqual(["monitor"]);
    expect(buy(l, "tech", "monitor")).toEqual({ ok: false, error: "уже куплено" });
    expect(xpEarnBonusPct(l)).toBeGreaterThanOrEqual(5);
  });

  it("одежда: куплена — потом только надевается, повторно не списывает деньги", () => {
    const l = defaultLife();
    l.money = 20000;
    expect(buy(l, "clothes", "hoodie").ok).toBe(true);
    const afterBuy = l.money;
    l.wear.top = "tshirt";
    expect(buy(l, "clothes", "hoodie").ok).toBe(true);
    expect(l.money).toBe(afterBuy);
    expect(l.wear.top).toBe("hoodie");
  });
});

describe("жизнь — начисление за урок", () => {
  it("без работы платят подработку, потребности слегка убывают", () => {
    const l = defaultLife();
    const { credited } = onLessonComplete(l, 30, 0);
    expect(credited).toBeGreaterThan(0);
    expect(l.money).toBe(8000 + credited);
    expect(l.hunger).toBe(64);
  });

  it("с офертой за урок не платят — оклад идёт по календарю, а не за скорость", () => {
    expect(onLessonComplete(defaultLife(), 30, 160000).credited).toBe(0);
    expect(onLessonComplete(defaultLife(), 30, 0).credited).toBeGreaterThan(0);
  });

  it("потребности не уходят ниже нуля", () => {
    const l = defaultLife();
    l.hunger = 2;
    for (let i = 0; i < 10; i++) onLessonComplete(l, 20, 0);
    expect(l.hunger).toBeGreaterThanOrEqual(0);
    expect(l.mood).toBeGreaterThanOrEqual(0);
    expect(l.health).toBeGreaterThanOrEqual(0);
  });

  it("содержание машины и жильё списываются по календарю, а не за урок", () => {
    const l = defaultLife();
    l.car = "used"; // up: 9000
    l.home = "room"; // rent: 16000
    expect(onLessonComplete(l, 30, 0).upkeep).toBe(0);

    const day = 86_400_000;
    l.paidAt = 0;
    // 30/7 реального дня = 30 игровых суток = ровно игровой месяц
    const { upkeep } = settleTime(l, 0, (30 / 7) * day);
    expect(upkeep).toBe(9000 + 16000);
  });

  it("обслуживание не уводит деньги в минус", () => {
    const l = defaultLife();
    l.money = 5;
    l.car = "used";
    onLessonComplete(l, 30, 0);
    expect(l.money).toBeGreaterThanOrEqual(0);
  });
});

describe("жизнь — текущая работа", () => {
  it("setCurrentJob назначает и снимает текущую работу", () => {
    const l = defaultLife();
    expect(l.currentJob).toBeNull();
    setCurrentJob(l, "pelmeni");
    expect(l.currentJob).toBe("pelmeni");
    setCurrentJob(l, null);
    expect(l.currentJob).toBeNull();
  });
});

describe("жизнь — слияние устройств", () => {
  it("берётся версия, дальше ушедшая по заработку", () => {
    const a = { ...defaultLife(), totalEarned: 5000, money: 1000 };
    const b = { ...defaultLife(), totalEarned: 12000, money: 300 };
    expect(mergeLife(a, b)).toBe(b);
    expect(mergeLife(undefined, a)).toBe(a);
    expect(mergeLife(undefined, undefined)).toBeUndefined();
  });

  it("mergeProgress переносит life", () => {
    const life = { ...defaultLife(), totalEarned: 999 };
    const m = mergeProgress(P({ life }), P());
    expect(m.life?.totalEarned).toBe(999);
  });
});

describe("календарь: 1 реальный день = 1 игровая неделя", () => {
  const DAY = 86_400_000;

  it("реальные сутки дают семь игровых — неделя игры за день", () => {
    const l = defaultLife();
    l.paidAt = 0;
    expect(settleTime(l, 0, DAY).gameDays).toBe(7);
  });

  it("месячный оклад набегает ровно за 30 игровых суток (чуть больше 4 реальных дней)", () => {
    const l = defaultLife();
    l.paidAt = 0;
    // 30 игровых суток / 7 игровых суток в реальном дне = 30/7 реального времени
    expect(settleTime(l, 150_000, (30 / 7) * DAY).credited).toBe(150_000);
  });

  it("первый вызов только запускает отсчёт и ничего не начисляет", () => {
    const l = defaultLife();
    expect(settleTime(l, 150_000, 5 * DAY).credited).toBe(0);
    expect(l.paidAt).toBe(5 * DAY);
  });

  it("незавершённые сутки не теряются и не задваиваются", () => {
    const l = defaultLife();
    l.paidAt = 0;
    // 0.2 реального дня = 1.4 игровых суток, 0.2 ещё -> итого 2.8 игровых суток
    const a = settleTime(l, 300_000, DAY * 0.2).gameDays;
    const b = settleTime(l, 300_000, DAY * 0.4).gameDays;
    expect(a).toBe(1);
    expect(b).toBe(1);
  });

  it("часы, переведённые назад, не начисляют ничего", () => {
    const l = defaultLife();
    l.paidAt = 10 * DAY;
    expect(settleTime(l, 150_000, 2 * DAY).credited).toBe(0);
  });

  it("голод убывает по календарю, а не по урокам", () => {
    const l = defaultLife();
    l.paidAt = 0;
    const before = l.hunger;
    settleTime(l, 0, 2 * DAY);
    expect(l.hunger).toBeLessThan(before);
  });

  it("2 реальных дня без еды персонаж переживает гарантированно", () => {
    // явное требование: 1 реальный день = неделя игры, но 2 реальных дня
    // без единого приёма пищи не должны быть смертельны
    const l = defaultLife();
    l.paidAt = 0;
    settleTime(l, 0, 2 * DAY);
    expect(l.health).toBeGreaterThan(0);
  });

  it("брошенный персонаж умирает от голода", () => {
    const l = defaultLife();
    l.paidAt = 0;
    settleTime(l, 0, 30 * DAY);
    expect(l.hunger).toBe(0);
    expect(l.health).toBe(0);
  });

  it("персонаж, которого кормят, не умирает", () => {
    const l = defaultLife();
    l.money = 1_000_000;
    l.paidAt = 0;
    for (let d = 1; d <= 30; d++) {
      settleTime(l, 0, d * DAY);
      while (l.hunger < 60) if (!eat(l, FOOD[0].id).ok) break;
    }
    expect(l.health).toBeGreaterThan(0);
  });

  it("долгий перерыв оплачивается, но не бесконечно", () => {
    const l = defaultLife();
    l.paidAt = 0;
    expect(settleTime(l, 300_000, 365 * DAY).gameDays).toBe(60);
  });
});
