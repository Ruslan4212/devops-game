import { def, E, O } from "./registry";
import { copyNode, getNode, mkdirp, parentOf, resolvePath, splitPath, writeFile } from "../engine/vfs";
import type { DirNode, FSNode } from "../engine/types";

/** Метка, по которой отличаем «настоящий» файл от заархивированного нашим tar. */
const TAR_MAGIC = "##TARBALL_V1##";

def("tar", (a, w) => {
  const flagsTok = a.find((x) => x.startsWith("-")) || "";
  const fIdx = a.indexOf(flagsTok);
  const archiveArg = fIdx >= 0 ? a[fIdx + 1] : null;
  if (!archiveArg) return E("tar: укажи имя архива, например: tar -czf backup.tar.gz /var/www");
  const archiveAbs = resolvePath(w, archiveArg);

  if (flagsTok.includes("c")) {
    const sources = a.slice(fIdx + 2).filter((x) => !x.startsWith("-"));
    if (!sources.length) return E("tar: укажи, что архивировать");
    const entries: Record<string, FSNode> = {};
    for (const src of sources) {
      const abs = resolvePath(w, src);
      const node = getNode(w, abs);
      if (!node) return E("tar: " + src + ": Нет такого файла или каталога");
      entries[splitPath(abs).pop() || src] = copyNode(node);
    }
    const [dir] = parentOf(archiveAbs);
    mkdirp(w, dir);
    writeFile(w, archiveAbs, TAR_MAGIC + JSON.stringify(entries));
    return O(sources.join("\n"));
  }

  if (flagsTok.includes("x")) {
    const archiveNode = getNode(w, archiveAbs);
    if (!archiveNode || archiveNode.type !== "file" || !archiveNode.content.startsWith(TAR_MAGIC))
      return E("tar: " + archiveArg + ": не является архивом (или он повреждён)");
    const cIdx = a.indexOf("-C");
    const destDir = cIdx >= 0 && a[cIdx + 1] ? resolvePath(w, a[cIdx + 1]) : w.cwd;
    mkdirp(w, destDir);
    const entries: Record<string, FSNode> = JSON.parse(archiveNode.content.slice(TAR_MAGIC.length));
    const destNode = getNode(w, destDir) as DirNode;
    for (const [name, node] of Object.entries(entries)) destNode.children[name] = copyNode(node);
    return O(Object.keys(entries).join("\n"));
  }

  return E("tar: используй -czf АРХИВ ИСТОЧНИКИ… для создания или -xzf АРХИВ для распаковки");
});

def("rsync", (a, w) => {
  const pos = a.filter((x) => !x.startsWith("-"));
  if (pos.length < 2) return E("rsync: нужно: rsync -a ИСТОЧНИК НАЗНАЧЕНИЕ");
  const [srcArg, dstArg] = pos;
  const srcAbs = resolvePath(w, srcArg.replace(/\/+$/, ""));
  const src = getNode(w, srcAbs);
  if (!src) return E("rsync: " + srcArg + ": Нет такого файла или каталога");

  if (src.type === "dir") {
    // упрощаем реальное поведение rsync (слэш в конце источника меняет смысл) до самого частого
    // учебного случая: «скопировать содержимое каталога внутрь каталога назначения»
    const dstAbs = resolvePath(w, dstArg);
    mkdirp(w, dstAbs);
    const dst = getNode(w, dstAbs) as DirNode;
    for (const [name, node] of Object.entries(src.children)) dst.children[name] = copyNode(node);
  } else {
    let dstAbs = resolvePath(w, dstArg);
    const dstNode = getNode(w, dstAbs);
    if (dstNode && dstNode.type === "dir")
      dstAbs = dstAbs.replace(/\/+$/, "") + "/" + splitPath(srcAbs).pop();
    const [dir, name] = parentOf(dstAbs);
    mkdirp(w, dir);
    const par = getNode(w, dir) as DirNode;
    par.children[name] = copyNode(src);
  }
  return O("sending incremental file list\n" + srcArg + " -> " + dstArg + "\n\nsent — синхронизировано");
});
