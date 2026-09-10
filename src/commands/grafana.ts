import { def, E, O } from "./registry";
import { readFile, resolvePath } from "../engine/vfs";
import { promInit, promShortValue } from "./prom";
import type { GrafanaPanel, GrafanaState, World } from "../engine/types";

export function grafanaInit(w: World): GrafanaState {
  if (!w.grafana) w.grafana = { datasources: [], dashboards: [] };
  return w.grafana;
}

/** Разбор дашборда: заголовок и панели (title + expr + unit). */
function parseDashboard(json: string): { title: string; panels: GrafanaPanel[] } | null {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title : "Без названия";
  const rawPanels = Array.isArray(o.panels) ? o.panels : [];
  const panels: GrafanaPanel[] = [];
  for (const rp of rawPanels) {
    if (!rp || typeof rp !== "object") continue;
    const p = rp as Record<string, unknown>;
    const targets = Array.isArray(p.targets) ? p.targets : [];
    const first = targets[0] as Record<string, unknown> | undefined;
    panels.push({
      title: typeof p.title === "string" ? p.title : "панель",
      expr: first && typeof first.expr === "string" ? first.expr : "",
      unit: typeof p.unit === "string" ? p.unit : "",
    });
  }
  return { title, panels };
}

/** Человеческое представление значения с учётом единицы измерения. */
function format(value: string, unit: string): string {
  if (value === "—") return "нет данных";
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  switch (unit) {
    case "s":
      return Math.round(n * 1000) + " мс";
    case "ms":
      return n + " мс";
    case "reqps":
      return n + " запросов/с";
    case "bytes":
      return (n / 1024 ** 3).toFixed(1) + " ГиБ";
    case "percent":
      return n + " %";
    default:
      return value;
  }
}

def("grafana", (a, w) => {
  const g = grafanaInit(w);
  const p = promInit(w);
  const [sub, file] = a.filter((x) => !x.startsWith("-"));

  if (sub === "check") {
    if (!file) return E("grafana check: укажи файл (datasources.yml или дашборд .json)");
    const txt = readFile(w, resolvePath(w, file));
    if (txt == null) return E("grafana: файл " + file + " не найден");

    if (/\.ya?ml$/.test(file)) {
      if (!/datasources\s*:/.test(txt))
        return E("  FAILED: нет секции datasources — Grafana не узнает, откуда брать данные");
      if (!/type\s*:\s*prometheus/.test(txt))
        return E("  FAILED: не указан type: prometheus — тип источника данных обязателен");
      if (!/url\s*:/.test(txt)) return E("  FAILED: у источника нет url — некуда ходить за метриками");
      const names = [...txt.matchAll(/name\s*:\s*["']?([\w -]+)["']?/g)].map((m) => m[1].trim());
      g.datasources = names.length ? names : ["Prometheus"];
      return O("  SUCCESS: " + file + " корректен\n  Источников данных: " + g.datasources.length);
    }

    const db = parseDashboard(txt);
    if (!db) return E("  FAILED: это не валидный JSON — проверь запятые и скобки");
    if (!db.panels.length) return E("  FAILED: в дашборде нет панелей (panels)");
    const noExpr = db.panels.filter((x) => !x.expr);
    if (noExpr.length)
      return E('  FAILED: у панели "' + noExpr[0].title + '" нет targets[].expr — панели нечего показывать');
    const i = g.dashboards.findIndex((x) => x.title === db.title);
    if (i >= 0) g.dashboards[i] = db;
    else g.dashboards.push(db);
    return O("  SUCCESS: " + file + " корректен\n  Дашборд: " + db.title + ", панелей: " + db.panels.length);
  }

  if (sub === "dashboards") {
    if (!g.dashboards.length) return O("Дашбордов нет. Загрузи:  grafana check ФАЙЛ.json");
    return O(
      "ИСТОЧНИКИ: " +
        (g.datasources.join(", ") || "(нет)") +
        "\n\n" +
        g.dashboards.map((d) => "  " + d.title + "  —  панелей: " + d.panels.length).join("\n"),
    );
  }

  if (sub === "render") {
    const db = file
      ? (g.dashboards.find((d) => d.title === file) ?? g.dashboards[0])
      : g.dashboards[g.dashboards.length - 1];
    if (!db) return E("grafana render: сначала загрузи дашборд —  grafana check ФАЙЛ.json");
    if (!g.datasources.length)
      return E("grafana render: не подключён источник данных — проверь datasources.yml");

    const W = 52;
    const line = (l: string, r: string): string => {
      const pad = Math.max(1, W - l.length - r.length);
      return "│ " + l + " ".repeat(pad) + r + " │";
    };
    const head = "┌─ " + db.title + " " + "─".repeat(Math.max(1, W - db.title.length - 1)) + "┐";
    const rows = db.panels.map((pn) => line(pn.title, format(promShortValue(pn.expr, p), pn.unit)));
    return O([head, ...rows, "└" + "─".repeat(W + 2) + "┘"].join("\n"));
  }

  return E("grafana: поддерживается  grafana check ФАЙЛ | grafana dashboards | grafana render");
});
