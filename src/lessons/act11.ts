import { mkdirp, writeFile } from "../engine/vfs";
import { has, ran } from "../missions/helpers";
import type { Lesson, World } from "../engine/types";

const CONFIG_OK =
  "global:\n" +
  "  scrape_interval: 15s\n" +
  "\n" +
  "scrape_configs:\n" +
  "  - job_name: node\n" +
  "    static_configs:\n" +
  '      - targets: ["localhost:9100"]\n' +
  "\n" +
  "  - job_name: app\n" +
  "    static_configs:\n" +
  '      - targets: ["localhost:8080"]\n';

const RULES_OK =
  "groups:\n" +
  "  - name: app\n" +
  "    rules:\n" +
  "      - alert: HighErrorRate\n" +
  '        expr: rate(http_requests_total{status="500"}[5m]) > 0.1\n' +
  "        for: 5m\n" +
  "        labels:\n" +
  "          severity: critical\n" +
  "        annotations:\n" +
  '          summary: "Слишком много 5xx у app"\n';

/** Каталог мониторинга и два запущенных экспортёра. */
function seedProm(w: World): void {
  mkdirp(w, "/home/devops/monitoring");
  w.cwd = "/home/devops/monitoring";
  w.prom = { exporters: { 9100: "node", 8080: "app" }, targets: [], configLoaded: false, rulesLoaded: false };
}

/** То же, но конфиг уже написан и загружен — цели опрашиваются. */
function seedScraping(w: World): void {
  seedProm(w);
  writeFile(w, "/home/devops/monitoring/prometheus.yml", CONFIG_OK);
  w.prom!.configLoaded = true;
  w.prom!.targets = [
    { job: "node", instance: "localhost:9100", up: true },
    { job: "app", instance: "localhost:8080", up: true },
  ];
}

export const act11: Lesson[] = [
  {
    id: "11.1",
    act: 11,
    title: "Зачем нужен мониторинг",
    xp: 15,
    intro: "Логи отвечают «что случилось». Метрики отвечают «как себя чувствует система прямо сейчас».",
    steps: [
      {
        kind: "say",
        text:
          "В Акте 10 ты реагировал на готовые алерты. Теперь разберёмся, откуда они берутся —\n" +
          "то есть построим мониторинг сами.\n\n" +
          "Стандарт индустрии для метрик — Prometheus. Почти в каждой вакансии DevOps\n" +
          "он есть в списке требований.",
      },
      {
        kind: "say",
        text:
          "Чем метрика отличается от лога:\n\n" +
          "  ЛОГ     — текстовая запись о конкретном событии.\n" +
          "            «12:03:41 заказ 8842 не оплатился: таймаут банка».\n" +
          "            Отвечает на вопрос «что именно случилось вот тогда».\n\n" +
          "  МЕТРИКА — число, измеренное в момент времени, и так каждые N секунд.\n" +
          "            «12:03:40 ошибок в секунду = 0.02».\n" +
          "            Отвечает на вопрос «как система ведёт себя во времени».",
      },
      {
        kind: "say",
        text:
          "Зачем нужны обе вещи:\n\n" +
          "  • метрика первой скажет, что стало плохо (и разбудит по алерту)\n" +
          "  • лог потом объяснит, почему именно\n\n" +
          "Искать проблему только по логам — как искать причину пожара, читая\n" +
          "все разговоры в доме. Метрики сразу показывают, в какой комнате горит.",
      },
      {
        kind: "quiz",
        text: "Сервис стал медленно отвечать. Что покажет это раньше и нагляднее?",
        options: [
          "Метрика задержки — видно тренд во времени и момент, когда началось",
          "Логи — надо прочитать все записи за день",
          "Ничего из этого",
        ],
        answer: 0,
        explain:
          "Метрики — про поведение во времени. Логи — про детали конкретного события. Нужны обе, но начинают с метрик.",
      },
    ],
  },
  {
    id: "11.2",
    act: 11,
    title: "Как устроена метрика",
    xp: 20,
    intro: "Имя, лейблы и значение. Плюс три типа, которые надо различать.",
    steps: [
      {
        kind: "say",
        text:
          "Метрика в Prometheus выглядит так:\n\n" +
          '  http_requests_total{method="GET", status="500"}  12\n' +
          "  └──────┬──────────┘└─────────────┬────────────┘  └┬┘\n" +
          "       имя                     лейблы            значение\n\n" +
          "Имя говорит, ЧТО меряем. Лейблы — разрезы: по методу, по статусу,\n" +
          "по инстансу. Значение — число.",
      },
      {
        kind: "say",
        text:
          "Лейблы — самая сильная идея Prometheus. Одна метрика с лейблами заменяет\n" +
          "десятки отдельных. Можно спросить «сколько всего запросов», а можно —\n" +
          "«сколько было пятисоток на GET» — из тех же данных.\n\n" +
          "Осторожно: лейбл с бесконечным числом значений (user_id, номер заказа)\n" +
          "убивает Prometheus — каждая комбинация лейблов это отдельный временной ряд.",
      },
      {
        kind: "say",
        text:
          "Три типа метрик, которые нужно различать:\n\n" +
          "  counter   — только растёт, сбрасывается при перезапуске.\n" +
          "              Пример: http_requests_total. Смотреть на само значение бессмысленно,\n" +
          "              смотрят на скорость роста (об этом урок 11.8).\n\n" +
          "  gauge     — может расти и падать. Температура, свободная память, число подов.\n" +
          "              Пример: node_load1. Смотрят на текущее значение.\n\n" +
          "  histogram — раскладывает измерения по «корзинам»: сколько запросов уложились\n" +
          "              в 0.1 с, сколько в 0.25 с и т.д. Из него считают перцентили (11.9).",
      },
      {
        kind: "quiz",
        text: "Свободное место на диске — это какой тип метрики?",
        options: [
          "gauge — значение может и расти, и падать",
          "counter — оно же всё время меняется",
          "histogram — там же разные значения",
        ],
        answer: 0,
        explain: "counter только растёт (счётчик событий). Всё, что может уменьшиться, — gauge.",
      },
    ],
  },
  {
    id: "11.3",
    act: 11,
    title: "Pull-модель и экспортёры",
    xp: 20,
    intro: "Prometheus сам ходит за метриками. Отдаёт их экспортёр — обычной HTTP-страницей.",
    setup: seedProm,
    steps: [
      {
        kind: "say",
        text:
          "Многие системы мониторинга работают на «push»: приложение само отправляет\n" +
          "метрики на сервер. Prometheus работает наоборот — на «pull»:\n\n" +
          "  он сам, каждые N секунд, ходит по HTTP на адрес цели и забирает метрики.\n\n" +
          "Это называется «скрейп» (scrape — соскрести).",
      },
      {
        kind: "say",
        text:
          "Что даёт pull-модель:\n\n" +
          "  • Prometheus всегда знает, жива ли цель — если не ответила, значит down\n" +
          "  • не нужно настраивать каждое приложение, куда слать\n" +
          "  • метрики можно посмотреть руками, просто открыв адрес в браузере\n\n" +
          "Программа, которая отдаёт метрики по HTTP, называется «экспортёр» (exporter).\n" +
          "Самый частый — node_exporter: отдаёт метрики самого сервера (CPU, память, диск).",
      },
      {
        kind: "watch",
        run: "curl localhost:9100/metrics",
        note:
          "Это и есть весь «протокол» Prometheus — обычный текст, строка на метрику.\n" +
          "На порту 9100 работает node_exporter и отдаёт метрики этого сервера.\n\n" +
          "Никакого хитрого формата: имя, лейблы, значение.",
      },
      {
        kind: "type",
        text: "Посмотри метрики приложения — оно отдаёт их на порту 8080. Набери:  curl localhost:8080/metrics",
        cmd: "curl localhost:8080/metrics",
      },
      {
        kind: "quiz",
        text: "Prometheus не получает метрики от сервиса. Что это значит в pull-модели?",
        options: [
          "Prometheus сходил на адрес цели, но она не ответила — цель считается down",
          "Сервис забыл отправить метрики",
          "Метрики потерялись по дороге",
        ],
        answer: 0,
        explain:
          "В pull-модели инициатор всегда Prometheus. Нет ответа — цель down, и это само по себе сигнал.",
      },
    ],
  },
  {
    id: "11.4",
    act: 11,
    title: "Читаем страницу /metrics",
    xp: 20,
    intro: "HELP объясняет метрику, TYPE задаёт тип. Дальше — значения.",
    setup: seedProm,
    steps: [
      {
        kind: "say",
        text:
          "Страница /metrics устроена по три строки на метрику:\n\n" +
          "  # HELP node_load1 Средняя загрузка за 1 минуту.   ← человеческое описание\n" +
          "  # TYPE node_load1 gauge                           ← тип метрики\n" +
          "  node_load1 2.14                                   ← само значение\n\n" +
          "Строки с # — комментарии для человека и для инструментов, они не данные.",
      },
      {
        kind: "say",
        text:
          "Страница длинная — сотни метрик. Поэтому её почти всегда фильтруют\n" +
          "уже знакомым тебе конвейером из Акта 1:\n\n" +
          "  curl localhost:9100/metrics | grep node_load\n\n" +
          "Это первое, что делает инженер, когда проверяет «а отдаёт ли экспортёр\n" +
          "вообще ту метрику, которую я жду».",
      },
      {
        kind: "watch",
        run: "curl localhost:9100/metrics | grep node_load1",
        note:
          "Три строки: описание, тип (gauge) и значение 2.14.\n" +
          "Средняя загрузка 2.14 — это про процессор сервера.",
      },
      {
        kind: "do",
        text: "Задача: найди на странице приложения (порт 8080) строки про http_requests_total.",
        check: ran(/^curl\s+.*8080\/metrics.*\|\s*grep\s+http_requests_total/),
        answer: "curl localhost:8080/metrics | grep http_requests_total",
        hint: "Собери конвейер:  curl localhost:8080/metrics | grep http_requests_total",
      },
      {
        kind: "quiz",
        text: "Что означает строка  # TYPE http_requests_total counter ?",
        options: [
          "Это счётчик: значение только растёт, смотреть надо скорость роста",
          "Это текущее число запросов прямо сейчас",
          "Это комментарий, его можно игнорировать",
        ],
        answer: 0,
        explain: "TYPE подсказывает, как метрику правильно читать. counter → почти всегда нужен rate().",
      },
    ],
  },
  {
    id: "11.5",
    act: 11,
    title: "prometheus.yml: кого опрашивать",
    xp: 25,
    intro: "Конфиг говорит Prometheus, по каким адресам ходить за метриками.",
    setup: (w) => {
      seedProm(w);
      w.templates = {
        "/home/devops/monitoring/prometheus.yml":
          "# ЗАДАЧА: опиши, что опрашивать. Нужны scrape_configs, job_name и targets\n" +
          "# для node (localhost:9100) и app (localhost:8080). Сотри комментарий.\n",
      };
    },
    steps: [
      {
        kind: "say",
        text:
          "Главный файл Prometheus —  prometheus.yml . Его смысловое ядро — секция\n" +
          "scrape_configs: список того, что опрашивать.\n\n" +
          "  global:\n" +
          "    scrape_interval: 15s        ← как часто ходить за метриками\n" +
          "\n" +
          "  scrape_configs:\n" +
          "    - job_name: node            ← имя задачи опроса (попадёт в лейбл job)\n" +
          "      static_configs:\n" +
          '        - targets: ["localhost:9100"]   ← адреса целей\n',
      },
      {
        kind: "say",
        text:
          "Разбор по словам:\n\n" +
          '  job_name       — как называется группа целей. Появится лейблом job="node"\n' +
          "                   у всех метрик, собранных этой задачей.\n" +
          "  static_configs — «адреса заданы списком прямо здесь». Есть и динамические\n" +
          "                   способы (service discovery), когда цели находятся сами.\n" +
          "  targets        — список адресов вида host:port. Путь /metrics подставляется\n" +
          "                   по умолчанию, писать его не нужно.",
      },
      {
        kind: "do",
        text:
          "Задача: напиши конфиг. Набери:\n" +
          "edit prometheus.yml\n" +
          "Опиши две задачи опроса: node на localhost:9100 и app на localhost:8080. Сохрани.",
        check: (w) =>
          has("/home/devops/monitoring/prometheus.yml", /scrape_configs\s*:/)(w) &&
          has("/home/devops/monitoring/prometheus.yml", /localhost:9100/)(w) &&
          has("/home/devops/monitoring/prometheus.yml", /localhost:8080/)(w),
        answer: CONFIG_OK,
        editFile: "/home/devops/monitoring/prometheus.yml",
        hint: "Открой  edit prometheus.yml  и впиши конфиг из теории урока — с двумя job_name и их targets.",
      },
      {
        kind: "say",
        text:
          "Прежде чем перезапускать Prometheus с новым конфигом, его проверяют.\n" +
          "Для этого есть утилита  promtool :\n\n" +
          "  promtool check config prometheus.yml\n\n" +
          "Она найдёт опечатку в YAML до того, как та уронит мониторинг.\n" +
          "Такую проверку обязательно ставят шагом в CI (Акт 7).",
      },
      {
        kind: "do",
        text: "Задача: проверь конфиг утилитой promtool.",
        check: (w) => !!w.prom?.configLoaded,
        answer: "promtool check config prometheus.yml",
        hint: "Команда  promtool check config prometheus.yml",
      },
      {
        kind: "quiz",
        text: "Что задаёт  job_name  в конфиге?",
        options: [
          "Имя группы целей — оно станет лейблом job у собранных метрик",
          "Имя сервера, на котором стоит Prometheus",
          "Название файла с метриками",
        ],
        answer: 0,
        explain:
          'job_name: node → все метрики с этих целей получат лейбл job="node". По нему потом фильтруют.',
      },
    ],
  },
  {
    id: "11.6",
    act: 11,
    title: "Живы ли цели: метрика up",
    xp: 20,
    intro: "Prometheus сам создаёт метрику up для каждой цели. Это твой первый вопрос при разборе.",
    setup: seedScraping,
    steps: [
      {
        kind: "say",
        text:
          "После каждого опроса Prometheus записывает служебную метрику  up :\n\n" +
          "  up = 1 — цель ответила, метрики собраны\n" +
          "  up = 0 — цель не ответила (упала, порт закрыт, адрес неверный)\n\n" +
          "Её не отдаёт экспортёр — её создаёт сам Prometheus по факту опроса.\n" +
          "Поэтому up работает даже тогда, когда цель мертва полностью.",
      },
      {
        kind: "say",
        text:
          "Запросы к Prometheus пишут на языке PromQL. В симуляторе для этого\n" +
          "есть команда  promql :\n\n" +
          "  promql 'up'\n\n" +
          "Кавычки нужны, потому что в выражениях бывают пробелы и спецсимволы.",
      },
      {
        kind: "watch",
        run: "promql 'up'",
        note:
          "Обе цели вернули 1 — и node, и app опрашиваются успешно.\n" +
          "Видны лейблы job и instance: по ним понятно, какая именно цель.",
      },
      { kind: "type", text: "Проверь цели сам. Набери:  promql 'up'", cmd: "promql 'up'" },
      {
        kind: "quiz",
        text: "Откуда берётся метрика up, если приложение её не отдаёт?",
        options: [
          "Её создаёт сам Prometheus по результату опроса цели",
          "Её отдаёт node_exporter",
          "Её надо прописать в конфиге вручную",
        ],
        answer: 0,
        explain: "Поэтому up — надёжный признак живости: он не зависит от того, работает ли само приложение.",
      },
    ],
  },
  {
    id: "11.7",
    act: 11,
    title: "PromQL: выбираем нужное",
    xp: 25,
    intro: "Имя метрики выбирает все ряды. Лейблы в фигурных скобках сужают выборку.",
    setup: seedScraping,
    steps: [
      {
        kind: "say",
        text:
          "Простейший запрос PromQL — просто имя метрики:\n\n" +
          "  http_requests_total\n\n" +
          "Он вернёт ВСЕ временные ряды с таким именем — по одному на каждую\n" +
          "комбинацию лейблов.",
      },
      {
        kind: "watch",
        run: "promql 'http_requests_total'",
        note:
          'Два ряда: успешные (status="200") и ошибки (status="500").\n' +
          "Это одна метрика, но разные значения лейблов — значит разные ряды.",
      },
      {
        kind: "say",
        text:
          "Чтобы сузить выборку, лейблы пишут в фигурных скобках:\n\n" +
          '  http_requests_total{status="500"}              только ошибки\n' +
          '  http_requests_total{job="app", status="500"}   и только у app\n\n' +
          "Операторы сравнения лейблов:\n" +
          '  =   равно            {status="500"}\n' +
          '  !=  не равно         {status!="200"}\n' +
          '  =~  подходит под регулярное выражение   {status=~"5.."}\n\n' +
          'Последнее особенно полезно: {status=~"5.."} — это «любая пятисотка».',
      },
      {
        kind: "do",
        text: 'Задача: запроси только ошибки — http_requests_total с лейблом status="500".',
        check: ran(/^promql\s+.*http_requests_total\{.*status/),
        answer: "promql 'http_requests_total{status=\"500\"}'",
        hint: "Команда:  promql 'http_requests_total{status=\"500\"}'",
      },
      {
        kind: "quiz",
        text: 'Что выберет запрос  http_requests_total{status=~"5.."} ?',
        options: [
          "Все ряды, где статус подходит под шаблон 5xx — 500, 502, 503 и другие",
          "Ровно статус 5..",
          "Ничего, так писать нельзя",
        ],
        answer: 0,
        explain: "=~ — сравнение с регулярным выражением. Удобно ловить целый класс статусов одним условием.",
      },
    ],
  },
  {
    id: "11.8",
    act: 11,
    title: "rate(): скорость вместо счётчика",
    xp: 25,
    intro: "Смотреть на counter напрямую бесполезно. Смотрят, как быстро он растёт.",
    setup: seedScraping,
    steps: [
      {
        kind: "say",
        text:
          "Счётчик  http_requests_total = 128400  — что это значит?\n\n" +
          "Ничего полезного. Это «всего запросов с момента запуска приложения».\n" +
          "Число будет разным на разных серверах и обнулится при перезапуске.\n\n" +
          "Полезен не сам счётчик, а СКОРОСТЬ его роста: сколько запросов в секунду.",
      },
      {
        kind: "say",
        text:
          "Для этого есть функция  rate() :\n\n" +
          "  rate(http_requests_total[5m])\n" +
          "       └────────┬───────────┘└┬┘\n" +
          "            счётчик        окно времени\n\n" +
          "Читается: «средний прирост счётчика в секунду, посчитанный по данным\n" +
          "за последние 5 минут». Квадратные скобки — это и есть окно.\n\n" +
          "Правило: rate() применяют ТОЛЬКО к counter. К gauge — нельзя.",
      },
      {
        kind: "watch",
        run: "promql 'rate(http_requests_total[5m])'",
        note:
          "41.3 запроса в секунду — вот это уже осмысленное число.\n" +
          "Его можно сравнивать между серверами и во времени, и оно переживает перезапуск.",
      },
      {
        kind: "do",
        text: "Задача: посчитай скорость роста именно ошибок — rate() от http_requests_total со статусом 500 за 5 минут.",
        check: ran(/^promql\s+.*rate\(\s*http_requests_total\{.*status.*\[5m\]/),
        answer: "promql 'rate(http_requests_total{status=\"500\"}[5m])'",
        hint: "Команда:  promql 'rate(http_requests_total{status=\"500\"}[5m])'",
      },
      {
        kind: "say",
        text:
          "0.02 ошибки в секунду. Именно такие выражения и кладут в основу алертов:\n" +
          "«если ошибок в секунду больше порога — буди дежурного» (урок 11.11).\n\n" +
          "Ещё частая пара: rate() плюс sum() — «сложить по всем инстансам»:\n" +
          "  sum(rate(http_requests_total[5m]))",
      },
      {
        kind: "quiz",
        text: "Почему на счётчик не смотрят напрямую, а оборачивают в rate()?",
        options: [
          "Само значение счётчика бессмысленно: важна скорость роста, а не накопленная сумма",
          "rate() работает быстрее",
          "Так требует синтаксис PromQL",
        ],
        answer: 0,
        explain:
          "counter обнуляется при рестарте и различается между инстансами. rate() даёт сравнимую величину «в секунду».",
      },
    ],
  },
  {
    id: "11.9",
    act: 11,
    title: "Перцентили из гистограммы",
    xp: 25,
    intro: "p95 — то самое число из Акта 10. Вот как оно считается.",
    setup: seedScraping,
    steps: [
      {
        kind: "say",
        text:
          "В Акте 10 мы смотрели на p99 задержки и говорили, что среднее врёт.\n" +
          "Теперь посмотрим, откуда перцентиль берётся.\n\n" +
          "Приложение отдаёт гистограмму — раскладку измерений по «корзинам»:\n\n" +
          '  http_request_duration_seconds_bucket{le="0.1"}   119800\n' +
          '  http_request_duration_seconds_bucket{le="0.25"}  126900\n' +
          '  http_request_duration_seconds_bucket{le="+Inf"}  128412\n\n' +
          "le — less or equal, «не дольше чем». То есть 119800 запросов уложились в 0.1 с.",
      },
      {
        kind: "say",
        text:
          "Из этих корзин перцентиль считает функция  histogram_quantile :\n\n" +
          "  histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))\n" +
          "                     └┬─┘  └──────────────────┬────────────────────────┘\n" +
          "                  какой перцентиль      корзины, взятые через rate()\n\n" +
          "rate() внутри нужен потому, что корзины — это счётчики (см. урок 11.8).",
      },
      {
        kind: "watch",
        run: "promql 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))'",
        note:
          "p95 = 213 мс. Читается: «95% запросов уложились в 213 миллисекунд,\n" +
          "а 5% были медленнее». Вот это и показывают на дашбордах и кладут в SLO.",
      },
      {
        kind: "do",
        text: "Задача: посчитай p95 задержки сам (выражение — из теории урока).",
        check: ran(/^promql\s+.*histogram_quantile\(\s*0\.95/),
        answer: "promql 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))'",
        hint: "Команда:  promql 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))'",
      },
      {
        kind: "quiz",
        text: 'Что означает корзина  ..._bucket{le="0.25"} = 126900 ?',
        options: [
          "126900 запросов выполнились за 0.25 секунды или быстрее",
          "126900 запросов выполнились ровно за 0.25 секунды",
          "126900 запросов были медленнее 0.25 секунды",
        ],
        answer: 0,
        explain: "le = «меньше или равно». Корзины накопительные: каждая включает все предыдущие.",
      },
    ],
  },
  {
    id: "11.10",
    act: 11,
    title: "Инцидент: цель не опрашивается ⚡",
    xp: 45,
    intro: "Метрик по серверу нет. Разбираемся, почему Prometheus не может достучаться.",
    setup: (w) => {
      seedProm(w);
      // в конфиге опечатка в порту: экспортёр слушает 9100, а опрашивается 9101
      writeFile(
        w,
        "/home/devops/monitoring/prometheus.yml",
        "global:\n" +
          "  scrape_interval: 15s\n" +
          "\n" +
          "scrape_configs:\n" +
          "  - job_name: node\n" +
          "    static_configs:\n" +
          '      - targets: ["localhost:9101"]\n' +
          "\n" +
          "  - job_name: app\n" +
          "    static_configs:\n" +
          '      - targets: ["localhost:8080"]\n',
      );
      w.prom!.configLoaded = true;
      w.prom!.targets = [
        { job: "node", instance: "localhost:9101", up: false },
        { job: "app", instance: "localhost:8080", up: true },
      ];
    },
    steps: [
      {
        kind: "say",
        text:
          "Жалоба: «на дашборде пропали графики по серверу, а по приложению есть».\n" +
          "Значит, часть целей не опрашивается. Начинаем с up.",
      },
      {
        kind: "do",
        text: "Шаг 1. Посмотри, какие цели сейчас недоступны.",
        check: ran(/^promql\s+.*up\s*==\s*0/),
        answer: "promql 'up == 0'",
        hint: "Команда:  promql 'up == 0'  — покажет только упавшие цели",
      },
      {
        kind: "say",
        text:
          'Одна цель лежит:  job="node", instance="localhost:9101" .\n\n' +
          "Дальше вопрос: экспортёр действительно мёртв — или мы стучимся не туда?\n" +
          "Проверяется это руками, тем же curl, что и в уроке 11.3.",
      },
      {
        kind: "do",
        text: "Шаг 2. Проверь руками адрес из конфига — localhost:9101.",
        check: (w) => w.log.some((l) => /^curl\s+.*9101/.test(l.cmd)),
        answer: "curl localhost:9101/metrics",
        hint: "Команда  curl localhost:9101/metrics",
      },
      {
        kind: "say",
        text:
          "«Connection refused» — на 9101 никто не слушает.\n\n" +
          "Но node_exporter по умолчанию работает на порту 9100. Проверим догадку:\n" +
          "если на 9100 метрики отдаются, значит экспортёр жив, а ошибка — в конфиге.",
      },
      {
        kind: "do",
        text: "Шаг 3. Проверь стандартный порт node_exporter — 9100.",
        check: ran(/^curl\s+.*9100\/metrics/),
        answer: "curl localhost:9100/metrics",
        hint: "Команда  curl localhost:9100/metrics",
      },
      {
        kind: "say",
        text:
          "Метрики есть. Экспортёр работает, просто в prometheus.yml опечатка в порту:\n" +
          "9101 вместо 9100. Классическая ошибка — и хорошо, что не ночью.",
      },
      {
        kind: "do",
        text:
          "Шаг 4. Почини конфиг. Набери:\n" +
          "edit prometheus.yml\n" +
          "Исправь порт цели node на 9100. Сохрани.",
        check: (w) =>
          has("/home/devops/monitoring/prometheus.yml", /localhost:9100/)(w) &&
          !has("/home/devops/monitoring/prometheus.yml", /localhost:9101/)(w),
        answer: CONFIG_OK,
        editFile: "/home/devops/monitoring/prometheus.yml",
        hint: "В  edit prometheus.yml  замени 9101 на 9100 в targets задачи node.",
      },
      {
        kind: "do",
        text: "Шаг 5. Проверь конфиг promtool — заодно применятся новые цели.",
        check: (w) => !!w.prom && w.prom.targets.length > 0 && w.prom.targets.every((t) => t.up),
        answer: "promtool check config prometheus.yml",
        hint: "Команда  promtool check config prometheus.yml",
      },
      {
        kind: "do",
        text: "Шаг 6. Убедись, что обе цели снова опрашиваются.",
        check: ran(/^promql\s+'?up'?\s*$/),
        answer: "promql 'up'",
        hint: "Команда  promql 'up'  — обе цели должны вернуть 1",
      },
      {
        kind: "say",
        text:
          "Инцидент закрыт. Алгоритм «нет метрик» всегда один:\n\n" +
          "  up == 0 → какая цель → curl по её адресу руками → это порт/адрес или сам экспортёр?\n\n" +
          "И вывод на будущее: проверка  promtool check config  в CI поймала бы\n" +
          "опечатку только в синтаксисе. От неверного порта спасает алерт на  up == 0 .",
      },
    ],
  },
  {
    id: "11.11",
    act: 11,
    title: "Правила алертов",
    xp: 25,
    intro: "Алерт — это выражение PromQL плюс порог и выдержка времени.",
    setup: (w) => {
      seedScraping(w);
      w.templates = {
        "/home/devops/monitoring/alerts.yml":
          "# ЗАДАЧА: опиши правило алерта HighErrorRate.\n" +
          "# Нужны groups, alert, expr (условие на PromQL), for и severity. Сотри комментарий.\n",
      };
    },
    steps: [
      {
        kind: "say",
        text:
          "Теперь соберём то, с чего начинался Акт 10, — сам алерт.\n" +
          "Правила живут в отдельном файле и выглядят так:\n\n" +
          "  groups:\n" +
          "    - name: app\n" +
          "      rules:\n" +
          "        - alert: HighErrorRate\n" +
          '          expr: rate(http_requests_total{status="500"}[5m]) > 0.1\n' +
          "          for: 5m\n" +
          "          labels:\n" +
          "            severity: critical\n",
      },
      {
        kind: "say",
        text:
          "Разбор полей:\n\n" +
          "  alert    — имя алерта. Именно оно придёт дежурному (помнишь HighErrorRate?).\n" +
          "  expr     — условие на PromQL. Пока выражение истинно — алерт «горит».\n" +
          "  for      — сколько времени условие должно держаться ДО срабатывания.\n" +
          "             Спасает от ложных тревог на секундном всплеске.\n" +
          "  labels   — severity: critical будит ночью, warning ждёт утра (Акт 10).\n" +
          "  annotations — текст для человека: что случилось и ссылка на runbook.",
      },
      {
        kind: "say",
        text:
          "Поле  for  — самое недооценённое. Без него алерт срабатывает на любой\n" +
          "одиночный выброс, дежурного будят зря, и начинается alert fatigue.\n\n" +
          "С  for: 5m  алерт скажет: «плохо не мгновение, а уже пять минут подряд» —\n" +
          "вот это действительно повод разбудить человека.",
      },
      {
        kind: "do",
        text:
          "Задача: напиши правило. Набери:\n" +
          "edit alerts.yml\n" +
          "Опиши алерт HighErrorRate: expr на rate() ошибок, for и severity. Сохрани.",
        check: (w) =>
          has("/home/devops/monitoring/alerts.yml", /groups\s*:/)(w) &&
          has("/home/devops/monitoring/alerts.yml", /alert\s*:/)(w) &&
          has("/home/devops/monitoring/alerts.yml", /expr\s*:/)(w),
        answer: RULES_OK,
        editFile: "/home/devops/monitoring/alerts.yml",
        hint: "Открой  edit alerts.yml  и впиши правило из теории урока (groups → rules → alert/expr/for/labels).",
      },
      {
        kind: "do",
        text: "Задача: проверь файл правил утилитой promtool.",
        check: (w) => !!w.prom?.rulesLoaded,
        answer: "promtool check rules alerts.yml",
        hint: "Команда  promtool check rules alerts.yml",
      },
      {
        kind: "quiz",
        text: "Зачем в правиле алерта нужно поле  for: 5m ?",
        options: [
          "Условие должно держаться 5 минут подряд — иначе алерт сработает на секундный всплеск",
          "Алерт будет проверяться раз в 5 минут",
          "Через 5 минут алерт погаснет сам",
        ],
        answer: 0,
        explain:
          "for отсекает шум. Без него дежурного будят на каждый случайный выброс — прямая дорога к alert fatigue.",
      },
    ],
  },
  {
    id: "11.12",
    act: 11,
    title: "Alertmanager: кому и как звонить",
    xp: 20,
    intro: "Prometheus решает, что алерт горит. Кому об этом сообщить — решает Alertmanager.",
    steps: [
      {
        kind: "say",
        text:
          "Разделение обязанностей:\n\n" +
          "  Prometheus   — считает метрики и вычисляет правила: алерт горит или нет.\n" +
          "  Alertmanager — получает горящие алерты и решает, что с ними делать:\n" +
          "                 кому отправить, куда, объединить ли, не молчать ли.\n\n" +
          "Это отдельная программа, и именно она превращает алерт в звонок дежурному.",
      },
      {
        kind: "say",
        text:
          "Три вещи, которые делает Alertmanager:\n\n" +
          "  Маршрутизация (routing) — по лейблам решает адресата.\n" +
          '    severity="critical" → звонок дежурному; warning → сообщение в чат команды.\n\n' +
          "  Группировка (grouping) — если упал сервер и с него прилетело 30 алертов,\n" +
          "    придёт одно уведомление со списком, а не 30 отдельных.\n\n" +
          "  Подавление и тишина — silence на время работ, чтобы плановый ремонт\n" +
          "    не будил всю команду; inhibition — «раз лежит весь кластер, не сообщать\n" +
          "    про каждый под отдельно».",
      },
      {
        kind: "say",
        text:
          "Как это связано с Актом 10: алерт  HighErrorRate [critical] , который тебя\n" +
          "разбудил, прошёл весь путь:\n\n" +
          "  экспортёр отдал метрику → Prometheus её собрал → правило посчитало expr →\n" +
          "  условие держалось for → Alertmanager сопоставил severity и разбудил тебя.\n\n" +
          "Теперь ты понимаешь каждое звено этой цепочки.",
      },
      {
        kind: "quiz",
        text: "Упал сервер, и с него прилетело 30 алертов. Что сделает правильно настроенный Alertmanager?",
        options: [
          "Сгруппирует их в одно уведомление со списком",
          "Отправит 30 отдельных сообщений",
          "Проигнорирует все",
        ],
        answer: 0,
        explain:
          "Группировка — защита от лавины уведомлений. 30 сообщений подряд человек всё равно не прочитает.",
      },
    ],
  },
  {
    id: "11.13",
    act: 11,
    title: "Проверка: собрать мониторинг сам",
    xp: 35,
    intro: "От пустой папки до работающих целей, запросов и правила алерта.",
    setup: (w) => {
      seedProm(w);
      w.templates = {
        "/home/devops/monitoring/prometheus.yml":
          "# Опиши scrape_configs: node на localhost:9100 и app на localhost:8080.\n",
        "/home/devops/monitoring/alerts.yml": "# Опиши алерт HighErrorRate: alert, expr, for, severity.\n",
      };
    },
    steps: [
      {
        kind: "say",
        text:
          "Финал Акта 11. Собери мониторинг с нуля самостоятельно.\n" +
          "Ошибёшься — подсказка, ещё раз — готовый ответ.",
      },
      {
        kind: "do",
        text: "Шаг 1. Напиши prometheus.yml с двумя целями. Набери:  edit prometheus.yml",
        check: (w) =>
          has("/home/devops/monitoring/prometheus.yml", /scrape_configs\s*:/)(w) &&
          has("/home/devops/monitoring/prometheus.yml", /localhost:9100/)(w) &&
          has("/home/devops/monitoring/prometheus.yml", /localhost:8080/)(w),
        answer: CONFIG_OK,
        editFile: "/home/devops/monitoring/prometheus.yml",
        hint: "Открой  edit prometheus.yml  и впиши scrape_configs с job_name node и app.",
      },
      {
        kind: "do",
        text: "Шаг 2. Проверь конфиг.",
        check: (w) => !!w.prom?.configLoaded,
        answer: "promtool check config prometheus.yml",
        hint: "Команда  promtool check config prometheus.yml",
      },
      {
        kind: "do",
        text: "Шаг 3. Убедись, что обе цели опрашиваются.",
        check: (w) => !!w.prom && w.prom.targets.length > 0 && w.prom.targets.every((t) => t.up),
        answer: "promql 'up'",
        hint: "Команда  promql 'up'",
      },
      {
        kind: "do",
        text: "Шаг 4. Посчитай скорость ошибок через rate().",
        check: ran(/^promql\s+.*rate\(\s*http_requests_total/),
        answer: "promql 'rate(http_requests_total{status=\"500\"}[5m])'",
        hint: "Команда:  promql 'rate(http_requests_total{status=\"500\"}[5m])'",
      },
      {
        kind: "do",
        text: "Шаг 5. Напиши правило алерта. Набери:  edit alerts.yml",
        check: (w) =>
          has("/home/devops/monitoring/alerts.yml", /alert\s*:/)(w) &&
          has("/home/devops/monitoring/alerts.yml", /expr\s*:/)(w),
        answer: RULES_OK,
        editFile: "/home/devops/monitoring/alerts.yml",
        hint: "Открой  edit alerts.yml  и впиши правило HighErrorRate с expr, for и severity.",
      },
      {
        kind: "do",
        text: "Шаг 6. Проверь правила.",
        check: (w) => !!w.prom?.rulesLoaded,
        answer: "promtool check rules alerts.yml",
        hint: "Команда  promtool check rules alerts.yml",
      },
      {
        kind: "say",
        text:
          "Акт 11 пройден. Ты умеешь:\n\n" +
          "  • объяснить разницу между метрикой и логом\n" +
          "  • читать метрику: имя, лейблы, значение; различать counter/gauge/histogram\n" +
          "  • понимать pull-модель и роль экспортёров\n" +
          "  • писать prometheus.yml и проверять его promtool\n" +
          "  • писать PromQL: селекторы, лейблы, rate(), histogram_quantile()\n" +
          "  • чинить неопрашиваемую цель по алгоритму up == 0 → curl\n" +
          "  • описывать правила алертов и понимать роль Alertmanager\n\n" +
          "Дальше — Grafana: превратим эти запросы в дашборды, на которые смотрит вся команда.",
      },
    ],
  },
];
