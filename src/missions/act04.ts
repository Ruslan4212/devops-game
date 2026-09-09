import { ran, ranAny } from "./helpers";
import type { Mission } from "../engine/types";

export const act04: Mission[] = [
  {
    id: "4.1", act: 4, title: "Достучаться до сервиса", xp: 45,
    why: "Когда «сайт не работает», нужно понять, на каком уровне обрыв: не резолвится имя, не доходит пакет, или сервер отвечает ошибкой. Инструменты по слоям: <b>dig</b> (DNS), <b>ping</b> (сеть), <b>curl</b> (HTTP). Проверять надо снизу вверх.",
    cheat: [
      ["ping example.com", "доходят ли пакеты"],
      ["dig example.com", "резолвится ли имя в IP"],
      ["curl -I https://example.com", "только заголовки и HTTP-код"],
      ["curl https://example.com", "тело ответа"],
      ["cat /etc/hosts", "локальная таблица имён"],
    ],
    hints: [
      "dig example.com покажет секцию ANSWER с IP",
      "ping example.com проверит доступность",
      "curl -I покажет строку HTTP/1.1 200 OK",
    ],
    objs: [
      { t: "Проверь, что имя резолвится в IP", d: "dig example.com", ok: ran(/^dig\b.*example\.com/) },
      { t: "Проверь, что хост доступен по сети", d: "ping example.com", ok: ran(/^ping\b/) },
      { t: "Получи HTTP-заголовки ответа", d: "curl -I https://example.com", ok: ran(/^curl\b.*-I/) },
    ],
    solution: ["dig example.com", "ping example.com", "curl -I https://example.com"],
  },
  {
    id: "4.2", act: 4, title: "Инцидент: порт закрыт", xp: 60, incident: true,
    why: "Классическая ситуация: приложение работает, но снаружи недоступно. Причина почти всегда одна из двух — служба не слушает порт, либо порт режет файрвол. Отличить помогает <b>ss</b> (кто слушает локально) против <b>curl</b> (доходит ли снаружи).",
    cheat: [
      ["curl https://api.shop.local", "попробовать достучаться"],
      ["dig api.shop.local", "проверить DNS"],
      ["ss -ltn", "какие порты слушаются"],
      ["sudo ufw status", "правила файрвола"],
      ["sudo ufw allow 443", "открыть порт"],
    ],
    hints: [
      "Сначала убедись, что имя резолвится: dig api.shop.local — тут всё в порядке",
      "curl покажет таймаут, а не отказ — это признак файрвола, а не мёртвой службы",
      "Посмотри sudo ufw status — 443 отсутствует",
      "Открой: sudo ufw allow 443, затем повтори curl",
    ],
    setup: (w) => { w.firewall = { 22: true, 80: true }; },
    objs: [
      { t: "Убедись, что DNS-имя резолвится", d: "dig api.shop.local", ok: ran(/^dig\b.*api\.shop\.local/) },
      { t: "Попробуй достучаться — увидишь таймаут", d: "curl https://api.shop.local", ok: ranAny(/^curl\b.*api\.shop\.local/) },
      { t: "Проверь правила файрвола", d: "sudo ufw status", ok: ran(/^sudo\s+ufw\s+status/) },
      { t: "Открой 443-й порт", d: "sudo ufw allow 443", ok: (w) => w.firewall[443] === true },
      { t: "Убедись, что сервис теперь отвечает", d: "curl https://api.shop.local", ok: (w) => w.log.some((l) => /curl.*api\.shop\.local/.test(l.cmd) && l.code === 0) },
    ],
    solution: [
      "dig api.shop.local", "curl https://api.shop.local", "sudo ufw status",
      "sudo ufw allow 443", "curl https://api.shop.local",
    ],
  },
];
