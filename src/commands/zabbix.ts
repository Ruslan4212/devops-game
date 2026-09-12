import { def, E, O } from "./registry";
import { readFile, resolvePath } from "../engine/vfs";
import type { World, ZabbixState } from "../engine/types";

export function zabbixInit(w: World): ZabbixState {
  if (!w.zabbix)
    w.zabbix = {
      agentConfigured: false,
      serverAddr: null,
      userParams: {},
      triggers: [],
      serverReaches: false,
    };
  return w.zabbix;
}

/** Встроенные ключи агента и их значения в симуляторе. */
const BUILTIN: Record<string, string> = {
  "agent.ping": "1",
  "agent.hostname": "web-01",
  "system.uptime": "184213",
  "system.cpu.load[all,avg1]": "2.14",
  "system.cpu.num": "4",
  "vm.memory.size[available]": "1981284864",
  "vfs.fs.size[/,pfree]": "63.4",
  "net.if.in[eth0]": "184320011",
};

/** Разбирает конфиг агента: Server=, ServerActive=, Hostname=, UserParameter=. */
function loadAgentConf(w: World, file: string): { ok: true } | { ok: false; error: string } {
  const z = zabbixInit(w);
  const txt = readFile(w, resolvePath(w, file));
  if (txt == null) return { ok: false, error: "zabbix_agentd: файл " + file + " не найден" };

  const server = (txt.match(/^\s*Server\s*=\s*(\S+)/m) || [])[1] || null;
  const hostname = (txt.match(/^\s*Hostname\s*=\s*(\S+)/m) || [])[1] || null;
  if (!server)
    return { ok: false, error: "  FAILED: в конфиге нет Server= — агент не примет запросы от сервера" };
  if (!hostname)
    return { ok: false, error: "  FAILED: нет Hostname= — сервер не сопоставит метрики с хостом" };

  z.userParams = {};
  for (const m of txt.matchAll(/^\s*UserParameter\s*=\s*([\w.[\],-]+)\s*,\s*(.+)$/gm)) {
    z.userParams[m[1].trim()] = m[2].trim();
  }
  z.serverAddr = server;
  z.agentConfigured = true;
  // сервер достаёт метрики, только если адрес похож на настоящий (не заглушка из шаблона)
  z.serverReaches = /^(\d{1,3}\.){3}\d{1,3}$/.test(server) || /zabbix|monitoring/.test(server);
  return { ok: true };
}

def("zabbix_agentd", (a, w) => {
  const z = zabbixInit(w);
  const ci = a.indexOf("-c");
  if (ci >= 0) {
    const r = loadAgentConf(w, a[ci + 1]);
    if (!r.ok) return E(r.error);
    if (a.includes("-p")) {
      const keys = [...Object.keys(BUILTIN), ...Object.keys(z.userParams)];
      return O(
        "  SUCCESS: конфиг корректен\n  Поддерживаемых ключей: " + keys.length + "\n  " + keys.join("\n  "),
      );
    }
    return O("  SUCCESS: конфиг " + a[ci + 1] + " корректен, Server=" + z.serverAddr);
  }

  const ti = a.indexOf("-t");
  if (ti >= 0) {
    const key = a[ti + 1];
    if (!key) return E("zabbix_agentd -t: укажи ключ, например  zabbix_agentd -t agent.ping");
    if (key in BUILTIN) return O(key + "  [s|" + BUILTIN[key] + "]");
    if (key in z.userParams) return O(key + "  [s|(выполнено: " + z.userParams[key] + ")]");
    return E(key + "  [ZBX_NOTSUPPORTED] Unknown metric — такого ключа агент не знает");
  }

  return E("zabbix_agentd: поддерживается  -c ФАЙЛ [-p]  и  -t КЛЮЧ");
});

/** Численное значение ключа для оценки триггера (только встроенные ключи). */
function numericValue(key: string): number | null {
  const v = BUILTIN[key];
  if (v == null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

const CMP: Record<string, (a: number, b: number) => boolean> = {
  ">": (a, b) => a > b,
  "<": (a, b) => a < b,
  ">=": (a, b) => a >= b,
  "<=": (a, b) => a <= b,
  "=": (a, b) => a === b,
};

/** Разбор выражения триггера вида  last(KEY)>ЧИСЛО . */
function parseTriggerExpr(expr: string): { key: string; op: string; threshold: number } | null {
  const m = expr.match(/^last\(([\w.[\]/,-]+)\)\s*(>=|<=|>|<|=)\s*(-?[\d.]+)$/);
  if (!m) return null;
  return { key: m[1], op: m[2], threshold: Number(m[3]) };
}

def("zabbix", (a, w) => {
  const z = zabbixInit(w);
  const [sub, verb] = a;

  if (sub === "trigger" && verb === "add") {
    const name = a[2];
    const expr = a[3];
    const severity = a[4];
    if (!name || !expr || !severity)
      return E('zabbix trigger add: нужно  zabbix trigger add "ИМЯ" "last(КЛЮЧ)>ЧИСЛО" СЕРЬЁЗНОСТЬ');
    if (!parseTriggerExpr(expr))
      return E(
        "  FAILED: непонятное выражение. Поддерживается только форма  last(КЛЮЧ)>ЧИСЛО  (>, <, >=, <=, =)",
      );
    z.triggers.push({ name, expr, severity });
    return O("  SUCCESS: триггер добавлен\n  " + name + "  [" + severity + "]  " + expr);
  }

  if (sub === "trigger" && verb === "list") {
    if (!z.triggers.length)
      return O('Триггеров нет. Добавь:  zabbix trigger add "ИМЯ" "last(КЛЮЧ)>N" СЕРЬЁЗНОСТЬ');
    return O(z.triggers.map((t) => "  " + t.name + "  [" + t.severity + "]  " + t.expr).join("\n"));
  }

  if (sub === "problems") {
    if (!z.triggers.length) return O("Триггеров нет — нечего оценивать.");
    if (!z.serverReaches)
      return O(
        z.triggers
          .map((t) => "  " + t.name + "  [" + t.severity + "]  NODATA (сервер не собирает метрики с хоста)")
          .join("\n"),
      );
    const lines = z.triggers.map((t) => {
      const parsed = parseTriggerExpr(t.expr);
      if (!parsed) return "  " + t.name + "  UNKNOWN (не распознано выражение)";
      const val = numericValue(parsed.key);
      if (val == null) return "  " + t.name + "  NODATA (ключ " + parsed.key + " не собирает число)";
      const fired = CMP[parsed.op](val, parsed.threshold);
      return (
        "  " +
        t.name +
        "  [" +
        t.severity +
        "]  " +
        (fired ? "PROBLEM" : "OK") +
        "  (" +
        parsed.key +
        "=" +
        val +
        ", условие " +
        t.expr +
        ")"
      );
    });
    return O(lines.join("\n"));
  }

  return E("zabbix: поддерживается  zabbix trigger add|list  и  zabbix problems");
});

def("zabbix_get", (a, w) => {
  const z = zabbixInit(w);
  const si = a.indexOf("-s");
  const ki = a.indexOf("-k");
  const host = si >= 0 ? a[si + 1] : null;
  const key = ki >= 0 ? a[ki + 1] : null;
  if (!host || !key) return E("zabbix_get: нужно  zabbix_get -s ХОСТ -k КЛЮЧ");

  if (!z.agentConfigured)
    return { out: "zabbix_get [1]: cannot connect to [[" + host + "]:10050]: Connection refused", code: 1 };
  if (!z.serverReaches)
    return {
      out:
        "zabbix_get [1]: cannot connect to [[" +
        host +
        "]:10050]: сервер не в списке разрешённых (Server=) или порт 10050 закрыт файрволом",
      code: 1,
    };
  if (key in BUILTIN) return O(BUILTIN[key]);
  if (key in z.userParams) return O("(выполнено: " + z.userParams[key] + ")");
  return { out: "ZBX_NOTSUPPORTED: Unknown metric " + key, code: 1 };
});
