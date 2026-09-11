import { CMDS } from "../commands";
import { getNode, readFile, resolvePath, writeFile } from "./vfs";
import type { CmdResult, World } from "./types";

export const ok = (out = ""): CmdResult => ({ out, code: 0 });
export const fail = (out: string): CmdResult => ({ out, code: 1, err: true });

export function tokenize(s: string): string[] {
  const out: string[] = [];
  let cur = "",
    q: string | null = null;
  for (const c of s) {
    if (q) {
      if (c === q) q = null;
      else cur += c;
      continue;
    }
    if (c === '"' || c === "'") {
      q = c;
      continue;
    }
    if (/\s/.test(c)) {
      if (cur) {
        out.push(cur);
        cur = "";
      }
      continue;
    }
    cur += c;
  }
  if (cur) out.push(cur);
  return out;
}

export function expand(w: World, s: string): string {
  return s.replace(/\$\{(\w+)\}|\$(\w+)|\$\?|\$#/g, (m, a, b) => {
    if (m === "$?") return String(w.code);
    if (m === "$#") return w.env["#"] !== undefined ? w.env["#"] : "0";
    const k = a || b;
    return w.env[k] !== undefined ? w.env[k] : "";
  });
}

/**
 * Запуск bash-скрипта: проверяет шебанг и бит выполнения — как настоящая система.
 *
 * args становятся позиционными параметрами $1.."9" и $# на время выполнения (как в
 * настоящем bash). Строка  set -e / set -euo pipefail  включает «останавливаться на
 * первой ошибке» — тогда команда с ненулевым кодом обрывает скрипт, и его итоговый код
 * возврата становится ненулевым. Строка  exit N  тоже завершает скрипт с кодом N.
 * Без set -e и exit поведение ровно то же, что было раньше: скрипт всегда «успешен»
 * (код 0), даже если какая-то команда внутри вернула ошибку — это осознанное упрощение
 * для ранних актов, которые ещё не разбирают коды возврата.
 */
export function runScript(w: World, abs: string, args: string[] = []): CmdResult {
  const n = getNode(w, abs);
  if (!n || n.type !== "file") return fail("bash: " + abs + ": Нет такого файла");
  if (!/x/.test(n.mode.slice(0, 3)))
    return fail("bash: " + abs + ": Отказано в доступе — файл не исполняемый (chmod +x)");
  if (!/^#!/.test(n.content))
    return fail("bash: " + abs + ": нет строки-шебанга (#!/bin/bash) — система не знает, чем запускать");
  const lines = n.content
    .split("\n")
    .slice(1)
    .filter((l) => l.trim() && !l.trim().startsWith("#"));

  const argKeys = [...args.map((_, i) => String(i + 1)), "#"];
  const savedEnv: Record<string, string | undefined> = {};
  for (const k of argKeys) savedEnv[k] = w.env[k];
  args.forEach((a, i) => (w.env[String(i + 1)] = a));
  w.env["#"] = String(args.length);

  let strict = false;
  let failCode: number | null = null;
  const out: string[] = [];
  for (const raw of lines) {
    const l = raw.trim();
    if (/^set\s+-\w*e/.test(l)) {
      strict = true;
      continue;
    }
    const r = execLine(w, l, { record: false });
    if (r.out) out.push(r.out);
    if (r.exitCalled !== undefined) {
      failCode = r.exitCalled;
      break;
    }
    // как в настоящем bash: неуспех — это часть && / || цепочки (проверка условия), а не
    // «настоящая» ошибка строки — set -e не должен обрывать скрипт на самом [ -z "$1" ]
    const isGuardLine = /&&|\|\|/.test(l);
    if (strict && !isGuardLine && (r.code || 0) !== 0) {
      out.push("bash: строка «" + l + "» завершилась с ошибкой — скрипт остановлен (set -e)");
      failCode = r.code || 0;
      break;
    }
  }

  for (const k of argKeys) {
    if (savedEnv[k] === undefined) delete w.env[k];
    else w.env[k] = savedEnv[k];
  }
  w.scriptRan = (w.scriptRan || 0) + 1;
  if (failCode != null && failCode !== 0) return { out: out.join("\n"), code: failCode, err: true };
  return ok(out.join("\n"));
}

function runOne(w: World, seg: string, stdin: string | null): CmdResult {
  let toks = tokenize(seg).map((t) => expand(w, t));
  if (!toks.length) return ok();
  w.sudo = false;
  if (toks[0] === "sudo") {
    w.sudo = true;
    toks = toks.slice(1);
    if (!toks.length) return fail("sudo: нужна команда");
  }
  const name = toks[0];
  const args = toks.slice(1);
  const rawArgs = tokenize(seg)
    .slice(w.sudo ? 2 : 1)
    .map((t) => expand(w, t));

  if (name.startsWith("./") || name.startsWith("/")) {
    const abs = resolvePath(w, name);
    if (getNode(w, abs)) return runScript(w, abs, args);
    return fail("bash: " + name + ": Нет такого файла или каталога");
  }
  if (name === "bash" || name === "sh") {
    if (!args[0]) return fail("bash: укажи скрипт");
    return runScript(w, resolvePath(w, args[0]), args.slice(1));
  }
  const fn = CMDS[name];
  if (!fn)
    return fail("bash: " + name + ": команда не найдена. Набери help — там команды для текущего задания.");
  try {
    return fn(args, w, stdin, rawArgs);
  } catch (e) {
    return fail("ошибка выполнения: " + (e as Error).message);
  }
}

/** Разбивает строку на сегменты по `&&`/`||`, храня оператор, что идёт ПОСЛЕ сегмента. */
function splitChain(line: string): { seg: string; op: "&&" | "||" | null }[] {
  const parts = line.split(/(&&|\|\|)/);
  const out: { seg: string; op: "&&" | "||" | null }[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    out.push({ seg: (parts[i] ?? "").trim(), op: (parts[i + 1] as "&&" | "||" | undefined) ?? null });
  }
  return out;
}

/** Один конвейер: команды через `|`, с необязательным перенаправлением `>` / `>>` в конце. */
function execPipeline(w: World, line: string): CmdResult {
  let redir: { mode: string; file: string } | null = null;
  const rm = line.match(/\s(>>|>)\s*(\S+)\s*$/);
  if (rm) {
    redir = { mode: rm[1], file: rm[2] };
    line = line.slice(0, rm.index);
  }

  const segs = line
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
  let stdin: string | null = null;
  let res: CmdResult = ok();
  for (const s of segs) {
    res = runOne(w, s, stdin);
    if (res.clear || res.hint || res.edit || res.restart || res.exitCalled !== undefined) return res;
    stdin = res.out;
  }

  if (redir && !res.err) {
    const abs = resolvePath(w, redir.file);
    const prev = redir.mode === ">>" ? readFile(w, abs) || "" : "";
    writeFile(w, abs, prev + (res.out || "") + "\n");
    res = ok();
  }
  return res;
}

/**
 * Разбирает строку целиком: `&&` / `||` между командами (короткое замыкание, как в
 * настоящем bash — [ -z "$1" ] && echo "нет аргумента"), внутри каждого сегмента —
 * конвейеры `|` и перенаправление `>` / `>>`.
 * record=false используется при запуске скриптов, чтобы их внутренние
 * команды не засоряли историю, по которой проверяются задачи.
 */
export function execLine(w: World, line: string, opts: { record?: boolean } = {}): CmdResult {
  const record = opts.record !== false;
  line = line.trim();
  if (!line) return ok();

  const chain = /&&|\|\|/.test(line) ? splitChain(line) : [{ seg: line, op: null as "&&" | "||" | null }];
  // каждая выполненная команда цепочки печатает своё — как в настоящем терминале,
  // поэтому вывод копим по всем сегментам, а не берём только последний
  const outs: string[] = [];
  let res: CmdResult = ok();
  for (const { seg, op } of chain) {
    if (!seg) continue;
    res = execPipeline(w, seg);
    if (res.out) outs.push(res.out);
    if (res.clear || res.hint || res.edit || res.restart || res.exitCalled !== undefined) {
      if (record) w.log.push({ cmd: line, code: res.code || 0 });
      return { ...res, out: outs.join("\n") };
    }
    w.code = res.code || 0;
    if (op === "&&" && res.code !== 0) break;
    if (op === "||" && res.code === 0) break;
  }

  w.code = res.code || 0;
  if (record) w.log.push({ cmd: line, code: w.code });
  return { ...res, out: outs.join("\n") };
}
