import { def, E, O } from "./registry";
import { copyNode, getNode, parentOf, resolvePath, splitPath } from "../engine/vfs";
import { escapeRegex } from "../engine/regex";
import type { DirNode, FSNode } from "../engine/types";

def("cp", (a, w) => {
  const ps = a.filter((x) => !x.startsWith("-"));
  if (ps.length < 2) return E("cp: нужно: cp ИСТОЧНИК НАЗНАЧЕНИЕ");
  const src = getNode(w, resolvePath(w, ps[0]));
  if (!src) return E("cp: " + ps[0] + ": Нет такого файла");
  let dst = resolvePath(w, ps[1]);
  const dn = getNode(w, dst);
  if (dn && dn.type === "dir") dst = dst.replace(/\/$/, "") + "/" + splitPath(ps[0]).pop();
  const [pp, name] = parentOf(dst);
  const par = getNode(w, pp);
  if (!par || par.type !== "dir") return E("cp: " + ps[1] + ": нет каталога назначения");
  par.children[name] = copyNode(src);
  return O();
});

def("mv", (a, w) => {
  const ps = a.filter((x) => !x.startsWith("-"));
  if (ps.length < 2) return E("mv: нужно: mv ИСТОЧНИК НАЗНАЧЕНИЕ");
  const sAbs = resolvePath(w, ps[0]);
  const src = getNode(w, sAbs);
  if (!src) return E("mv: " + ps[0] + ": Нет такого файла");
  let dst = resolvePath(w, ps[1]);
  const dn = getNode(w, dst);
  if (dn && dn.type === "dir") dst = dst.replace(/\/$/, "") + "/" + splitPath(ps[0]).pop();
  const [pp, name] = parentOf(dst);
  const par = getNode(w, pp);
  if (!par || par.type !== "dir") return E("mv: нет каталога назначения");
  par.children[name] = src;
  const [sp, sn] = parentOf(sAbs);
  delete (getNode(w, sp) as DirNode).children[sn];
  return O();
});

def("find", (a, w) => {
  const root = resolvePath(w, a[0] && !a[0].startsWith("-") ? a[0] : ".");
  const i = a.indexOf("-name");
  const pat = i >= 0 ? a[i + 1] : null;
  // экранируем всё, затем возвращаем `*` его смысл маски: экранированная `\*` -> `.*`
  const rx = pat ? new RegExp("^" + escapeRegex(pat).replace(/\\\*/g, ".*") + "$") : null;
  const res: string[] = [];
  const walk = (node: FSNode | null, path: string): void => {
    if (!node) return;
    if (!rx || rx.test(splitPath(path).pop() || "/")) res.push(path);
    if (node.type === "dir")
      for (const k of Object.keys(node.children).sort())
        walk(node.children[k], path === "/" ? "/" + k : path + "/" + k);
  };
  walk(getNode(w, root), root);
  return O(res.join("\n"));
});

def("chmod", (a, w) => {
  const ps = a.filter((x) => !x.startsWith("-"));
  if (ps.length < 2) return E("chmod: нужно: chmod ПРАВА ФАЙЛ");
  const [m, f] = ps;
  const n = getNode(w, resolvePath(w, f));
  if (!n) return E("chmod: " + f + ": Нет такого файла");
  if (n.type !== "file") return E("chmod: " + f + ": это каталог");
  const map: Record<string, string> = {
    "7": "rwx",
    "6": "rw-",
    "5": "r-x",
    "4": "r--",
    "3": "-wx",
    "2": "-w-",
    "1": "--x",
    "0": "---",
  };
  if (/^[0-7]{3}$/.test(m))
    n.mode = m
      .split("")
      .map((d) => map[d])
      .join("");
  else if (/\+x/.test(m)) n.mode = n.mode.replace(/^(..)./, "$1x");
  else return E("chmod: непонятные права: " + m);
  return O();
});

def("chown", (a, w) => {
  const ps = a.filter((x) => !x.startsWith("-"));
  if (ps.length < 2) return E("chown: нужно: chown ВЛАДЕЛЕЦ ФАЙЛ");
  const n = getNode(w, resolvePath(w, ps[1]));
  if (!n) return E("chown: " + ps[1] + ": Нет такого файла");
  if (!w.sudo) return E("chown: изменение владельца: Операция не позволена (нужен sudo)");
  if (n.type === "file") n.owner = ps[0].split(":")[0];
  return O();
});
