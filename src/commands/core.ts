import { def, E, O } from "./registry";
import { resolvePath } from "../engine/vfs";
import { currentMission } from "../missions/current";

def("help", () => {
  const m = currentMission();
  const list = (m?.cheat || []).map((x) => "  " + x[0].padEnd(26) + " — " + x[1]).join("\n");
  return O(
    "Команды этого задания:\n" +
      list +
      "\n\nВсегда доступны:\n" +
      "  help                       — этот список\n" +
      "  hint                       — следующая подсказка\n" +
      "  edit <файл>                — открыть редактор файла\n" +
      "  clear                      — очистить экран\n" +
      "  restart                    — начать задание заново\n" +
      "  next                       — следующее задание",
  );
});

def("clear", () => ({ out: "", code: 0, clear: true }));
def("hint", () => ({ out: "", code: 0, hint: true }));
def("restart", () => ({ out: "", code: 0, restart: true }));

/**
 * exit N — завершает bash-скрипт немедленно с кодом N (0, если не указан).
 * Работает и внутри цепочки && / || (например  [ -z "$1" ] && exit 1 ), не только
 * отдельной строкой — см. exitCalled в runScript (engine/shell.ts).
 */
def("exit", (a) => {
  const code = a[0] ? Number(a[0]) || 0 : 0;
  return { out: "", code, exitCalled: code };
});

def("edit", (a, w) => {
  if (!a[0]) return E("edit: укажи файл, например: edit Dockerfile");
  return { out: "", code: 0, edit: resolvePath(w, a[0]) };
});

// nano/vim в тренажёре открывают тот же редактор, что и edit: настоящих
// модальных клавиш vim здесь нет, но название команды — то же, что в реальном терминале.
def("nano", (a, w) => {
  if (!a[0]) return E("nano: укажи файл, например: nano app.conf");
  return { out: "", code: 0, edit: resolvePath(w, a[0]) };
});
def("vim", (a, w) => {
  if (!a[0]) return E("vim: укажи файл, например: vim app.conf");
  return { out: "", code: 0, edit: resolvePath(w, a[0]) };
});

def("man", (a) => {
  const m: Record<string, string> = {
    ls: "ls — список файлов. -l подробно, -a со скрытыми.",
    grep: "grep ШАБЛОН ФАЙЛ — ищет строки. -i без регистра, -n с номерами.",
    chmod: "chmod ПРАВА ФАЙЛ — меняет права. 7=rwx 6=rw- 5=r-x 4=r--.",
    pwd: "pwd — печатает каталог, в котором ты сейчас находишься.",
    cd: "cd КАТАЛОГ — перейти. cd .. на уровень вверх, cd ~ домой.",
    cat: "cat ФАЙЛ — печатает файл целиком. Для больших файлов лучше head/tail.",
    head: "head ФАЙЛ — первые строки файла. -n ЧИСЛО — сколько именно.",
    tail: "tail ФАЙЛ — последние строки файла. -n ЧИСЛО — сколько именно.",
    wc: "wc — счётчик. -l строки, -w слова. Обычно в конце цепочки через |.",
    find: "find ГДЕ -name ШАБЛОН — ищет по ИМЕНИ во всём дереве. -type f файлы, -type d каталоги.",
    cp: "cp ИСТОЧНИК НАЗНАЧЕНИЕ — копирует файл.",
    mv: "mv ИСТОЧНИК НАЗНАЧЕНИЕ — переносит или переименовывает файл.",
    rm: "rm ФАЙЛ — удаляет без корзины. Назад не вернуть.",
    mkdir: "mkdir КАТАЛОГ — создаёт каталог. -p создаёт и всех родителей сразу.",
    df: "df — сколько места занято на разделах. Смотри колонку Использовано%.",
    free: "free — сколько оперативной памяти всего, занято и свободно.",
    env: "env — печатает все переменные окружения. Обычно env | grep ИМЯ.",
    export: "export ИМЯ=значение — заводит переменную окружения (без пробелов вокруг =).",
    ps: "ps — список процессов: PID, пользователь, нагрузка, команда.",
    chown: "chown ВЛАДЕЛЕЦ ФАЙЛ — меняет владельца файла. Обычно нужен sudo.",
    id: "id — твой uid, gid и группы, в которых ты состоишь.",
    sort: "sort — сортирует строки. Нужен перед uniq, иначе uniq не увидит дубли.",
    uniq: "uniq — схлопывает ПОДРЯД идущие одинаковые строки. Работает после sort.",
    nano: "nano ФАЙЛ — простой редактор. Ctrl+O сохранить, Ctrl+X выйти.",
    man: "man КОМАНДА — встроенная справка. Выход из справки — клавиша q.",
    systemctl: "systemctl status|start|stop|restart|enable СЕРВИС — управление службами.",
    git: "git — контроль версий. init, status, add, commit -m, log, switch -c, merge, push.",
    docker: "docker build -t ИМЯ . / run -d -p ХОСТ:КОНТ / ps / logs / exec.",
    kubectl: "kubectl apply -f / get pods / logs / describe / scale / rollout undo.",
  };
  const t = a[0];
  return t && m[t] ? O(m[t]) : O("man: справка есть по: " + Object.keys(m).join(", "));
});
