import { mkdirp, writeFile } from "../engine/vfs";
import { has, ran } from "./helpers";
import { runPipeline } from "../commands/ci";
import type { Mission, World } from "../engine/types";

const WORKFLOW =
  "name: CI\non: push\njobs:\n  build:\n    steps:\n      - run: npm ci\n      - run: npm test\n";

const seedCiRepo = (w: World): void => {
  mkdirp(w, "/home/devops/app/src");
  writeFile(w, "/home/devops/app/index.js", "console.log('shop api');\n");
  w.cwd = "/home/devops/app";
  w.git = {
    branch: "main",
    branches: ["main"],
    staged: [],
    commits: [{ msg: "init", files: ["index.js"], branch: "main", hash: "a1b2c3d" }],
    remote: "git@github.com:shop/api.git",
    pushed: 0,
  };
};

export const act07: Mission[] = [
  {
    id: "7.1",
    act: 7,
    title: "Собрать пайплайн",
    xp: 70,
    why: "CI — это робот, который на каждый <b>push</b> собирает проект и гоняет тесты. Описывается YAML-файлом в репозитории. Ключевые части: <b>on</b> (когда запускать) и <b>steps</b> (что делать). Отступы в YAML — только пробелы, это частая причина поломки.",
    cheat: [
      ["edit .github/workflows/ci.yml", "создать пайплайн"],
      ["git add .", "добавить в индекс"],
      ['git commit -m "ci"', "зафиксировать"],
      ["git push", "отправить — это запустит пайплайн"],
      ["ci status", "результат последнего запуска"],
      ["ci logs", "логи запуска"],
    ],
    hints: [
      "Открой edit .github/workflows/ci.yml — там заготовка",
      "Нужны строки on: push и шаг с npm test",
      "Пайплайн стартует после git push",
    ],
    setup: (w) => {
      seedCiRepo(w);
      writeFile(w, "/home/devops/app/src/sum.js", "function sum(a,b){ return a + b; }\n");
      w.templates = {
        "/home/devops/app/.github/workflows/ci.yml":
          "# ЗАДАЧА: описать пайплайн.\n" +
          "# Нужно: триггер on: push и шаг, который запускает npm test\n" +
          "# Пример:\n" +
          "# name: CI\n" +
          "# on: push\n" +
          "# jobs:\n" +
          "#   build:\n" +
          "#     steps:\n" +
          "#       - run: npm ci\n" +
          "#       - run: npm test\n",
      };
    },
    objs: [
      {
        t: "Создай файл пайплайна с триггером на push",
        d: "edit .github/workflows/ci.yml",
        ok: has("/home/devops/app/.github/workflows/ci.yml", /on:\s*push/),
      },
      {
        t: "Добавь шаг запуска тестов",
        d: "строка: - run: npm test",
        ok: has("/home/devops/app/.github/workflows/ci.yml", /npm test/),
      },
      {
        t: "Закоммить и запушь — это запустит пайплайн",
        d: 'git add . затем git commit -m "ci" и git push',
        ok: (w) => w.ci.runs.length > 0,
      },
      { t: "Посмотри результат пайплайна", d: "ci status", ok: ran(/^ci\s+status/) },
    ],
    solution: [
      { file: ".github/workflows/ci.yml", content: WORKFLOW },
      "git add .",
      'git commit -m "ci"',
      "git push",
      "ci status",
    ],
  },
  {
    id: "7.2",
    act: 7,
    title: "Инцидент: красный билд",
    xp: 70,
    incident: true,
    why: "Красный пайплайн блокирует всю команду, поэтому чинится первым. Порядок действий: <b>ci status</b> — какой этап упал, <b>ci logs</b> — что именно сломалось, правка кода, новый коммит и push. Пайплайн должен позеленеть — только тогда задача закрыта.",
    cheat: [
      ["ci status", "какой этап упал"],
      ["ci logs", "что именно не так"],
      ["cat src/sum.js", "посмотреть код"],
      ["edit src/sum.js", "исправить"],
      ["git add .", "добавить в индекс"],
      ["git push", "перезапустить пайплайн"],
    ],
    hints: [
      "ci logs скажет: sum(2,3) ожидалось 5, получено -1",
      "Открой cat src/sum.js — там стоит минус вместо плюса",
      "Исправь через edit src/sum.js на return a + b;",
      "Закоммить и запушь заново, потом проверь ci status",
    ],
    setup: (w) => {
      seedCiRepo(w);
      writeFile(w, "/home/devops/app/.github/workflows/ci.yml", WORKFLOW);
      w.ci.workflow = WORKFLOW;
      writeFile(w, "/home/devops/app/src/sum.js", "function sum(a,b){ return a - b; }\n");
      runPipeline(w);
    },
    objs: [
      { t: "Посмотри, какой этап пайплайна упал", d: "ci status", ok: ran(/^ci\s+status/) },
      { t: "Прочитай логи и найди причину", d: "ci logs", ok: ran(/^ci\s+logs/) },
      {
        t: "Исправь ошибку в коде",
        d: "edit src/sum.js — верни a + b",
        ok: has("/home/devops/app/src/sum.js", /return\s+a\s*\+\s*b/),
      },
      {
        t: "Закоммить и запушь исправление",
        d: 'git add . затем git commit -m "fix sum" и git push',
        ok: (w) => w.ci.runs.length > 1,
      },
      {
        t: "Убедись, что пайплайн зелёный",
        d: "ci status",
        ok: (w) => w.ci.runs.length > 0 && w.ci.runs[w.ci.runs.length - 1].ok,
      },
    ],
    solution: [
      "ci status",
      "ci logs",
      { file: "src/sum.js", content: "function sum(a,b){ return a + b; }\n" },
      "git add .",
      'git commit -m "fix sum"',
      "git push",
      "ci status",
    ],
  },
];
