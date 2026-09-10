import type { DirNode, FileNode, FSNode, World } from "./types";

export const dir = (children: Record<string, FSNode> = {}): DirNode => ({ type: "dir", children });
export const file = (content = "", mode = "rw-r--r--"): FileNode => ({ type: "file", content, mode });

export const splitPath = (p: string): string[] => p.split("/").filter(Boolean);

export function resolvePath(w: World, p?: string): string {
  if (!p) p = ".";
  p = p.replace(/^~(?=$|\/)/, w.env.HOME);
  const parts = p.startsWith("/") ? [] : splitPath(w.cwd);
  for (const seg of splitPath(p)) {
    if (seg === ".") continue;
    if (seg === "..") {
      parts.pop();
      continue;
    }
    parts.push(seg);
  }
  return "/" + parts.join("/");
}

export function getNode(w: World, abs: string): FSNode | null {
  let n: FSNode = w.fs;
  for (const seg of splitPath(abs)) {
    if (n.type !== "dir" || !n.children[seg]) return null;
    n = n.children[seg];
  }
  return n;
}

export function parentOf(abs: string): [string, string] {
  const p = splitPath(abs);
  const name = p.pop() as string;
  return ["/" + p.join("/"), name];
}

export function mkdirp(w: World, abs: string): boolean {
  let n: DirNode = w.fs;
  for (const seg of splitPath(abs)) {
    if (!n.children[seg]) n.children[seg] = dir();
    const next = n.children[seg];
    if (next.type !== "dir") return false;
    n = next;
  }
  return true;
}

export function writeFile(w: World, abs: string, content: string): boolean {
  const [pp, name] = parentOf(abs);
  const par = getNode(w, pp);
  if (!par || par.type !== "dir") return false;
  const existing = par.children[name];
  if (existing && existing.type === "file") existing.content = content;
  else par.children[name] = file(content);
  return true;
}

export function readFile(w: World, abs: string): string | null {
  const n = getNode(w, abs);
  return n && n.type === "file" ? n.content : null;
}

export function copyNode(n: FSNode): FSNode {
  return n.type === "dir"
    ? {
        type: "dir",
        children: Object.fromEntries(Object.entries(n.children).map(([k, v]) => [k, copyNode(v)])),
      }
    : { type: "file", content: n.content, mode: n.mode, owner: n.owner };
}

export function shortCwd(w: World): string {
  if (w.cwd === w.env.HOME) return "~";
  if (w.cwd.startsWith(w.env.HOME + "/")) return "~" + w.cwd.slice(w.env.HOME.length);
  return w.cwd;
}
