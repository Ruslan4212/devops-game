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
  return s.replace(/\$\{(\w+)\}|\$(\w+)|\$\?/g, (m, a, b) => {
    if (m === "$?") return String(w.code);
    const k = a || b;
    return w.env[k] !== undefined ? w.env[k] : "";
  });
}

/** Запуск bash-скрипта: проверяет шебанг и бит выполнения — как настоящая система. */
export function runScript(w: World, abs: string): CmdResult {
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
  const out: string[] = [];
  for (const l of lines) {
    const r = execLine(w, l, { record: false });
    if (r.out) out.push(r.out);
  }
  w.scriptRan = (w.scriptRan || 0) + 1;
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
    if (getNode(w, abs)) return runScript(w, abs);
    return fail("bash: " + name + ": Нет такого файла или каталога");
  }
  if (name === "bash" || name === "sh") {
    if (!args[0]) return fail("bash: укажи скрипт");
    return runScript(w, resolvePath(w, args[0]));
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

/**
 * Разбирает строку целиком: конвейеры `|` и перенаправление `>` / `>>`.
 * record=false используется при запуске скриптов, чтобы их внутренние
 * команды не засоряли историю, по которой проверяются задачи.
 */
export function execLine(w: World, line: string, opts: { record?: boolean } = {}): CmdResult {
  const record = opts.record !== false;
  line = line.trim();
  if (!line) return ok();

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
    if (res.clear || res.hint || res.edit || res.restart) {
      if (record) w.log.push({ cmd: line.trim(), code: res.code || 0 });
      return res;
    }
    stdin = res.out;
  }

  if (redir && !res.err) {
    const abs = resolvePath(w, redir.file);
    const prev = redir.mode === ">>" ? readFile(w, abs) || "" : "";
    writeFile(w, abs, prev + (res.out || "") + "\n");
    res = ok();
  }

  w.code = res.code || 0;
  if (record) w.log.push({ cmd: (rm ? line + " " + rm[0].trim() : line).trim(), code: w.code });
  return res;
}
