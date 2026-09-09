import { mkdirp, writeFile } from "../engine/vfs";
import { has, ran } from "./helpers";
import type { Mission, World } from "../engine/types";

const DOCKERFILE = "FROM node:20-alpine\nWORKDIR /app\nCOPY . .\nCMD [\"node\",\"index.js\"]\n";

const seedApp = (w: World): void => {
  mkdirp(w, "/home/devops/app");
  writeFile(w, "/home/devops/app/index.js", "console.log('shop api');\n");
  w.cwd = "/home/devops/app";
};

export const act06: Mission[] = [
  {
    id: "6.1", act: 6, title: "Собрать образ", xp: 60,
    why: "Контейнер решает проблему «у меня работает». <b>Dockerfile</b> — рецепт образа: с чего начать (FROM), что скопировать (COPY), что установить (RUN) и что запускать (CMD). Образ неизменяем и состоит из слоёв — поэтому повторная сборка быстрая.",
    cheat: [
      ["edit Dockerfile", "создать/править рецепт"],
      ["docker build -t shop:1.0 .", "собрать образ, точка = текущий каталог"],
      ["docker images", "список образов"],
      ["cat Dockerfile", "проверить рецепт"],
    ],
    hints: [
      "Открой edit Dockerfile — в шаблоне есть подсказки",
      "Обязательны минимум FROM и CMD, иначе сборка откажет",
      "Собери: docker build -t shop:1.0 . — точка в конце обязательна",
    ],
    setup: (w) => {
      seedApp(w);
      w.templates = {
        "/home/devops/app/Dockerfile":
          "# ЗАДАЧА: собери рецепт образа.\n" +
          "# Нужны как минимум строки FROM и CMD.\n" +
          "# Пример структуры:\n" +
          "#   FROM node:20-alpine\n" +
          "#   WORKDIR /app\n" +
          "#   COPY . .\n" +
          "#   CMD [\"node\", \"index.js\"]\n",
      };
    },
    objs: [
      { t: "Напиши Dockerfile с базовым образом (FROM)", d: "edit Dockerfile", ok: has("/home/devops/app/Dockerfile", /^\s*FROM\s+\S+/mi) },
      { t: "Укажи, что запускать в контейнере (CMD)", d: "строка CMD в Dockerfile", ok: has("/home/devops/app/Dockerfile", /^\s*(CMD|ENTRYPOINT)\s+/mi) },
      { t: "Собери образ с тегом shop:1.0", d: "docker build -t shop:1.0 .", ok: (w) => w.docker.images.some((i) => i.tag === "shop:1.0") },
      { t: "Проверь, что образ появился", d: "docker images", ok: ran(/^docker\s+images/) },
    ],
    solution: [
      { file: "Dockerfile", content: DOCKERFILE },
      "docker build -t shop:1.0 .",
      "docker images",
    ],
  },
  {
    id: "6.2", act: 6, title: "Запустить и заглянуть внутрь", xp: 60,
    why: "Образ — рецепт, контейнер — блюдо. <b>-d</b> запускает в фоне, <b>-p 8080:80</b> пробрасывает порт хоста в порт контейнера (порядок именно такой: ХОСТ:КОНТЕЙНЕР). Когда что-то не так — сначала <b>docker logs</b>, потом <b>docker exec</b> внутрь.",
    cheat: [
      ["docker run -d -p 8080:80 --name web shop:1.0", "запустить в фоне с пробросом порта"],
      ["docker ps", "запущенные контейнеры"],
      ["docker ps -a", "включая остановленные"],
      ["curl localhost:8080", "проверить, что отвечает"],
      ["docker logs web", "логи контейнера"],
      ["docker exec -it web sh", "зайти внутрь"],
    ],
    hints: [
      "Формат порта: -p ПОРТ_ХОСТА:ПОРТ_КОНТЕЙНЕРА",
      "Дай контейнеру имя через --name web — так удобнее",
      "После запуска проверь curl localhost:8080",
    ],
    setup: (w) => {
      seedApp(w);
      writeFile(w, "/home/devops/app/Dockerfile", DOCKERFILE);
      w.docker.images.push({ tag: "shop:1.0", layers: 4 });
    },
    objs: [
      { t: "Запусти контейнер в фоне с портом 8080→80 и именем web", d: "docker run -d -p 8080:80 --name web shop:1.0", ok: (w) => w.docker.containers.some((c) => c.hostPort === 8080) },
      { t: "Убедись, что контейнер работает", d: "docker ps", ok: ran(/^docker\s+ps/) },
      { t: "Проверь, что сервис отвечает по HTTP", d: "curl localhost:8080", ok: (w) => w.log.some((l) => /curl.*8080/.test(l.cmd) && l.code === 0) },
      { t: "Посмотри логи контейнера", d: "docker logs web", ok: ran(/^docker\s+logs/) },
      { t: "Зайди внутрь контейнера", d: "docker exec -it web sh", ok: (w) => !!w.execedContainer },
    ],
    solution: [
      "docker run -d -p 8080:80 --name web shop:1.0",
      "docker ps",
      "curl localhost:8080",
      "docker logs web",
      "docker exec -it web sh",
    ],
  },
];
