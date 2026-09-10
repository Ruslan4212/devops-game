import { def, E, O } from "./registry";
import { readFile, resolvePath } from "../engine/vfs";
import { escapeRegex } from "../engine/regex";

const linesOf = (c: string): string[] => c.split("\n").filter((x, i, ar) => i < ar.length - 1 || x !== "");

def("echo", (_a, _w, _stdin, raw) => O(raw.join(" ")));

def("head", (a, w, stdin) => {
  let n = 10;
  const i = a.indexOf("-n");
  if (i >= 0) n = Number(a[i + 1]) || 10;
  const f = a.filter((x) => !x.startsWith("-") && x !== String(n))[0];
  const c = f ? readFile(w, resolvePath(w, f)) : stdin;
  if (c == null) return E("head: " + (f || "") + ": нет входных данных");
  return O(c.split("\n").slice(0, n).join("\n"));
});

def("tail", (a, w, stdin) => {
  let n = 10;
  const i = a.indexOf("-n");
  if (i >= 0) n = Number(a[i + 1]) || 10;
  const f = a.filter((x) => !x.startsWith("-") && x !== String(n))[0];
  const c = f ? readFile(w, resolvePath(w, f)) : stdin;
  if (c == null) return E("tail: " + (f || "") + ": нет входных данных");
  return O(linesOf(c).slice(-n).join("\n"));
});

def("wc", (a, w, stdin) => {
  const f = a.filter((x) => !x.startsWith("-"))[0];
  const c = f ? readFile(w, resolvePath(w, f)) : stdin;
  if (c == null) return E("wc: нет входных данных");
  const lines = linesOf(c).length;
  if (a.includes("-l")) return O(String(lines) + (f ? " " + f : ""));
  const words = c.split(/\s+/).filter(Boolean).length;
  return O(lines + " " + words + " " + c.length + (f ? " " + f : ""));
});

def("grep", (a, w, stdin) => {
  const flags = a.filter((x) => x.startsWith("-")).join("");
  const rest = a.filter((x) => !x.startsWith("-"));
  const pat = rest[0];
  const files = rest.slice(1);
  if (!pat) return E("grep: нужен шаблон поиска");
  const rx = new RegExp(escapeRegex(pat), flags.includes("i") ? "i" : "");
  const scan = (text: string, label: string): string[] =>
    text
      .split("\n")
      .map((l, i) => ({ l, i }))
      .filter((x) => rx.test(x.l))
      .map((x) => (label ? label + ":" : "") + (flags.includes("n") ? x.i + 1 + ":" : "") + x.l);

  let res: string[] = [];
  if (!files.length) {
    if (stdin == null) return E("grep: нет входных данных");
    res = scan(stdin, "");
  } else {
    for (const f of files) {
      const c = readFile(w, resolvePath(w, f));
      if (c == null) return E("grep: " + f + ": Нет такого файла");
      res = res.concat(scan(c, files.length > 1 ? f : ""));
    }
  }
  return { out: res.join("\n"), code: res.length ? 0 : 1 };
});

def("sort", (_a, _w, stdin) => O((stdin || "").split("\n").filter(Boolean).sort().join("\n")));

def("uniq", (_a, _w, stdin) => {
  const L = (stdin || "").split("\n").filter(Boolean);
  const seen: string[] = [];
  for (const l of L) if (seen[seen.length - 1] !== l) seen.push(l);
  return O(seen.join("\n"));
});
