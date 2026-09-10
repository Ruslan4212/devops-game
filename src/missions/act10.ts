import { mkdirp } from "../engine/vfs";
import { syncPods } from "../commands/k8s";
import { has, ran } from "./helpers";
import type { Mission } from "../engine/types";

export const act10: Mission[] = [
  {
    id: "10.1",
    act: 10,
    title: "Алерт: 5xx после релиза",
    xp: 100,
    incident: true,
    why: "Главное правило дежурного: <b>сначала останови боль, потом ищи причину</b>. Если ошибки начались сразу после выката — не надо часами читать код. Откатись на предыдущую рабочую версию (<b>rollout undo</b>), убедись, что метрики пришли в норму, и только потом спокойно разбирайся. Это и есть «реагировать на инцидент».",
    cheat: [
      ["alerts", "какие алерты горят"],
      ["metrics", "текущие метрики сервиса"],
      ["kubectl get pods", "состояние подов"],
      ["kubectl logs ИМЯ", "логи приложения"],
      ["kubectl rollout undo deployment/api", "откатить на прошлую версию"],
      ["kubectl rollout status", "дождаться выката"],
    ],
    hints: [
      "Начни с alerts — увидишь HighErrorRate",
      "metrics покажет error_rate 32% и рост задержки",
      "Ошибки начались после выката shop:3.0-beta — это подсказка",
      "Митигируй: kubectl rollout undo deployment/api, затем проверь metrics и alerts",
    ],
    setup: (w) => {
      mkdirp(w, "/home/devops/k8s");
      w.cwd = "/home/devops/k8s";
      w.k8s = {
        deploys: [{ name: "api", replicas: 4, image: "shop:3.0-beta", crash: true }],
        pods: [],
        svcs: [],
      };
      syncPods(w);
      w.alerts = [
        {
          name: "HighErrorRate",
          sev: "critical",
          desc: "error_rate 32% за последние 5 минут (порог 1%). Началось через 2 минуты после выката shop:3.0-beta.",
        },
        { name: "LatencyP99High", sev: "warning", desc: "p99 задержка 4200ms при норме 200ms." },
      ];
    },
    objs: [
      { t: "Посмотри, какие алерты сейчас горят", d: "alerts", ok: ran(/^alerts/) },
      { t: "Оцени масштаб по метрикам", d: "metrics", ok: ran(/^metrics/) },
      { t: "Проверь состояние подов", d: "kubectl get pods", ok: ran(/^kubectl\s+get\s+pod/) },
      {
        t: "Посмотри логи, чтобы зафиксировать симптом",
        d: "kubectl logs ИМЯ_ПОДА",
        ok: ran(/^kubectl\s+logs/),
      },
      {
        t: "Митигируй: откатись на предыдущую версию",
        d: "kubectl rollout undo deployment/api",
        ok: (w) => !!w.k8s && w.k8s.deploys.every((d) => !d.crash),
      },
      {
        t: "Убедись, что алерты погасли",
        d: "alerts",
        ok: (w) => {
          if (w.alerts.length) return false;
          const undoIx = w.log.findIndex((l) => /rollout\s+undo/.test(l.cmd));
          return undoIx >= 0 && w.log.slice(undoIx + 1).some((l) => /^alerts/.test(l.cmd));
        },
      },
    ],
    solution: [
      "alerts",
      "metrics",
      "kubectl get pods",
      "kubectl logs api-x",
      "kubectl rollout undo deployment/api",
      "alerts",
    ],
  },
  {
    id: "10.2",
    act: 10,
    title: "Постмортем",
    xp: 110,
    why: "Инцидент не закрыт, пока не написан <b>постмортем</b>. Он <b>blameless</b>: разбирают систему и процессы, а не людей — иначе инженеры начинают скрывать сбои. Обязательные разделы: что произошло, каково было влияние на пользователей, какова причина и какие конкретные действия не дадут этому повториться.",
    cheat: [
      ["edit postmortem.md", "написать разбор"],
      ["cat postmortem.md", "проверить"],
      ["alerts", "убедиться, что тихо"],
    ],
    hints: [
      "Открой edit postmortem.md — в шаблоне перечислены нужные разделы",
      "Нужны четыре заголовка: Что произошло, Влияние, Причина, Действия",
      "Формулируй без имён и обвинений — разбирается система, а не человек",
    ],
    setup: (w) => {
      w.cwd = "/home/devops";
      w.templates = {
        "/home/devops/postmortem.md":
          "# Постмортем: рост 5xx после релиза\n\n" +
          "## Что произошло\n(опиши коротко: выкатили версию, пошли ошибки)\n\n" +
          "## Влияние\n(сколько времени, кого задело)\n\n" +
          "## Причина\n(что именно в новой версии сломалось)\n\n" +
          "## Действия\n(что сделать, чтобы не повторилось: тесты, канареечный деплой, алерты)\n",
      };
    },
    objs: [
      {
        t: "Опиши, что произошло",
        d: "edit postmortem.md",
        ok: has("/home/devops/postmortem.md", /##\s*Что произошло\s*\n+(?!\()\S/),
      },
      {
        t: "Опиши влияние на пользователей",
        d: "раздел Влияние",
        ok: has("/home/devops/postmortem.md", /##\s*Влияние\s*\n+(?!\()\S/),
      },
      {
        t: "Укажи причину",
        d: "раздел Причина",
        ok: has("/home/devops/postmortem.md", /##\s*Причина\s*\n+(?!\()\S/),
      },
      {
        t: "Перечисли действия, чтобы не повторилось",
        d: "раздел Действия",
        ok: has("/home/devops/postmortem.md", /##\s*Действия\s*\n+(?!\()\S/),
      },
    ],
    solution: [
      {
        file: "postmortem.md",
        content:
          "# Постмортем: рост 5xx после релиза\n\n" +
          "## Что произошло\nВыкатили shop:3.0-beta, поды не стартовали, пошли 5xx.\n\n" +
          "## Влияние\n18 минут, около 30% запросов завершались ошибкой.\n\n" +
          "## Причина\nВ манифесте не задали переменную окружения DB_URL.\n\n" +
          "## Действия\nПроверка манифеста в CI и канареечный деплой вместо полного выката.\n",
      },
    ],
  },
];
