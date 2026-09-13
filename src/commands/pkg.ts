import { def, E, O } from "./registry";
import { mkdirp, parentOf, resolvePath, writeFile } from "../engine/vfs";

/** Пакеты, о которых тренажёр «знает» — apt install любого другого имени тоже сработает. */
const KNOWN_PACKAGES = ["nginx", "curl", "git", "htop", "vim", "tree", "rsync", "unzip"];

def("apt", (a, w) => {
  const sub = a[0];
  const arg = a.filter((x) => !x.startsWith("-")).slice(1)[0];
  if (sub === "update") return O("Чтение списков пакетов… Готово\nВсе пакеты обновлены.");
  if (sub === "upgrade") {
    if (!w.sudo) return E("apt: недостаточно прав — добавь sudo");
    return O("Расчёт обновлений… Готово\n0 пакетов обновлено, 0 новых, 0 удалено.");
  }
  if (sub === "install") {
    if (!w.sudo) return E("apt: недостаточно прав — добавь sudo");
    if (!arg) return E("apt: укажи пакет, например: sudo apt install nginx");
    if (w.packages[arg]) return O("Пакет " + arg + " уже установлен и обновлять его не нужно.");
    w.packages[arg] = true;
    return O(
      "Чтение списков пакетов… Готово\n" +
        "Следующие НОВЫЕ пакеты будут установлены:\n  " +
        arg +
        "\nПакет " +
        arg +
        " успешно установлен.",
    );
  }
  if (sub === "remove" || sub === "purge") {
    if (!w.sudo) return E("apt: недостаточно прав — добавь sudo");
    if (!arg) return E("apt: укажи пакет");
    if (!w.packages[arg]) return E("apt: пакет " + arg + " не установлен");
    delete w.packages[arg];
    return O("Пакет " + arg + " удалён.");
  }
  if (sub === "search") {
    if (!arg) return E("apt: укажи, что искать");
    const found = KNOWN_PACKAGES.filter((p) => p.includes(arg));
    return O(found.length ? found.map((p) => p + "/stable — пакет").join("\n") : "Ничего не найдено");
  }
  if (sub === "list") {
    const names = Object.keys(w.packages);
    return O(
      names.length ? names.map((p) => p + "/stable,now [installed]").join("\n") : "(ничего не установлено)",
    );
  }
  return E("apt: update|upgrade|install|remove|search|list");
});

def("dpkg", (a, w) => {
  if (a[0] === "-l" || a[0] === "--list") {
    const names = Object.keys(w.packages);
    return O(
      names.length
        ? "Же  Имя            Версия     Описание\n" +
            names.map((p) => "ii  " + p.padEnd(15) + "1.0        —").join("\n")
        : "(пакетов не установлено)",
    );
  }
  return E("dpkg: в тренажёре поддерживается только -l");
});

def("ssh-keygen", (a, w) => {
  const fi = a.indexOf("-f");
  const rawPath = fi >= 0 && a[fi + 1] ? a[fi + 1] : "~/.ssh/id_ed25519";
  const path = rawPath.replace(/^~/, w.env.HOME || "/home/devops");
  const abs = resolvePath(w, path);
  const [dir] = parentOf(abs);
  mkdirp(w, dir);
  writeFile(
    w,
    abs,
    "-----BEGIN OPENSSH PRIVATE KEY-----\n[приватный ключ, никому не показывать]\n-----END OPENSSH PRIVATE KEY-----\n",
  );
  writeFile(
    w,
    abs + ".pub",
    "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI" + Math.random().toString(36).slice(2, 12) + " devops@ops-01\n",
  );
  return O(
    "Generating public/private ed25519 key pair.\n" +
      "Your identification has been saved in " +
      abs +
      "\n" +
      "Your public key has been saved in " +
      abs +
      ".pub",
  );
});
