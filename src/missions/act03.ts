import { getNode } from "../engine/vfs";
import { has, ran } from "./helpers";
import { seedAppLog } from "./act01";
import type { Mission, World } from "../engine/types";

const isExec = (path: string) => (w: World): boolean => {
  const n = getNode(w, path);
  return !!n && n.type === "file" && /x/.test(n.mode.slice(0, 3));
};

export const act03: Mission[] = [
  {
    id: "3.1", act: 3, title: "Первый скрипт", xp: 50,
    why: "Скрипт — это записанная последовательность команд. Чтобы система его запустила, нужны две вещи: <b>шебанг</b> в первой строке (<code>#!/bin/bash</code>) — он говорит, каким интерпретатором исполнять, и <b>право на выполнение</b> (chmod +x). Без любого из них будет отказ.",
    cheat: [
      ["edit backup.sh", "открыть редактор файла"],
      ["cat backup.sh", "проверить содержимое"],
      ["chmod +x backup.sh", "сделать исполняемым"],
      ["./backup.sh", "запустить скрипт"],
      ["ls -l", "убедиться, что появился x в правах"],
    ],
    hints: [
      "Открой edit backup.sh — там уже заготовка с подсказками",
      "Первая строка обязана быть #!/bin/bash",
      "После сохранения дай права: chmod +x backup.sh",
      "Запусти: ./backup.sh",
    ],
    setup: (w) => {
      w.templates = {
        "/home/devops/backup.sh":
          "# ЗАДАЧА: сделать это рабочим скриптом.\n" +
          "# 1) первой строкой поставь шебанг: #!/bin/bash\n" +
          "# 2) добавь команду echo с любым текстом\n" +
          "# 3) добавь команду ls\n",
      };
    },
    objs: [
      { t: "Создай backup.sh и добавь шебанг в первую строку", d: "edit backup.sh", ok: has("/home/devops/backup.sh", /^#!\/bin\/(ba)?sh/) },
      { t: "Добавь в скрипт команду echo", d: "внутри редактора: echo \"бэкап начат\"", ok: has("/home/devops/backup.sh", /^\s*echo\s+/m) },
      { t: "Сделай файл исполняемым", d: "chmod +x backup.sh", ok: isExec("/home/devops/backup.sh") },
      { t: "Запусти скрипт", d: "./backup.sh", ok: (w) => (w.scriptRan || 0) > 0 },
    ],
    solution: [
      { file: "backup.sh", content: "#!/bin/bash\necho \"бэкап начат\"\nls\n" },
      "chmod +x backup.sh",
      "./backup.sh",
    ],
  },
  {
    id: "3.2", act: 3, title: "Переменные и код возврата", xp: 50,
    why: "Каждая команда возвращает <b>код завершения</b>: 0 — успех, не 0 — ошибка. Переменная <b>$?</b> хранит код последней команды. На этом стоит вся автоматизация: CI считает шаг проваленным именно по ненулевому коду.",
    cheat: [
      ["export ИМЯ=значение", "задать переменную"],
      ["echo $ИМЯ", "показать значение"],
      ["echo $?", "код возврата последней команды"],
      ["env", "все переменные окружения"],
      ["ls /нет-такого", "команда, которая упадёт"],
    ],
    hints: [
      "export APP_ENV=prod задаёт переменную",
      "Показать: echo $APP_ENV",
      "Выполни заведомо неверную команду, например ls /нет-такого",
      "Сразу после неё: echo $? — увидишь не ноль",
    ],
    objs: [
      { t: "Задай переменную окружения APP_ENV", d: "export APP_ENV=prod", ok: (w) => w.env.APP_ENV === "prod" },
      { t: "Выведи её значение", d: "echo $APP_ENV", ok: ran(/^echo\s+\$APP_ENV/) },
      { t: "Выполни команду, которая завершится ошибкой", d: "ls /нет-такого", ok: (w) => w.log.some((l) => l.code !== 0) },
      { t: "Посмотри код возврата", d: "echo $?", ok: ran(/^echo\s+\$\?/) },
    ],
    solution: ["export APP_ENV=prod", "echo $APP_ENV", "ls /нет-такого", "echo $?"],
  },
  {
    id: "3.3", act: 3, title: "Скрипт, который проверяет сервис", xp: 60,
    why: "Реальные скрипты не просто печатают текст — они <b>проверяют</b> и <b>решают</b>. Здесь ты соберёшь мини-healthcheck: он смотрит логи, считает ошибки и сообщает результат. Это прямой прообраз того, что потом делает мониторинг.",
    cheat: [
      ["edit healthcheck.sh", "редактор"],
      ["chmod +x healthcheck.sh", "права на запуск"],
      ["./healthcheck.sh", "запуск"],
      ["grep -i error ФАЙЛ", "поиск ошибок"],
      ["ls /var/log", "что есть в логах"],
    ],
    hints: [
      "В шаблоне уже есть каркас — допиши строки",
      "Нужны: шебанг, echo и grep по /var/log/app.log",
      "Не забудь chmod +x перед запуском",
    ],
    setup: (w) => {
      seedAppLog(w);
      w.templates = {
        "/home/devops/healthcheck.sh":
          "# ЗАДАЧА: скрипт-проверка сервиса\n" +
          "# 1) шебанг #!/bin/bash\n" +
          "# 2) echo с текстом о начале проверки\n" +
          "# 3) grep -i error /var/log/app.log\n",
      };
    },
    objs: [
      { t: "Напиши healthcheck.sh с шебангом", d: "edit healthcheck.sh", ok: has("/home/devops/healthcheck.sh", /^#!\/bin\/(ba)?sh/) },
      { t: "Внутри скрипта должен быть поиск ошибок в логе", d: "строка: grep -i error /var/log/app.log", ok: has("/home/devops/healthcheck.sh", /grep[^\n]*error[^\n]*app\.log/i) },
      { t: "Сделай исполняемым и запусти", d: "chmod +x healthcheck.sh, затем ./healthcheck.sh", ok: (w) => (w.scriptRan || 0) > 0 },
    ],
    solution: [
      { file: "healthcheck.sh", content: "#!/bin/bash\necho \"проверка сервиса\"\ngrep -i error /var/log/app.log\n" },
      "chmod +x healthcheck.sh",
      "./healthcheck.sh",
    ],
  },
];
