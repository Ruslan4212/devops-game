import { mkdirp, writeFile } from "../engine/vfs";
import { has, ran } from "./helpers";
import type { Mission, World } from "../engine/types";

const seedRepo = (w: World): void => {
  mkdirp(w, "/home/devops/app");
  writeFile(w, "/home/devops/app/index.js", "console.log('shop api');\n");
  writeFile(w, "/home/devops/app/README.md", "# Shop API\n");
  w.cwd = "/home/devops/app";
};

export const act05: Mission[] = [
  {
    id: "5.1",
    act: 5,
    title: "Первый репозиторий",
    xp: 50,
    why: "Git хранит историю изменений. Цикл всегда один: изменил файл → <b>add</b> (положил в индекс, «беру в коммит») → <b>commit</b> (зафиксировал с сообщением). Индекс существует именно для того, чтобы ты сам решал, что попадёт в коммит, а что нет.",
    cheat: [
      ["git init", "создать репозиторий"],
      ["git status", "что изменилось"],
      ["git add ФАЙЛ", "добавить в индекс"],
      ["git add .", "добавить всё"],
      ['git commit -m "текст"', "зафиксировать"],
      ["git log", "история коммитов"],
    ],
    hints: [
      "Перейди в ~/app и выполни git init",
      "git status подскажет, что файлы неотслеживаемые",
      'git add . добавит всё, затем git commit -m "первый коммит"',
    ],
    setup: seedRepo,
    objs: [
      { t: "Инициализируй репозиторий в ~/app", d: "git init", ok: (w) => !!w.git },
      { t: "Посмотри, что видит git", d: "git status", ok: ran(/^git\s+status/) },
      {
        t: "Добавь файлы в индекс",
        d: "git add .",
        ok: (w) => !!w.git && (w.git.staged.length > 0 || w.git.commits.length > 0),
      },
      {
        t: "Сделай коммит с осмысленным сообщением",
        d: 'git commit -m "первый коммит"',
        ok: (w) => !!w.git && w.git.commits.length > 0,
      },
      { t: "Проверь историю", d: "git log", ok: ran(/^git\s+log/) },
    ],
    solution: ["git init", "git status", "git add .", 'git commit -m "первый коммит"', "git log"],
  },
  {
    id: "5.2",
    act: 5,
    title: "Ветки и слияние",
    xp: 55,
    why: "Ветка — это отдельная линия работы. Правило команды: <b>в главную ветку не коммитят напрямую</b>. Делаешь ветку под задачу, работаешь, потом вливаешь обратно. Так падение твоей недоделки не роняет прод.",
    cheat: [
      ["git switch -c ИМЯ", "создать ветку и перейти"],
      ["git branch", "список веток"],
      ["git switch main", "вернуться в главную"],
      ["git merge ИМЯ", "влить ветку"],
      ["edit index.js", "изменить файл"],
    ],
    hints: [
      "git switch -c feature-cart создаст ветку",
      'Измени файл (edit index.js), затем git add . и git commit -m "..."',
      "Вернись: git switch main",
      "Влей: git merge feature-cart",
    ],
    setup: (w) => {
      seedRepo(w);
      w.git = {
        branch: "main",
        branches: ["main"],
        staged: [],
        commits: [{ msg: "первый коммит", files: ["index.js"], branch: "main", hash: "a1b2c3d" }],
        remote: null,
        pushed: 0,
      };
    },
    objs: [
      {
        t: "Создай ветку feature-cart и перейди в неё",
        d: "git switch -c feature-cart",
        ok: (w) => w.git?.branch === "feature-cart",
      },
      {
        t: "Измени index.js в редакторе",
        d: "edit index.js",
        ok: has("/home/devops/app/index.js", /cart|корзин/i),
      },
      {
        t: "Закоммить изменение",
        d: 'git add . затем git commit -m "добавил корзину"',
        ok: (w) => !!w.git && w.git.commits.length > 1,
      },
      { t: "Вернись в main", d: "git switch main", ok: (w) => w.git?.branch === "main" },
      {
        t: "Влей ветку feature-cart в main",
        d: "git merge feature-cart",
        ok: (w) => !!w.git && (w.git.merged || []).includes("feature-cart"),
      },
    ],
    solution: [
      "git switch -c feature-cart",
      { file: "index.js", content: "console.log('shop api');\nconsole.log('cart ready');\n" },
      "git add .",
      'git commit -m "добавил корзину"',
      "git switch main",
      "git merge feature-cart",
    ],
  },
];
