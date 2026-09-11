import { getNode, mkdirp, resolvePath, writeFile } from "../engine/vfs";
import { has, ran, ranAny } from "../missions/helpers";
import type { Lesson, World } from "../engine/types";

const OVERRIDE = "/etc/systemd/system/nginx.service.d/override.conf";

const lastCmd = (w: World): string => (w.log.length ? w.log[w.log.length - 1].cmd.trim() : "");

const ownerCanExec =
  (path: string) =>
  (w: World): boolean => {
    const n = getNode(w, path);
    return !!n && n.type === "file" && /x/.test(n.mode.slice(0, 3));
  };

/** Кому сейчас принадлежит файл (по умолчанию — текущему пользователю). Путь — как в терминале, относительно cwd. */
const ownerIs =
  (path: string, who: string) =>
  (w: World): boolean => {
    const n = getNode(w, resolvePath(w, path));
    return !!n && n.type === "file" && (n.owner || w.user) === who;
  };

/** Ровно такая строка прав (rwxr-x--- и т.п.), как после chmod. Путь — как в терминале, относительно cwd. */
const modeIs =
  (path: string, mode: string) =>
  (w: World): boolean => {
    const n = getNode(w, resolvePath(w, path));
    return !!n && n.type === "file" && n.mode === mode;
  };

/** Домашняя папка с файлом-секретом и скриптом. */
function seedFiles(w: World): void {
  writeFile(w, "/home/devops/secrets.txt", "DB_PASSWORD=hunter2\nAPI_TOKEN=abc123\n");
  writeFile(w, "/home/devops/deploy.sh", "#!/bin/bash\necho выкатываю новую версию\n");
}

/** Работающий nginx. */
function seedNginxActive(w: World): void {
  w.services.nginx = {
    desc: "A high performance web server",
    state: "active",
    enabled: true,
    needsPort: 80,
    journal: ["nginx: started, listening on 0.0.0.0:80"],
  };
  w.ports[80] = "nginx";
}

export const act02: Lesson[] = [
  {
    id: "2.1",
    act: 2,
    title: "Читаем права по буквам",
    xp: 15,
    intro: "Первый столбец в ls -l — это права. Разбираем его знак за знаком.",
    setup: seedFiles,
    steps: [
      {
        kind: "say",
        text:
          "Ты уже знаешь  ls -l  — подробный список файлов.\n\n" +
          "Самый первый столбец в нём — это ПРАВА: кому и что можно делать с файлом.\n" +
          "Сейчас разберём его по буквам, это несложно.",
      },
      {
        kind: "watch",
        run: "ls -l",
        note:
          "Посмотри на первый столбец, например  -rw-r--r--\n\n" +
          "Это 10 знаков подряд. Первый знак — тип: минус  -  значит обычный файл, буква  d  значит папка.\n" +
          "Остальные 9 — это три группы по три буквы.",
      },
      {
        kind: "say",
        text:
          "Три группы отвечают на вопрос «кому»:\n\n" +
          "1-я группа — владельцу файла\n" +
          "2-я группа — его группе\n" +
          "3-я группа — всем остальным\n\n" +
          "А внутри каждой группы всегда одни и те же три буквы:\n" +
          "  r  — read, читать\n" +
          "  w  — write, менять\n" +
          "  x  — execute, запускать\n\n" +
          "Прочерк  -  на месте буквы значит «нельзя».",
      },
      {
        kind: "say",
        text:
          "Разберём  -rw-r--r--  целиком:\n\n" +
          "  -      обычный файл\n" +
          "  rw-    владелец: читать и менять, запускать нельзя\n" +
          "  r--    группа: только читать\n" +
          "  r--    остальные: только читать",
      },
      {
        kind: "do",
        text: "Задача: выведи подробный список файлов и найди в нём secrets.txt",
        check: ran(/^ls\s+-l/),
        answer: "ls -l",
        hint: "Команда  ls  с флагом  -l",
      },
      {
        kind: "quiz",
        text: "В правах  -rw-r--r--  что может делать владелец файла?",
        options: ["Читать и менять файл", "Только читать", "Читать, менять и запускать"],
        answer: 0,
        explain:
          "Группа владельца — это  rw- . Есть r (читать) и w (менять). На третьем месте прочерк, значит запускать нельзя.",
      },
    ],
  },
  {
    id: "2.2",
    act: 2,
    title: "Права цифрами: chmod",
    xp: 20,
    intro: "Меняем права командой chmod. Цифры — это просто сложение.",
    setup: seedFiles,
    steps: [
      {
        kind: "say",
        text:
          "Менять права — команда  chmod  (от «change mode», сменить режим доступа).\n\n" +
          "Права ей задают цифрами. Выглядит страшно, но это обычное сложение.",
      },
      {
        kind: "say",
        text:
          "Каждая буква — это число:\n\n" +
          "  r  (читать)    = 4\n" +
          "  w  (менять)    = 2\n" +
          "  x  (запускать) = 1\n\n" +
          "Чтобы получить цифру для группы — складываем нужные буквы:\n" +
          "  rwx = 4+2+1 = 7\n" +
          "  rw- = 4+2   = 6\n" +
          "  r-x = 4+1   = 5\n" +
          "  r-- = 4",
      },
      {
        kind: "say",
        text:
          "Три цифры подряд — это три группы «кому»: владелец, группа, остальные.\n\n" +
          "  chmod 600 файл\n" +
          "     6 → владельцу  rw-  (читать и менять)\n" +
          "     0 → группе ничего\n" +
          "     0 → остальным ничего\n\n" +
          "Так закрывают файлы с паролями, чтобы их не прочитал никто чужой.",
      },
      {
        kind: "watch",
        run: "ls -l secrets.txt",
        note:
          "Сейчас у файла  -rw-r--r--  . Внутри лежит пароль от базы, а прочитать его может любой,\n" +
          "у кого есть доступ на сервер. Так оставлять нельзя.",
      },
      {
        kind: "watch",
        run: "chmod 600 secrets.txt",
        note: "Тишина. chmod, как и cd, молчит, когда всё получилось.",
      },
      {
        kind: "watch",
        run: "ls -l secrets.txt",
        note:
          "Стало  -rw-------\n\n" +
          "Вместо  r--r--  теперь шесть прочерков: группа и остальные больше ничего не могут.\n" +
          "Файл виден только владельцу.",
      },
      { kind: "type", text: "Закрой файл сам. Набери:  chmod 600 secrets.txt", cmd: "chmod 600 secrets.txt" },
      {
        kind: "say",
        text:
          "Второй частый случай — сделать файл запускаемым (например, скрипт).\n\n" +
          "Для этого нужна буква  x . Есть короткая запись:  chmod +x файл\n" +
          "Она добавляет право «запускать», не трогая остальные права.",
      },
      {
        kind: "do",
        text: "Задача: сделай скрипт  deploy.sh  запускаемым.",
        check: ownerCanExec("/home/devops/deploy.sh"),
        answer: "chmod +x deploy.sh",
        hint: "Команда  chmod , потом  +x , потом имя файла  deploy.sh",
      },
      {
        kind: "quiz",
        text: "Что даёт группе команда  chmod 640 файл ?",
        options: ["r-- — только чтение", "rw- — чтение и запись", "Ничего"],
        answer: 0,
        explain: "6 = rw- владельцу, 4 = r-- группе, 0 = ничего остальным.",
      },
    ],
  },
  {
    id: "2.3",
    act: 2,
    title: "Что сейчас запущено: ps",
    xp: 15,
    intro: "Процесс — это работающая программа. У каждой есть номер PID.",
    steps: [
      {
        kind: "say",
        text:
          "Программа, которая прямо сейчас работает, называется «процесс».\n\n" +
          "У каждого процесса есть номер — PID (Process ID, идентификатор процесса).\n" +
          "Именно по этому номеру процессом потом управляют: например, останавливают.",
      },
      {
        kind: "say",
        text:
          "Показать список процессов — команда  ps .\n\n" +
          "В жизни чаще пишут  ps aux  — это те же процессы, но вообще все и подробно.\n" +
          "Здесь хватит короткой формы.",
      },
      {
        kind: "watch",
        run: "ps",
        note:
          "Четыре столбца:\n" +
          "  PID     — номер процесса\n" +
          "  USER    — от чьего имени он запущен\n" +
          "  %CPU    — сколько процессора ест\n" +
          "  COMMAND — что это за программа",
      },
      { kind: "type", text: "Набери две буквы:  ps", cmd: "ps" },
      {
        kind: "quiz",
        text: "PID — это...",
        options: ["Номер процесса, по нему процессом управляют", "Имя пользователя", "Сколько памяти занято"],
        answer: 0,
        explain: "PID = Process ID. Уникальный номер работающей программы.",
      },
    ],
  },
  {
    id: "2.4",
    act: 2,
    title: "Кто ест процессор: top",
    xp: 15,
    intro: "top сортирует процессы по нагрузке — виновник всегда сверху.",
    setup: (w) => {
      w.procs.push({ pid: 3312, user: "root", cpu: 98.4, cmd: "/opt/stress --cpu 4" });
    },
    steps: [
      {
        kind: "say",
        text:
          "Сервер тормозит — надо найти, кто его грузит.\n\n" +
          "Команда  ps  показывает процессы как попало. А команда  top  сортирует их по нагрузке:\n" +
          "самый прожорливый оказывается в самом верху списка.",
      },
      {
        kind: "watch",
        run: "top",
        note:
          "Смотри на первую строку списка: PID 3312, целых 98% процессора, программа /opt/stress.\n" +
          "Вот он и есть виновник тормозов. Запомни его номер — 3312.",
      },
      { kind: "type", text: "Набери три буквы:  top", cmd: "top" },
      {
        kind: "do",
        text: "Задача: посмотри список по нагрузке ещё раз, сам.",
        check: (w) => lastCmd(w) === "top",
        answer: "top",
        hint: "Всего три буквы:  top",
      },
      {
        kind: "quiz",
        text: "Чем  top  удобнее  ps , когда сервер тормозит?",
        options: [
          "Сортирует по нагрузке — виновник сразу сверху",
          "Показывает меньше процессов",
          "Работает быстрее",
        ],
        answer: 0,
        explain: "top ставит самый прожорливый процесс первым, искать глазами не нужно.",
      },
    ],
  },
  {
    id: "2.5",
    act: 2,
    title: "Остановить процесс: kill",
    xp: 20,
    intro: "kill завершает процесс по номеру. Чужой — только через sudo.",
    setup: (w) => {
      w.procs.push({ pid: 3312, user: "root", cpu: 98.4, cmd: "/opt/stress --cpu 4" });
      w.procs.push({ pid: 4100, user: "devops", cpu: 2.1, cmd: "python3 my-script.py" });
    },
    steps: [
      {
        kind: "say",
        text:
          "Завершить процесс — команда  kill  и номер PID.\n\n" +
          "Например:  kill 4100\n" +
          "Несмотря на грозное название, обычно это вежливая просьба программе закончить работу.",
      },
      {
        kind: "watch",
        run: "kill 4100",
        note:
          "Молча завершился. PID 4100 — это твой собственный процесс (в колонке USER стояло devops),\n" +
          "поэтому дополнительных прав не потребовалось.",
      },
      {
        kind: "say",
        text:
          "А вот процесс 3312 запущен от пользователя  root  — это администратор системы.\n\n" +
          "Чужой процесс просто так не завершить: не хватит прав. Это защита, чтобы одна программа\n" +
          "не убивала чужие. Сейчас увидишь эту ошибку своими глазами.",
      },
      { kind: "type", text: "Попробуй без прав администратора. Набери:  kill 3312", cmd: "kill 3312" },
      {
        kind: "say",
        text:
          "Видишь «Операция не позволена»? Всё правильно — процесс чужой.\n\n" +
          "Чтобы выполнить команду с правами администратора, впереди пишут  sudo .\n" +
          "Ещё добавляют  -9  — это «завершить жёстко, без разговоров». Так поступают с зависшими.",
      },
      {
        kind: "do",
        text: "Задача: заверши процесс-обжору 3312 с правами администратора.",
        check: (w) => !w.procs.find((p) => p.pid === 3312),
        answer: "sudo kill -9 3312",
        hint: "То же самое, но впереди  sudo , и добавь  -9 :  sudo kill -9 3312",
      },
      {
        kind: "quiz",
        text: "Зачем нужен  sudo  перед  kill  чужого процесса?",
        options: [
          "Это защита: трогать чужое можно только с правами администратора",
          "Чтобы команда работала быстрее",
          "sudo вообще не нужен",
        ],
        answer: 0,
        explain: "Без sudo система не даст вмешаться в процессы другого пользователя.",
      },
    ],
  },
  {
    id: "2.6",
    act: 2,
    title: "Сервисы: кто держит программы живыми",
    xp: 20,
    intro: "systemd — надзиратель, который держит нужные программы запущенными.",
    setup: seedNginxActive,
    steps: [
      {
        kind: "say",
        text:
          "Есть программы, которые должны работать всегда: веб-сервер, база данных.\n\n" +
          "Их запускает не человек мышкой, а системный надзиратель за программами.\n" +
          "В Linux он называется  systemd .\n\n" +
          "Ты один раз говоришь ему «следи за nginx» — и он держит nginx запущенным.",
      },
      {
        kind: "say",
        text:
          "Такая управляемая программа называется «сервис» (или «служба»).\n\n" +
          "Команда для разговора с systemd —  systemctl  (system control, управление системой).\n" +
          "Спросить, как дела у сервиса:  systemctl status ИМЯ",
      },
      {
        kind: "watch",
        run: "systemctl status nginx",
        note:
          "Две важные строки:\n\n" +
          "  Active: active (running)  — сервис прямо сейчас работает.\n" +
          "  Loaded: ... enabled       — он включён в автозапуск, поднимется сам после перезагрузки сервера.",
      },
      {
        kind: "type",
        text: "Спроси состояние сам. Набери:  systemctl status nginx",
        cmd: "systemctl status nginx",
      },
      {
        kind: "quiz",
        text: "systemd — это...",
        options: [
          "Системный надзиратель, который держит сервисы запущенными",
          "Текстовый редактор",
          "Команда удаления файлов",
        ],
        answer: 0,
        explain: "systemd запускает сервисы, следит за ними и поднимает их при необходимости.",
      },
    ],
  },
  {
    id: "2.7",
    act: 2,
    title: "Поднять сервис и включить автозапуск",
    xp: 20,
    intro: "start — запустить сейчас, enable — запускать после перезагрузки.",
    setup: (w) => {
      w.services.nginx = {
        desc: "A high performance web server",
        state: "inactive",
        enabled: false,
        needsPort: 80,
        journal: [],
      };
    },
    steps: [
      {
        kind: "say",
        text:
          "С сервисом делают три вещи:\n\n" +
          "  systemctl start ИМЯ   — запустить прямо сейчас\n" +
          "  systemctl stop ИМЯ    — остановить\n" +
          "  systemctl enable ИМЯ  — включить автозапуск при загрузке сервера\n\n" +
          "Всё это управление системой, поэтому впереди нужен  sudo .",
      },
      {
        kind: "say",
        text:
          "Важно не перепутать:\n\n" +
          "  start   — работает СЕЙЧАС, но после перезагрузки сервера не поднимется.\n" +
          "  enable  — будет подниматься ПОСЛЕ ПЕРЕЗАГРУЗКИ, но прямо сейчас не запускает.\n\n" +
          "Поэтому обычно делают обе команды.",
      },
      {
        kind: "watch",
        run: "systemctl status nginx",
        note:
          "  Active: inactive (dead)  — сервис не работает.\n" +
          "  Loaded: ... disabled     — и после перезагрузки сам не поднимется.\n\n" +
          "Сломано и то, и другое. Чиним по очереди.",
      },
      { kind: "watch", run: "sudo systemctl start nginx", note: "Запустили. Как обычно — молча." },
      {
        kind: "watch",
        run: "systemctl status nginx",
        note:
          "Теперь  active (running)  — работает.\n" +
          "Но в строке Loaded по-прежнему  disabled : автозапуск ещё не включён.",
      },
      {
        kind: "type",
        text: "Запусти сервис сам. Набери:  sudo systemctl start nginx",
        cmd: "sudo systemctl start nginx",
      },
      {
        kind: "do",
        text: "Задача: включи автозапуск nginx, чтобы он поднимался после перезагрузки сервера.",
        check: (w) => !!w.services.nginx?.enabled,
        answer: "sudo systemctl enable nginx",
        hint: "sudo systemctl enable  и имя сервиса  nginx",
      },
      {
        kind: "quiz",
        text: "Что делает  systemctl enable ?",
        options: [
          "Сервис будет сам запускаться после перезагрузки сервера",
          "Запускает сервис прямо сейчас",
          "Удаляет сервис",
        ],
        answer: 0,
        explain: "enable — про автозапуск при загрузке. Чтобы запустить сейчас, нужен start.",
      },
    ],
  },
  {
    id: "2.8",
    act: 2,
    title: "Читать журнал сервиса",
    xp: 15,
    intro: "status говорит ЧТО сломалось, журнал говорит ПОЧЕМУ.",
    setup: (w) => {
      w.services.nginx = {
        desc: "A high performance web server",
        state: "failed",
        enabled: true,
        needsPort: 80,
        err: '[emerg] open() "/etc/nginx/ssl/cert.pem" failed (2: No such file or directory)',
        journal: [
          "systemd[1]: Starting A high performance web server...",
          "nginx: configuration file /etc/nginx/nginx.conf test failed",
        ],
      };
    },
    steps: [
      {
        kind: "say",
        text:
          "Когда сервис не работает,  systemctl status  честно говорит ЧТО случилось: failed.\n" +
          "Но не всегда объясняет ПОЧЕМУ.\n\n" +
          "Причину программы пишут в журнал — специальное место, куда система складывает все сообщения.",
      },
      {
        kind: "say",
        text:
          "Посмотреть журнал именно нужного сервиса:\n\n" +
          "  journalctl -u ИМЯ\n\n" +
          "Флаг  -u  означает unit — так systemd называет сервис. То есть «покажи записи по этому сервису».",
      },
      {
        kind: "watch",
        run: "systemctl status nginx",
        note: "  Active: failed  — сервис упал. Что именно не так, из этой строки не понять. Идём в журнал.",
      },
      {
        kind: "watch",
        run: "journalctl -u nginx",
        note:
          "Вот и причина, в последних строках: nginx не нашёл файл сертификата cert.pem.\n\n" +
          "Правило: журнал читают снизу вверх — внизу самое свежее.",
      },
      { kind: "type", text: "Открой журнал сам. Набери:  journalctl -u nginx", cmd: "journalctl -u nginx" },
      {
        kind: "quiz",
        text: "Что показывает  journalctl -u nginx ?",
        options: [
          "Записи журнала именно по сервису nginx",
          "Все файлы в текущей папке",
          "Список запущенных процессов",
        ],
        answer: 0,
        explain: "-u = unit, то есть отфильтровать журнал по одному сервису.",
      },
    ],
  },
  {
    id: "2.9",
    act: 2,
    title: "Инцидент: nginx не стартует ⚡",
    xp: 45,
    intro: "Первый настоящий разбор поломки. Идём по алгоритму, шаг за шагом.",
    setup: (w) => {
      w.services.nginx = {
        desc: "A high performance web server",
        state: "failed",
        enabled: false,
        needsPort: 80,
        err: "bind() to 0.0.0.0:80 failed (98: Address already in use)",
        journal: [
          "systemd[1]: Starting A high performance web server...",
          "nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)",
          "nginx: configuration file test failed",
        ],
      };
      w.procs.push({ pid: 2201, user: "root", cpu: 1.2, cmd: "python3 -m http.server 80", port: 80 });
      w.ports[80] = "python3";
    },
    steps: [
      {
        kind: "say",
        text:
          "Сервис nginx не запускается. Сейчас разберём это по шагам.\n\n" +
          "Запомни порядок — он одинаковый почти для любого упавшего сервиса:\n\n" +
          "  1) посмотреть статус\n" +
          "  2) прочитать журнал\n" +
          "  3) понять причину\n" +
          "  4) убрать причину\n" +
          "  5) запустить\n" +
          "  6) закрепить, чтобы не повторилось",
      },
      {
        kind: "watch",
        run: "sudo systemctl start nginx",
        note:
          "«Job for nginx.service failed» — не запустился.\n" +
          "Само по себе это ничего не объясняет. Идём по алгоритму.",
      },
      {
        kind: "do",
        text: "Шаг 1. Посмотри статус сервиса nginx.",
        check: ranAny(/^systemctl\s+status\s+nginx/),
        answer: "systemctl status nginx",
        hint: "systemctl status  и имя  nginx",
      },
      {
        kind: "do",
        text: "Шаг 2. Прочитай журнал этого сервиса.",
        check: ranAny(/journalctl\b.*nginx/),
        answer: "journalctl -u nginx",
        hint: "journalctl -u  и имя  nginx",
      },
      {
        kind: "say",
        text:
          "Ключевая строка в журнале:\n\n" +
          "  bind() to 0.0.0.0:80 failed (98: Address already in use)\n\n" +
          "По-русски: nginx хочет занять порт 80, а порт уже кем-то занят.\n" +
          "(Порт — это как номер квартиры: по одному адресу номер может занимать только одна программа.)\n\n" +
          "Значит, надо выяснить — кем.",
      },
      {
        kind: "do",
        text: "Шаг 3. Посмотри, какие программы слушают порты.",
        check: ran(/^ss\b/),
        answer: "ss -ltn",
        hint: "Команда  ss  с флагами  -ltn",
      },
      {
        kind: "say",
        text:
          "На порту 80 сидит  python3  — кто-то оставил тестовый веб-сервер и забыл его выключить.\n\n" +
          "Его PID — 2201, и запущен он от root. Значит, для завершения понадобится  sudo .",
      },
      {
        kind: "do",
        text: "Шаг 4. Освободи порт — заверши процесс 2201.",
        check: (w) => !w.procs.find((p) => p.pid === 2201),
        answer: "sudo kill -9 2201",
        hint: "sudo kill -9  и номер  2201",
      },
      {
        kind: "do",
        text: "Шаг 5. Теперь запусти nginx.",
        check: (w) => w.services.nginx?.state === "active",
        answer: "sudo systemctl start nginx",
        hint: "sudo systemctl start nginx",
      },
      {
        kind: "do",
        text: "Шаг 6. Включи автозапуск, чтобы после перезагрузки сервер поднял nginx сам.",
        check: (w) => !!w.services.nginx?.enabled,
        answer: "sudo systemctl enable nginx",
        hint: "sudo systemctl enable nginx",
      },
      {
        kind: "say",
        text:
          "Готово, инцидент закрыт.\n\n" +
          "Ты прошёл по алгоритму: статус → журнал → причина → убрать причину → запустить → закрепить.\n" +
          "Так чинится большинство поломок с сервисами. Порядок важнее, чем знание конкретных команд.",
      },
    ],
  },
  {
    id: "2.10",
    act: 2,
    title: "Restart и шторм перезапусков ⚡",
    xp: 30,
    intro: "Авто-перезапуск без ограничителя способен положить весь сервер.",
    setup: (w) => {
      w.services.nginx = {
        desc: "A high performance web server",
        state: "auto-restart",
        enabled: true,
        restart: "always",
        badConfig: true,
        restartCount: 12400,
        journalLines: 15000,
        err: "nginx: [emerg] invalid parameter in /etc/nginx/nginx.conf:12",
        journal: ["systemd[1]: Starting A high performance web server..."],
      };
      w.disk = 94;
    },
    steps: [
      {
        kind: "say",
        text:
          "Утро. Сервис nginx в странном состоянии: не работает — но и не сдаётся.\n\n" +
          "Сейчас поймём, что происходит, и почему это опаснее, чем просто упавший сервис.",
      },
      {
        kind: "watch",
        run: "systemctl status nginx",
        note:
          "Обрати внимание на две вещи:\n\n" +
          "  Active: activating (auto-restart)  — не «работает» и не «упал», а «прямо сейчас перезапускается».\n" +
          "  Перезапусков: 12400 и растёт\n\n" +
          "То есть: nginx стартует, СРАЗУ падает, systemd поднимает его снова. И так по кругу, тысячи раз.",
      },
      {
        kind: "say",
        text:
          "Почему он падает каждый раз?\n\n" +
          "Кто-то вчера правил файл настроек nginx и оставил там ошибку.\n" +
          "Теперь nginx не может запуститься в принципе — дело не в нагрузке, а в сломанном конфиге.\n" +
          "Сколько его ни поднимай, он упадёт снова.",
      },
      {
        kind: "say",
        text:
          "Кто его поднимает? systemd. В настройках сервиса есть строка  Restart=  —\n" +
          "она говорит, что делать, когда программа завершилась:\n\n" +
          "  Restart=on-failure  — поднимать, только если упала с ошибкой. Обычный, разумный выбор.\n" +
          "  Restart=always      — поднимать всегда, что бы ни случилось.\n\n" +
          "Посмотрим, что стоит у нашего nginx.",
      },
      {
        kind: "do",
        text: "Задача: покажи unit-файл (файл настроек) сервиса nginx.",
        check: ran(/^systemctl\s+cat\s+nginx/),
        answer: "systemctl cat nginx",
        hint: "systemctl cat  и имя  nginx",
      },
      {
        kind: "say",
        text:
          "Видишь строку  Restart=always  — и больше ничего рядом? Вот в этом и беда.\n\n" +
          "Сломанный конфиг + Restart=always без ограничителя = systemd поднимает падающий сервис\n" +
          "бесконечно, сотни раз в секунду. И каждая попытка пишет строчку в журнал.\n\n" +
          "Посмотрим, во что это вылилось за ночь.",
      },
      {
        kind: "do",
        text: "Задача: проверь, насколько заполнен диск.",
        check: ran(/^df\b/),
        answer: "df -h",
        hint: "Команда  df  с флагом  -h  (human, по-человечески)",
      },
      {
        kind: "say",
        text:
          "Диск занят на 94%. Журнал перезапусков за ночь съел десятки гигабайт.\n\n" +
          "Ещё немного — и место кончится совсем. Тогда ляжет не только nginx, а ВЕСЬ сервер:\n" +
          "остальным программам тоже некуда будет писать.\n\n" +
          "Вот это и называется «шторм перезапусков»: бесполезный цикл, который делает только хуже.",
      },
      {
        kind: "say",
        text:
          "Лечится ограничителем попыток. Три строки, которые ставят рядом с  Restart= :\n\n" +
          "  Restart=on-failure\n" +
          "  StartLimitIntervalSec=60\n" +
          "  StartLimitBurst=5\n\n" +
          "Читается так: «окно наблюдения — 60 секунд. За это окно разрешено 5 попыток запуска.\n" +
          "Не помогло — прекрати пытаться и оставь сервис в состоянии failed».",
      },
      {
        kind: "say",
        text:
          "Сам unit-файл руками править не принято — при обновлении пакета его перезапишут.\n\n" +
          "Правильно положить рядом маленький файл-добавку. Он называется drop-in, и путь у него такой:\n\n" +
          "  /etc/systemd/system/nginx.service.d/override.conf\n\n" +
          "Всё, что в нём написано, перекрывает настройки основного файла.",
      },
      {
        kind: "do",
        text:
          "Задача: создай этот файл-добавку. Набери в терминале:\n" +
          "edit /etc/systemd/system/nginx.service.d/override.conf\n" +
          "Откроется редактор — впиши блок [Service] и строки ограничителя, потом нажми Сохранить.",
        check: has(OVERRIDE, /Restart\s*=\s*on-failure/i),
        answer: "[Service]\nRestart=on-failure\nRestartSec=5\nStartLimitIntervalSec=60\nStartLimitBurst=5",
        editFile: OVERRIDE,
        hint:
          "Открой  edit /etc/systemd/system/nginx.service.d/override.conf  и впиши ровно это:\n" +
          "[Service]\nRestart=on-failure\nRestartSec=5\nStartLimitIntervalSec=60\nStartLimitBurst=5",
      },
      {
        kind: "say",
        text:
          "Файл создан, но systemd о нём ещё не знает: он не перечитывает настройки сам.\n\n" +
          "Надо явно сказать ему «перечитай unit-файлы»:  systemctl daemon-reload\n" +
          "Это частая забытая мелочь — правку сделали, а она не применилась.",
      },
      {
        kind: "do",
        text: "Задача: заставь systemd перечитать настройки.",
        check: ran(/systemctl\s+daemon-reload/),
        answer: "sudo systemctl daemon-reload",
        hint: "sudo systemctl daemon-reload",
      },
      {
        kind: "do",
        text: "Задача: перезапусти nginx и посмотри, что изменилось.",
        check: (w) => w.services.nginx?.state === "failed",
        answer: "sudo systemctl restart nginx",
        hint: "sudo systemctl restart nginx",
      },
      {
        kind: "say",
        text:
          "Смотри, что произошло: nginx сделал 5 попыток за минуту, после чего systemd остановился.\n" +
          "Сервис теперь в состоянии  failed  — честно лежит и не притворяется.\n\n" +
          "Журнал и диск больше не растут. Шторм погашен.\n" +
          "Осталось спокойно починить сам конфиг nginx — но уже без пожара и без гонки.",
      },
      {
        kind: "quiz",
        text: "Что делает строка  StartLimitBurst=5 ?",
        options: [
          "После 5 неудачных запусков за окно systemd перестаёт пытаться",
          "Запускает сервис 5 раз подряд для надёжности",
          "Ждёт 5 секунд перед запуском",
        ],
        answer: 0,
        explain:
          "Это ограничитель числа попыток. Без него Restart=always при сломанном конфиге устраивает шторм. Пауза между попытками — это другая строка, RestartSec.",
      },
      {
        kind: "say",
        text:
          "Правило на всю жизнь:\n\n" +
          "Авто-перезапуск без ограничителя попыток — это не страховка, а бомба замедленного действия.\n" +
          "Если пишешь  Restart= , рядом всегда должен стоять  StartLimitBurst= .",
      },
    ],
  },
  {
    id: "2.11",
    act: 2,
    title: "Отдать файл: chown",
    xp: 25,
    intro: "chmod меняет ЧТО можно делать с файлом. chown меняет, КОМУ он принадлежит.",
    setup: (w) => {
      mkdirp(w, "/home/devops/app");
      writeFile(w, "/home/devops/app/deploy.log", "деплой запущен вручную через sudo по ошибке\n");
      writeFile(w, "/home/devops/app/deploy.env", "STAGE=prod\n");
      for (const f of ["/home/devops/app/deploy.log", "/home/devops/app/deploy.env"]) {
        const n = getNode(w, f);
        if (n && n.type === "file") n.owner = "root";
      }
      w.cwd = "/home/devops/app";
    },
    steps: [
      {
        kind: "say",
        text:
          "Бывает, команду запускают через  sudo  по привычке, хотя не требовалось.\n" +
          "Итог: файл в ТВОЕЙ собственной папке оказывается собственностью root, а твои\n" +
          "обычные скрипты (работающие от devops) с ним потом мучаются.",
      },
      {
        kind: "watch",
        run: "ls -l deploy.log",
        note: "Во второй колонке владелец —  root . Файл лежит в твоей папке, но принадлежит не тебе.",
      },
      {
        kind: "say",
        text:
          "Передать файл другому владельцу —  chown  (change owner). Пишется:\n" +
          "chown  НОВЫЙ_ВЛАДЕЛЕЦ  файл\n\n" +
          "Но у chown, в отличие от chmod, есть жёсткое правило.",
      },
      {
        kind: "watch",
        run: "chown devops deploy.log",
        note:
          "«Операция не позволена — нужен sudo».\n\n" +
          "Даже владея папкой, в которой лежит файл, менять ЧЬЯ это собственность нельзя без прав\n" +
          "администратора. Иначе любой мог бы «присвоить» себе чужие файлы.",
      },
      {
        kind: "watch",
        run: "sudo chown devops deploy.log",
        note: "С sudo — получилось. Проверим.",
      },
      {
        kind: "watch",
        run: "ls -l deploy.log",
        note: "Владелец сменился на  devops . Дело в правах, не в файле.",
      },
      {
        kind: "type",
        text: "Повтори сам. Набери:  sudo chown devops deploy.log",
        cmd: "sudo chown devops deploy.log",
      },
      {
        kind: "do",
        text: "Задача: тот же самый случай со вторым файлом —  deploy.env . Верни ему владельца devops.",
        check: ownerIs("/home/devops/app/deploy.env", "devops"),
        answer: "sudo chown devops deploy.env",
        hint: "sudo chown devops deploy.env",
      },
      {
        kind: "quiz",
        text: "Почему  chown  требует sudo, даже если файл лежит в твоей собственной домашней папке?",
        options: [
          "Смена владельца — административное действие; без этого правила можно было бы присваивать себе чужие файлы",
          "chown вообще никогда не требует sudo",
          "chown опаснее, чем rm, поэтому его вообще запретили без root",
        ],
        answer: 0,
        explain:
          "chmod ты применяешь к СВОИМ файлам свободно. chown меняет принадлежность — это уже вопрос доверия во всей системе.",
      },
    ],
  },
  {
    id: "2.12",
    act: 2,
    title: "id и группы: зачем нужна вторая тройка прав",
    xp: 20,
    intro: "Права делятся на владельца/группу/всех не просто так — вот кому это нужно.",
    steps: [
      {
        kind: "say",
        text:
          "В Акте 2.1 ты разобрал права по трём группам: владелец, группа, остальные.\n" +
          "Но кто такая «группа» в реальности? Спросим у системы: команда  id  (identity).",
      },
      {
        kind: "watch",
        run: "id",
        note: "Три части ответа: uid — твой личный номер, gid — номер твоей основной группы, groups — все группы, в которых ты состоишь.",
      },
      {
        kind: "say",
        text:
          "Смотри внимательно на  groups=1000(devops),27(sudo) . Ты состоишь сразу в ДВУХ группах:\n" +
          "своей личной  devops  и системной  sudo .\n\n" +
          "Членство в группе  sudo  — вот откуда у тебя вообще берётся право писать команды\n" +
          "с приставкой  sudo . Это не волшебство, а обычное членство в группе.",
      },
      {
        kind: "say",
        text:
          "Теперь понятно, зачем в chmod вторая тройка прав («группа»): на реальном сервере\n" +
          "с командой из десяти человек заводят общую группу (например,  ops ), добавляют в неё\n" +
          "нужных людей — и одной строкой  chmod 640 файл  дают им доступ, не открывая файл\n" +
          "вообще всем на сервере.",
      },
      {
        kind: "do",
        text: "Задача: посмотри свои идентификаторы и группы.",
        check: ran(/^id\b/),
        answer: "id",
        hint: "Одна команда:  id",
      },
      {
        kind: "quiz",
        text: "Что значит вхождение в группу  27(sudo)  в выводе  id ?",
        options: [
          "Пользователю разрешено выполнять команды с sudo — именно членство в группе даёт это право",
          "Это просто техническая метка, ни на что не влияет",
          "Значит, у пользователя есть ровно 27 отдельных прав",
        ],
        answer: 0,
        explain:
          "sudo проверяет не «особый статус», а обычное членство в группе. Убрать из группы — и sudo пропадёт.",
      },
    ],
  },
  {
    id: "2.13",
    act: 2,
    title: "Числа как язык прав: реальные пресеты",
    xp: 30,
    intro: "На собеседовании реже спрашивают «что такое chmod», чаще — «какие права поставишь на X».",
    setup: (w) => {
      mkdirp(w, "/home/devops/app");
      writeFile(w, "/home/devops/app/secrets.env", "DB_PASSWORD=hunter2\n");
      writeFile(w, "/home/devops/app/deploy.sh", "#!/bin/bash\necho деплой\n");
      writeFile(w, "/home/devops/app/index.html", "<h1>Магазин</h1>\n");
      writeFile(w, "/home/devops/app/archive-2023.tar.gz", "(бинарный архив)\n");
      w.cwd = "/home/devops/app";
    },
    steps: [
      {
        kind: "say",
        text:
          "Четыре файла — четыре типичных случая, с которыми реально сталкиваются на работе.\n" +
          "У каждого свой правильный пресет прав. Разберём и проставим все четыре.",
      },
      {
        kind: "say",
        text:
          "secrets.env — пароли и токены. Читать и менять должен ТОЛЬКО владелец, больше никто —\n" +
          "ни группа, ни остальные. Это  600 .",
      },
      {
        kind: "do",
        text: "Задача: закрой  secrets.env  как секрет — только владельцу читать и писать.",
        check: modeIs("secrets.env", "rw-------"),
        answer: "chmod 600 secrets.env",
        hint: "chmod 600 secrets.env",
      },
      {
        kind: "say",
        text:
          "deploy.sh — скрипт, который запускает вся команда деплоя (общая группа), но посторонним\n" +
          "с сервера он не нужен вовсе. Владельцу — всё (rwx), группе — читать и запускать (r-x),\n" +
          "остальным — ничего. Это  750 .",
      },
      {
        kind: "do",
        text: "Задача: выставь deploy.sh права  750 .",
        check: modeIs("deploy.sh", "rwxr-x---"),
        answer: "chmod 750 deploy.sh",
        hint: "chmod 750 deploy.sh",
      },
      {
        kind: "say",
        text:
          "index.html — страница сайта, её отдаёт веб-сервер ВСЕМ посетителям. Владельцу — читать\n" +
          "и менять, всем остальным — только читать. Это  644 , самый частый пресет для\n" +
          "публичных файлов.",
      },
      {
        kind: "do",
        text: "Задача: выставь index.html права  644 .",
        check: modeIs("index.html", "rw-r--r--"),
        answer: "chmod 644 index.html",
        hint: "chmod 644 index.html",
      },
      {
        kind: "say",
        text:
          "archive-2023.tar.gz — старый архив. Его больше никто, включая ТЕБЯ САМОГО, не должен\n" +
          "случайно перезаписать — только читать. Права  444  убирают право записи вообще у всех,\n" +
          "даже у владельца.",
      },
      {
        kind: "do",
        text: "Задача: сделай архив полностью доступным только для чтения — всем, включая себя.",
        check: modeIs("archive-2023.tar.gz", "r--r--r--"),
        answer: "chmod 444 archive-2023.tar.gz",
        hint: "chmod 444 archive-2023.tar.gz",
      },
      {
        kind: "quiz",
        text: "Почему у архива, который никто не должен менять, ставят 444 даже владельцу?",
        options: [
          "444 убирает право записи у ВСЕХ, включая владельца — это защищает и от твоей собственной ошибки",
          "444 — минимальное возможное значение chmod, меньше поставить нельзя",
          "444 работает только для файлов с расширением .tar.gz",
        ],
        answer: 0,
        explain: "Права — это не только защита от чужих. Иногда важно защитить файл от самого себя в спешке.",
      },
    ],
  },
  {
    id: "2.14",
    act: 2,
    title: "Вежливо и жёстко: kill без -9 и с ним",
    xp: 25,
    intro: "kill по умолчанию — это просьба закончить работу. -9 — не просьба.",
    setup: (w) => {
      w.procs.push({ pid: 5200, user: "devops", cpu: 3.1, cmd: "node worker.js" });
      w.procs.push({ pid: 5301, user: "devops", cpu: 61.0, cmd: "python3 stuck_migration.py" });
    },
    steps: [
      {
        kind: "say",
        text:
          "В Акте 2.5 ты уже завершал процессы. Но у  kill  есть нюанс, который часто путают:\n" +
          "по умолчанию kill НЕ убивает программу мгновенно — он посылает ей сигнал TERM,\n" +
          "вежливую просьбу «пожалуйста, закончи работу сам».",
      },
      {
        kind: "say",
        text:
          "Программа, получив такой сигнал, успевает: сохранить несохранённые данные, закрыть\n" +
          "соединения с базой, дописать логи — и только потом завершиться. Это и есть\n" +
          "«корректное завершение».\n\n" +
          "Флаг  -9  — совсем другое: это сигнал KILL, программе не дают ни единого шанса\n" +
          "прибраться за собой. Обрыв мгновенно, что бы она ни делала в этот момент.",
      },
      {
        kind: "do",
        text: "Задача: PID 5200 (node worker.js) — обычный рабочий процесс. Заверши его вежливо, без -9.",
        check: (w) => !w.procs.find((p) => p.pid === 5200) && !/-9/.test(lastCmd(w)),
        answer: "kill 5200",
        hint: "Просто  kill  и номер, без флагов:  kill 5200",
      },
      {
        kind: "say",
        text:
          "А вот PID 5301 — скрипт миграции базы, который завис в бесконечном цикле уже несколько\n" +
          "минут и не реагирует ни на что. Вежливая просьба ему уже не поможет — самое время\n" +
          "эскалировать.",
      },
      {
        kind: "do",
        text: "Задача: заверши зависший PID 5301 жёстко.",
        check: (w) => !w.procs.find((p) => p.pid === 5301) && /-9/.test(lastCmd(w)),
        answer: "kill -9 5301",
        hint: "kill -9 5301",
      },
      {
        kind: "quiz",
        text: "Почему НЕЛЬЗЯ всегда сразу использовать kill -9, если можно и без него?",
        options: [
          "-9 не даёт программе шанса сохранить данные и закрыть соединения аккуратно — начинают всегда с вежливого kill",
          "kill -9 работает заметно медленнее обычного kill",
          "Для kill -9 всегда обязательно нужен sudo",
        ],
        answer: 0,
        explain:
          "Правило дежурного: сначала TERM (kill), эскалация до KILL (-9) — только если процесс не отвечает.",
      },
    ],
  },
  {
    id: "2.15",
    act: 2,
    title: "free и OOM Killer",
    xp: 25,
    intro: "Иногда сервис не падает сам — его убивает система, когда памяти не хватает на всех.",
    setup: (w) => {
      w.services.api = {
        desc: "Order API",
        state: "failed",
        enabled: true,
        err: "процесс убит системой из-за нехватки памяти",
        journal: [
          "systemd[1]: Started Order API.",
          "kernel: Out of memory: Killed process 7841 (api) total-vm:2048000kB, anon-rss:1850000kB",
          "systemd[1]: api.service: Main process exited, code=killed, status=9/KILL",
        ],
      };
    },
    steps: [
      {
        kind: "say",
        text: "Жалоба: сервис Order API «сам собой» упал ночью, никто его не трогал. Разбираемся.",
      },
      {
        kind: "do",
        text: "Шаг 1. Проверь статус сервиса  api",
        check: ranAny(/systemctl\s+status\s+api/),
        answer: "systemctl status api",
        hint: "systemctl status api",
      },
      {
        kind: "do",
        text: "Шаг 2. Прочитай журнал — там должна быть причина.",
        check: ranAny(/journalctl\b.*api/),
        answer: "journalctl -u api",
        hint: "journalctl -u api",
      },
      {
        kind: "say",
        text:
          "Ключевая строка:  kernel: Out of memory: Killed process 7841 (api) .\n\n" +
          "Это не авария приложения — это  OOM Killer  (Out Of Memory Killer), часть самого ядра\n" +
          "Linux. Когда свободной памяти на сервере не остаётся совсем, ядро вынуждено убить\n" +
          "хоть кого-то, иначе рухнет вся система разом. Оно выбирает жертву по числу  oom_score  —\n" +
          "обычно это самый прожорливый по памяти процесс.",
      },
      {
        kind: "say",
        text:
          "Важно: сам процесс тут ни при чём — его настигло удушение системы целиком.\n" +
          "Первое, что проверяют в таких случаях, помимо журнала — текущее состояние памяти.",
      },
      {
        kind: "do",
        text: "Шаг 3. Проверь текущее состояние оперативной памяти.",
        check: ran(/^free\b/),
        answer: "free",
        hint: "Одна команда:  free",
      },
      {
        kind: "quiz",
        text: "По какому принципу OOM Killer выбирает, какой процесс убить?",
        options: [
          "По oom_score — обычно это самый прожорливый по памяти процесс на сервере",
          "Убивает случайный процесс по номеру PID",
          "Всегда убивает процесс, который был запущен последним",
        ],
        answer: 0,
        explain:
          "Лечится не «перезапуском» — а увеличением памяти, лимитами по контейнерам или поиском утечки в самом процессе.",
      },
    ],
  },
  {
    id: "2.16",
    act: 2,
    title: "chmod-ловушка: запер сам себя",
    xp: 20,
    intro: "chmod 000 убирает права вообще у всех — включая тебя самого.",
    setup: (w) => {
      mkdirp(w, "/home/devops/app");
      writeFile(w, "/home/devops/app/config.env", "STAGE=staging\n");
      w.cwd = "/home/devops/app";
    },
    steps: [
      {
        kind: "say",
        text:
          "Инженер, перестраховываясь насчёт секретов, иногда «на всякий случай» ставит файлу\n" +
          "права 000 — вообще без единой единицы. Посмотрим, что из этого получается.",
      },
      { kind: "watch", run: "chmod 000 config.env", note: "Тишина, как обычно у chmod." },
      {
        kind: "watch",
        run: "ls -l config.env",
        note: "Девять прочерков подряд —  ---------- . Ни читать, ни писать не может уже НИКТО. Даже владелец.",
      },
      {
        kind: "say",
        text:
          "Вот и ловушка: 000 не «спрятал секрет от чужих», а запер сам файл наглухо, в том числе\n" +
          "от владельца. Формально это защита, но пользоваться файлом стало невозможно.\n\n" +
          "Для секрета правильный пресет — уже знакомый тебе  600 : владельцу можно, остальным нет.",
      },
      {
        kind: "do",
        text: "Задача: верни себе доступ — поставь секретный пресет прав  600 .",
        check: modeIs("config.env", "rw-------"),
        answer: "chmod 600 config.env",
        hint: "chmod 600 config.env",
      },
      {
        kind: "quiz",
        text: "Чем плохи права  000  для файла, который тебе самому нужен по работе?",
        options: [
          "000 убирает доступ вообще у всех, включая владельца — файлом станет невозможно пользоваться",
          "000 — это то же самое, что 600, просто другая запись",
          "000 работает только для папок, а не для файлов",
        ],
        answer: 0,
        explain:
          "«Максимально закрыто» не значит «правильно закрыто». Секрету нужен доступ ровно одному — владельцу, это 600, а не 000.",
      },
    ],
  },
  {
    id: "2.17",
    act: 2,
    title: "Инцидент: enabled ≠ работает прямо сейчас ⚡",
    xp: 35,
    intro: "Сервис включён в автозапуск — и всё равно не отвечает уже третий день.",
    setup: (w) => {
      w.services.nginx = {
        desc: "A high performance web server",
        state: "inactive",
        enabled: true,
        needsPort: 80,
        journal: [
          "systemd[1]: Stopping A high performance web server...",
          "systemd[1]: Stopped A high performance web server. (остановлено вручную, плановые работы в пятницу)",
        ],
      };
    },
    steps: [
      {
        kind: "say",
        text:
          "Понедельник, утро. Жалоба: «Сайт магазина не открывается уже который день».\n" +
          "Ты заходишь на сервер разобраться.",
      },
      {
        kind: "do",
        text: "Шаг 1. Проверь статус nginx.",
        check: ranAny(/systemctl\s+status\s+nginx/),
        answer: "systemctl status nginx",
        hint: "systemctl status nginx",
      },
      {
        kind: "say",
        text:
          "Странная картина:  Active: inactive (dead) , но при этом  Loaded: ... enabled .\n\n" +
          "На первый взгляд как будто должно работать само — сервис же «включён». Прежде чем\n" +
          "чинить, разберись, откуда взялась остановка.",
      },
      {
        kind: "do",
        text: "Шаг 2. Прочитай журнал nginx.",
        check: ranAny(/journalctl\b.*nginx/),
        answer: "journalctl -u nginx",
        hint: "journalctl -u nginx",
      },
      {
        kind: "say",
        text:
          "В журнале — обычная плановая остановка в пятницу, во время работ. Кто-то выполнил\n" +
          "systemctl stop  и просто забыл включить обратно.\n\n" +
          "Здесь и кроется путаница: enable  отвечает ТОЛЬКО за то, что произойдёт ПРИ СЛЕДУЮЩЕЙ\n" +
          "перезагрузке сервера. Он не «следит» за сервисом постоянно и не поднимает его обратно\n" +
          "сам, если кто-то остановил вручную. С пятницы по понедельник сервер не перезагружали —\n" +
          "значит, nginx так и провисел выключенным все выходные.",
      },
      {
        kind: "do",
        text: "Шаг 3. Запусти nginx прямо сейчас.",
        check: (w) => w.services.nginx?.state === "active",
        answer: "sudo systemctl start nginx",
        hint: "sudo systemctl start nginx",
      },
      {
        kind: "quiz",
        text: "Сервис enabled=true, но кто-то вручную его остановил. Поднимется ли он сам, если сервер прямо сейчас НЕ перезагружать?",
        options: [
          "Нет — enabled решает только то, что будет при следующей ЗАГРУЗКЕ сервера, а не прямо сейчас",
          "Да, через несколько минут systemd поднимет его сам",
          "Да, enabled означает, что сервис невозможно остановить вручную",
        ],
        answer: 0,
        explain:
          "enabled и «сейчас запущен» — два разных вопроса. Оба стоит проверять по отдельности, как в этом уроке.",
      },
    ],
  },
  {
    id: "2.18",
    act: 2,
    title: "Инцидент: деплою не хватает прав ⚡",
    xp: 35,
    intro: "Тикет: «Permission denied при попытке дописать в release.log». Разбираешься сам.",
    setup: (w) => {
      mkdirp(w, "/home/devops/app");
      writeFile(w, "/home/devops/app/release.log", "релиз 1.3.0, деплоил вручную через sudo\n");
      const n = getNode(w, "/home/devops/app/release.log");
      if (n && n.type === "file") {
        n.owner = "root";
        n.mode = "rw-------";
      }
      w.cwd = "/home/devops/app";
    },
    steps: [
      {
        kind: "say",
        text:
          "Тикет от разработчика: «Наш скрипт деплоя (работает от devops) падает с Permission denied,\n" +
          "пытаясь дописать в release.log. Файл когда-то давно заводили вручную через sudo».\n\n" +
          "Разберись и почини — двух отдельных проблем здесь на самом деле одна причина в двух местах.",
      },
      {
        kind: "do",
        text: "Шаг 1. Посмотри подробности файла.",
        check: ran(/^ls\s+-l\s+release\.log/),
        answer: "ls -l release.log",
        hint: "ls -l release.log",
      },
      {
        kind: "say",
        text:
          "Видно сразу два несовпадения:\n\n" +
          "  1) владелец —  root , а деплой-скрипт работает от  devops\n" +
          "  2) права —  rw------- , то есть доступ вообще только у владельца — у root\n\n" +
          "Значит, чинить нужно и ВЛАДЕНИЕ, и ПРАВА отдельно — это две разные оси, chmod одно\n" +
          "не заменяет другое.",
      },
      {
        kind: "do",
        text: "Шаг 2. Верни файл владельцу devops.",
        check: ownerIs("release.log", "devops"),
        answer: "sudo chown devops release.log",
        hint: "sudo chown devops release.log",
      },
      {
        kind: "do",
        text: "Шаг 3. Выставь права: владельцу — читать и писать, остальным — только читать (644).",
        check: modeIs("release.log", "rw-r--r--"),
        answer: "chmod 644 release.log",
        hint: "chmod 644 release.log",
      },
      {
        kind: "quiz",
        text: "Почему в этом тикете понадобились И chown, И chmod — а не что-то одно?",
        options: [
          "chown меняет, КОМУ принадлежит файл, chmod — ЧТО с ним может делать этот владелец и остальные; это разные оси",
          "Можно было обойтись одним только chown, chmod здесь лишний",
          "chmod автоматически исправляет владельца заодно",
        ],
        answer: 0,
        explain:
          "Владение неправильное — деплой-скрипт не тот пользователь. Права слишком узкие — даже правильный владелец не спасёт без rw.",
      },
    ],
  },
  {
    id: "2.19",
    act: 2,
    title: "Собери отчёт об инциденте",
    xp: 30,
    intro: "Пригодится тот же приём из Акта 1: сохранить вывод команд в файл, а не пересказывать словами.",
    setup: (w) => {
      w.services.nginx = {
        desc: "A high performance web server",
        state: "failed",
        enabled: true,
        err: "bind() to 0.0.0.0:80 failed (98: Address already in use)",
        journal: ["systemd[1]: Starting A high performance web server..."],
      };
    },
    steps: [
      {
        kind: "say",
        text:
          "Тимлид просит короткую сводку по инциденту с nginx — статус и причину из журнала —\n" +
          "в отдельном файле, чтобы приложить к разбору после дежурства. Тот же приём с  >  и  >> ,\n" +
          "что и в Акте 1, только теперь на новом материале.",
      },
      {
        kind: "do",
        text: "1) Сохрани статус сервиса в файл  incident.txt",
        check: has("incident.txt", /nginx/),
        answer: "systemctl status nginx > incident.txt",
        hint: "systemctl status nginx > incident.txt",
      },
      {
        kind: "do",
        text: "2) Допиши в конец того же файла записи из журнала — не заменяя то, что уже сохранено.",
        check: has("incident.txt", /Address already in use/),
        answer: "journalctl -u nginx >> incident.txt",
        hint: "Знак  >> , а не  > , чтобы дописать:  journalctl -u nginx >> incident.txt",
      },
      {
        kind: "do",
        text: "3) Проверь получившийся файл целиком.",
        check: ran(/^cat\s+incident\.txt\s*$/),
        answer: "cat incident.txt",
        hint: "cat incident.txt",
      },
      {
        kind: "quiz",
        text: "Почему для второй команды использовали  >> , а не  > ?",
        options: [
          "Чтобы дописать журнал к уже сохранённому статусу, а не стереть его целиком",
          "journalctl вообще не умеет работать со знаком >",
          "Разницы нет, можно было использовать любой из двух",
        ],
        answer: 0,
        explain: "Тот же принцип из Акта 1: > заменяет файл целиком, >> дописывает в конец.",
      },
    ],
  },
  {
    id: "2.20",
    act: 2,
    title: "Финал акта: ночной звонок ⚡⚡",
    xp: 55,
    intro: "2 часа ночи, сайт магазина не открывается целиком. Разберись и почини всё, что найдёшь.",
    setup: (w) => {
      w.services.nginx = {
        desc: "A high performance web server",
        state: "failed",
        enabled: false,
        needsPort: 80,
        err: "bind() to 0.0.0.0:80 failed (98: Address already in use)",
        journal: ["systemd[1]: Starting A high performance web server..."],
      };
      w.procs.push({ pid: 2290, user: "root", cpu: 0.4, cmd: "python3 -m http.server 80", port: 80 });
      w.ports[80] = "python3";
      mkdirp(w, "/home/devops/app");
      writeFile(w, "/home/devops/app/release.log", "релиз 1.4.0\n");
      const n = getNode(w, "/home/devops/app/release.log");
      if (n && n.type === "file") n.owner = "root";
      w.cwd = "/home/devops/app";
    },
    steps: [
      {
        kind: "say",
        text:
          "Звонок в 2 часа ночи: «Сайт магазина не открывается вообще, клиенты не могут оформить\n" +
          "ни одного заказа». Ты один на дежурстве. Собери весь Акт 2 воедино — по алгоритму,\n" +
          "без паники.",
      },
      {
        kind: "do",
        text: "Шаг 1. Проверь статус nginx.",
        check: ranAny(/systemctl\s+status\s+nginx/),
        answer: "systemctl status nginx",
        hint: "systemctl status nginx",
      },
      {
        kind: "do",
        text: "Шаг 2. Прочитай журнал nginx.",
        check: ranAny(/journalctl\b.*nginx/),
        answer: "journalctl -u nginx",
        hint: "journalctl -u nginx",
      },
      {
        kind: "say",
        text: "Знакомая картина из Акта 2.9: порт 80 уже кем-то занят. Проверь, кем именно.",
      },
      {
        kind: "do",
        text: "Шаг 3. Посмотри, какие программы слушают порты.",
        check: ran(/^ss\b/),
        answer: "ss -ltn",
        hint: "ss -ltn",
      },
      {
        kind: "do",
        text: "Шаг 4. Освободи порт — заверши забытый посторонний процесс 2290. Он не твой, действуй соответственно.",
        check: (w) => !w.procs.find((p) => p.pid === 2290),
        answer: "sudo kill -9 2290",
        hint: "Процесс запущен от root, значит нужен sudo:  sudo kill -9 2290",
      },
      {
        kind: "do",
        text: "Шаг 5. Запусти nginx.",
        check: (w) => w.services.nginx?.state === "active",
        answer: "sudo systemctl start nginx",
        hint: "sudo systemctl start nginx",
      },
      {
        kind: "do",
        text: "Шаг 6. Включи автозапуск, чтобы следующая перезагрузка не повторила эту же ночь.",
        check: (w) => !!w.services.nginx?.enabled,
        answer: "sudo systemctl enable nginx",
        hint: "sudo systemctl enable nginx",
      },
      {
        kind: "say",
        text:
          "Сайт снова открывается. Пока ты здесь — заодно замечаешь: release.log в папке деплоя\n" +
          "почему-то принадлежит root. Раз уж ты не спишь, почини и это, чтобы утром CI не упал следом.",
      },
      {
        kind: "do",
        text: "Шаг 7. Верни release.log владельцу devops.",
        check: ownerIs("release.log", "devops"),
        answer: "sudo chown devops release.log",
        hint: "sudo chown devops release.log",
      },
      {
        kind: "say",
        text: "Осталось зафиксировать, что произошло, — так же, как в прошлом уроке.",
      },
      {
        kind: "do",
        text: "Шаг 8. Сохрани финальный статус nginx в отчёт  night-incident.txt",
        check: has("night-incident.txt", /nginx/),
        answer: "systemctl status nginx > night-incident.txt",
        hint: "systemctl status nginx > night-incident.txt",
      },
      {
        kind: "do",
        text: "Шаг 9. Допиши в конец отчёта короткий итог своими словами.",
        check: has("night-incident.txt", /порт освобождён/),
        answer: 'echo "порт освобождён, права release.log починены" >> night-incident.txt',
        hint: 'echo "порт освобождён, права release.log починены" >> night-incident.txt',
      },
      {
        kind: "do",
        text: "Шаг 10. Прочитай готовый отчёт перед тем, как наконец лечь спать.",
        check: ran(/^cat\s+night-incident\.txt\s*$/),
        answer: "cat night-incident.txt",
        hint: "cat night-incident.txt",
      },
      {
        kind: "say",
        text:
          "Инцидент закрыт полностью: сайт работает, автозапуск включён, права починены, отчёт готов.\n\n" +
          "Акт 2 пройден. Ты умеешь: читать и назначать права (ls -l, chmod, реальные пресеты),\n" +
          "передавать владение (chown), понимать группы (id), находить и завершать процессы вежливо\n" +
          "и жёстко (ps, top, kill), управлять сервисами и их автозапуском (systemctl), читать причину\n" +
          "по журналу (journalctl), распознавать шторм перезапусков и OOM Killer — и собирать всё\n" +
          "это в отчёт. Дальше — bash-скрипты: то же самое, но без ручного набора каждой команды.",
      },
    ],
  },
];
