import { file, getNode, writeFile } from "../engine/vfs";
import { has, ran } from "./helpers";
import type { Mission, World } from "../engine/types";

const APP_LOG =
  "INFO старт сервиса\nINFO обработан заказ 1001\nERROR платёж отклонён банком\n" +
  "INFO обработан заказ 1002\nERROR таймаут базы данных\nWARN медленный ответ 2400ms\n" +
  "INFO обработан заказ 1003\n";

export const seedAppLog = (w: World): void => {
  const logDir = getNode(w, "/var/log");
  if (logDir && logDir.type === "dir") logDir.children["app.log"] = file(APP_LOG);
};

export const act01: Mission[] = [
  {
    id: "1.1", act: 1, title: "Первый вход", xp: 30,
    why: "Терминал — это диалог с машиной. Ты всегда находишься <b>в каком-то каталоге</b>, и почти каждая команда работает относительно него. Три команды закрывают 80% навигации: узнать где ты, посмотреть что вокруг, перейти дальше.",
    cheat: [
      ["pwd", "показать текущий каталог"],
      ["ls", "список файлов"],
      ["ls -l", "подробный список: права, владелец, размер"],
      ["cd ПУТЬ", "перейти в каталог"],
      ["cd ..", "на уровень вверх"],
      ["cat ФАЙЛ", "показать содержимое файла"],
    ],
    hints: [
      "Начни с pwd — она просто печатает, где ты сейчас.",
      "Абсолютный путь начинается со слэша: cd /var/log",
      "Файл можно прочитать так: cat notes.txt",
    ],
    setup: seedAppLog,
    objs: [
      { t: "Узнай, в каком каталоге ты находишься", d: "pwd", ok: ran(/^pwd\b/) },
      { t: "Посмотри, что лежит в домашнем каталоге", d: "ls", ok: ran(/^ls\b/) },
      { t: "Прочитай notes.txt", d: "cat notes.txt", ok: ran(/^cat\s+.*notes\.txt/) },
      { t: "Перейди в каталог логов /var/log", d: "cd /var/log", ok: (w) => w.cwd === "/var/log" },
      { t: "Посмотри подробный список файлов там", d: "ls -l", ok: ran(/^ls\s+-l/) },
    ],
    solution: ["pwd", "ls", "cat notes.txt", "cd /var/log", "ls -l"],
  },
  {
    id: "1.2", act: 1, title: "Найти улику в логах", xp: 40,
    why: "Логи — первое место, куда смотрит инженер, когда «что-то сломалось». Читать их целиком невозможно, поэтому связка <b>grep</b> (найти строки) и <b>| wc -l</b> (посчитать) — базовый рефлекс. Символ <b>|</b> отправляет вывод одной команды на вход другой.",
    cheat: [
      ["cd /var/log", "перейти к логам"],
      ["cat app.log", "весь файл"],
      ["tail -n 3 app.log", "последние 3 строки"],
      ["grep ERROR app.log", "строки со словом ERROR"],
      ["grep -i error app.log", "то же, без учёта регистра"],
      ["grep -i error app.log | wc -l", "посчитать такие строки"],
    ],
    hints: [
      "Сначала перейди в /var/log",
      "grep ищет по подстроке: grep ERROR app.log",
      "Ключ -i делает поиск нечувствительным к регистру",
      "Труба | передаёт результат дальше: grep -i error app.log | wc -l",
    ],
    setup: (w) => { seedAppLog(w); w.cwd = "/var/log"; },
    objs: [
      { t: "Посмотри последние строки лога", d: "tail -n 3 app.log", ok: ran(/^tail\b.*app\.log/) },
      { t: "Найди в логе все строки с ошибками", d: "grep -i error app.log", ok: ran(/^grep\b.*app\.log/) },
      { t: "Посчитай, сколько всего ошибок", d: "grep -i error app.log | wc -l", ok: ran(/grep[^|]*\|\s*wc\s+-l/) },
      { t: "Сохрани найденные ошибки в файл errors.txt", d: "grep -i error app.log > /tmp/errors.txt", ok: has("/tmp/errors.txt", /ERROR/i) },
    ],
    solution: [
      "tail -n 3 app.log",
      "grep -i error app.log",
      "grep -i error app.log | wc -l",
      "grep -i error app.log > /tmp/errors.txt",
    ],
  },
  {
    id: "1.3", act: 1, title: "Навести порядок", xp: 40,
    why: "Создавать, копировать, переносить и удалять — рутина, которую ты будешь делать каждый день, в том числе в скриптах. Ключ <b>-p</b> у mkdir создаёт всю цепочку каталогов сразу, а <b>find</b> ищет файлы, когда не помнишь, куда положил.",
    cheat: [
      ["mkdir -p ~/work/backup", "создать каталог с родителями"],
      ["cp ИСТОЧНИК НАЗНАЧЕНИЕ", "копировать"],
      ["mv СТАРОЕ НОВОЕ", "переместить/переименовать"],
      ["rm ФАЙЛ", "удалить файл"],
      ["rm -r КАТАЛОГ", "удалить каталог"],
      ['find ~ -name "*.log"', "найти файлы по имени"],
    ],
    hints: [
      "mkdir -p ~/work/backup создаст сразу два уровня",
      "Копируй так: cp /var/log/app.log ~/work/backup/",
      "Переименовать = переместить: mv старое.txt новое.txt",
      'find ~ -name "*.log" ищет от домашнего каталога',
    ],
    setup: (w) => { seedAppLog(w); writeFile(w, "/home/devops/tmp-мусор.txt", "удали меня"); },
    objs: [
      { t: "Создай каталог ~/work/backup одной командой", d: "mkdir -p ~/work/backup", ok: (w) => !!getNode(w, "/home/devops/work/backup") },
      { t: "Скопируй туда /var/log/app.log", d: "cp /var/log/app.log ~/work/backup/", ok: (w) => !!getNode(w, "/home/devops/work/backup/app.log") },
      { t: "Переименуй копию в app-2026.log", d: "cd ~/work/backup && mv app.log app-2026.log", ok: (w) => !!getNode(w, "/home/devops/work/backup/app-2026.log") },
      { t: "Удали ненужный файл ~/tmp-мусор.txt", d: "rm ~/tmp-мусор.txt", ok: (w) => !getNode(w, "/home/devops/tmp-мусор.txt") },
      { t: "Найди все .log файлы в домашнем каталоге", d: 'find ~ -name "*.log"', ok: ran(/^find\b.*-name/) },
    ],
    solution: [
      "mkdir -p ~/work/backup",
      "cp /var/log/app.log ~/work/backup/",
      "cd ~/work/backup",
      "mv app.log app-2026.log",
      "rm ~/tmp-мусор.txt",
      'find ~ -name "*.log"',
    ],
  },
];
