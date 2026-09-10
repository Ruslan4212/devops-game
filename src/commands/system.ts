import { def, E, O } from "./registry";
import { readFile } from "../engine/vfs";
import type { Service, World } from "../engine/types";

def("whoami", (_a, w) => O(w.user));
def("id", (_a, w) =>
  O("uid=1000(" + w.user + ") gid=1000(" + w.user + ") groups=1000(" + w.user + "),27(sudo)"),
);
def("uname", (a) => O(a.includes("-a") ? "Linux ops-01 5.15.0 #1 SMP x86_64 GNU/Linux" : "Linux"));
def("date", () => O(new Date().toString()));
def("free", () =>
  O("               всего       занято     свободно\nПамять:         3.8Gi        1.9Gi        1.9Gi"),
);

def("df", (_a, w) => {
  const pct = w.disk ?? 55;
  const used = Math.round((40 * pct) / 100);
  const avail = 40 - used;
  const warn = pct >= 95 ? "\n\n⚠ Диск почти заполнен — сервер скоро встанет целиком." : "";
  return O(
    "Ф.система     Размер Использовано Дост Использовано%\n" +
      "/dev/sda1        40G          " +
      used +
      "G  " +
      avail +
      "G           " +
      pct +
      "%" +
      warn,
  );
});

def("env", (_a, w) =>
  O(
    Object.entries(w.env)
      .map(([k, v]) => k + "=" + v)
      .join("\n"),
  ),
);
def("export", (a, w) => {
  for (const t of a) {
    const i = t.indexOf("=");
    if (i > 0) w.env[t.slice(0, i)] = t.slice(i + 1);
  }
  return O();
});

const psTable = (procs: { pid: number; user: string; cpu: number; cmd: string }[]): string =>
  "  PID USER      %CPU COMMAND\n" +
  procs
    .map(
      (p) =>
        String(p.pid).padStart(5) + " " + p.user.padEnd(9) + " " + String(p.cpu).padStart(4) + " " + p.cmd,
    )
    .join("\n");

def("ps", (_a, w) => O(psTable(w.procs)));

def("top", (_a, w) => {
  const s = [...w.procs].sort((x, y) => y.cpu - x.cpu);
  return O("top - нагрузка: " + (s[0] ? s[0].cpu : 0) + "%\n\n" + psTable(s));
});

def("kill", (a, w) => {
  const pid = Number(a.filter((x) => !x.startsWith("-")).pop());
  const i = w.procs.findIndex((p) => p.pid === pid);
  if (i < 0) return E("kill: (" + pid + "): Нет такого процесса");
  const p = w.procs[i];
  if (p.user !== "devops" && !w.sudo)
    return E("kill: (" + pid + "): Операция не позволена — процесс чужой, нужен sudo");
  w.procs.splice(i, 1);
  // процесс, слушавший порт, освобождает его — иначе служба так и не поднимется
  if (p.port) delete w.ports[p.port];
  return O();
});

/* ------------------------------ systemd ------------------------------ */

const overridePath = (name: string): string => "/etc/systemd/system/" + name + ".service.d/override.conf";

/** Собирает текст unit-файла из полей сервиса (для `systemctl cat`). */
function unitText(w: World, name: string, s: Service): string {
  const lines = [
    "# /lib/systemd/system/" + name + ".service",
    "[Unit]",
    "Description=" + s.desc,
    "",
    "[Service]",
    "ExecStart=/usr/sbin/" + name,
    "Restart=" + (s.restart ?? "no"),
  ];
  if (s.restartSec != null) lines.push("RestartSec=" + s.restartSec);
  if (s.startLimitInterval != null) lines.push("StartLimitIntervalSec=" + s.startLimitInterval);
  if (s.startLimitBurst != null) lines.push("StartLimitBurst=" + s.startLimitBurst);
  lines.push("", "[Install]", "WantedBy=multi-user.target");

  const override = readFile(w, overridePath(name));
  return override
    ? lines.join("\n") + "\n\n# --- override.conf (твоё переопределение) ---\n" + override
    : lines.join("\n");
}

/** Перечитывает drop-in override.conf в поля сервиса (systemctl daemon-reload). */
function reload(w: World, name: string): void {
  const s = w.services[name];
  if (!s) return;
  const txt = readFile(w, overridePath(name));
  if (!txt) return;
  const grab = (key: string): string | null => {
    const m = txt.match(new RegExp("^" + key + "\\s*=\\s*(\\S+)", "mi"));
    return m ? m[1] : null;
  };
  const r = grab("Restart");
  if (r === "no" || r === "on-failure" || r === "always") s.restart = r;
  const burst = grab("StartLimitBurst");
  if (burst) s.startLimitBurst = Number(burst);
  const interval = grab("StartLimitIntervalSec");
  if (interval) s.startLimitInterval = Number(interval);
  const sec = grab("RestartSec");
  if (sec) s.restartSec = Number(sec);
}

function startService(w: World, name: string, s: Service): { out: string; code: number } {
  // 1) занятый порт (инцидент с конфликтом)
  if (s.needsPort && w.ports[s.needsPort] && w.ports[s.needsPort] !== name) {
    s.state = "failed";
    s.err = "bind() to 0.0.0.0:" + s.needsPort + " failed (98: Address already in use)";
    return {
      out:
        "Job for " + name + ".service failed. Смотри: systemctl status " + name + " и journalctl -u " + name,
      code: 1,
    };
  }

  // 2) сломанный конфиг — сервис падает сразу при старте
  if (s.badConfig) {
    const limit = s.startLimitBurst;
    if (s.restart === "always" && (limit == null || limit >= 50)) {
      // ШТОРМ: без ограничителя systemd будет долбить бесконечно
      s.state = "auto-restart";
      s.restartCount = (s.restartCount ?? 0) + 900;
      s.journalLines = (s.journalLines ?? 0) + 9000;
      w.disk = Math.min(99, (w.disk ?? 55) + 40);
      s.err = "nginx: [emerg] invalid parameter in /etc/nginx/nginx.conf:12";
      return {
        out:
          "nginx запускается и тут же падает. Restart=always поднимает его снова и снова —\n" +
          "уже " +
          s.restartCount +
          "+ перезапусков, журнал распух, диск заполняется. Это шторм.",
        code: 1,
      };
    }
    // с ограничителем: N попыток за окно — и systemd сдаётся
    const tries = limit ?? 5;
    s.state = "failed";
    s.restartCount = tries;
    s.journalLines = (s.journalLines ?? 0) + tries;
    s.err = "nginx: [emerg] invalid parameter in /etc/nginx/nginx.conf:12";
    return {
      out:
        tries +
        " неудачных запуска за " +
        (s.startLimitInterval ?? 60) +
        " секунд — " +
        "systemd прекратил попытки. Сервис в состоянии failed, диск и журнал в порядке.\n" +
        "Теперь можно спокойно чинить конфиг.",
      code: 1,
    };
  }

  // 3) всё хорошо
  s.state = "active";
  s.err = null;
  s.restartCount = 0;
  if (s.needsPort) w.ports[s.needsPort] = name;
  return { out: "", code: 0 };
}

def("systemctl", (a, w) => {
  const args = a.filter((x) => !x.startsWith("-"));
  const [act, name] = args;
  if (act === "daemon-reload") {
    for (const n of Object.keys(w.services)) reload(w, n);
    return O("systemd перечитал изменённые unit-файлы.");
  }
  if (!act) return E("systemctl: нужно действие: status|start|stop|restart|enable|cat|daemon-reload");
  const s = w.services[name];
  if (!s) return E("Unit " + name + ".service не найден.");

  if (act === "cat") return O(unitText(w, name, s));

  if (act === "status") {
    const active =
      s.state === "active"
        ? "active (running)"
        : s.state === "auto-restart"
          ? "activating (auto-restart) (Result: exit-code)"
          : s.state === "inactive"
            ? "inactive (dead)"
            : "failed (Result: exit-code)";
    const extra =
      s.state === "auto-restart" && s.restartCount
        ? "\n  Перезапусков: " + s.restartCount + " и растёт"
        : s.restartCount && s.state === "failed"
          ? "\n  Перезапусков: " + s.restartCount + " (лимит исчерпан, дальше не пытается)"
          : "";
    return {
      out:
        "● " +
        name +
        ".service - " +
        s.desc +
        "\n   Loaded: loaded (/lib/systemd/system/" +
        name +
        ".service; " +
        (s.enabled ? "enabled" : "disabled") +
        ")" +
        "\n   Active: " +
        active +
        extra +
        (s.state !== "active" && s.err ? "\n\n" + s.err : ""),
      code: s.state === "active" ? 0 : 3,
    };
  }

  if (act === "enable") {
    s.enabled = true;
    return O("Created symlink for " + name + ".service");
  }
  if (act === "disable") {
    s.enabled = false;
    return O("Removed symlink for " + name + ".service");
  }
  if (act === "stop") {
    s.state = "inactive";
    if (s.needsPort && w.ports[s.needsPort] === name) delete w.ports[s.needsPort];
    return O();
  }
  if (act === "start" || act === "restart") return startService(w, name, s);

  return E("systemctl: неизвестное действие " + act);
});

def("journalctl", (a, w) => {
  const i = a.indexOf("-u");
  const name = i >= 0 ? a[i + 1] : null;
  const s = name ? w.services[name] : null;
  if (!s) return E("journalctl: укажи сервис: journalctl -u ИМЯ");

  const base = (s.journal || []).slice();
  if (s.err) base.push(name + ": " + s.err);

  // при шторме журнал забит одинаковыми строками перезапуска
  if (s.journalLines && s.journalLines > base.length) {
    const bloat = s.journalLines - base.length;
    base.push(
      "systemd[1]: " +
        name +
        ".service: Scheduled restart job, restart counter is at " +
        (s.restartCount ?? bloat) +
        ".",
      "... (" + bloat + " почти одинаковых строк перезапуска) ...",
      "systemd[1]: " + name + ".service: Start request repeated too quickly.",
    );
  }
  return O(base.length ? base.join("\n") : "-- Записей нет --");
});
