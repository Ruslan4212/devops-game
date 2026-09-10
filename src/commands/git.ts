import { def, E, O } from "./registry";
import { getNode, mkdirp, resolvePath } from "../engine/vfs";
import { runPipeline } from "./ci";
import type { DirNode } from "../engine/types";

const hash = (): string => Math.random().toString(16).slice(2, 9);

def("git", (a, w) => {
  const [sub, ...rest] = a;

  if (sub === "init") {
    if (w.git) return O("Существующий репозиторий Git переинициализирован");
    w.git = { branch: "main", branches: ["main"], staged: [], commits: [], remote: null, pushed: 0 };
    mkdirp(w, resolvePath(w, ".git"));
    return O("Инициализирован пустой репозиторий Git в " + w.cwd + "/.git/");
  }

  const g = w.git;
  if (!g) return E("fatal: не является репозиторием git (сначала git init)");

  if (sub === "status") {
    const cur = getNode(w, w.cwd) as DirNode | null;
    const files = cur ? Object.keys(cur.children).filter((k) => k !== ".git") : [];
    const tracked = g.commits.flatMap((c) => c.files);
    const untracked = files.filter((f) => !g.staged.includes(f) && !tracked.includes(f));
    return O(
      "На ветке " +
        g.branch +
        "\n" +
        (g.staged.length
          ? "\nИзменения, которые будут закоммичены:\n" +
            g.staged.map((f) => "        новый файл:   " + f).join("\n") +
            "\n"
          : "") +
        (untracked.length
          ? "\nНеотслеживаемые файлы:\n" +
            untracked.map((f) => "        " + f).join("\n") +
            '\n\nничего не добавлено, но есть неотслеживаемые файлы (используйте "git add")'
          : g.staged.length
            ? ""
            : "нечего коммитить, рабочий каталог чист"),
    );
  }

  if (sub === "add") {
    const cur = getNode(w, w.cwd) as DirNode | null;
    let files = rest.filter((x) => !x.startsWith("-"));
    if (files.includes(".") || rest.includes("-A"))
      files = cur ? Object.keys(cur.children).filter((k) => k !== ".git") : [];
    for (const f of files) if (!g.staged.includes(f)) g.staged.push(f);
    return O();
  }

  if (sub === "commit") {
    const i = rest.indexOf("-m");
    const msg = i >= 0 ? rest[i + 1] : null;
    if (!msg) return E('git: нужен текст коммита: git commit -m "описание"');
    if (!g.staged.length) return E("nothing to commit — сначала git add");
    g.commits.push({ msg, files: [...g.staged], branch: g.branch, hash: hash() });
    const n = g.staged.length;
    g.staged = [];
    return O(
      "[" +
        g.branch +
        " " +
        g.commits[g.commits.length - 1].hash +
        "] " +
        msg +
        "\n " +
        n +
        " файл(ов) изменено",
    );
  }

  if (sub === "log") {
    if (!g.commits.length) return E("fatal: у текущей ветки нет коммитов");
    return O(
      [...g.commits]
        .reverse()
        .map((c) => c.hash + " " + c.msg)
        .join("\n"),
    );
  }

  if (sub === "branch") {
    const nm = rest.filter((x) => !x.startsWith("-"))[0];
    if (nm) {
      if (!g.branches.includes(nm)) g.branches.push(nm);
      return O();
    }
    return O(g.branches.map((b) => (b === g.branch ? "* " : "  ") + b).join("\n"));
  }

  if (sub === "switch" || sub === "checkout") {
    const create = rest.includes("-c") || rest.includes("-b");
    const nm = rest.filter((x) => !x.startsWith("-"))[0];
    if (!nm) return E("git " + sub + ": укажи ветку");
    if (create) {
      if (!g.branches.includes(nm)) g.branches.push(nm);
      g.branch = nm;
      return O("Переключились на новую ветку '" + nm + "'");
    }
    if (!g.branches.includes(nm)) return E("fatal: ветка '" + nm + "' не найдена");
    g.branch = nm;
    return O("Переключились на ветку '" + nm + "'");
  }

  if (sub === "merge") {
    const nm = rest.filter((x) => !x.startsWith("-"))[0];
    if (!g.branches.includes(nm)) return E("merge: ветка '" + nm + "' не найдена");
    g.merged = (g.merged || []).concat(nm);
    return O("Обновление " + hash() + "\nFast-forward — ветка " + nm + " влита в " + g.branch);
  }

  if (sub === "remote") {
    if (rest[0] === "add") {
      g.remote = rest[2] || rest[1];
      return O();
    }
    return O(g.remote ? "origin\t" + g.remote : "");
  }

  if (sub === "push") {
    if (!g.remote) return E("fatal: не настроен удалённый репозиторий (git remote add origin URL)");
    if (!g.commits.length) return E("everything up-to-date — нечего пушить");
    g.pushed = g.commits.length;
    const extra = w.ci.workflow ? runPipeline(w) : "";
    return O("Enumerating objects... done.\nTo " + g.remote + "\n   " + g.branch + " -> " + g.branch + extra);
  }

  if (sub === "diff") return O(g.staged.length ? "diff --git — изменения проиндексированы" : "");
  return E("git: неизвестная подкоманда '" + sub + "'");
});
