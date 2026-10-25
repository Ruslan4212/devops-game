/**
 * Карта ежедневной практики: станции от самых простых команд к сложным.
 *
 * Правила редактирования (от них зависит сохранённый прогресс игроков):
 *   - ключ команды — «id станции:номер», поэтому порядок команд внутри станции и
 *     порядок самих станций менять нельзя: новые — только в конец;
 *   - `cmd` — как команду пишет эталон; `alts` — другие записи, которые тоже верны
 *     (порядок флагов, длинные имена). Пробелы вокруг | > >> && и порядок букв
 *     в слитных флагах (-la = -al) проверка прощает сама;
 *   - `teach` — одна фраза «что делает», до 100 знаков: она же показывается
 *     в упражнении «что делает эта команда?» как один из вариантов.
 */

export interface DrillItem {
  /** задача по-русски: что нужно сделать */
  ask: string;
  /** эталонная команда */
  cmd: string;
  /** другие верные записи */
  alts?: string[];
  /** что делает — короткая фраза */
  teach: string;
  /** правдоподобные неверные команды — для вариантов ответа и лишних фишек */
  wrong?: string[];
}

export interface DrillUnit {
  id: string;
  title: string;
  blurb: string;
  /** иконка узла на карте (имя из ui-icons) */
  icon: string;
  items: DrillItem[];
}

export const DRILL_UNITS: DrillUnit[] = [
  {
    id: "orient",
    title: "Осмотреться",
    blurb: "Где я и что здесь лежит",
    icon: "map",
    items: [
      {
        ask: "Показать, в какой папке ты сейчас",
        cmd: "pwd",
        teach: "pwd печатает путь текущей папки — твой компас на незнакомом сервере.",
        wrong: ["ls", "cd", "whoami"],
      },
      {
        ask: "Показать список файлов в папке",
        cmd: "ls",
        teach: "ls выводит список файлов и папок.",
        wrong: ["pwd", "cat", "dir -x"],
      },
      {
        ask: "Показать файлы подробно: права, владелец, размер, дата",
        cmd: "ls -l",
        alts: ["ls -l ."],
        teach: "-l — длинный формат: права, владелец, размер и дата каждого файла.",
        wrong: ["ls -a", "ls -h", "ls --long-all"],
      },
      {
        ask: "Показать список вместе со скрытыми файлами (имя с точки)",
        cmd: "ls -a",
        alts: ["ls -a ."],
        teach: "-a (all) добавляет скрытые файлы, имена которых начинаются с точки.",
        wrong: ["ls -l", "ls -h", "ls -s"],
      },
      {
        ask: "Подробный список со скрытыми файлами",
        cmd: "ls -la",
        alts: ["ls -l -a", "ls -a -l", "ls -la ."],
        teach: "-la — это -l и -a вместе: подробно и со скрытыми.",
        wrong: ["ls -l", "ls -a", "ls -lh"],
      },
      {
        ask: "Показать содержимое папки /var/log, не заходя в неё",
        cmd: "ls /var/log",
        teach: "После ls можно указать путь — тогда покажет эту папку, а не текущую.",
        wrong: ["cd /var/log", "pwd /var/log", "cat /var/log"],
      },
      {
        ask: "Узнать, под каким пользователем ты работаешь",
        cmd: "whoami",
        teach: "whoami печатает имя текущего пользователя.",
        wrong: ["who", "id -p", "user"],
      },
    ],
  },
  {
    id: "walk",
    title: "Ходить по папкам",
    blurb: "cd и пути",
    icon: "flag",
    items: [
      {
        ask: "Перейти в папку /var/log",
        cmd: "cd /var/log",
        teach: "cd меняет текущую папку на указанную.",
        wrong: ["ls /var/log", "cd var/log", "pwd /var/log"],
      },
      {
        ask: "Подняться на уровень выше",
        cmd: "cd ..",
        teach: "Две точки — это родительская папка: cd .. поднимает на уровень вверх.",
        wrong: ["cd .", "cd /", "cd ../.."],
      },
      {
        ask: "Вернуться в домашнюю папку",
        cmd: "cd ~",
        alts: ["cd"],
        teach: "Тильда ~ — твоя домашняя папка; cd без аргументов делает то же самое.",
        wrong: ["cd /", "cd home", "cd .."],
      },
      {
        ask: "Вернуться в предыдущую папку, где был до этого",
        cmd: "cd -",
        teach: "cd - возвращает в папку, из которой ты только что перешёл.",
        wrong: ["cd ..", "cd ~", "cd --"],
      },
      {
        ask: "Перейти в корень файловой системы",
        cmd: "cd /",
        teach: "Одиночный слэш — корень, начало всего дерева папок.",
        wrong: ["cd ~", "cd ..", "cd //home"],
      },
      {
        ask: "Зайти в папку logs, которая лежит внутри текущей",
        cmd: "cd logs",
        alts: ["cd ./logs"],
        teach: "Путь без слэша в начале считается от текущей папки.",
        wrong: ["cd /logs", "ls logs", "cd ../logs"],
      },
    ],
  },
  {
    id: "read",
    title: "Читать файлы",
    blurb: "cat, head, tail, less",
    icon: "book",
    items: [
      {
        ask: "Вывести на экран весь файл app.log",
        cmd: "cat app.log",
        teach: "cat печатает файл целиком — удобно для коротких файлов.",
        wrong: ["ls app.log", "less -n app.log", "show app.log"],
      },
      {
        ask: "Показать первые 5 строк app.log",
        cmd: "head -n 5 app.log",
        alts: ["head -5 app.log"],
        teach: "head показывает начало файла, -n задаёт число строк.",
        wrong: ["tail -n 5 app.log", "head app.log 5", "cat -n 5 app.log"],
      },
      {
        ask: "Показать последние 20 строк app.log",
        cmd: "tail -n 20 app.log",
        alts: ["tail -20 app.log"],
        teach: "tail показывает конец файла — там самые свежие записи лога.",
        wrong: ["head -n 20 app.log", "tail app.log -n", "cat -20 app.log"],
      },
      {
        ask: "Следить за app.log в реальном времени",
        cmd: "tail -f app.log",
        alts: ["tail --follow app.log"],
        teach: "-f (follow) не завершается и печатает новые строки по мере появления.",
        wrong: ["tail -n app.log", "cat -f app.log", "watch app.log -f"],
      },
      {
        ask: "Листать большой файл app.log постранично",
        cmd: "less app.log",
        teach: "less листает файл по экрану, не загружая его целиком; q — выход.",
        wrong: ["more -l app.log", "cat app.log", "page app.log"],
      },
      {
        ask: "Посчитать, сколько строк в app.log",
        cmd: "wc -l app.log",
        teach: "wc считает; -l — именно строки.",
        wrong: ["wc -w app.log", "count app.log", "cat -l app.log"],
      },
      {
        ask: "Показать последние 50 строк app.log и следить дальше",
        cmd: "tail -n 50 -f app.log",
        alts: ["tail -f -n 50 app.log", "tail -50f app.log", "tail -fn 50 app.log"],
        teach: "Флаги -n и -f можно сочетать: сначала хвост, потом слежение.",
        wrong: ["tail -f 50 app.log", "head -n 50 -f app.log", "tail -n -f 50 app.log"],
      },
    ],
  },
  {
    id: "files",
    title: "Файлы и папки",
    blurb: "создать, скопировать, удалить",
    icon: "bag",
    items: [
      {
        ask: "Создать папку backups",
        cmd: "mkdir backups",
        teach: "mkdir создаёт новую папку.",
        wrong: ["touch backups", "md backups", "mkdir -p"],
      },
      {
        ask: "Создать вложенные папки a/b/c за одну команду",
        cmd: "mkdir -p a/b/c",
        teach: "-p создаёт всю цепочку папок сразу и не ругается, если часть уже есть.",
        wrong: ["mkdir a/b/c", "mkdir -r a/b/c", "mkdir a b c"],
      },
      {
        ask: "Создать пустой файл notes.txt",
        cmd: "touch notes.txt",
        teach: "touch создаёт пустой файл или обновляет время изменения у существующего.",
        wrong: ["mkdir notes.txt", "echo notes.txt", "new notes.txt"],
      },
      {
        ask: "Скопировать файл a.txt в b.txt",
        cmd: "cp a.txt b.txt",
        teach: "cp копирует: сначала откуда, потом куда.",
        wrong: ["cp b.txt a.txt", "mv a.txt b.txt", "copy a.txt b.txt"],
      },
      {
        ask: "Переименовать a.txt в b.txt",
        cmd: "mv a.txt b.txt",
        teach: "mv переносит или переименовывает — в Linux это одна и та же операция.",
        wrong: ["rename a.txt b.txt", "cp a.txt b.txt", "mv b.txt a.txt"],
      },
      {
        ask: "Удалить файл old.txt",
        cmd: "rm old.txt",
        teach: "rm удаляет насовсем: корзины в терминале нет.",
        wrong: ["del old.txt", "rm -r", "unlink -f"],
      },
      {
        ask: "Скопировать папку conf со всем содержимым в conf.bak",
        cmd: "cp -r conf conf.bak",
        alts: ["cp -R conf conf.bak"],
        teach: "Для папок нужен -r (рекурсивно): без него cp откажется.",
        wrong: ["cp conf conf.bak", "cp -f conf conf.bak", "cp conf -r conf.bak"],
      },
      {
        ask: "Удалить папку tmp вместе со всем внутри",
        cmd: "rm -r tmp",
        alts: ["rm -rf tmp", "rm -R tmp", "rm -fr tmp"],
        teach: "rm -r удаляет папку рекурсивно. Перед ним проверь pwd — отменить нельзя.",
        wrong: ["rmdir tmp -r", "rm tmp", "del -r tmp"],
      },
    ],
  },
  {
    id: "search",
    title: "Искать и фильтровать",
    blurb: "grep и find",
    icon: "target",
    items: [
      {
        ask: "Найти в app.log строки со словом ERROR",
        cmd: "grep ERROR app.log",
        teach: "grep печатает только строки, где встретился шаблон.",
        wrong: ["find ERROR app.log", "grep app.log ERROR", "cat ERROR app.log"],
      },
      {
        ask: "Найти error в app.log, не различая регистр",
        cmd: "grep -i error app.log",
        alts: ["grep --ignore-case error app.log"],
        teach: "-i (ignore case) считает ERROR, error и Error одним словом.",
        wrong: ["grep -v error app.log", "grep -c error app.log", "grep -I error app.log"],
      },
      {
        ask: "Показать строки app.log, где НЕТ слова DEBUG",
        cmd: "grep -v DEBUG app.log",
        teach: "-v инвертирует выбор: остаются строки без совпадения.",
        wrong: ["grep -i DEBUG app.log", "grep ! DEBUG app.log", "grep -n DEBUG app.log"],
      },
      {
        ask: "Найти TODO во всех файлах текущей папки и глубже",
        cmd: "grep -r TODO .",
        alts: ["grep -R TODO ."],
        teach: "-r обходит папки рекурсивно; точка — «начиная с текущей».",
        wrong: ["grep TODO .", "find TODO .", "grep -a TODO ."],
      },
      {
        ask: "Посчитать, сколько строк в app.log содержат ERROR",
        cmd: "grep -c ERROR app.log",
        teach: "-c выводит не сами строки, а их количество.",
        wrong: ["grep -n ERROR app.log", "wc -l ERROR app.log", "grep -s ERROR app.log"],
      },
      {
        ask: "Найти все файлы с именем *.log начиная с текущей папки",
        cmd: 'find . -name "*.log"',
        teach: "find ищет по дереву папок; -name задаёт шаблон имени (в кавычках).",
        wrong: ['find -name "*.log" .', 'grep -r "*.log" .', 'find . -file "*.log"'],
      },
      {
        ask: "Найти в /var обычные файлы больше 100 МБ",
        cmd: "find /var -type f -size +100M",
        teach: "-type f — только файлы, -size +100M — крупнее 100 мегабайт.",
        wrong: ["find /var -size 100M -type", "find /var -big 100M", "ls /var -size +100M"],
      },
    ],
  },
  {
    id: "pipes",
    title: "Конвейер и перенаправление",
    blurb: "| и > — склеиваем команды",
    icon: "bolt",
    items: [
      {
        ask: "Посчитать, сколько файлов в папке: вывод ls передать в wc",
        cmd: "ls | wc -l",
        teach: "Знак | передаёт вывод левой команды на вход правой.",
        wrong: ["ls > wc -l", "ls & wc -l", "wc -l | ls"],
      },
      {
        ask: "Взять строки с ERROR из app.log и показать только последние 5",
        cmd: "grep ERROR app.log | tail -n 5",
        alts: ["grep ERROR app.log | tail -5"],
        teach: "Конвейер: grep отбирает строки, tail оставляет хвост.",
        wrong: [
          "tail -n 5 | grep ERROR app.log",
          "grep ERROR app.log > tail -n 5",
          "grep ERROR | tail app.log",
        ],
      },
      {
        ask: "Записать слово ok в файл status.txt (перезаписав его)",
        cmd: "echo ok > status.txt",
        teach: "> записывает вывод в файл и стирает старое содержимое.",
        wrong: ["echo ok >> status.txt", "echo ok | status.txt", "echo status.txt > ok"],
      },
      {
        ask: "Дописать слово ok в конец status.txt, ничего не стирая",
        cmd: "echo ok >> status.txt",
        teach: ">> дописывает в конец файла и сохраняет то, что там было.",
        wrong: ["echo ok > status.txt", "echo ok > > status.txt", "echo ok << status.txt"],
      },
      {
        ask: "Отсортировать users.txt и убрать повторяющиеся строки",
        cmd: "sort users.txt | uniq",
        alts: ["sort -u users.txt"],
        teach: "uniq убирает только СОСЕДНИЕ дубли, поэтому сначала sort.",
        wrong: ["uniq users.txt | sort", "uniq users.txt", "sort users.txt > uniq"],
      },
      {
        ask: "Сохранить и вывод, и ошибки скрипта ./build.sh в файл build.log",
        cmd: "./build.sh > build.log 2>&1",
        alts: ["./build.sh &> build.log"],
        teach: "2>&1 отправляет поток ошибок туда же, куда идёт обычный вывод.",
        wrong: ["./build.sh > build.log", "./build.sh 2>&1 > build.log 1", "./build.sh | build.log 2>&1"],
      },
      {
        ask: "Показать вывод ls -l постранично",
        cmd: "ls -l | less",
        teach: "Любой длинный вывод удобно пустить через less.",
        wrong: ["less | ls -l", "ls -l > less", "ls -l less"],
      },
    ],
  },
  {
    id: "perms",
    title: "Права и владельцы",
    blurb: "chmod и chown",
    icon: "lock",
    items: [
      {
        ask: "Сделать скрипт run.sh исполняемым",
        cmd: "chmod +x run.sh",
        alts: ["chmod a+x run.sh", "chmod u+x run.sh"],
        teach: "chmod +x добавляет право на запуск.",
        wrong: ["chmod -x run.sh", "chmod 000 run.sh", "chown +x run.sh"],
      },
      {
        ask: "Выставить notes.txt права rw-r--r--",
        cmd: "chmod 644 notes.txt",
        teach: "6 = чтение+запись, 4 = чтение: владелец пишет, остальные читают.",
        wrong: ["chmod 755 notes.txt", "chmod 666 notes.txt", "chmod 444 notes.txt"],
      },
      {
        ask: "Выставить папке bin права rwxr-xr-x",
        cmd: "chmod 755 bin",
        teach: "7 = rwx, 5 = r-x: владелец всё, остальные читают и заходят.",
        wrong: ["chmod 644 bin", "chmod 777 bin", "chmod 575 bin"],
      },
      {
        ask: "Закрыть приватный ключ id_rsa от всех, кроме владельца",
        cmd: "chmod 600 id_rsa",
        teach: "600 — только владелец читает и пишет; ssh требует именно это для ключей.",
        wrong: ["chmod 644 id_rsa", "chmod 400 id_rsa -x", "chmod 060 id_rsa"],
      },
      {
        ask: "Сменить владельца app.log на пользователя deploy",
        cmd: "chown deploy app.log",
        teach: "chown меняет владельца файла.",
        wrong: ["chmod deploy app.log", "chown app.log deploy", "chgrp deploy app.log"],
      },
      {
        ask: "Сменить и владельца, и группу app.log на deploy:deploy",
        cmd: "chown deploy:deploy app.log",
        teach: "Через двоеточие задаются владелец и группа за один раз.",
        wrong: ["chown deploy.deploy.app.log", "chown deploy app.log:deploy", "chgrp deploy:deploy app.log"],
      },
      {
        ask: "Отдать папку /srv/app пользователю deploy вместе со всем внутри",
        cmd: "chown -R deploy /srv/app",
        alts: ["chown --recursive deploy /srv/app"],
        teach: "-R применяет изменение ко всему содержимому папки.",
        wrong: ["chown deploy -R", "chown -r /srv/app deploy", "chmod -R deploy /srv/app"],
      },
    ],
  },
  {
    id: "procs",
    title: "Процессы и службы",
    blurb: "ps, kill, systemctl",
    icon: "terminal",
    items: [
      {
        ask: "Показать все процессы подробно",
        cmd: "ps aux",
        alts: ["ps -aux"],
        teach: "ps aux — снимок всех процессов всех пользователей.",
        wrong: ["ps -l", "top -a", "proc list"],
      },
      {
        ask: "Найти среди процессов nginx",
        cmd: "ps aux | grep nginx",
        alts: ["ps -aux | grep nginx"],
        teach: "Список процессов пропускаем через grep — остаётся нужная строка.",
        wrong: ["grep nginx | ps aux", "ps nginx", "ps aux > grep nginx"],
      },
      {
        ask: "Вежливо попросить процесс 1234 завершиться",
        cmd: "kill 1234",
        alts: ["kill -15 1234", "kill -TERM 1234", "kill -SIGTERM 1234"],
        teach: "kill по умолчанию шлёт SIGTERM: процесс успевает убрать за собой.",
        wrong: ["kill -9 1234", "stop 1234", "kill 1234 -9"],
      },
      {
        ask: "Принудительно убить зависший процесс 1234",
        cmd: "kill -9 1234",
        alts: ["kill -KILL 1234", "kill -SIGKILL 1234"],
        teach: "-9 (SIGKILL) убивает сразу, без шанса сохраниться. Крайняя мера.",
        wrong: ["kill 1234", "kill -1 1234", "killall 1234"],
      },
      {
        ask: "Узнать статус службы nginx",
        cmd: "systemctl status nginx",
        teach: "systemctl status показывает, жива ли служба, и последние строки её лога.",
        wrong: ["systemctl nginx status", "service status nginx -d", "systemctl show-status nginx"],
      },
      {
        ask: "Перезапустить службу nginx",
        cmd: "systemctl restart nginx",
        teach: "restart останавливает и снова запускает службу.",
        wrong: ["systemctl reload-all nginx", "systemctl start nginx -r", "restart nginx"],
      },
      {
        ask: "Включить автозапуск nginx при загрузке сервера",
        cmd: "systemctl enable nginx",
        teach: "enable настраивает автозапуск, но сейчас службу не стартует.",
        wrong: ["systemctl start nginx", "systemctl autostart nginx", "systemctl boot nginx"],
      },
      {
        ask: "Читать журнал службы nginx",
        cmd: "journalctl -u nginx",
        alts: ["journalctl -u nginx.service"],
        teach: "journalctl читает системный журнал; -u выбирает службу (unit).",
        wrong: ["journalctl nginx", "journalctl -s nginx", "systemctl log nginx"],
      },
      {
        ask: "Следить за журналом службы nginx в реальном времени",
        cmd: "journalctl -u nginx -f",
        alts: ["journalctl -f -u nginx", "journalctl -fu nginx"],
        teach: "-f работает как в tail: печатает новые записи по мере появления.",
        wrong: ["journalctl -u nginx -t", "journalctl -follow nginx", "tail -f journalctl nginx"],
      },
    ],
  },
  {
    id: "sys",
    title: "Диск, память, сеть",
    blurb: "df, du, free, ping, curl, ss",
    icon: "gauge",
    items: [
      {
        ask: "Показать свободное место на дисках в понятных единицах",
        cmd: "df -h",
        teach: "df показывает занятое и свободное место на дисках, -h — в МБ и ГБ.",
        wrong: ["du -h", "df -l", "disk -h"],
      },
      {
        ask: "Узнать размер папки /var/log одной строкой в понятных единицах",
        cmd: "du -sh /var/log",
        alts: ["du -hs /var/log"],
        teach: "du считает размер папки: -s — итог одной строкой, -h — человеческие единицы.",
        wrong: ["df -sh /var/log", "du -h /var/log -r", "du /var/log -total"],
      },
      {
        ask: "Показать, сколько памяти занято и свободно",
        cmd: "free -h",
        teach: "free показывает память и swap; смотри на колонку available.",
        wrong: ["mem -h", "free -d", "df -m"],
      },
      {
        ask: "Проверить, отвечает ли хост example.com: отправить 4 пакета",
        cmd: "ping -c 4 example.com",
        teach: "ping без -c идёт бесконечно; -c ограничивает число пакетов.",
        wrong: ["ping -n 4 example.com", "ping example.com 4", "ping -t 4 example.com"],
      },
      {
        ask: "Получить только заголовки ответа сайта https://example.com",
        cmd: "curl -I https://example.com",
        alts: ["curl --head https://example.com"],
        teach: "curl -I делает запрос HEAD: только код ответа и заголовки.",
        wrong: [
          "curl -i https://example.com -h",
          "curl -H https://example.com",
          "curl --headers https://example.com",
        ],
      },
      {
        ask: "Показать TCP-порты, которые слушает сервер",
        cmd: "ss -ltn",
        alts: ["ss -tln", "ss -nlt", "ss -ntl", "ss -lnt", "ss -tnl"],
        teach: "ss -ltn: l — слушающие, t — TCP, n — числа вместо имён.",
        wrong: ["ss -a", "ss -tcp", "netstat"],
      },
      {
        ask: "Узнать IP-адрес домена example.com коротким ответом",
        cmd: "dig +short example.com",
        alts: ["dig example.com +short"],
        teach: "dig запрашивает DNS; +short оставляет только ответ.",
        wrong: ["dig -short example.com", "nslookup +short example.com -d", "dig example.com short"],
      },
    ],
  },
  {
    id: "scripts",
    title: "Скрипты bash",
    blurb: "запуск, переменные, код возврата",
    icon: "keyboard",
    items: [
      {
        ask: "Запустить скрипт deploy.sh из текущей папки",
        cmd: "./deploy.sh",
        teach: "Точка и слэш — «файл из этой папки»; нужен бит +x.",
        wrong: ["deploy.sh", "run deploy.sh", "./deploy"],
      },
      {
        ask: "Запустить deploy.sh через bash, не делая его исполняемым",
        cmd: "bash deploy.sh",
        alts: ["sh deploy.sh"],
        teach: "Так bash читает файл как скрипт, и право +x не требуется.",
        wrong: ["bash -x < deploy.sh >", "exec deploy.sh", "bash ./deploy"],
      },
      {
        ask: "Показать код возврата последней команды",
        cmd: "echo $?",
        teach: "$? хранит код выхода: 0 — успех, любое другое число — ошибка.",
        wrong: ["echo $!", "echo $0", "echo $#"],
      },
      {
        ask: "Задать переменную ENV=prod, видимую запущенным из оболочки программам",
        cmd: "export ENV=prod",
        teach: "export передаёт переменную дочерним процессам, а не только текущей оболочке.",
        wrong: ["ENV = prod", "set ENV=prod", "export ENV prod"],
      },
      {
        ask: "Показать значение переменной HOME",
        cmd: "echo $HOME",
        alts: ['echo "$HOME"', "echo ${HOME}"],
        teach: "Знак $ перед именем подставляет значение переменной.",
        wrong: ["echo HOME", "echo %HOME%", "print $HOME"],
      },
      {
        ask: "Строка в начале скрипта: остановиться при первой ошибке",
        cmd: "set -e",
        teach: "set -e обрывает скрипт на первой команде с ненулевым кодом.",
        wrong: ["set -x", "exit -e", "stop on error"],
      },
      {
        ask: "Запустить backup.sh и, только если он успешен, показать список файлов",
        cmd: "./backup.sh && ls",
        teach: "&& запускает вторую команду лишь при успехе первой.",
        wrong: ["./backup.sh || ls", "./backup.sh ; ls &", "./backup.sh & ls"],
      },
    ],
  },
  {
    id: "git1",
    title: "Git: первые шаги",
    blurb: "init, add, commit, log",
    icon: "diamond",
    items: [
      {
        ask: "Создать репозиторий в текущей папке",
        cmd: "git init",
        teach: "git init заводит скрытую папку .git — с этого начинается история.",
        wrong: ["git start", "git create", "git new"],
      },
      {
        ask: "Показать состояние файлов: что изменено и что в очереди",
        cmd: "git status",
        teach: "git status — самая частая команда: что изменено, что добавлено.",
        wrong: ["git state", "git log", "git diff --status"],
      },
      {
        ask: "Добавить в будущий коммит все изменения",
        cmd: "git add .",
        alts: ["git add -A", "git add --all"],
        teach: "git add кладёт изменения в «коробку» перед коммитом.",
        wrong: ["git commit .", "git push .", "git stage"],
      },
      {
        ask: "Добавить в коммит только файл README.md",
        cmd: "git add README.md",
        teach: "Можно добавлять по одному файлу — коммит получится аккуратнее.",
        wrong: ["git commit README.md", "git add -m README.md", "git push README.md"],
      },
      {
        ask: "Сделать коммит с сообщением fix typo",
        cmd: 'git commit -m "fix typo"',
        teach: "-m задаёт сообщение коммита сразу в командной строке.",
        wrong: ['git commit "fix typo"', 'git commit -a "fix typo"', 'git add -m "fix typo"'],
      },
      {
        ask: "Показать историю коротко: один коммит — одна строка",
        cmd: "git log --oneline",
        teach: "--oneline сжимает каждый коммит до хеша и заголовка.",
        wrong: ["git log -1", "git history", "git log --short-line"],
      },
      {
        ask: "Показать, что изменилось в файлах, но ещё не добавлено",
        cmd: "git diff",
        teach: "git diff показывает построчные различия.",
        wrong: ["git status -d", "git changes", "git show"],
      },
    ],
  },
  {
    id: "git2",
    title: "Git: ветки и сервер",
    blurb: "branch, merge, push, pull",
    icon: "flag",
    items: [
      {
        ask: "Показать список веток",
        cmd: "git branch",
        teach: "git branch перечисляет ветки; звёздочка — текущая.",
        wrong: ["git branches", "git list", "git status -b -l"],
      },
      {
        ask: "Создать ветку feature и сразу перейти в неё",
        cmd: "git switch -c feature",
        alts: ["git checkout -b feature"],
        teach: "-c (create) создаёт ветку и переключает на неё за один шаг.",
        wrong: ["git branch -c feature", "git switch feature -n", "git new feature"],
      },
      {
        ask: "Перейти на существующую ветку main",
        cmd: "git switch main",
        alts: ["git checkout main"],
        teach: "git switch переключает ветку, не создавая новую.",
        wrong: ["git switch -c main", "git go main", "git merge main"],
      },
      {
        ask: "Влить ветку feature в текущую",
        cmd: "git merge feature",
        teach: "merge вливает ветку в ту, на которой ты стоишь.",
        wrong: ["git merge -into feature", "git push feature", "git pull feature --merge-into"],
      },
      {
        ask: "Отправить ветку main на сервер origin",
        cmd: "git push origin main",
        teach: "push загружает твои коммиты на удалённый репозиторий.",
        wrong: ["git push main origin", "git send origin main", "git pull origin main"],
      },
      {
        ask: "Забрать новые коммиты с сервера в текущую ветку",
        cmd: "git pull",
        teach: "git pull скачивает изменения и вливает их.",
        wrong: ["git fetch --merge", "git push --pull", "git get"],
      },
      {
        ask: "Спрятать незакоммиченные правки, чтобы переключиться",
        cmd: "git stash",
        teach: "stash убирает правки «в карман»; вернуть — git stash pop.",
        wrong: ["git hide", "git save", "git reset --stash"],
      },
      {
        ask: "Отменить последний коммит, но оставить правки в файлах",
        cmd: "git reset --soft HEAD~1",
        alts: ["git reset --soft HEAD^"],
        teach: "--soft откатывает только коммит: изменения остаются добавленными.",
        wrong: ["git reset --hard HEAD~1", "git revert --soft HEAD", "git undo HEAD~1"],
      },
    ],
  },
  {
    id: "docker",
    title: "Docker",
    blurb: "образы и контейнеры",
    icon: "bag",
    items: [
      {
        ask: "Показать запущенные контейнеры",
        cmd: "docker ps",
        teach: "docker ps — только работающие контейнеры.",
        wrong: ["docker list", "docker ls -r", "docker images"],
      },
      {
        ask: "Показать все контейнеры, включая остановленные",
        cmd: "docker ps -a",
        alts: ["docker ps --all"],
        teach: "-a добавляет остановленные — удобно искать упавшие.",
        wrong: ["docker ps -s", "docker ps --stopped", "docker ls -a -c"],
      },
      {
        ask: "Показать образы, скачанные на этот сервер",
        cmd: "docker images",
        alts: ["docker image ls"],
        teach: "Образ — шаблон, из которого запускают контейнеры.",
        wrong: ["docker ps -i", "docker image", "docker list images"],
      },
      {
        ask: "Запустить nginx в фоне, открыв порт 8080 снаружи на порт 80 внутри",
        cmd: "docker run -d -p 8080:80 nginx",
        alts: ["docker run -p 8080:80 -d nginx", "docker run -dp 8080:80 nginx"],
        teach: "-d — в фоне, -p снаружи:внутри — проброс порта.",
        wrong: [
          "docker run -d -p 80:8080 nginx",
          "docker run nginx -d -p 8080:80",
          "docker start -d -p 8080:80 nginx",
        ],
      },
      {
        ask: "Запустить nginx в фоне под именем web",
        cmd: "docker run -d --name web nginx",
        alts: ["docker run --name web -d nginx"],
        teach: "--name даёт контейнеру понятное имя вместо случайного.",
        wrong: ["docker run -d -n web nginx", "docker run -d web nginx", "docker run --name -d web nginx"],
      },
      {
        ask: "Читать логи контейнера web в реальном времени",
        cmd: "docker logs -f web",
        alts: ["docker logs --follow web"],
        teach: "docker logs показывает вывод контейнера, -f следит за ним.",
        wrong: ["docker log -f web", "docker logs web -t", "docker tail web"],
      },
      {
        ask: "Зайти внутрь контейнера web в оболочку sh",
        cmd: "docker exec -it web sh",
        alts: ["docker exec -it web bash", "docker exec -ti web sh", "docker exec -ti web bash"],
        teach: "exec запускает команду внутри; -it даёт интерактивный терминал.",
        wrong: ["docker run -it web sh", "docker exec web -it sh", "docker enter web"],
      },
      {
        ask: "Собрать образ app:1.0 из Dockerfile в текущей папке",
        cmd: "docker build -t app:1.0 .",
        teach: "-t задаёт имя:тег образа, точка — где лежит Dockerfile.",
        wrong: ["docker build app:1.0 .", "docker make -t app:1.0 .", "docker build -t app:1.0"],
      },
      {
        ask: "Остановить контейнер web",
        cmd: "docker stop web",
        teach: "stop вежливо останавливает контейнер (SIGTERM, затем SIGKILL).",
        wrong: ["docker kill -s web", "docker rm web", "docker pause web -s"],
      },
      {
        ask: "Удалить остановленный контейнер web",
        cmd: "docker rm web",
        teach: "rm удаляет контейнер; запущенный сначала нужно остановить.",
        wrong: ["docker rmi web", "docker delete web", "docker stop -rm web"],
      },
    ],
  },
  {
    id: "k8s",
    title: "Kubernetes",
    blurb: "kubectl",
    icon: "gauge",
    items: [
      {
        ask: "Показать поды в текущем пространстве имён",
        cmd: "kubectl get pods",
        alts: ["kubectl get pod", "kubectl get po"],
        teach: "kubectl get перечисляет объекты кластера: под — самая мелкая единица.",
        wrong: ["kubectl list pods", "kubectl pods", "kubectl show pods"],
      },
      {
        ask: "Подробно описать под api-0: события, причина падения",
        cmd: "kubectl describe pod api-0",
        alts: ["kubectl describe pod/api-0"],
        teach: "describe собирает состояние и события — первое место, куда смотрят при сбое.",
        wrong: ["kubectl get pod api-0 -d", "kubectl explain pod api-0", "kubectl logs describe api-0"],
      },
      {
        ask: "Прочитать логи пода api-0",
        cmd: "kubectl logs api-0",
        alts: ["kubectl logs pod/api-0"],
        teach: "logs показывает вывод контейнера внутри пода.",
        wrong: ["kubectl log api-0", "kubectl get logs api-0", "kubectl describe logs api-0"],
      },
      {
        ask: "Применить манифест app.yaml",
        cmd: "kubectl apply -f app.yaml",
        teach: "apply приводит кластер к описанному в файле; -f — путь к файлу.",
        wrong: ["kubectl create app.yaml -f", "kubectl run -f app.yaml", "kubectl apply app.yaml"],
      },
      {
        ask: "Показать поды в пространстве имён kube-system",
        cmd: "kubectl get pods -n kube-system",
        alts: ["kubectl get pods --namespace kube-system", "kubectl -n kube-system get pods"],
        teach: "-n выбирает пространство имён (namespace).",
        wrong: [
          "kubectl get pods kube-system",
          "kubectl get pods -s kube-system",
          "kubectl get kube-system pods",
        ],
      },
      {
        ask: "Масштабировать deployment api до 3 реплик",
        cmd: "kubectl scale deployment api --replicas=3",
        alts: ["kubectl scale deployment/api --replicas=3", "kubectl scale deploy api --replicas=3"],
        teach: "scale меняет число копий; --replicas — сколько нужно.",
        wrong: ["kubectl scale api 3", "kubectl set replicas api=3", "kubectl scale deployment api -r 3"],
      },
      {
        ask: "Откатить deployment api на предыдущую версию",
        cmd: "kubectl rollout undo deployment/api",
        alts: ["kubectl rollout undo deployment api"],
        teach: "rollout undo возвращает прошлую ревизию — быстрый откат плохого релиза.",
        wrong: [
          "kubectl rollback deployment/api",
          "kubectl undo deployment/api",
          "kubectl rollout back deployment/api",
        ],
      },
      {
        ask: "Дождаться окончания раскатки deployment api",
        cmd: "kubectl rollout status deployment/api",
        alts: ["kubectl rollout status deployment api"],
        teach: "rollout status ждёт и показывает прогресс обновления.",
        wrong: [
          "kubectl status deployment/api",
          "kubectl rollout wait deployment/api",
          "kubectl get rollout api",
        ],
      },
    ],
  },
  {
    id: "tf",
    title: "Terraform",
    blurb: "инфраструктура как код",
    icon: "sparkles",
    items: [
      {
        ask: "Подготовить рабочую папку: скачать провайдеры",
        cmd: "terraform init",
        teach: "init скачивает провайдеры и готовит папку; делается первым.",
        wrong: ["terraform start", "terraform setup", "terraform get-providers"],
      },
      {
        ask: "Выровнять форматирование всех файлов .tf",
        cmd: "terraform fmt",
        teach: "fmt приводит код к стандартному виду.",
        wrong: ["terraform format -all", "terraform lint", "terraform style"],
      },
      {
        ask: "Проверить синтаксис конфигурации",
        cmd: "terraform validate",
        teach: "validate проверяет, что конфигурация написана корректно — без обращения к облаку.",
        wrong: ["terraform check", "terraform test", "terraform plan -v"],
      },
      {
        ask: "Посмотреть, что изменится, ничего не трогая",
        cmd: "terraform plan",
        teach: "plan — репетиция: показывает, что будет создано, изменено, удалено.",
        wrong: ["terraform apply -dry", "terraform preview", "terraform diff"],
      },
      {
        ask: "Применить изменения к инфраструктуре",
        cmd: "terraform apply",
        teach: "apply выполняет план; перед выполнением спросит подтверждение.",
        wrong: ["terraform run", "terraform deploy", "terraform plan -apply"],
      },
      {
        ask: "Показать список ресурсов, которые Terraform держит в состоянии",
        cmd: "terraform state list",
        teach: "state — память Terraform о том, что он создал.",
        wrong: ["terraform list state", "terraform show-state", "terraform state ls -a"],
      },
      {
        ask: "Снести всё, что было создано",
        cmd: "terraform destroy",
        teach: "destroy удаляет ресурсы. Сначала убедись, что стоишь в нужной папке.",
        wrong: ["terraform delete", "terraform remove -all", "terraform apply -destroy-all"],
      },
    ],
  },
  {
    id: "py",
    title: "Python и мониторинг",
    blurb: "venv, pip, promtool, curl",
    icon: "brain",
    items: [
      {
        ask: "Создать виртуальное окружение в папке venv",
        cmd: "python3 -m venv venv",
        teach: "venv изолирует зависимости проекта от системных.",
        wrong: ["python3 venv venv", "python3 -venv venv", "pip venv venv"],
      },
      {
        ask: "Включить окружение venv",
        cmd: "source venv/bin/activate",
        alts: [". venv/bin/activate"],
        teach: "После activate pip и python работают внутри окружения.",
        wrong: ["./venv/bin/activate", "activate venv", "source venv/activate"],
      },
      {
        ask: "Установить библиотеку requests",
        cmd: "pip install requests",
        alts: ["pip3 install requests", "python3 -m pip install requests"],
        teach: "pip скачивает и ставит пакеты из PyPI.",
        wrong: ["pip get requests", "pip add requests", "python3 install requests"],
      },
      {
        ask: "Сохранить список установленных пакетов в requirements.txt",
        cmd: "pip freeze > requirements.txt",
        alts: ["pip3 freeze > requirements.txt"],
        teach: "freeze выводит пакеты с версиями; > отправляет их в файл.",
        wrong: ["pip list > requirements.txt -f", "pip freeze >> requirements", "pip save requirements.txt"],
      },
      {
        ask: "Запустить скрипт script.py",
        cmd: "python3 script.py",
        alts: ["python script.py"],
        teach: "python3 читает файл и выполняет его.",
        wrong: ["python3 -s script.py", "run script.py", "python3 < script"],
      },
      {
        ask: "Проверить конфиг Prometheus prometheus.yml",
        cmd: "promtool check config prometheus.yml",
        teach: "promtool check config находит ошибки в конфиге до перезапуска сервера.",
        wrong: [
          "prometheus check prometheus.yml",
          "promtool test config prometheus.yml",
          "promtool config check -f prometheus.yml",
        ],
      },
      {
        ask: "Запросить метрики экспортёра на порту 9100",
        cmd: "curl localhost:9100/metrics",
        alts: ["curl http://localhost:9100/metrics", "curl -s localhost:9100/metrics"],
        teach: "Экспортёр отдаёт метрики текстом по HTTP на пути /metrics.",
        wrong: ["curl localhost:9100", "curl -m localhost:9100/metrics", "wget -O localhost 9100/metrics"],
      },
    ],
  },
];
