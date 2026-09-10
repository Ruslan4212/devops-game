import { getNode, writeFile } from "../engine/vfs";
import { ran, ranAny } from "./helpers";
import type { Mission } from "../engine/types";

export const act02: Mission[] = [
  {
    id: "2.1",
    act: 2,
    title: "Права доступа",
    xp: 45,
    why: "В Linux у каждого файла есть права для <b>владельца</b>, <b>группы</b> и <b>остальных</b>: чтение (r=4), запись (w=2), выполнение (x=1). Их складывают: 7=rwx, 6=rw-, 4=r--. Поэтому <b>chmod 600 файл</b> значит «владельцу читать и писать, остальным ничего» — так закрывают секреты.",
    cheat: [
      ["ls -l", "увидеть текущие права"],
      ["chmod 600 ФАЙЛ", "только владельцу чтение+запись"],
      ["chmod 644 ФАЙЛ", "владельцу rw, остальным r"],
      ["chmod +x ФАЙЛ", "сделать исполняемым"],
      ["sudo chown root ФАЙЛ", "сменить владельца"],
      ["whoami", "кто я сейчас"],
    ],
    hints: [
      "Сначала посмотри ls -l — увидишь строку прав вида rw-r--r--",
      "secrets.txt открыт всем на чтение. Нужно chmod 600 secrets.txt",
      "Смена владельца требует прав root: sudo chown root secrets.txt",
    ],
    setup: (w) => {
      writeFile(w, "/home/devops/secrets.txt", "DB_PASSWORD=hunter2\nAPI_TOKEN=abc123\n");
    },
    objs: [
      { t: "Посмотри права на файлы в домашнем каталоге", d: "ls -l", ok: ran(/^ls\s+-l/) },
      {
        t: "Закрой secrets.txt от всех, кроме владельца",
        d: "chmod 600 secrets.txt",
        ok: (w) => {
          const n = getNode(w, "/home/devops/secrets.txt");
          return !!n && n.type === "file" && n.mode === "rw-------";
        },
      },
      {
        t: "Передай файл во владение root (нужен sudo)",
        d: "sudo chown root secrets.txt",
        ok: (w) => {
          const n = getNode(w, "/home/devops/secrets.txt");
          return !!n && n.type === "file" && n.owner === "root";
        },
      },
    ],
    solution: ["ls -l", "chmod 600 secrets.txt", "sudo chown root secrets.txt"],
  },
  {
    id: "2.2",
    act: 2,
    title: "Кто съел процессор",
    xp: 45,
    why: "Сервер тормозит — надо найти виновника. <b>ps</b> показывает список процессов, <b>top</b> сортирует по нагрузке, <b>kill</b> завершает по PID. Чужой процесс убить нельзя без <b>sudo</b> — это защита системы, а не досадная помеха.",
    cheat: [
      ["ps", "список процессов"],
      ["top", "процессы по нагрузке CPU"],
      ["ps | grep ИМЯ", "найти процесс по имени"],
      ["kill PID", "завершить процесс"],
      ["sudo kill -9 PID", "жёстко завершить чужой процесс"],
    ],
    hints: [
      "Начни с top — он отсортирует по CPU, виновник будет сверху",
      "Запомни его PID (число в первой колонке)",
      "Процесс запущен от root, поэтому нужен sudo: sudo kill -9 PID",
    ],
    setup: (w) => {
      w.procs.push({ pid: 3312, user: "root", cpu: 98.4, cmd: "/opt/stress --cpu 4" });
    },
    objs: [
      { t: "Посмотри список процессов", d: "ps", ok: ran(/^ps\b/) },
      { t: "Найди процесс, съедающий CPU", d: "top", ok: ran(/^top\b/) },
      {
        t: "Заверши процесс-виновник (PID 3312, нужен sudo)",
        d: "sudo kill -9 3312",
        ok: (w) => !w.procs.find((p) => p.pid === 3312),
      },
    ],
    solution: ["ps", "top", "sudo kill -9 3312"],
  },
  {
    id: "2.3",
    act: 2,
    title: "Инцидент: nginx не стартует",
    xp: 60,
    incident: true,
    why: "Первый настоящий инцидент. Алгоритм разбора всегда один: <b>1)</b> посмотреть статус службы, <b>2)</b> прочитать её логи, <b>3)</b> понять причину, <b>4)</b> устранить, <b>5)</b> проверить, что поднялось. Здесь порт 80 занят чужим процессом — классика.",
    cheat: [
      ["systemctl status nginx", "состояние службы"],
      ["journalctl -u nginx", "логи именно этой службы"],
      ["ss -ltn", "кто какие порты слушает"],
      ["ps | grep ИМЯ", "найти процесс"],
      ["sudo kill -9 PID", "убить процесс"],
      ["sudo systemctl start nginx", "запустить службу"],
      ["sudo systemctl enable nginx", "включить автозапуск"],
    ],
    hints: [
      "systemctl status nginx покажет failed и намекнёт на журнал",
      "journalctl -u nginx выдаст строку про Address already in use",
      "ss -ltn покажет, что порт 80 занят процессом python3",
      "Найди его PID через ps, убей sudo kill -9 PID, затем sudo systemctl start nginx",
    ],
    setup: (w) => {
      w.services.nginx = {
        desc: "A high performance web server",
        state: "failed",
        enabled: false,
        needsPort: 80,
        err: "bind() to 0.0.0.0:80 failed (98: Address already in use)",
        journal: [
          "nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)",
          "nginx: configuration file test failed",
        ],
      };
      w.procs.push({ pid: 2201, user: "root", cpu: 1.2, cmd: "python3 -m http.server 80", port: 80 });
      w.ports[80] = "python3";
    },
    objs: [
      {
        t: "Проверь состояние службы nginx",
        d: "systemctl status nginx",
        ok: ranAny(/^systemctl\s+status\s+nginx/),
      },
      {
        t: "Прочитай журнал службы, чтобы понять причину",
        d: "journalctl -u nginx",
        ok: ranAny(/^journalctl\b.*nginx/),
      },
      { t: "Выясни, кто занял 80-й порт", d: "ss -ltn", ok: ran(/^ss\b/) },
      {
        t: "Освободи порт — заверши процесс-захватчик",
        d: "sudo kill -9 2201",
        ok: (w) => !w.procs.find((p) => p.pid === 2201),
      },
      {
        t: "Запусти nginx",
        d: "sudo systemctl start nginx",
        ok: (w) => w.services.nginx?.state === "active",
      },
      {
        t: "Включи автозапуск, чтобы после ребута поднялся сам",
        d: "sudo systemctl enable nginx",
        ok: (w) => !!w.services.nginx?.enabled,
      },
    ],
    solution: [
      "systemctl status nginx",
      "journalctl -u nginx",
      "ss -ltn",
      "sudo kill -9 2201",
      "sudo systemctl start nginx",
      "sudo systemctl enable nginx",
    ],
  },
];
