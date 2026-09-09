import { def, E, O } from "./registry";
import { copyNode, dir, getNode, mkdirp, parentOf, readFile, resolvePath, splitPath, writeFile } from "../engine/vfs";
import type { DirNode, FSNode } from "../engine/types";

def("pwd", (_a, w) => O(w.cwd));

def("cd", (a, w) => {
  const t = resolvePath(w, a[0] || w.env.HOME);
  const n = getNode(w, t);
  if (!n) return E("cd: " + (a[0] || "") + ": Нет такого файла или каталога");
  if (n.type !== "dir") return E("cd: " + a[0] + ": Это не каталог");
  w.cwd = t;
  return O();
});

def("ls", (a, w) => {
  const flags = a.filter((x) => x.startsWith("-")).join("");
  const paths = a.filter((x) => !x.startsWith("-"));
  const t = resolvePath(w, paths[0] || ".");
  const n = getNode(w, t);
  if (!n) return E("ls: " + (paths[0] || ".") + ": Нет такого файла или каталога");
  if (n.type === "file") return O(paths[0]);
  let names = Object.keys(n.children).sort();
  if (!flags.includes("a")) names = names.filter((x) => !x.startsWith("."));
  if (!names.length) return O();
  if (flags.includes("l")) {
    const rows = names.map((nm) => {
      const c = n.children[nm];
      const mode = (c.type === "dir" ? "d" : "-") + (c.type === "dir" ? "rwxr-xr-x" : c.mode);
      const size = c.type === "dir" ? 4096 : c.content.length;
      const own = (c.type === "file" && c.owner) || w.user;
      return mode + "  " + own.padEnd(7) + " " + String(size).padStart(6) + "  " + nm + (c.type === "dir" ? "/" : "");
    });
    return O("итого " + names.length + "\n" + rows.join("\n"));
  }
  return O(names.map((nm) => (n.children[nm].type === "dir" ? nm + "/" : nm)).join("  "));
});

def("mkdir", (a, w) => {
  const ps = a.filter((x) => !x.startsWith("-"));
  if (!ps.length) return E("mkdir: не указан каталог");
  for (const p of ps) {
    const abs = resolvePath(w, p);
    if (a.includes("-p")) { mkdirp(w, abs); continue; }
    const [pp, name] = parentOf(abs);
    const par = getNode(w, pp);
    if (!par || par.type !== "dir") return E("mkdir: " + p + ": нет родительского каталога (попробуй -p)");
    if (par.children[name]) return E("mkdir: " + p + ": уже существует");
    par.children[name] = dir();
  }
  return O();
});

def("touch", (a, w) => {
  for (const p of a.filter((x) => !x.startsWith("-"))) {
    const abs = resolvePath(w, p);
    if (!getNode(w, abs) && !writeFile(w, abs, "")) return E("touch: " + p + ": нет каталога");
  }
  return O();
});

def("rm", (a, w) => {
  const ps = a.filter((x) => !x.startsWith("-"));
  const rec = a.some((x) => /^-.*r/.test(x));
  for (const p of ps) {
    const abs = resolvePath(w, p);
    const n = getNode(w, abs);
    if (!n) return E("rm: " + p + ": Нет такого файла или каталога");
    if (n.type === "dir" && !rec) return E("rm: " + p + ": это каталог (нужен ключ -r)");
    const [pp, name] = parentOf(abs);
    delete (getNode(w, pp) as DirNode).children[name];
  }
  return O();
});

def("cat", (a, w, stdin) => {
  const fs = a.filter((x) => !x.startsWith("-"));
  if (!fs.length) return O(stdin || "");
  const out: string[] = [];
  for (const f of fs) {
    const c = readFile(w, resolvePath(w, f));
    if (c == null) return E("cat: " + f + ": Нет такого файла или каталога");
    out.push(c);
  }
  return O(out.join(""));
});
