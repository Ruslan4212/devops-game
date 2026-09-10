import { def, E, O } from "./registry";
import { mkdirp, readFile, resolvePath } from "../engine/vfs";
import type { CmdResult, PyState, World } from "../engine/types";

/** Ленивая инициализация состояния симулятора Python (акт «Python для DevOps»). */
export function pyInit(w: World): PyState {
  if (!w.py) w.py = { venv: false, pkgs: [], ran: 0 };
  return w.py;
}

/** Подстроки в URL, которые тренажёр считает «сервис недоступен». */
const DOWN = /:9999|:1234|host-down|unreachable|nonexistent/;

/** Известные версии пакетов — для pip list / pip freeze. */
const PKG_VER: Record<string, string> = {
  requests: "2.31.0",
  pyyaml: "6.0.1",
  ruff: "0.5.7",
  black: "24.4.2",
  boto3: "1.34.0",
};

/* ─────────────────────────── pip ─────────────────────────── */

function pipMain(a: string[], w: World): CmdResult {
  const py = pyInit(w);
  const sub = a[0];

  if (sub === "install") {
    const pkgs = a.slice(1).filter((x) => !x.startsWith("-"));
    if (!pkgs.length) return E("pip install: укажи пакет, например  pip install requests");
    for (const p of pkgs) {
      const name = p
        .split(/[=<>~!]/)[0]
        .trim()
        .toLowerCase();
      if (name && !py.pkgs.includes(name)) py.pkgs.push(name);
    }
    const tail = py.venv
      ? ""
      : "\n(venv не активирован — пакет ушёл в системный Python; так делать не стоит)";
    return O("Successfully installed " + pkgs.join(" ") + tail);
  }

  if (sub === "list" || sub === "freeze") {
    if (!py.pkgs.length) return O(sub === "freeze" ? "" : "Пакеты не установлены");
    return O(
      py.pkgs
        .map((p) => {
          const v = PKG_VER[p] || "1.0.0";
          return sub === "freeze" ? `${p}==${v}` : `${p.padEnd(12)} ${v}`;
        })
        .join("\n"),
    );
  }

  if (sub === "--version" || sub === "-V") return O("pip 24.0 (python 3.11)");
  return E("pip: в тренажёре поддерживается  install | list | freeze");
}

def("pip", (a, w) => pipMain(a, w));
def("pip3", (a, w) => pipMain(a, w));

/* ─────────────────────────── python ─────────────────────────── */

/** Вычисляет простейший print(): убирает кавычки, склеивает строковые куски. */
function evalPrint(expr: string): string {
  return expr
    .split(",")
    .map((s) => s.trim().replace(/^[frbu]*(['"])(.*)\1$/s, "$2"))
    .join(" ");
}

function runVenv(a: string[], w: World): CmdResult {
  const py = pyInit(w);
  const target = a[a.indexOf("venv") + 1] || ".venv";
  mkdirp(w, resolvePath(w, target));
  py.venv = true;
  return O(
    "Виртуальное окружение создано в " + target + "\nАктивируй его:  source " + target + "/bin/activate",
  );
}

/**
 * «Запуск» python-скрипта: разбирает исходник и по узнаваемым для DevOps
 * конструкциям (json.load, requests, argparse, subprocess, sys.exit) выдаёт
 * правдоподобный вывод и код возврата. Это тренажёр, а не интерпретатор.
 */
function analyze(src: string, args: string[], w: World): { out: string; code: number } {
  const out: string[] = [];
  const usesArgparse = /argparse/.test(src);
  const usesRequests = /requests\.(get|post|head|put|delete)\(/.test(src);
  const usesSubprocess = /subprocess\.(run|check_output|call|Popen)\(/.test(src);
  const guarded = /\btry\s*:/.test(src);

  /* argparse: разбор аргументов командной строки */
  if (usesArgparse) {
    if (args.includes("-h") || args.includes("--help")) {
      const opts = [...src.matchAll(/add_argument\(\s*["'](--[\w-]+)["']/g)].map((m) => m[1]);
      return {
        out: "usage: script [-h] " + opts.map((o) => `[${o} ${o.replace(/-/g, "").toUpperCase()}]`).join(" "),
        code: 0,
      };
    }
    const required = [...src.matchAll(/add_argument\(\s*["'](--[\w-]+)["'][^\n]*required\s*=\s*True/g)].map(
      (m) => m[1],
    );
    const missing = required.filter((r) => !args.some((x) => x === r || x.startsWith(r + "=")));
    if (missing.length)
      return {
        out:
          "usage: script [-h] ...\nscript: error: the following arguments are required: " +
          missing.join(", "),
        code: 2,
      };
  }

  /* json.load: чтение структурированного конфига */
  if (/json\.load[s]?\(/.test(src)) {
    const opened = (src.match(/open\(\s*["']([^"']+)["']/) || [])[1];
    if (opened) {
      const txt = readFile(w, resolvePath(w, opened));
      if (txt == null) {
        if (guarded || /except\s+FileNotFoundError/.test(src))
          out.push("конфиг " + opened + " не найден — берём значения по умолчанию");
        else
          return {
            out:
              "Traceback (most recent call last):\nFileNotFoundError: [Errno 2] No such file or directory: '" +
              opened +
              "'",
            code: 1,
          };
      } else {
        let keys: string[] = [];
        try {
          const parsed = JSON.parse(txt);
          keys = parsed && typeof parsed === "object" ? Object.keys(parsed) : [];
        } catch {
          return {
            out:
              "Traceback (most recent call last):\njson.decoder.JSONDecodeError: " +
              opened +
              " — это не валидный JSON",
            code: 1,
          };
        }
        out.push(`конфиг ${opened} прочитан, ключей: ${keys.length} (${keys.join(", ")})`);
      }
    }
  }

  /* requests: HTTP-проверка сервиса */
  if (usesRequests) {
    if (!w.py?.pkgs.includes("requests"))
      return {
        out: "Traceback (most recent call last):\nModuleNotFoundError: No module named 'requests'  —  pip install requests",
        code: 1,
      };
    const url =
      (src.match(/requests\.\w+\(\s*f?["']([^"']+)["']/) || [])[1] ||
      (src.match(/\burl\s*=\s*f?["']([^"']+)["']/) || [])[1] ||
      "http://localhost:8080/health";
    const hasTimeout = /requests\.\w+\([^)]*\btimeout\s*=/.test(src) || /\btimeout\s*=\s*\d/.test(src);
    if (!hasTimeout)
      out.push(
        "⚠  запрос без timeout= — если сервис зависнет, скрипт будет ждать вечно (крон не завершится)",
      );
    if (DOWN.test(url)) {
      const exitLine = (src.match(/sys\.exit\(\s*(\d+)\s*\)/) || [])[1];
      if (guarded || /except\s+[\w.]*(RequestException|ConnectionError|Timeout)/.test(src)) {
        out.push(`сервис ${url} недоступен: Connection refused — исключение поймано`);
        out.push("выходим с кодом " + (exitLine || "1"));
        return { out: out.join("\n"), code: exitLine ? Number(exitLine) : 1 };
      }
      out.push("Traceback (most recent call last):");
      out.push("requests.exceptions.ConnectionError: не удалось подключиться к " + url);
      return { out: out.join("\n"), code: 1 };
    }
    out.push("GET " + url + " -> 200 OK");
    if (/raise_for_status\(\)/.test(src)) out.push("raise_for_status(): статус 2xx, всё в порядке");
  }

  /* subprocess: вызов внешних команд */
  if (usesSubprocess) {
    const listForm = /subprocess\.\w+\(\s*\[/.test(src);
    if (/shell\s*=\s*True/.test(src) && /f["']/.test(src))
      out.push(
        "⚠  shell=True с f-строкой — инъекция команд: чужой ввод попадёт прямо в shell. Передавай список аргументов без shell=True.",
      );
    if (listForm) {
      const bin = (src.match(/subprocess\.\w+\(\s*\[\s*["']([^"']+)["']/) || [])[1] || "cmd";
      out.push(`$ ${bin} … -> код 0`);
    } else if (/shell\s*=\s*True/.test(src)) {
      out.push("выполнено через shell -> код 0");
    }
    if (/check\s*=\s*True/.test(src))
      out.push("check=True: ненулевой код внешней команды поднял бы CalledProcessError");
  }

  /* «голый» скрипт: print() и sys.exit() как демонстрация кодов возврата */
  if (!usesArgparse && !usesRequests && !usesSubprocess) {
    for (const m of src.matchAll(/print\(\s*([^)]*)\)/g)) out.push(evalPrint(m[1]));
    const ec = (src.match(/sys\.exit\(\s*(\d+)\s*\)/) || [])[1];
    if (ec && Number(ec) !== 0) {
      out.push("скрипт завершился с кодом " + ec);
      return { out: out.join("\n"), code: Number(ec) };
    }
  }

  if (!out.length) out.push("(скрипт отработал, вывода нет)");
  return { out: out.join("\n"), code: 0 };
}

function pythonMain(a: string[], w: World, _stdin: string | null, raw: string[]): CmdResult {
  const py = pyInit(w);

  if (a[0] === "-m") {
    if (a[1] === "venv") return runVenv(a, w);
    if (a[1] === "pip") return pipMain(a.slice(2), w);
    return E("python -m: в тренажёре поддерживается только  -m venv  и  -m pip");
  }
  if (a[0] === "-c") {
    const code = raw
      .slice(1)
      .join(" ")
      .replace(/^['"]|['"]$/g, "");
    const m = code.match(/print\(\s*([^)]*)\)/);
    return O(m ? evalPrint(m[1]) : "");
  }
  if (a[0] === "--version" || a[0] === "-V") return O("Python 3.11.7");
  if (!a[0]) return E("python3: укажи файл скрипта, например  python3 healthcheck.py");

  const fileArg = a[0];
  const src = readFile(w, resolvePath(w, fileArg));
  if (src == null)
    return {
      out: "python3: can't open file '" + fileArg + "': [Errno 2] No such file or directory",
      code: 2,
      err: true,
    };

  const res = analyze(src, a.slice(1), w);
  if (res.code === 0) py.ran += 1;
  return res.code === 0 ? O(res.out) : { out: res.out, code: res.code, err: true };
}

def("python", pythonMain);
def("python3", pythonMain);
