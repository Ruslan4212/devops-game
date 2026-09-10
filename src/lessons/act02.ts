import { getNode, writeFile } from "../engine/vfs";
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
];
