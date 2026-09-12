import { mkdirp, writeFile } from "../engine/vfs";
import { has, ran } from "../missions/helpers";
import type { Lesson, World } from "../engine/types";

const CONF_OK =
  "# /etc/zabbix/zabbix_agentd.conf\n" +
  "Server=10.0.1.10\n" +
  "ServerActive=10.0.1.10\n" +
  "Hostname=web-01\n" +
  "\n" +
  "# своя метрика: число процессов nginx\n" +
  "UserParameter=nginx.workers,pgrep -c nginx\n";

/** Пустой каталог конфигов Zabbix, состояние сброшено. */
function seedZabbix(w: World): void {
  mkdirp(w, "/etc/zabbix");
  w.cwd = "/etc/zabbix";
  w.zabbix = {
    agentConfigured: false,
    serverAddr: null,
    userParams: {},
    triggers: [],
    serverReaches: false,
  };
}

/** То же, но агент уже настроен и сервер достаёт метрики. */
function seedConfigured(w: World): void {
  seedZabbix(w);
  writeFile(w, "/etc/zabbix/zabbix_agentd.conf", CONF_OK);
  w.zabbix!.agentConfigured = true;
  w.zabbix!.serverAddr = "10.0.1.10";
  w.zabbix!.serverReaches = true;
  w.zabbix!.userParams = { "nginx.workers": "pgrep -c nginx" };
}

export const act13: Lesson[] = [
  {
    id: "13.1",
    act: 13,
    title: "Зачем Zabbix, если есть Prometheus",
    xp: 15,
    intro: "Разные инструменты выросли из разных задач. Zabbix стоит в тысячах компаний.",
    steps: [
      {
        kind: "say",
        text:
          "Ты уже знаешь Prometheus (Акт 11) и Grafana (Акт 12). Zabbix решает ту же\n" +
          "задачу — мониторинг, — но появился раньше и устроен иначе.\n\n" +
          "В вакансиях он встречается постоянно: банки, телеком, госсектор, любой\n" +
          "«не облачный» инфраструктурный отдел. Знать его — практическая необходимость.",
      },
      {
        kind: "say",
        text:
          "Чем Zabbix отличается от Prometheus:\n\n" +
          "  • ставится как единая система: сервер + база + веб-интерфейс + агенты\n" +
          "  • «из коробки» умеет собирать метрики ОС, слать письма/телеграм, рисовать\n" +
          "    графики — не нужно собирать связку из трёх продуктов\n" +
          "  • сильная сторона — сеть и железо: SNMP, IPMI, коммутаторы, ИБП\n" +
          "  • конфигурация в основном через веб-интерфейс и хранится в базе,\n" +
          "    а не файлами в git (это его слабое место с точки зрения IaC)",
      },
      {
        kind: "say",
        text:
          "Грубое правило выбора:\n\n" +
          "  Kubernetes, микросервисы, всё в облаке, инфраструктура как код\n" +
          "    -> Prometheus + Grafana\n\n" +
          "  Парк физических серверов и сетевого оборудования, нужно «всё в одном»,\n" +
          "  команда без глубокой экспертизы в мониторинге\n" +
          "    -> Zabbix\n\n" +
          "Часто в компании есть и то, и другое — для разных зон.",
      },
      {
        kind: "quiz",
        text: "В каком случае Zabbix обычно предпочитают Prometheus?",
        options: [
          "Парк физических серверов и сетевого железа, нужен мониторинг «всё в одном» из коробки",
          "Кластер Kubernetes с автоскейлингом",
          "Когда вся инфраструктура описана в Terraform",
        ],
        answer: 0,
        explain:
          "Zabbix силён в сети/железе и не требует собирать стек из нескольких продуктов. Prometheus — про cloud-native.",
      },
    ],
  },
  {
    id: "13.2",
    act: 13,
    title: "Из чего состоит Zabbix",
    xp: 20,
    intro: "Четыре части: сервер, база, веб-интерфейс и агенты на хостах.",
    steps: [
      {
        kind: "say",
        text:
          "Zabbix — это не одна программа, а связка:\n\n" +
          "  zabbix-server   — мозг: опрашивает агенты, считает триггеры, шлёт оповещения\n" +
          "  база данных     — хранит и метрики (history), и всю конфигурацию\n" +
          "  zabbix-frontend — веб-интерфейс на PHP: тут настраивают хосты, смотрят графики\n" +
          "  zabbix-agent    — маленькая программа на КАЖДОМ наблюдаемом сервере",
      },
      {
        kind: "say",
        text:
          "Важное отличие от Prometheus: у Zabbix конфигурация (хосты, что собирать,\n" +
          "какие триггеры) живёт в БАЗЕ и правится через веб-интерфейс. Файла вроде\n" +
          "prometheus.yml, который можно положить в git, здесь нет.\n\n" +
          "Файлами настраивается только сам агент — про него следующий урок.",
      },
      {
        kind: "say",
        text:
          "Как течёт метрика (пассивный режим, он основной):\n\n" +
          "  zabbix-server раз в N секунд подключается к агенту на хосте (порт 10050)\n" +
          "  и спрашивает: «дай мне значение по ключу system.cpu.load[all,avg1]».\n" +
          "  Агент выполняет соответствующую проверку локально и возвращает число.\n" +
          "  Сервер кладёт его в базу и проверяет, не сработал ли триггер.",
      },
      {
        kind: "quiz",
        text: "Где Zabbix хранит конфигурацию хостов и триггеров?",
        options: [
          "В базе данных, правится через веб-интерфейс — файла в git, как prometheus.yml, нет",
          "В /etc/zabbix/hosts.yml",
          "В самом агенте на каждом хосте",
        ],
        answer: 0,
        explain:
          "Файлами настраивается только агент. Хосты/items/триггеры — в БД через frontend (это минус для IaC).",
      },
    ],
  },
  {
    id: "13.3",
    act: 13,
    title: "Агент и его конфиг",
    xp: 25,
    intro: "Единственный файл, который правят руками на наблюдаемом сервере.",
    setup: (w) => {
      seedZabbix(w);
      w.templates = {
        "/etc/zabbix/zabbix_agentd.conf":
          "# ЗАДАЧА: настрой агент. Нужны минимум три строки:\n" +
          "#   Server=       — адрес zabbix-сервера (10.0.1.10)\n" +
          "#   ServerActive= — тот же адрес, для активных проверок\n" +
          "#   Hostname=     — имя этого хоста (web-01), должно совпадать с именем в интерфейсе\n" +
          "# Сотри комментарий и впиши конфиг.\n",
      };
    },
    steps: [
      {
        kind: "say",
        text:
          "Файл  /etc/zabbix/zabbix_agentd.conf . Минимально нужны три параметра:\n\n" +
          "  Server=10.0.1.10\n" +
          "  ServerActive=10.0.1.10\n" +
          "  Hostname=web-01\n",
      },
      {
        kind: "say",
        text:
          "Разбор:\n\n" +
          "  Server=       — с каких адресов агент ПРИМЕТ запросы (пассивные проверки).\n" +
          "                  Если сюда не вписать адрес сервера — сервер получит отказ.\n" +
          "                  Это по сути белый список, аналог правила файрвола.\n" +
          "  ServerActive= — куда агент сам ПОДКЛЮЧАЕТСЯ за списком активных проверок.\n" +
          "  Hostname=     — как этот хост называется. Должно ТОЧНО совпадать с именем\n" +
          "                  хоста, заведённого в веб-интерфейсе, иначе метрики не сойдутся.",
      },
      {
        kind: "do",
        text:
          "Задача: настрой агент. Набери:\n" +
          "edit zabbix_agentd.conf\n" +
          "Впиши Server, ServerActive (оба 10.0.1.10) и Hostname=web-01. Сохрани.",
        check: (w) =>
          has("/etc/zabbix/zabbix_agentd.conf", /^\s*Server\s*=/m)(w) &&
          has("/etc/zabbix/zabbix_agentd.conf", /^\s*Hostname\s*=/m)(w),
        answer: CONF_OK,
        editFile: "/etc/zabbix/zabbix_agentd.conf",
        hint: "Открой  edit zabbix_agentd.conf  и впиши три строки Server=, ServerActive=, Hostname= из теории.",
      },
      {
        kind: "say",
        text:
          "Конфиг проверяют, не перезапуская агент вслепую:\n\n" +
          "  zabbix_agentd -c zabbix_agentd.conf\n\n" +
          "Утилита найдёт синтаксическую ошибку или отсутствие обязательного параметра.",
      },
      {
        kind: "do",
        text: "Задача: проверь конфиг агента.",
        check: (w) => !!w.zabbix?.agentConfigured,
        answer: "zabbix_agentd -c zabbix_agentd.conf",
        hint: "Команда  zabbix_agentd -c zabbix_agentd.conf",
      },
      {
        kind: "quiz",
        text: "Что задаёт параметр  Server=  в конфиге агента?",
        options: [
          "Белый список адресов, с которых агент примет запросы — сюда обязательно вписывают адрес zabbix-сервера",
          "Адрес базы данных Zabbix",
          "Имя хоста в интерфейсе",
        ],
        answer: 0,
        explain:
          "Нет адреса сервера в Server= -> сервер получает «connection refused» от агента. Частая причина «нет данных».",
      },
    ],
  },
  {
    id: "13.4",
    act: 13,
    title: "Item и ключ проверки",
    xp: 20,
    intro: "Одна метрика в Zabbix — это item, а что именно собрать, говорит его «ключ».",
    setup: seedConfigured,
    steps: [
      {
        kind: "say",
        text:
          "В Zabbix отдельная собираемая метрика называется  item  («элемент данных»).\n" +
          "У каждого item есть  ключ (key) — короткая строка, которая говорит агенту,\n" +
          "что именно измерить:\n\n" +
          "  agent.ping                     — агент жив? (всегда 1, если отвечает)\n" +
          "  system.cpu.load[all,avg1]      — средняя загрузка CPU за 1 минуту\n" +
          "  vfs.fs.size[/,pfree]           — сколько процентов свободно на /\n" +
          "  vm.memory.size[available]      — доступная память в байтах\n\n" +
          "В квадратных скобках — параметры ключа (какая ФС, какой интерфейс).",
      },
      {
        kind: "say",
        text:
          "Прежде чем заводить item в интерфейсе, ключ проверяют прямо на хосте:\n\n" +
          "  zabbix_agentd -t agent.ping\n\n" +
          "  -t — test: агент выполнит проверку по ключу и покажет результат.\n" +
          "Если ключ не поддерживается — увидишь  ZBX_NOTSUPPORTED .",
      },
      {
        kind: "watch",
        run: "zabbix_agentd -t agent.ping",
        note:
          "Ответ  [s|1]  — агент отдал значение 1 по ключу agent.ping.\n" +
          "s — тип (строка/число), 1 — само значение. Ключ рабочий.",
      },
      {
        kind: "do",
        text: "Задача: проверь ключ загрузки CPU —  system.cpu.load[all,avg1]",
        check: ran(/^zabbix_agentd\s+-t\s+system\.cpu\.load/),
        answer: "zabbix_agentd -t system.cpu.load[all,avg1]",
        hint: "Команда  zabbix_agentd -t system.cpu.load[all,avg1]",
      },
      {
        kind: "do",
        text: "Задача: проверь несуществующий ключ  system.nonsense  — должно вернуться ZBX_NOTSUPPORTED.",
        check: (w) => w.log.some((l) => /^zabbix_agentd\s+-t\s+system\.nonsense/.test(l.cmd)),
        answer: "zabbix_agentd -t system.nonsense",
        hint: "Команда  zabbix_agentd -t system.nonsense",
      },
      {
        kind: "quiz",
        text: "Что означает ответ  ZBX_NOTSUPPORTED  при проверке ключа?",
        options: [
          "Агент не знает такого ключа: опечатка, нет нужного модуля или UserParameter",
          "Сервер недоступен",
          "Метрика собрана успешно",
        ],
        answer: 0,
        explain:
          "Проверяй имя ключа и параметры в скобках. Свои ключи добавляют через UserParameter (урок 13.6).",
      },
    ],
  },
  {
    id: "13.5",
    act: 13,
    title: "Проверка сбора с сервера",
    xp: 25,
    intro: "zabbix_get эмулирует то, что делает сервер: спрашивает метрику у агента по сети.",
    setup: seedConfigured,
    steps: [
      {
        kind: "say",
        text:
          "zabbix_agentd -t  проверяет ключ ЛОКАЛЬНО на самом хосте. Но проблема часто\n" +
          "не в ключе, а в сети между сервером и агентом.\n\n" +
          "Чтобы проверить именно этот путь, есть  zabbix_get  — она делает ровно то,\n" +
          "что делает сервер: подключается к агенту по сети (порт 10050) и запрашивает ключ.",
      },
      {
        kind: "say",
        text:
          "  zabbix_get -s 10.0.1.20 -k agent.ping\n\n" +
          "  -s — адрес хоста с агентом\n" +
          "  -k — ключ item\n\n" +
          "Запускают её обычно С САМОГО zabbix-сервера — так проверяется реальный\n" +
          "сетевой путь: файрвол, параметр Server= в конфиге агента, порт 10050.",
      },
      {
        kind: "watch",
        run: "zabbix_get -s 10.0.1.20 -k agent.ping",
        note:
          "Ответ  1  — сервер (в нашем случае эмулятор) достучался до агента и получил\n" +
          "значение. Значит и сеть, и Server= в конфиге, и порт — всё в порядке.",
      },
      {
        kind: "do",
        text: "Задача: запроси у агента процент свободного места на / —  vfs.fs.size[/,pfree]",
        check: ran(/^zabbix_get\s+-s\s+\S+\s+-k\s+vfs\.fs\.size/),
        answer: "zabbix_get -s 10.0.1.20 -k vfs.fs.size[/,pfree]",
        hint: "Команда  zabbix_get -s 10.0.1.20 -k vfs.fs.size[/,pfree]",
      },
      {
        kind: "quiz",
        text: "zabbix_agentd -t КЛЮЧ работает, а zabbix_get с сервера — «connection refused». Где проблема?",
        options: [
          "Не в ключе: сеть/файрвол на порту 10050 или адрес сервера не вписан в Server= конфига агента",
          "Ключ не поддерживается",
          "Упала база данных Zabbix",
        ],
        answer: 0,
        explain:
          "Локальный тест изолирует ключ. Если он проходит, а get по сети — нет, разбираются с сетью и Server=.",
      },
    ],
  },
  {
    id: "13.6",
    act: 13,
    title: "UserParameter: своя метрика",
    xp: 20,
    intro: "Нужной метрики нет среди встроенных ключей — добавляешь свою одной строкой.",
    setup: (w) => {
      seedZabbix(w);
      writeFile(
        w,
        "/etc/zabbix/zabbix_agentd.conf",
        "Server=10.0.1.10\nServerActive=10.0.1.10\nHostname=web-01\n",
      );
      w.zabbix!.agentConfigured = true;
      w.zabbix!.serverAddr = "10.0.1.10";
      w.zabbix!.serverReaches = true;
    },
    steps: [
      {
        kind: "say",
        text:
          "Встроенные ключи покрывают ОС, но не твоё приложение. Чтобы собрать что-то\n" +
          "своё — число заказов в очереди, воркеров nginx, ответ health-эндпоинта —\n" +
          "в конфиг агента добавляют строку  UserParameter :\n\n" +
          "  UserParameter=nginx.workers,pgrep -c nginx\n" +
          "               имя ключа        команда shell\n\n" +
          "Теперь по ключу  nginx.workers  агент выполнит  pgrep -c nginx  и вернёт число.",
      },
      {
        kind: "say",
        text:
          "Правила безопасности для UserParameter (их спрашивают на собеседовании):\n\n" +
          "  • команда выполняется от пользователя zabbix — дай ему только нужные права\n" +
          "  • не подставляй параметры ключа в команду без проверки — это как SQL-инъекция,\n" +
          "    только шелл; для этого есть настройка UnsafeUserParameters (по умолчанию off)\n" +
          "  • команда должна быть быстрой: агент ждёт её, а сервер ждёт агента",
      },
      {
        kind: "do",
        text:
          "Задача: добавь свою метрику. Набери:\n" +
          "edit zabbix_agentd.conf\n" +
          "Допиши строку  UserParameter=nginx.workers,pgrep -c nginx . Сохрани.",
        check: has("/etc/zabbix/zabbix_agentd.conf", /UserParameter\s*=\s*nginx\.workers/),
        answer:
          "Server=10.0.1.10\nServerActive=10.0.1.10\nHostname=web-01\n\nUserParameter=nginx.workers,pgrep -c nginx\n",
        editFile: "/etc/zabbix/zabbix_agentd.conf",
        hint: "В  edit zabbix_agentd.conf  допиши строку  UserParameter=nginx.workers,pgrep -c nginx",
      },
      {
        kind: "do",
        text: "Задача: перечитай конфиг и проверь новый ключ —  zabbix_agentd -t nginx.workers",
        check: ran(/^zabbix_agentd\s+-t\s+nginx\.workers/),
        answer: "zabbix_agentd -c zabbix_agentd.conf\nzabbix_agentd -t nginx.workers",
        hint: "Сначала  zabbix_agentd -c zabbix_agentd.conf , потом  zabbix_agentd -t nginx.workers",
      },
      {
        kind: "quiz",
        text: "От какого пользователя выполняется команда из UserParameter и почему это важно?",
        options: [
          "От пользователя zabbix — ему дают минимум прав, иначе через свою метрику можно расширить доступ",
          "От root, поэтому можно делать что угодно",
          "От того, кто запустил zabbix_get",
        ],
        answer: 0,
        explain:
          "UserParameter — это выполнение shell-команд. Минимальные права + осторожность с параметрами ключа обязательны.",
      },
    ],
  },
  {
    id: "13.7",
    act: 13,
    title: "Триггер: когда считать, что плохо",
    xp: 25,
    intro: "Триггер в Zabbix — это выражение над собранными метриками, аналог alert rule.",
    setup: seedConfigured,
    steps: [
      {
        kind: "say",
        text:
          "Собирать метрики мало — нужно правило «вот теперь плохо». В Zabbix это\n" +
          "называется  триггер (trigger). Он состоит из выражения и важности.\n\n" +
          "Выражение ссылается на item через функцию и параметр времени:\n\n" +
          "  last(/web-01/vfs.fs.size[/,pfree]) < 10\n" +
          "  функция  хост          ключ item\n\n" +
          "Читается: «последнее значение свободного места на / у web-01 меньше 10%».",
      },
      {
        kind: "say",
        text:
          "Частые функции в выражениях триггеров:\n\n" +
          "  last(...)              — последнее значение\n" +
          "  avg(/host/key,5m)      — среднее за 5 минут (сглаживает всплески — как for в Prometheus)\n" +
          "  min(...) / max(...)    — минимум/максимум за период\n" +
          "  nodata(/host/key,5m)   — 5 минут нет данных вообще (агент умер)\n\n" +
          "avg вместо last — тот же приём, что поле  for  в Акте 11: не будить\n" +
          "на секундный выброс.",
      },
      {
        kind: "say",
        text:
          "У триггера есть важность (severity), она определяет, кого и как оповещать:\n\n" +
          "  Not classified / Information / Warning — в чат, разберутся в рабочее время\n" +
          "  Average / High / Disaster              — звонок дежурному, в том числе ночью\n\n" +
          "Это ровно та же идея critical/warning из Акта 10, просто уровней больше.",
      },
      {
        kind: "quiz",
        text: "Почему в триггере часто пишут  avg(/host/key,5m) > X , а не  last(/host/key) > X ?",
        options: [
          "avg за 5 минут не сработает на одиночный выброс — защита от ложных тревог, аналог for в Prometheus",
          "avg считается быстрее, чем last",
          "last нельзя использовать в триггерах",
        ],
        answer: 0,
        explain: "last реагирует на любой мгновенный скачок. avg/min/max за период дают устойчивое условие.",
      },
    ],
  },
  {
    id: "13.8",
    act: 13,
    title: "Инцидент: сервер не собирает метрики ⚡",
    xp: 45,
    intro: "В интерфейсе у хоста «нет данных». Агент при этом жив. Разбираемся.",
    setup: (w) => {
      seedZabbix(w);
      // Hostname есть, но Server= указывает на заглушку из шаблона — сервер получит отказ
      writeFile(
        w,
        "/etc/zabbix/zabbix_agentd.conf",
        "Server=127.0.0.1\nServerActive=127.0.0.1\nHostname=web-01\n",
      );
      w.zabbix!.agentConfigured = true;
      w.zabbix!.serverAddr = "127.0.0.1";
      w.zabbix!.serverReaches = false;
    },
    steps: [
      {
        kind: "say",
        text:
          "Жалоба: «в Zabbix у хоста web-01 всё серое, данных нет уже час».\n" +
          "Начинаем снизу: жив ли вообще агент на самом хосте.",
      },
      {
        kind: "do",
        text: "Шаг 1. Проверь агент локально на хосте — ключ  agent.ping",
        check: ran(/^zabbix_agentd\s+-t\s+agent\.ping/),
        answer: "zabbix_agentd -t agent.ping",
        hint: "Команда  zabbix_agentd -t agent.ping",
      },
      {
        kind: "say",
        text:
          "Локально  [s|1]  — агент работает, ключи отдаёт. Значит проблема на пути\n" +
          "между сервером и агентом. Проверяем этот путь тем, чем ходит сервер.",
      },
      {
        kind: "do",
        text: "Шаг 2. Запроси метрику так, как это делает сервер — zabbix_get с адреса web-01.",
        check: (w) => w.log.some((l) => /^zabbix_get\s+-s/.test(l.cmd)),
        answer: "zabbix_get -s 10.0.1.20 -k agent.ping",
        hint: "Команда  zabbix_get -s 10.0.1.20 -k agent.ping",
      },
      {
        kind: "say",
        text:
          "«cannot connect ... сервер не в списке разрешённых (Server=) или порт закрыт».\n\n" +
          "Локальный тест прошёл, сетевой — нет. Две причины: файрвол на 10050 или\n" +
          "в конфиге агента в  Server=  не тот адрес. Смотрим конфиг.",
      },
      {
        kind: "do",
        text: "Шаг 3. Посмотри конфиг агента.",
        check: ran(/^cat\s+zabbix_agentd\.conf/),
        answer: "cat zabbix_agentd.conf",
        hint: "Команда  cat zabbix_agentd.conf",
      },
      {
        kind: "say",
        text:
          "В конфиге  Server=127.0.0.1  — это заглушка из шаблона, её забыли поменять.\n" +
          "Агент принимает запросы только с 127.0.0.1, а настоящий сервер живёт на\n" +
          "10.0.1.10 — и получает отказ. Правим.",
      },
      {
        kind: "do",
        text:
          "Шаг 4. Почини конфиг. Набери:\n" +
          "edit zabbix_agentd.conf\n" +
          "Замени 127.0.0.1 на адрес сервера 10.0.1.10 в Server= и ServerActive=. Сохрани.",
        check: (w) =>
          has("/etc/zabbix/zabbix_agentd.conf", /Server\s*=\s*10\.0\.1\.10/)(w) &&
          !has("/etc/zabbix/zabbix_agentd.conf", /127\.0\.0\.1/)(w),
        answer: "Server=10.0.1.10\nServerActive=10.0.1.10\nHostname=web-01\n",
        editFile: "/etc/zabbix/zabbix_agentd.conf",
        hint: "В  edit zabbix_agentd.conf  замени 127.0.0.1 на 10.0.1.10 в обеих строках.",
      },
      {
        kind: "do",
        text: "Шаг 5. Перечитай конфиг агента.",
        check: (w) => !!w.zabbix && w.zabbix.serverAddr === "10.0.1.10" && w.zabbix.serverReaches,
        answer: "zabbix_agentd -c zabbix_agentd.conf",
        hint: "Команда  zabbix_agentd -c zabbix_agentd.conf",
      },
      {
        kind: "do",
        text: "Шаг 6. Проверь, что метрики снова достаются с сервера.",
        check: (w) => {
          const i = w.log.findIndex((l) => /^zabbix_agentd\s+-c/.test(l.cmd));
          return i >= 0 && w.log.slice(i).some((l) => /^zabbix_get/.test(l.cmd) && l.code === 0);
        },
        answer: "zabbix_get -s 10.0.1.20 -k agent.ping",
        hint: "Команда  zabbix_get -s 10.0.1.20 -k agent.ping  — теперь должна вернуть 1",
      },
      {
        kind: "say",
        text:
          "Инцидент закрыт. Алгоритм «в Zabbix нет данных» всегда один:\n\n" +
          "  zabbix_agentd -t КЛЮЧ  (агент жив локально?)\n" +
          "    -> zabbix_get -s ХОСТ -k КЛЮЧ  (путь по сети?)\n" +
          "      -> cat конфига: Server=, Hostname=  -> файрвол на 10050\n\n" +
          "Локальный тест отделяет проблему ключа от проблемы сети.",
      },
    ],
  },
  {
    id: "13.9",
    act: 13,
    title: "Шаблоны",
    xp: 20,
    intro: "Набор items и триггеров, который применяют сразу к десяткам хостов.",
    steps: [
      {
        kind: "say",
        text:
          "У тебя сорок одинаковых веб-серверов. Заводить руками на каждом одни и те же\n" +
          "двадцать items и десять триггеров — путь к ошибкам и хаосу.\n\n" +
          "Поэтому в Zabbix есть  шаблоны (templates). Шаблон — это именованный набор\n" +
          "items, триггеров, графиков и правил обнаружения. Хост «наследует» всё это,\n" +
          "как только шаблон к нему привязан.",
      },
      {
        kind: "say",
        text:
          "Что это даёт:\n\n" +
          "  • новый сервер: завёл хост, привязал шаблон «Linux by Zabbix agent» —\n" +
          "    и сразу собираются CPU, память, диск, сеть, есть триггеры\n" +
          "  • поправил порог в шаблоне — изменение применилось ко всем сорока хостам\n" +
          "  • шаблоны можно экспортировать в XML/YAML и хранить в git — единственный\n" +
          "    практичный способ держать конфигурацию Zabbix под контролем версий",
      },
      {
        kind: "say",
        text:
          "Zabbix идёт с большой библиотекой готовых шаблонов: Linux, Windows, Nginx,\n" +
          "PostgreSQL, Docker, сетевые устройства по SNMP. Обычно берут готовый и\n" +
          "дополняют своими items под конкретное приложение.",
      },
      {
        kind: "quiz",
        text: "Зачем нужны шаблоны в Zabbix?",
        options: [
          "Один набор items и триггеров применяется к десяткам хостов; правка в шаблоне меняет их у всех",
          "Шаблоны ускоряют работу базы данных",
          "Без шаблона нельзя завести ни одного хоста",
        ],
        answer: 0,
        explain:
          "Шаблон — единое место правды для однотипных хостов. Плюс экспорт в файл для хранения в git.",
      },
    ],
  },
  {
    id: "13.10",
    act: 13,
    title: "Автообнаружение (LLD)",
    xp: 20,
    intro: "Одно правило создаёт items для каждой файловой системы или интерфейса — само.",
    steps: [
      {
        kind: "say",
        text:
          "На сервере три файловые системы: / , /var , /data . Заводить для каждой\n" +
          "по три item (размер, свободно, %) вручную — девять item, и это только диски.\n" +
          "А если завтра добавят /backup?\n\n" +
          "Для этого есть  низкоуровневое обнаружение (Low-Level Discovery, LLD).",
      },
      {
        kind: "say",
        text:
          "Как работает LLD:\n\n" +
          "  1) правило обнаружения спрашивает у агента специальный ключ, например\n" +
          "     vfs.fs.discovery — тот возвращает СПИСОК файловых систем\n" +
          "  2) к правилу привязан прототип item с макросом:\n" +
          "     ключ  vfs.fs.size[{#FSNAME},pfree]\n" +
          "  3) Zabbix подставляет каждое имя из списка и создаёт настоящий item\n" +
          "     для каждой ФС. Появилась новая — item создастся сам; исчезла — удалится.",
      },
      {
        kind: "say",
        text:
          "Так же обнаруживают сетевые интерфейсы, ядра CPU, диски, сервисы systemd,\n" +
          "контейнеры Docker, базы в СУБД. LLD — то, что делает мониторинг парка серверов\n" +
          "поддерживаемым: не ты бегаешь за инфраструктурой, а мониторинг сам за ней следует.",
      },
      {
        kind: "quiz",
        text: "Что делает правило низкоуровневого обнаружения (LLD)?",
        options: [
          "Автоматически создаёт items по списку сущностей (ФС, интерфейсы) и обновляет его при изменениях",
          "Ищет новые хосты в сети",
          "Понижает уровень логирования агента",
        ],
        answer: 0,
        explain:
          "LLD = «прототип item + макрос + список от агента». Новая ФС — новый item сам; убрали — item удалился.",
      },
    ],
  },
  {
    id: "13.11",
    act: 13,
    title: "Zabbix и Prometheus вместе",
    xp: 20,
    intro: "Не «или-или»: у каждого своя зона, часто в одной компании оба.",
    steps: [
      {
        kind: "say",
        text:
          "Ты прошёл оба мира мониторинга. Собери картину, как их обычно сочетают.\n\n" +
          "  Zabbix       — «этаж инфраструктуры»: физические серверы, гипервизоры,\n" +
          "                 СХД, коммутаторы и маршрутизаторы (SNMP), ИБП, температура\n" +
          "                 в стойке. Всё «из коробки», с оповещениями и графиками.\n\n" +
          "  Prometheus   — «этаж приложений»: сервисы в Kubernetes, метрики бизнес-логики,\n" +
          "                 RED/USE дашборды в Grafana, алерты в git рядом с кодом.",
      },
      {
        kind: "say",
        text:
          "Границы стираются: Zabbix умеет забирать метрики из /metrics в формате\n" +
          "Prometheus, а из Zabbix можно экспортировать данные в системы, понимающие\n" +
          "PromQL. Но исходная сильная сторона у каждого своя, и на собеседовании\n" +
          "ценят умение объяснить, ЧТО чем мониторить и почему.",
      },
      {
        kind: "say",
        text:
          "Общее у всех систем мониторинга, независимо от инструмента:\n\n" +
          "  • алерт — только на симптом, который чувствует пользователь\n" +
          "  • у каждого алерта есть runbook и понятно, что делать\n" +
          "  • дашборд отвечает на конкретный вопрос конкретного человека\n" +
          "  • конфигурацию по возможности держат в git\n\n" +
          "Инструмент меняется — принципы из Актов 10–13 остаются.",
      },
      {
        kind: "quiz",
        text: "Компания на 90% в Kubernetes, но есть стойка сетевого железа. Разумная схема мониторинга?",
        options: [
          "Prometheus + Grafana для сервисов в кластере, Zabbix для коммутаторов и железа по SNMP",
          "Только Zabbix — он умеет всё",
          "Только Prometheus — Zabbix устарел",
        ],
        answer: 0,
        explain: "Каждый инструмент в своей зоне. Prometheus силён в cloud-native, Zabbix — в сети и железе.",
      },
    ],
  },
  {
    id: "13.12",
    act: 13,
    title: "Проверка: подключить хост к Zabbix",
    xp: 35,
    intro: "От пустого конфига до метрик, которые достаёт сервер.",
    setup: (w) => {
      seedZabbix(w);
      w.templates = {
        "/etc/zabbix/zabbix_agentd.conf":
          "# Настрой агент: Server= и ServerActive= на 10.0.1.10, Hostname=web-01,\n" +
          "# и добавь UserParameter=nginx.workers,pgrep -c nginx . Комментарий сотри.\n",
      };
    },
    steps: [
      {
        kind: "say",
        text:
          "Финал Акта 13. Подключи хост web-01 к Zabbix-серверу самостоятельно.\n" +
          "Ошибёшься — подсказка, ещё раз — готовый ответ.",
      },
      {
        kind: "do",
        text: "Шаг 1. Настрой конфиг агента. Набери:  edit zabbix_agentd.conf",
        check: (w) =>
          has("/etc/zabbix/zabbix_agentd.conf", /Server\s*=\s*10\.0\.1\.10/)(w) &&
          has("/etc/zabbix/zabbix_agentd.conf", /Hostname\s*=\s*web-01/)(w) &&
          has("/etc/zabbix/zabbix_agentd.conf", /UserParameter\s*=\s*nginx\.workers/)(w),
        answer: CONF_OK,
        editFile: "/etc/zabbix/zabbix_agentd.conf",
        hint: "Открой  edit zabbix_agentd.conf  и впиши Server, ServerActive, Hostname и строку UserParameter.",
      },
      {
        kind: "do",
        text: "Шаг 2. Проверь конфиг агента.",
        check: (w) => !!w.zabbix?.agentConfigured,
        answer: "zabbix_agentd -c zabbix_agentd.conf",
        hint: "Команда  zabbix_agentd -c zabbix_agentd.conf",
      },
      {
        kind: "do",
        text: "Шаг 3. Проверь встроенный ключ локально —  agent.ping",
        check: ran(/^zabbix_agentd\s+-t\s+agent\.ping/),
        answer: "zabbix_agentd -t agent.ping",
        hint: "Команда  zabbix_agentd -t agent.ping",
      },
      {
        kind: "do",
        text: "Шаг 4. Проверь свою метрику —  nginx.workers",
        check: ran(/^zabbix_agentd\s+-t\s+nginx\.workers/),
        answer: "zabbix_agentd -t nginx.workers",
        hint: "Команда  zabbix_agentd -t nginx.workers",
      },
      {
        kind: "do",
        text: "Шаг 5. Убедись, что сервер достаёт метрику по сети.",
        check: (w) => w.log.some((l) => /^zabbix_get\s+-s/.test(l.cmd) && l.code === 0),
        answer: "zabbix_get -s 10.0.1.20 -k agent.ping",
        hint: "Команда  zabbix_get -s 10.0.1.20 -k agent.ping",
      },
      {
        kind: "say",
        text:
          "Хороший рубеж. Хост подключён, метрики идут, ты умеешь чинить «нет данных».\n" +
          "Это база. Дальше в этом же акте — настоящие триггеры: заведём их руками,\n" +
          "разберём инцидент с ложной тревогой и соберём полноценный мониторинг хоста\n" +
          "с CPU- и диск-триггерами, как это делает дежурный инженер на проде.",
      },
    ],
  },
  {
    id: "13.13",
    act: 13,
    title: "Заводим триггер руками",
    xp: 25,
    intro: "От «просто собираем метрику» к «система сама говорит, когда плохо».",
    setup: seedConfigured,
    steps: [
      {
        kind: "say",
        text:
          "В интерфейсе триггер заводят мышкой, но суть та же, что мы уже разобрали\n" +
          "в 13.7. В этом симуляторе триггер заводится командой:\n\n" +
          '  zabbix trigger add "Имя" "last(КЛЮЧ)>ЧИСЛО" СЕРЬЁЗНОСТЬ\n\n' +
          "Поддерживаются операторы  >  <  >=  <=  = . Функция всегда  last(...) —\n" +
          "это самый частый и самый простой вид условия.",
      },
      {
        kind: "watch",
        run: 'zabbix trigger add "CPU перегружен" "last(system.cpu.load[all,avg1])>5" high',
        note:
          "Триггер сохранён: если последнее значение system.cpu.load[all,avg1]\n" +
          "превысит 5 — сработает тревога уровня high.",
      },
      {
        kind: "do",
        text:
          "Задача: заведи триггер на нехватку места на диске — сработает, если\n" +
          "vfs.fs.size[/,pfree] (процент свободного места) станет меньше 10. Важность average.",
        check: (w) => !!w.zabbix?.triggers.some((t) => /vfs\.fs\.size/.test(t.expr) && /<\s*10/.test(t.expr)),
        answer: 'zabbix trigger add "Диск заполнен" "last(vfs.fs.size[/,pfree])<10" average',
        hint: 'Команда  zabbix trigger add "Диск заполнен" "last(vfs.fs.size[/,pfree])<10" average',
      },
      {
        kind: "do",
        text: "Задача: посмотри список заведённых триггеров.",
        check: ran(/^zabbix\s+trigger\s+list/),
        answer: "zabbix trigger list",
        hint: "Команда  zabbix trigger list",
      },
      {
        kind: "quiz",
        text: 'Что вернёт  zabbix trigger add "X" "cpu больше 5" high  (без функции last и без хоста в скобках)?',
        options: [
          "Ошибку: выражение не в поддерживаемом формате last(КЛЮЧ)>ЧИСЛО",
          "Триггер добавится, но никогда не сработает",
          "Триггер добавится и сразу сработает",
        ],
        answer: 0,
        explain:
          "Выражение обязано выглядеть как last(КЛЮЧ) и оператор сравнения с числом — иначе это не распознать.",
      },
    ],
  },
  {
    id: "13.14",
    act: 13,
    title: "problems: что видит дежурный",
    xp: 25,
    intro: "Триггеры сами по себе ничего не показывают — их состояние смотрят через problems.",
    setup: (w) => {
      seedConfigured(w);
      w.zabbix!.triggers = [
        { name: "CPU перегружен", expr: "last(system.cpu.load[all,avg1])>5", severity: "high" },
        { name: "Диск заполнен", expr: "last(vfs.fs.size[/,pfree])<10", severity: "average" },
      ];
    },
    steps: [
      {
        kind: "say",
        text:
          "В веб-интерфейсе Zabbix есть раздел  Problems  — там дежурный видит все\n" +
          "сработавшие триггеры в одном месте, отсортированные по важности.\n" +
          "В симуляторе то же самое делает команда  zabbix problems .",
      },
      {
        kind: "do",
        text: "Задача: посмотри текущие проблемы по заведённым триггерам.",
        check: ran(/^zabbix\s+problems/),
        answer: "zabbix problems",
        hint: "Команда  zabbix problems",
      },
      {
        kind: "say",
        text:
          "Оба триггера показали  OK : CPU сейчас 2.14 (порог 5), свободного места\n" +
          "63.4% (порог меньше 10%). Тревога появится, только когда условие станет\n" +
          "истинным — ровно как строка ALERT в Prometheus (Акт 11).",
      },
      {
        kind: "quiz",
        text: "Чем problems в Zabbix концептуально похож на алерты Prometheus?",
        options: [
          "Оба показывают только то, что СЕЙЧАС нарушает заданное условие, а не все метрики подряд",
          "Оба хранят историю метрик за год",
          "Оба требуют Grafana для отображения",
        ],
        answer: 0,
        explain:
          "И Zabbix problems, и Prometheus alerts — это фильтр «условие истинно прямо сейчас», а не сырые данные.",
      },
    ],
  },
  {
    id: "13.15",
    act: 13,
    title: "Инцидент: триггеры молчат ⚡",
    xp: 45,
    intro: "Дежурный заводит триггеры, а problems стабильно показывает NODATA.",
    setup: (w) => {
      seedZabbix(w);
      writeFile(
        w,
        "/etc/zabbix/zabbix_agentd.conf",
        "Server=127.0.0.1\nServerActive=127.0.0.1\nHostname=web-01\n",
      );
      w.zabbix!.agentConfigured = true;
      w.zabbix!.serverAddr = "127.0.0.1";
      w.zabbix!.serverReaches = false;
      w.zabbix!.triggers = [
        { name: "CPU перегружен", expr: "last(system.cpu.load[all,avg1])>5", severity: "high" },
      ];
    },
    steps: [
      {
        kind: "say",
        text:
          "Жалоба: «завели триггер на CPU, а Problems всегда пустой либо NODATA,\n" +
          "хотя нагрузка точно скачет». Начинаем с того же алгоритма, что в 13.8.",
      },
      {
        kind: "do",
        text: "Шаг 1. Посмотри текущее состояние триггеров.",
        check: ran(/^zabbix\s+problems/),
        answer: "zabbix problems",
        hint: "Команда  zabbix problems",
      },
      {
        kind: "say",
        text:
          "NODATA — «сервер не собирает метрики с хоста». Это не проблема триггера,\n" +
          "это ровно тот же симптом, что в 13.8: сервер не может достучаться до агента.",
      },
      {
        kind: "do",
        text: "Шаг 2. Проверь сеть между сервером и агентом.",
        check: (w) => w.log.some((l) => /^zabbix_get\s+-s/.test(l.cmd)),
        answer: "zabbix_get -s 10.0.1.20 -k agent.ping",
        hint: "Команда  zabbix_get -s 10.0.1.20 -k agent.ping",
      },
      {
        kind: "do",
        text:
          "Шаг 3. Почини конфиг агента. Набери:\n" +
          "edit zabbix_agentd.conf\n" +
          "Замени 127.0.0.1 на 10.0.1.10 в Server= и ServerActive=.",
        check: (w) =>
          has("/etc/zabbix/zabbix_agentd.conf", /Server\s*=\s*10\.0\.1\.10/)(w) &&
          !has("/etc/zabbix/zabbix_agentd.conf", /127\.0\.0\.1/)(w),
        answer: "Server=10.0.1.10\nServerActive=10.0.1.10\nHostname=web-01\n",
        editFile: "/etc/zabbix/zabbix_agentd.conf",
        hint: "В  edit zabbix_agentd.conf  замени 127.0.0.1 на 10.0.1.10.",
      },
      {
        kind: "do",
        text: "Шаг 4. Перечитай конфиг агента.",
        check: (w) => !!w.zabbix?.serverReaches,
        answer: "zabbix_agentd -c zabbix_agentd.conf",
        hint: "Команда  zabbix_agentd -c zabbix_agentd.conf",
      },
      {
        kind: "do",
        text: "Шаг 5. Убедись, что триггер теперь оценивается по-настоящему (не NODATA).",
        check: (w) => {
          const i = w.log.findIndex((l) => /^zabbix_agentd\s+-c/.test(l.cmd));
          return i >= 0 && w.log.slice(i).some((l) => /^zabbix\s+problems/.test(l.cmd) && l.code === 0);
        },
        answer: "zabbix problems",
        hint: "Команда  zabbix problems — теперь должно быть OK или PROBLEM, а не NODATA",
      },
      {
        kind: "say",
        text:
          "Важный вывод на собеседование: NODATA у триггера почти никогда не значит\n" +
          "«триггер неправильный». Это значит «до сервера не долетают метрики» —\n" +
          "чинить нужно путь агент -> сервер, а не выражение триггера.",
      },
    ],
  },
  {
    id: "13.16",
    act: 13,
    title: "Триггер сработал: что дальше",
    xp: 30,
    intro: "PROBLEM появился в списке — дальше решает важность, а не сам факт срабатывания.",
    setup: (w) => {
      seedConfigured(w);
      w.zabbix!.triggers = [
        { name: "CPU перегружен", expr: "last(system.cpu.load[all,avg1])>1", severity: "disaster" },
      ];
    },
    steps: [
      {
        kind: "say",
        text:
          "Порог поставили с запасом (>1, а реальная загрузка 2.14) — специально,\n" +
          "чтобы увидеть, как выглядит настоящий PROBLEM.",
      },
      {
        kind: "do",
        text: "Задача: посмотри текущие проблемы.",
        check: ran(/^zabbix\s+problems/),
        answer: "zabbix problems",
        hint: "Команда  zabbix problems",
      },
      {
        kind: "say",
        text:
          "PROBLEM с важностью disaster — это то же самое, что critical-алерт в Акте 10:\n" +
          "будят дежурного, даже ночью. Именно поэтому важность выбирают ОСОЗНАННО,\n" +
          "а не ставят везде disaster «на всякий случай» — иначе дежурный перестанет\n" +
          "доверять алертам (тот же fatigue из Акта 10).",
      },
      {
        kind: "quiz",
        text: "Триггер с порогом «впритык» к обычным значениям постоянно шлёт disaster ночью. Что не так?",
        options: [
          "Порог или важность выбраны неверно — триггер слишком чувствителен для своей важности, это alert fatigue",
          "Zabbix сломан и триггеры вообще не должны срабатывать",
          "Нужно просто удалить весь мониторинг хоста",
        ],
        answer: 0,
        explain:
          "Чувствительный порог — не проблема сам по себе, но давать ему высшую важность нельзя: это будит зря.",
      },
    ],
  },
  {
    id: "13.17",
    act: 13,
    title: "Ошибка в выражении триггера",
    xp: 20,
    intro: "Опечатка в выражении — и триггер либо не создастся, либо будет молчать вечно.",
    setup: seedConfigured,
    steps: [
      {
        kind: "say",
        text:
          "Частые ошибки в выражениях триггеров:\n\n" +
          "  • ключ написан не так, как в item (лишний пробел, другой регистр)\n" +
          "  • забыли функцию: написали  vfs.fs.size[/,pfree] < 10  без  last(...)\n" +
          "  • перепутали оператор: > вместо < для «мало места» — триггер молчит вечно\n\n" +
          "Симулятор ловит только грубые из них — например, отсутствие  last(...) .",
      },
      {
        kind: "do",
        text: 'Задача: попробуй добавить триггер без функции last —  zabbix trigger add "Диск" "vfs.fs.size[/,pfree]<10" high',
        check: (w) => w.log.some((l) => /^zabbix\s+trigger\s+add/.test(l.cmd) && l.code === 1),
        answer: 'zabbix trigger add "Диск" "vfs.fs.size[/,pfree]<10" high',
        hint: 'Команда  zabbix trigger add "Диск" "vfs.fs.size[/,pfree]<10" high',
      },
      {
        kind: "say",
        text:
          "Отказ сразу — это лучше, чем в реальном Zabbix: там такое выражение\n" +
          "тоже не пройдёт валидацию формы, но текст ошибки менее очевиден.",
      },
      {
        kind: "do",
        text: "Задача: исправь выражение и добавь триггер правильно (напоминание — используй last()).",
        check: (w) => !!w.zabbix?.triggers.some((t) => /^last\(vfs\.fs\.size/.test(t.expr)),
        answer: 'zabbix trigger add "Диск" "last(vfs.fs.size[/,pfree])<10" high',
        hint: 'Команда  zabbix trigger add "Диск" "last(vfs.fs.size[/,pfree])<10" high',
      },
      {
        kind: "quiz",
        text: "Триггер на «мало места» написан как  last(vfs.fs.size[/,pfree]) > 10 . В чём беда?",
        options: [
          "Оператор перепутан: > вместо < — сработает, когда места МНОГО, а не мало, и будет ложно тревожить всегда",
          "Ничего, всё верно",
          "Нельзя использовать pfree в выражениях",
        ],
        answer: 0,
        explain:
          "pfree — процент свободного. «Мало места» — это меньше порога, значит нужен оператор <, а не >.",
      },
    ],
  },
  {
    id: "13.18",
    act: 13,
    title: "Ревью триггеров перед продом",
    xp: 25,
    intro: "Несколько триггеров разной важности — учимся читать список целиком, как на код-ревью.",
    setup: (w) => {
      seedConfigured(w);
      w.zabbix!.triggers = [
        { name: "Агент недоступен", expr: "last(agent.ping)=0", severity: "disaster" },
        { name: "CPU высокий", expr: "last(system.cpu.load[all,avg1])>5", severity: "warning" },
        { name: "Диск почти полон", expr: "last(vfs.fs.size[/,pfree])<10", severity: "high" },
        { name: "Диск совсем полон", expr: "last(vfs.fs.size[/,pfree])<3", severity: "disaster" },
      ];
    },
    steps: [
      {
        kind: "say",
        text:
          "Перед тем как включать триггеры на проде, их читают все разом — это\n" +
          "аналог код-ревью для алертов (тот же принцип, что и в Акте 11 для\n" +
          "правил Prometheus).",
      },
      {
        kind: "do",
        text: "Задача: выведи список всех триггеров хоста.",
        check: ran(/^zabbix\s+trigger\s+list/),
        answer: "zabbix trigger list",
        hint: "Команда  zabbix trigger list",
      },
      {
        kind: "say",
        text:
          "Обрати внимание на пару «Диск почти полон» (<10, high) и «Диск совсем\n" +
          "полон» (<3, disaster) — это ЭСКАЛАЦИЯ: сначала предупредили в чат (high),\n" +
          "и только если стало по-настоящему плохо — разбудили дежурного (disaster).\n" +
          "Это грамотная практика, а не дублирование.",
      },
      {
        kind: "quiz",
        text: "Зачем заводить два триггера на диск (<10% и <3%) вместо одного?",
        options: [
          "Это эскалация: слабый сигнал уходит в чат заранее, а критичный будит дежурного, когда стало реально плохо",
          "Это ошибка конфигурации, нужно оставить только один",
          "Zabbix требует минимум два триггера на каждый item",
        ],
        answer: 0,
        explain:
          "Постепенная эскалация по важности — стандартный паттерн, снижает и пропуски, и усталость от алертов.",
      },
    ],
  },
  {
    id: "13.19",
    act: 13,
    title: "LLD и триггер-прототип вместе",
    xp: 25,
    intro: "Возвращаемся к автообнаружению — теперь с точки зрения триггеров.",
    steps: [
      {
        kind: "say",
        text:
          "В 13.10 LLD создавал item на каждую файловую систему. Идея идёт дальше:\n" +
          "к правилу обнаружения привязывают не только прототип item, но и\n" +
          "  прототип триггера :\n\n" +
          "  last(/host/vfs.fs.size[{#FSNAME},pfree])<10\n\n" +
          "Для каждой найденной ФС Zabbix создаст СВОЙ item И свой триггер по этому\n" +
          "шаблону — вручную писать triggers под каждый диск не нужно.",
      },
      {
        kind: "say",
        text:
          "Это то же самое, что делает шаблон записи алертов в Prometheus, когда\n" +
          "выражение параметризовано лейблом ($labels.mountpoint) — один текст\n" +
          "правила покрывает произвольное число реальных объектов.",
      },
      {
        kind: "quiz",
        text: "На сервере появилась новая файловая система /backup. Что произойдёт с мониторингом при настроенном LLD с триггер-прототипом?",
        options: [
          "Автоматически появятся и item, и триггер на /backup — без ручного вмешательства",
          "Ничего, /backup придётся заводить руками",
          "LLD работает только для item, триггер обязательно пишут отдельно",
        ],
        answer: 0,
        explain:
          "Прототип триггера, как и прототип item, подставляет макрос {#FSNAME} для каждой найденной сущности.",
      },
    ],
  },
  {
    id: "13.20",
    act: 13,
    title: "Капстоун: мониторинг хоста с нуля до триггеров",
    xp: 50,
    intro: "Полный путь: агент -> метрики -> триггеры -> problems, как в первый рабочий день.",
    setup: (w) => {
      seedZabbix(w);
      w.templates = {
        "/etc/zabbix/zabbix_agentd.conf":
          "# Настрой агент: Server= и ServerActive= на 10.0.1.10, Hostname=web-01,\n" +
          "# и UserParameter=nginx.workers,pgrep -c nginx . Комментарий сотри.\n",
      };
    },
    steps: [
      {
        kind: "say",
        text:
          "Финальная задача акта: подключи web-01 к Zabbix и заведи для него два\n" +
          "триггера — на CPU и на диск. Ошибёшься — подсказка, ещё раз — готовый ответ.",
      },
      {
        kind: "do",
        text: "Шаг 1. Настрой конфиг агента. Набери:  edit zabbix_agentd.conf",
        check: (w) =>
          has("/etc/zabbix/zabbix_agentd.conf", /Server\s*=\s*10\.0\.1\.10/)(w) &&
          has("/etc/zabbix/zabbix_agentd.conf", /Hostname\s*=\s*web-01/)(w) &&
          has("/etc/zabbix/zabbix_agentd.conf", /UserParameter\s*=\s*nginx\.workers/)(w),
        answer: CONF_OK,
        editFile: "/etc/zabbix/zabbix_agentd.conf",
        hint: "Открой  edit zabbix_agentd.conf  и впиши Server, ServerActive, Hostname и строку UserParameter.",
      },
      {
        kind: "do",
        text: "Шаг 2. Проверь конфиг агента.",
        check: (w) => !!w.zabbix?.agentConfigured,
        answer: "zabbix_agentd -c zabbix_agentd.conf",
        hint: "Команда  zabbix_agentd -c zabbix_agentd.conf",
      },
      {
        kind: "do",
        text: "Шаг 3. Убедись, что сервер достаёт метрику по сети.",
        check: (w) => w.log.some((l) => /^zabbix_get\s+-s/.test(l.cmd) && l.code === 0),
        answer: "zabbix_get -s 10.0.1.20 -k agent.ping",
        hint: "Команда  zabbix_get -s 10.0.1.20 -k agent.ping",
      },
      {
        kind: "do",
        text: "Шаг 4. Заведи триггер на CPU: сработает, если system.cpu.load[all,avg1] больше 5, важность warning.",
        check: (w) =>
          !!w.zabbix?.triggers.some((t) => /system\.cpu\.load/.test(t.expr) && t.severity === "warning"),
        answer: 'zabbix trigger add "CPU высокий" "last(system.cpu.load[all,avg1])>5" warning',
        hint: 'Команда  zabbix trigger add "CPU высокий" "last(system.cpu.load[all,avg1])>5" warning',
      },
      {
        kind: "do",
        text: "Шаг 5. Заведи триггер на диск: сработает, если vfs.fs.size[/,pfree] меньше 10, важность high.",
        check: (w) => !!w.zabbix?.triggers.some((t) => /vfs\.fs\.size/.test(t.expr) && t.severity === "high"),
        answer: 'zabbix trigger add "Диск заполнен" "last(vfs.fs.size[/,pfree])<10" high',
        hint: 'Команда  zabbix trigger add "Диск заполнен" "last(vfs.fs.size[/,pfree])<10" high',
      },
      {
        kind: "do",
        text: "Шаг 6. Проверь, что оба триггера реально оцениваются (не NODATA).",
        check: (w) => {
          const r = w.log.filter((l) => /^zabbix\s+problems/.test(l.cmd));
          return r.length > 0 && r[r.length - 1].code === 0;
        },
        answer: "zabbix problems",
        hint: "Команда  zabbix problems",
      },
      {
        kind: "say",
        text:
          "Акт 13 пройден. Ты умеешь:\n\n" +
          "  • объяснить, чем Zabbix отличается от Prometheus и когда что выбирать\n" +
          "  • назвать части: server / БД / frontend / agent и путь метрики\n" +
          "  • настроить агент: Server=, ServerActive=, Hostname=\n" +
          "  • проверить ключ item локально (zabbix_agentd -t) и по сети (zabbix_get)\n" +
          "  • добавить свою метрику через UserParameter и знать про её риски\n" +
          "  • завести триггер, прочитать problems и понять NODATA / OK / PROBLEM\n" +
          "  • выстроить эскалацию по важности и не спалить дежурного ложными тревогами\n" +
          "  • понимать шаблоны и автообнаружение (LLD), в том числе с триггер-прототипом\n" +
          "  • чинить «в Zabbix нет данных» по алгоритму локально -> по сети -> конфиг\n\n" +
          "Дальше — последний акт: Python для DevOps, чтобы автоматизировать то,\n" +
          "что не ложится в bash.",
      },
    ],
  },
];
