import { mkdirp, writeFile } from "../engine/vfs";
import { has, ran, ranAny } from "../missions/helpers";
import type { Lesson, World } from "../engine/types";

const DIR = "/home/devops/scripts";
const CONFIG_JSON = '{\n  "port": 8080,\n  "workers": 4,\n  "log_level": "info"\n}\n';

/** Рабочий каталог для скриптов; venv и requests уже на месте. */
function seedScripts(w: World): void {
  mkdirp(w, DIR);
  w.cwd = DIR;
  w.py = { venv: true, pkgs: ["requests"], ran: 0 };
}

/** Пустой старт: ни окружения, ни пакетов — их ставит сам ученик. */
function seedBare(w: World): void {
  mkdirp(w, DIR);
  w.cwd = DIR;
  w.py = { venv: false, pkgs: [], ran: 0 };
}

const HEALTHCHECK_OK =
  "#!/usr/bin/env python3\n" +
  "import sys\n" +
  "import requests\n" +
  "\n" +
  'URL = "http://localhost:8080/health"\n' +
  "\n" +
  "try:\n" +
  "    r = requests.get(URL, timeout=5)\n" +
  "    r.raise_for_status()\n" +
  "except requests.RequestException as e:\n" +
  '    print("сервис недоступен:", e)\n' +
  "    sys.exit(1)\n" +
  "\n" +
  'print("healthcheck ок:", r.status_code)\n';

const CRASH_FIXED =
  "#!/usr/bin/env python3\n" +
  "import sys\n" +
  "import requests\n" +
  "\n" +
  'URL = "http://localhost:8080/health"\n' +
  "\n" +
  "try:\n" +
  "    r = requests.get(URL, timeout=3)\n" +
  "    r.raise_for_status()\n" +
  "except requests.RequestException as e:\n" +
  '    print("API недоступно:", e)\n' +
  "    sys.exit(1)\n" +
  "\n" +
  'print("ответ получен:", r.status_code)\n';

const EXPORT_BROKEN =
  "#!/usr/bin/env python3\n" +
  "import json\n" +
  "import requests\n" +
  "\n" +
  'with open("/etc/app/config.json") as f:\n' +
  "    cfg = json.load(f)\n" +
  "\n" +
  "# TODO: поменять на реальный адрес экспортёра\n" +
  'url = "http://metrics-nonexistent:9999/export"\n' +
  "r = requests.get(url)\n" +
  'print("выгружено строк:", len(r.text))\n';

const EXPORT_FIXED =
  "#!/usr/bin/env python3\n" +
  "import json\n" +
  "import sys\n" +
  "import requests\n" +
  "\n" +
  'with open("/etc/app/config.json") as f:\n' +
  "    cfg = json.load(f)\n" +
  "\n" +
  'url = "http://localhost:9091/export"\n' +
  "try:\n" +
  "    r = requests.get(url, timeout=5)\n" +
  "    r.raise_for_status()\n" +
  "except requests.RequestException as e:\n" +
  '    print("экспортёр недоступен:", e)\n' +
  "    sys.exit(1)\n" +
  "\n" +
  'print("выгружено строк:", len(r.text))\n';

const DEPLOY_OK =
  "#!/usr/bin/env python3\n" +
  "import argparse\n" +
  "\n" +
  'parser = argparse.ArgumentParser(description="выкатить сервис")\n' +
  'parser.add_argument("--env", required=True, choices=["staging", "prod"])\n' +
  'parser.add_argument("--version", default="latest")\n' +
  "args = parser.parse_args()\n" +
  "\n" +
  'print("деплой", args.version, "в", args.env)\n';

const SVC_OK =
  "#!/usr/bin/env python3\n" +
  "import subprocess\n" +
  "import sys\n" +
  "\n" +
  "result = subprocess.run(\n" +
  '    ["systemctl", "is-active", "nginx"],\n' +
  "    capture_output=True,\n" +
  "    text=True,\n" +
  ")\n" +
  'print("nginx:", result.stdout.strip())\n' +
  "sys.exit(0 if result.returncode == 0 else 1)\n";

const MONITOR_OK =
  "#!/usr/bin/env python3\n" +
  "import argparse\n" +
  "import sys\n" +
  "import requests\n" +
  "\n" +
  'parser = argparse.ArgumentParser(description="проверка здоровья сервиса")\n' +
  'parser.add_argument("--url", required=True)\n' +
  'parser.add_argument("--timeout", type=int, default=5)\n' +
  "args = parser.parse_args()\n" +
  "\n" +
  "try:\n" +
  "    r = requests.get(args.url, timeout=args.timeout)\n" +
  "    r.raise_for_status()\n" +
  "except requests.RequestException as e:\n" +
  '    print("НЕ ОК:", e)\n' +
  "    sys.exit(1)\n" +
  "\n" +
  'print("ОК:", r.status_code)\n' +
  "sys.exit(0)\n";

export const act14: Lesson[] = [
  {
    id: "14.1",
    act: 14,
    title: "Зачем Python, если есть bash",
    xp: 15,
    intro: "Bash хорош, чтобы склеить несколько команд. Всё, что сложнее, пишут на Python.",
    steps: [
      {
        kind: "say",
        text:
          "Ты уже писал bash-скрипты в Акте 3. Bash незаменим, когда нужно быстро\n" +
          "связать несколько утилит: cp, tar, grep, systemctl — пять-десять строк,\n" +
          "запустил из крона и забыл.",
      },
      {
        kind: "say",
        text:
          "Bash становится обузой, как только появляется НАСТОЯЩАЯ логика:\n\n" +
          "  • разобрать JSON или YAML (ответ API, конфиг) — в bash это ад из grep/sed\n" +
          "  • сходить в HTTP API, обработать коды ответа, повторить при ошибке\n" +
          "  • вложенные условия, работа со словарями и списками\n" +
          "  • скрипт вырос за 30–50 строк, его читают и правят несколько человек\n" +
          "  • нужны тесты\n\n" +
          "Здесь берут Python: он читается, у него есть библиотеки и нормальные ошибки.",
      },
      {
        kind: "say",
        text:
          "Для DevOps Python — это «швейцарский нож» автоматизации:\n\n" +
          "  requests    — сходить в API / проверить сервис\n" +
          "  json / yaml — прочитать структурированные данные\n" +
          "  subprocess  — безопасно вызвать системную команду\n" +
          "  argparse    — сделать из скрипта инструмент с --help и аргументами\n\n" +
          "В этом акте разберём каждый по очереди и соберём рабочий CLI-инструмент.",
      },
      {
        kind: "quiz",
        text: "Когда разумно перейти с bash на Python?",
        options: [
          "Появилась логика: разбор JSON/API, вложенные условия, обработка ошибок, скрипт большой и общий",
          "Всегда — bash использовать нельзя",
          "Только если bash физически не установлен",
        ],
        answer: 0,
        explain:
          "Bash — для короткой склейки команд. Логика, данные, ошибки, размер, тесты — сигнал переходить на Python.",
      },
    ],
  },
  {
    id: "14.2",
    act: 14,
    title: "venv и pip: изолируем зависимости",
    xp: 20,
    intro: "Каждый проект — своё окружение с нужными версиями пакетов. Системный Python не трогаем.",
    setup: seedBare,
    steps: [
      {
        kind: "say",
        text:
          "У проекта A нужен requests 2.31, у проекта B — старый requests 2.20.\n" +
          "Если ставить пакеты глобально (в системный Python), они конфликтуют, а ещё\n" +
          "можно сломать пакеты самой операционной системы.\n\n" +
          "Решение —  виртуальное окружение (venv): отдельная папка со своим Python\n" +
          "и своим набором пакетов, привязанная к проекту.",
      },
      {
        kind: "say",
        text:
          "Создание окружения:\n\n" +
          "  python3 -m venv .venv          # создать папку .venv в проекте\n" +
          "  source .venv/bin/activate      # войти в него (в приглашении появится (.venv))\n\n" +
          "Дальше всё, что ставит pip, попадает только в  .venv , а не в систему.\n" +
          "Папку  .venv  в git не кладут — она восстанавливается из requirements.txt.",
      },
      {
        kind: "do",
        text: "Задача: создай виртуальное окружение в папке  .venv .",
        check: (w) => !!w.py?.venv,
        answer: "python3 -m venv .venv",
        hint: "Команда:  python3 -m venv .venv",
      },
      {
        kind: "say",
        text:
          "Окружение активировано (в тренажёре это происходит сразу). Теперь ставим\n" +
          "пакеты через  pip :\n\n" +
          "  pip install requests          # поставить пакет\n" +
          "  pip list                      # что стоит\n" +
          "  pip freeze                    # то же, но в формате requests==2.31.0",
      },
      {
        kind: "do",
        text: "Задача: установи пакет  requests .",
        check: (w) => !!w.py?.pkgs.includes("requests"),
        answer: "pip install requests",
        hint: "Команда:  pip install requests",
      },
      {
        kind: "watch",
        run: "pip list",
        note: "pip показал установленные пакеты и их версии. Пока только requests.",
      },
      {
        kind: "quiz",
        text: "Зачем нужно виртуальное окружение (venv)?",
        options: [
          "Изолирует пакеты проекта: свои версии, не конфликтуют с другими проектами и не ломают системный Python",
          "Ускоряет выполнение скриптов",
          "Заменяет git для хранения кода",
        ],
        answer: 0,
        explain:
          "venv = отдельный набор зависимостей на проект. Список версий фиксируют в requirements.txt (урок 14.10).",
      },
    ],
  },
  {
    id: "14.3",
    act: 14,
    title: "Первый скрипт и коды возврата",
    xp: 25,
    intro: "Структура python-скрипта и главное для автоматизации — чем он завершился.",
    setup: seedScripts,
    steps: [
      {
        kind: "say",
        text:
          "Скелет скрипта для автоматизации:\n\n" +
          "  #!/usr/bin/env python3        # шебанг — как в bash\n" +
          "  import sys\n" +
          "\n" +
          "  def main():\n" +
          "      ...\n" +
          "\n" +
          '  if __name__ == "__main__":    # запускается только при прямом вызове\n' +
          "      main()\n",
      },
      {
        kind: "say",
        text:
          "Как в bash (Акт 3), у скрипта есть  код возврата :\n\n" +
          "  выход без ошибок           -> 0\n" +
          "  sys.exit(1)  (или падение) -> не 0\n\n" +
          "Крон, CI и системы мониторинга смотрят именно на код: 0 — «ок»,\n" +
          "любое другое число — «что-то сломалось, реагируй».",
      },
      {
        kind: "do",
        text:
          "Задача: создай  disk_ok.py . Набери:\n" +
          "edit disk_ok.py\n" +
          "Пусть скрипт печатает строку и завершается  sys.exit(0) . Сохрани.",
        check: has(`${DIR}/disk_ok.py`, /sys\.exit\(\s*0\s*\)/),
        answer:
          "#!/usr/bin/env python3\n" +
          "import sys\n" +
          "\n" +
          "free_percent = 42\n" +
          'print("свободно на диске:", free_percent, "%")\n' +
          "sys.exit(0)\n",
        editFile: `${DIR}/disk_ok.py`,
        hint: "В  edit disk_ok.py  впиши import sys, один print(...) и последней строкой  sys.exit(0) .",
      },
      {
        kind: "do",
        text: "Задача: запусти скрипт —  python3 disk_ok.py",
        check: ran(/^python3?\s+disk_ok\.py/),
        answer: "python3 disk_ok.py",
        hint: "Команда:  python3 disk_ok.py",
      },
      {
        kind: "quiz",
        text: "Скрипт завершился  sys.exit(1) . Что это означает для запустившего его крона?",
        options: [
          "Скрипт сообщил об ошибке: 0 — успех, не 0 — сбой; на этом строятся алерты и остановка пайплайна",
          "Выполнена ровно одна инструкция",
          "Всё прошло успешно",
        ],
        answer: 0,
        explain:
          "Код возврата — единственный сигнал, который видит автоматика. Молча вернуть 0 при ошибке — скрыть аварию.",
      },
    ],
  },
  {
    id: "14.4",
    act: 14,
    title: "Читаем структурированные данные (JSON)",
    xp: 25,
    intro: "Конфиги и ответы API — это JSON/YAML. Их разбирают библиотекой, а не grep.",
    setup: (w) => {
      seedScripts(w);
      mkdirp(w, "/etc/app");
      writeFile(w, "/etc/app/config.json", CONFIG_JSON);
      w.templates = {
        [`${DIR}/read_config.py`]:
          "# ЗАДАЧА: открой /etc/app/config.json, разбери json.load,\n" +
          "# напечатай значения port и workers. Комментарий сотри.\n",
      };
    },
    steps: [
      {
        kind: "say",
        text:
          "Файл  /etc/app/config.json :\n\n" +
          "  {\n" +
          '    "port": 8080,\n' +
          '    "workers": 4,\n' +
          '    "log_level": "info"\n' +
          "  }\n\n" +
          "Достать отсюда порт через grep/sed можно, но это хрупко: перенос строки,\n" +
          "вложенность, кавычки, числа против строк — регулярки на этом ломаются.",
      },
      {
        kind: "say",
        text:
          "Правильно — модулем  json  из стандартной библиотеки:\n\n" +
          "  import json\n" +
          '  with open("/etc/app/config.json") as f:\n' +
          "      cfg = json.load(f)      # json.load — из файла; json.loads — из строки\n" +
          "\n" +
          '  print(cfg["port"])          # cfg это словарь: cfg["port"] -> 8080\n\n' +
          "Для YAML то же самое: import yaml, yaml.safe_load(f).",
      },
      {
        kind: "do",
        text:
          "Задача: создай  read_config.py . Набери:\n" +
          "edit read_config.py\n" +
          "Открой /etc/app/config.json, разбери json.load, напечатай port и workers.",
        check: has(`${DIR}/read_config.py`, /json\.load\(/),
        answer:
          "#!/usr/bin/env python3\n" +
          "import json\n" +
          "\n" +
          'with open("/etc/app/config.json") as f:\n' +
          "    cfg = json.load(f)\n" +
          "\n" +
          'print("порт:", cfg["port"], "воркеров:", cfg["workers"])\n',
        editFile: `${DIR}/read_config.py`,
        hint: 'В edit read_config.py: import json, with open(...) as f, cfg = json.load(f), затем print с cfg["port"].',
      },
      {
        kind: "do",
        text: "Задача: запусти —  python3 read_config.py",
        check: ran(/^python3?\s+read_config\.py/),
        answer: "python3 read_config.py",
        hint: "Команда:  python3 read_config.py",
      },
      {
        kind: "quiz",
        text: "Почему JSON-конфиг разбирают модулем json, а не grep/sed?",
        options: [
          "json понимает вложенность, типы и кавычки; регулярки ломаются на первой же нетривиальной структуре",
          "grep не умеет читать файлы .json",
          "Так скрипт работает быстрее",
        ],
        answer: 0,
        explain: "Структурированные данные — структурированным парсером. Это надёжно и читается.",
      },
    ],
  },
  {
    id: "14.5",
    act: 14,
    title: "requests: проверяем, что сервис жив",
    xp: 30,
    intro: "HTTP-запрос из Python — и обязательный timeout, без которого скрипт зависает навсегда.",
    setup: (w) => {
      seedScripts(w);
      w.templates = {
        [`${DIR}/healthcheck.py`]:
          "# ЗАДАЧА: сходи GET на http://localhost:8080/health с timeout=5,\n" +
          "# проверь r.raise_for_status(), поймай requests.RequestException и sys.exit(1).\n",
      };
    },
    steps: [
      {
        kind: "say",
        text:
          "Библиотека  requests  — стандарт для HTTP в Python:\n\n" +
          "  import requests\n" +
          '  r = requests.get("http://localhost:8080/health", timeout=5)\n' +
          "  r.status_code        # 200, 500, ...\n" +
          "  r.raise_for_status() # бросит исключение, если код 4xx/5xx\n" +
          "  r.json()             # разобрать тело как JSON",
      },
      {
        kind: "say",
        text:
          "Главное правило:  timeout=  указывают ВСЕГДА.\n\n" +
          "Без timeout запрос к зависшему сервису висит бесконечно. В кроне это значит:\n" +
          "новый процесс каждую минуту, все висят, через сутки сервер забит зомби-задачами.\n" +
          "timeout=5 — «ждём ответа 5 секунд, дальше считаем сервис недоступным».",
      },
      {
        kind: "do",
        text:
          "Задача: создай  healthcheck.py . Набери:\n" +
          "edit healthcheck.py\n" +
          "GET на http://localhost:8080/health с  timeout=5 , raise_for_status(),\n" +
          "перехвати requests.RequestException и  sys.exit(1) . Сохрани.",
        check: (w) =>
          has(`${DIR}/healthcheck.py`, /requests\.get\(/)(w) &&
          has(`${DIR}/healthcheck.py`, /timeout\s*=/)(w),
        answer: HEALTHCHECK_OK,
        editFile: `${DIR}/healthcheck.py`,
        hint: "Обязательно  requests.get(URL, timeout=5)  и блок  try/except requests.RequestException .",
      },
      {
        kind: "do",
        text: "Задача: запусти проверку —  python3 healthcheck.py",
        check: ran(/^python3?\s+healthcheck\.py/),
        answer: "python3 healthcheck.py",
        hint: "Команда:  python3 healthcheck.py",
      },
      {
        kind: "quiz",
        text: "Зачем в  requests.get(...)  почти всегда пишут  timeout= ?",
        options: [
          "Без него запрос к зависшему сервису ждёт вечно; в кроне копятся зависшие процессы",
          "timeout ускоряет ответ сервера",
          "Без timeout запрос вообще не отправится",
        ],
        answer: 0,
        explain:
          "Нет timeout — нет гарантии, что скрипт когда-нибудь завершится. Это классическая причина инцидентов.",
      },
    ],
  },
  {
    id: "14.6",
    act: 14,
    title: "Обработка ошибок: try/except и понятный выход",
    xp: 30,
    intro: "Ошибку не глушат и не игнорируют — ловят конкретную, логируют и выходят осмысленным кодом.",
    setup: (w) => {
      seedScripts(w);
      writeFile(
        w,
        `${DIR}/crash.py`,
        "#!/usr/bin/env python3\n" +
          "import requests\n" +
          "\n" +
          'r = requests.get("http://api-nonexistent:9999/data")\n' +
          'print("получено:", len(r.text))\n',
      );
      w.templates = {
        [`${DIR}/crash.py`]:
          "#!/usr/bin/env python3\n" +
          "import requests\n" +
          "\n" +
          "# TODO: обернуть в try/except requests.RequestException, добавить timeout и sys.exit(1)\n" +
          'r = requests.get("http://api-nonexistent:9999/data")\n' +
          'print("получено:", len(r.text))\n',
      };
    },
    steps: [
      {
        kind: "say",
        text:
          "Непойманное исключение = трейсбек в лог и код возврата 1. Иногда этого хватает,\n" +
          "но чаще нужно понятное сообщение и осмысленный код:\n\n" +
          "  try:\n" +
          "      r = requests.get(url, timeout=5)\n" +
          "      r.raise_for_status()\n" +
          "  except requests.RequestException as e:\n" +
          '      print("сервис недоступен:", e)\n' +
          "      sys.exit(1)\n",
      },
      {
        kind: "say",
        text:
          "Что НЕЛЬЗЯ делать:\n\n" +
          "  except Exception:\n" +
          "      pass          # << проглотили любую ошибку\n\n" +
          "Так скрипт «успешно» завершается кодом 0, данные не обновились, а понять,\n" +
          "что сломалось, невозможно. Это худшая практика — на собеседовании назовут\n" +
          "«тихим сбоем». Лови КОНКРЕТНОЕ исключение и всегда оставляй след в логе.",
      },
      {
        kind: "watch",
        run: "python3 crash.py",
        note:
          "Скрипт упал: запрос без timeout, адрес недоступен, исключение не поймано —\n" +
          "трейсбек и код 1. Пользователь видит только непонятную простыню.",
      },
      {
        kind: "do",
        text:
          "Задача: почини  crash.py . Набери:\n" +
          "edit crash.py\n" +
          "Добавь timeout, оберни в  try/except requests.RequestException , в except —\n" +
          "понятный print и  sys.exit(1) . Сохрани.",
        check: (w) =>
          has(`${DIR}/crash.py`, /except\s+requests/)(w) && has(`${DIR}/crash.py`, /timeout\s*=/)(w),
        answer: CRASH_FIXED,
        editFile: `${DIR}/crash.py`,
        hint: "Оберни requests.get(URL, timeout=3) в try, поймай  except requests.RequestException as e , внутри — sys.exit(1).",
      },
      {
        kind: "do",
        text: "Задача: запусти снова —  python3 crash.py . Теперь ошибка обработана, а не свалена трейсбеком.",
        check: ranAny(/^python3?\s+crash\.py/),
        answer: "python3 crash.py",
        hint: "Команда:  python3 crash.py  — вывод станет понятным, код 1 (сервиса и правда нет).",
      },
      {
        kind: "quiz",
        text: "Чем плох  except Exception: pass ?",
        options: [
          "Прячет любую ошибку: скрипт завершается кодом 0, данные не обновились, причину не найти",
          "Это синтаксическая ошибка, скрипт не запустится",
          "Замедляет выполнение",
        ],
        answer: 0,
        explain:
          "Ловим конкретное исключение, пишем в лог, выходим не-нулём. Глушитель ошибок = невидимая авария.",
      },
    ],
  },
  {
    id: "14.7",
    act: 14,
    title: "argparse: делаем настоящий CLI-инструмент",
    xp: 30,
    intro: "Разбирать sys.argv руками — боль. argparse даёт --help, проверку и понятные ошибки.",
    setup: (w) => {
      seedScripts(w);
      w.templates = {
        [`${DIR}/deploy.py`]:
          "# ЗАДАЧА: argparse с обязательным --env (choices staging/prod)\n" +
          "# и необязательным --version (default latest). Комментарий сотри.\n",
      };
    },
    steps: [
      {
        kind: "say",
        text:
          "Скрипт, которым пользуются люди, должен принимать аргументы по-человечески:\n" +
          "с  --help , проверкой обязательных, понятной ошибкой при опечатке.\n" +
          "Разбор  sys.argv[1]  вручную всё это не даёт и падает с IndexError.",
      },
      {
        kind: "say",
        text:
          "Модуль  argparse  из стандартной библиотеки:\n\n" +
          "  import argparse\n" +
          '  parser = argparse.ArgumentParser(description="выкатить сервис")\n' +
          '  parser.add_argument("--env", required=True, choices=["staging", "prod"])\n' +
          '  parser.add_argument("--version", default="latest")\n' +
          "  args = parser.parse_args()\n" +
          "  # дальше: args.env, args.version\n",
      },
      {
        kind: "do",
        text:
          "Задача: создай  deploy.py . Набери:\n" +
          "edit deploy.py\n" +
          "Обязательный  --env  (choices staging/prod), необязательный  --version  (default latest),\n" +
          "в конце — print с обоими значениями. Сохрани.",
        check: has(`${DIR}/deploy.py`, /add_argument\(\s*["']--env["'][^\n]*required\s*=\s*True/),
        answer: DEPLOY_OK,
        editFile: `${DIR}/deploy.py`,
        hint: 'Ключевая строка:  parser.add_argument("--env", required=True, choices=["staging", "prod"]) .',
      },
      {
        kind: "watch",
        run: "python3 deploy.py",
        note:
          "Запустили без  --env  — argparse сам не пустил и объяснил: «the following\n" +
          "arguments are required: --env», код возврата 2. Не пришлось писать ни строчки проверки.",
      },
      {
        kind: "do",
        text: "Задача: запусти правильно —  python3 deploy.py --env prod",
        check: ran(/^python3?\s+deploy\.py\s+--env\s+prod/),
        answer: "python3 deploy.py --env prod",
        hint: "Команда:  python3 deploy.py --env prod",
      },
      {
        kind: "quiz",
        text: "Почему argparse лучше, чем брать  sys.argv[1]  напрямую?",
        options: [
          "Даёт --help, проверку обязательных и choices, понятные ошибки и не падает с IndexError",
          "argparse работает без импорта",
          "sys.argv вообще не содержит аргументов",
        ],
        answer: 0,
        explain: "argparse превращает скрипт в предсказуемый инструмент с самодокументацией.",
      },
    ],
  },
  {
    id: "14.8",
    act: 14,
    title: "subprocess: безопасно звать системные команды",
    xp: 30,
    intro: "Иногда из Python нужно вызвать systemctl или git. Делают это списком аргументов, без shell=True.",
    setup: (w) => {
      seedScripts(w);
      w.templates = {
        [`${DIR}/svc_state.py`]:
          "# ЗАДАЧА: subprocess.run(['systemctl', 'is-active', 'nginx'], capture_output=True, text=True)\n" +
          "# напечатай result.stdout, верни код по result.returncode. Комментарий сотри.\n",
      };
    },
    steps: [
      {
        kind: "say",
        text:
          "Вызвать внешнюю программу из Python — модуль  subprocess :\n\n" +
          "  import subprocess\n" +
          "  result = subprocess.run(\n" +
          '      ["systemctl", "is-active", "nginx"],   # СПИСОК аргументов\n' +
          "      capture_output=True, text=True,        # забрать stdout/stderr как строки\n" +
          "  )\n" +
          "  result.returncode   # код возврата команды\n" +
          "  result.stdout       # её вывод\n",
      },
      {
        kind: "say",
        text:
          "Безопасность (спрашивают на собеседовании):\n\n" +
          '  ✗  subprocess.run(f"systemctl restart {name}", shell=True)\n' +
          '     если name = "nginx; rm -rf /" — выполнится и второе. Это инъекция команд.\n\n' +
          '  ✓  subprocess.run(["systemctl", "restart", name])\n' +
          "     аргументы передаются программе напрямую, shell не участвует.\n\n" +
          "Ещё:  check=True  — бросить исключение при ненулевом коде команды.",
      },
      {
        kind: "do",
        text:
          "Задача: создай  svc_state.py . Набери:\n" +
          "edit svc_state.py\n" +
          "subprocess.run со СПИСКОМ аргументов (systemctl is-active nginx), capture_output=True,\n" +
          "напечатай result.stdout, заверши кодом по result.returncode. Сохрани.",
        check: has(`${DIR}/svc_state.py`, /subprocess\.run\(\s*\n?\s*\[/),
        answer: SVC_OK,
        editFile: `${DIR}/svc_state.py`,
        hint: 'Первый аргумент subprocess.run — список:  ["systemctl", "is-active", "nginx"] , без shell=True.',
      },
      {
        kind: "do",
        text: "Задача: запусти —  python3 svc_state.py",
        check: ran(/^python3?\s+svc_state\.py/),
        answer: "python3 svc_state.py",
        hint: "Команда:  python3 svc_state.py",
      },
      {
        kind: "quiz",
        text: 'Чем опасен  subprocess.run(f"restart {name}", shell=True) ?',
        options: [
          "Инъекция команд: значение name с  ;  или  &&  выполнит произвольный shell-код. Нужен список аргументов без shell=True",
          "Ничем, это рекомендованный способ",
          "shell=True запрещён синтаксисом Python",
        ],
        answer: 0,
        explain:
          "shell=True + подстановка внешнего значения = дыра. Список аргументов передаётся программе напрямую.",
      },
    ],
  },
  {
    id: "14.9",
    act: 14,
    title: "Инцидент: ночной скрипт-экспортёр молча упал ⚡",
    xp: 45,
    intro: "Данных в дашборде нет сутки. Крон зелёный. Скрипт на Python. Разбираемся.",
    setup: (w) => {
      seedScripts(w);
      mkdirp(w, "/etc/app");
      writeFile(w, "/etc/app/config.json", CONFIG_JSON);
      writeFile(w, `${DIR}/export_metrics.py`, EXPORT_BROKEN);
      w.templates = { [`${DIR}/export_metrics.py`]: EXPORT_BROKEN };
    },
    steps: [
      {
        kind: "say",
        text:
          "Жалоба: «в дашборде метрик по проекту нет уже сутки». Метрики раз в 5 минут\n" +
          "выгружает крон-скрипт  export_metrics.py . В логе крона — пусто, задача\n" +
          "«отработала». Первым делом запускаем скрипт руками и смотрим, что он скажет.",
      },
      {
        kind: "do",
        text: "Шаг 1. Запусти скрипт вручную —  python3 export_metrics.py",
        check: ranAny(/^python3?\s+export_metrics\.py/),
        answer: "python3 export_metrics.py",
        hint: "Команда:  python3 export_metrics.py",
      },
      {
        kind: "say",
        text:
          "Видно сразу две вещи:\n\n" +
          "  ⚠  запрос без timeout=\n" +
          "  requests.exceptions.ConnectionError — исключение не поймано, скрипт упал\n\n" +
          "А адрес  http://metrics-nonexistent:9999/export  подозрительно похож на\n" +
          "заглушку. Открываем код.",
      },
      {
        kind: "do",
        text: "Шаг 2. Посмотри исходник —  cat export_metrics.py",
        check: ran(/^cat\s+export_metrics\.py/),
        answer: "cat export_metrics.py",
        hint: "Команда:  cat export_metrics.py",
      },
      {
        kind: "say",
        text:
          'В коде  # TODO: поменять на реальный адрес  и  url = "http://metrics-nonexistent:9999/...".\n' +
          "Placeholder уехал в прод. Плюс запрос без timeout и без обработки ошибки:\n" +
          "даже когда экспортёр просто тормозит, скрипт зависнет, а крон намолчит.\n\n" +
          "Чиним всё сразу: реальный адрес  http://localhost:9091/export , timeout,\n" +
          "try/except с  sys.exit(1) .",
      },
      {
        kind: "do",
        text:
          "Шаг 3. Почини  export_metrics.py . Набери:\n" +
          "edit export_metrics.py\n" +
          "Поставь реальный url (localhost:9091), добавь  timeout=5 , оберни в\n" +
          "try/except requests.RequestException с  sys.exit(1) . Сохрани.",
        check: (w) =>
          has(`${DIR}/export_metrics.py`, /timeout\s*=/)(w) &&
          has(`${DIR}/export_metrics.py`, /except\s+requests/)(w) &&
          !has(`${DIR}/export_metrics.py`, /nonexistent/)(w),
        answer: EXPORT_FIXED,
        editFile: `${DIR}/export_metrics.py`,
        hint: "Замени url на http://localhost:9091/export, добавь timeout=5 и блок try/except requests.RequestException.",
      },
      {
        kind: "do",
        text: "Шаг 4. Запусти снова —  python3 export_metrics.py . Теперь должно быть зелено.",
        check: ran(/^python3?\s+export_metrics\.py/),
        answer: "python3 export_metrics.py",
        hint: "Команда:  python3 export_metrics.py  — конфиг прочитан, GET 200 OK, код 0.",
      },
      {
        kind: "say",
        text:
          "Инцидент закрыт. Три вывода, каждый — типовой вопрос на собеседовании:\n\n" +
          "  1) любой сетевой вызов — с  timeout= , иначе однажды всё зависнет\n" +
          "  2) ошибку не глотать: понятный лог + выход не-нулевым кодом\n" +
          "  3) крон-скрипт без проверки результата = «тихий сбой» (как в Акте 3).\n" +
          "     Нужен алерт «нет свежих данных за N минут», а не надежда на логи.",
      },
    ],
  },
  {
    id: "14.10",
    act: 14,
    title: "Качество и упаковка: ruff, requirements.txt",
    xp: 20,
    intro: "Линтер ловит ошибки до запуска, requirements.txt фиксирует версии для воспроизводимости.",
    setup: seedScripts,
    steps: [
      {
        kind: "say",
        text:
          "Линтер и форматтер — обязательная гигиена:\n\n" +
          "  ruff check .     — находит баги, неиспользуемые импорты, стиль (быстрый,\n" +
          "                     заменяет flake8 + isort + часть pylint)\n" +
          "  ruff format .    — единое форматирование (аналог black / gofmt)\n\n" +
          "Их ставят в dev-зависимости и гоняют в CI — красный линтер не пускает merge.",
      },
      {
        kind: "say",
        text:
          "Зависимости фиксируют в  requirements.txt :\n\n" +
          "  requests==2.31.0\n" +
          "  pyyaml==6.0.1\n\n" +
          "Точные версии (==), а не  requests  без числа — иначе «у меня работает, у\n" +
          "тебя нет». Это тот же принцип, что фиксированные теги образов в Акте 6 и\n" +
          "lock-файл в IaC. Генерируют командой  pip freeze > requirements.txt ,\n" +
          "ставят —  pip install -r requirements.txt .",
      },
      {
        kind: "do",
        text: "Задача: поставь  ruff  и выведи список версий для requirements.txt —  pip freeze",
        check: ran(/^pip3?\s+freeze/),
        answer: "pip install ruff\npip freeze",
        hint: "Сначала  pip install ruff , потом  pip freeze .",
      },
      {
        kind: "say",
        text:
          "Минимум для любого python-репозитория в DevOps:\n\n" +
          "  • venv + requirements.txt с точными версиями\n" +
          "  • ruff check в CI\n" +
          '  • if __name__ == "__main__"  и явные коды возврата\n' +
          "  • сетевые вызовы с timeout, ошибки — в лог\n\n" +
          "Этого хватает, чтобы скрипт можно было отдать коллеге и в прод.",
      },
      {
        kind: "quiz",
        text: "Зачем в requirements.txt фиксируют точные версии ( requests==2.31.0 )?",
        options: [
          "Воспроизводимость: у всех и в CI одинаковые версии, поведение не «плавает» между машинами",
          "Так пакеты ставятся быстрее",
          "Без версии pip выдаёт ошибку",
        ],
        answer: 0,
        explain:
          "Та же идея, что фикс-теги образов (Акт 6) и lock-файлы в IaC (Акт 8): убрать «у меня работает».",
      },
    ],
  },
  {
    id: "14.11",
    act: 14,
    title: "Python и bash: что чем",
    xp: 20,
    intro: "Не спор «что лучше», а понимание границы: где заканчивается bash и начинается Python.",
    steps: [
      {
        kind: "say",
        text:
          "Собери картину из двух актов про скрипты (3 и 14):\n\n" +
          "  bash    — склеить несколько команд, конвейеры, разовый запуск, 5–15 строк.\n" +
          "            Пример: сделать архив, залить в хранилище, удалить старые.\n\n" +
          "  Python  — логика, данные (JSON/YAML/API), обработка ошибок, повторное\n" +
          "            использование, тесты, скрипт большой и общий.",
      },
      {
        kind: "say",
        text:
          "Признаки, что пора переписывать bash-скрипт на Python:\n\n" +
          "  • появились вложенные if / case и их стало трудно читать\n" +
          "  • разбираешь вывод команд через sed/awk в несколько этажей\n" +
          "  • ходишь в HTTP API, обрабатываешь коды ответа\n" +
          "  • нужен --help, аргументы, понятные ошибки\n" +
          "  • скрипт перевалил за 30–50 строк и его правят несколько человек",
      },
      {
        kind: "say",
        text:
          "Что общего у хороших скриптов на любом языке:\n\n" +
          "  • явные коды возврата (0 / не 0)\n" +
          "  • останавливаться на ошибке (set -e в bash / исключения в Python)\n" +
          "  • никаких секретов в коде — только переменные окружения / хранилище\n" +
          "  • результат мониторится (крон без алерта на сбой бесполезен)\n\n" +
          "Инструмент разный — принципы из Актов 3, 7 и 14 одни.",
      },
      {
        kind: "quiz",
        text: "bash-скрипт разросся: 15 строк, два вложенных цикла и разбор JSON через grep. Что разумно сделать?",
        options: [
          "Переписать на Python: json + requests + argparse; в bash это уже хрупко и нечитаемо",
          "Оставить как есть — работает же",
          "Разбить на пять bash-скриптов поменьше",
        ],
        answer: 0,
        explain:
          "Разбор JSON и вложенная логика — явный сигнал перейти на Python. Дробить bash проблему не решит.",
      },
    ],
  },
  {
    id: "14.12",
    act: 14,
    title: "Проверка: собери healthcheck-CLI",
    xp: 40,
    intro: "От пустого окружения до рабочего инструмента: аргументы, timeout, осмысленный код возврата.",
    setup: (w) => {
      seedBare(w);
      w.templates = {
        [`${DIR}/monitor.py`]:
          "# ЗАДАЧА: CLI-проверка сервиса.\n" +
          "#  argparse: обязательный --url, необязательный --timeout (int, default 5)\n" +
          "#  requests.get(args.url, timeout=args.timeout) + raise_for_status()\n" +
          "#  except requests.RequestException -> print + sys.exit(1)\n" +
          "#  успех -> print(r.status_code) + sys.exit(0). Комментарий сотри.\n",
      };
    },
    steps: [
      {
        kind: "say",
        text:
          "Финал курса. Собери сам инструмент  monitor.py : проверяет здоровье сервиса\n" +
          "по URL из аргумента, с таймаутом, с понятным кодом возврата (0 — жив, 1 — нет).\n" +
          "Ошибёшься — подсказка, ещё раз — готовый ответ.",
      },
      {
        kind: "do",
        text: "Шаг 1. Подготовь окружение: создай venv и поставь requests.",
        check: (w) => !!w.py?.venv && !!w.py?.pkgs.includes("requests"),
        answer: "python3 -m venv .venv\npip install requests",
        hint: "Две команды:  python3 -m venv .venv  и  pip install requests .",
      },
      {
        kind: "do",
        text:
          "Шаг 2. Напиши  monitor.py . Набери:\n" +
          "edit monitor.py\n" +
          "argparse с обязательным  --url  и  --timeout (int, default 5); requests.get(args.url,\n" +
          "timeout=args.timeout) + raise_for_status(); except requests.RequestException ->\n" +
          "print + sys.exit(1); успех -> print(r.status_code) + sys.exit(0). Сохрани.",
        check: (w) =>
          has(`${DIR}/monitor.py`, /add_argument\(\s*["']--url["'][^\n]*required\s*=\s*True/)(w) &&
          has(`${DIR}/monitor.py`, /timeout\s*=/)(w) &&
          has(`${DIR}/monitor.py`, /except\s+requests/)(w),
        answer: MONITOR_OK,
        editFile: `${DIR}/monitor.py`,
        hint: 'Нужны: add_argument("--url", required=True), requests.get(args.url, timeout=args.timeout), try/except requests.RequestException с sys.exit(1).',
      },
      {
        kind: "do",
        text: "Шаг 3. Запусти инструмент —  python3 monitor.py --url http://localhost:8080/health",
        check: ran(/^python3?\s+monitor\.py\s+--url\s+\S+/),
        answer: "python3 monitor.py --url http://localhost:8080/health",
        hint: "Команда:  python3 monitor.py --url http://localhost:8080/health",
      },
      {
        kind: "say",
        text:
          "Курс пройден. Ты прошёл путь от  pwd  до полноценного DevOps-набора:\n\n" +
          "  Linux и процессы · bash · сети · git · Docker · CI/CD · Terraform ·\n" +
          "  Kubernetes · дежурство и надёжность · Prometheus · Grafana · Zabbix ·\n" +
          "  Python для автоматизации.\n\n" +
          "Что дальше:\n" +
          "  • финальное задание на реальном сервере (capstone) — кнопка «Финал»\n" +
          "  • разделы «Собеседование» и «Карьера» — прогони вопросы вслух\n" +
          "  • держи руки в деле: свой сервер, свой pet-проект, свой pipeline.\n\n" +
          "Удачи на собеседовании — ты к нему готов.",
      },
    ],
  },
];
