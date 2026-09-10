import { def, E, O } from "./registry";
import { readFile, resolvePath } from "../engine/vfs";
import type { PromState, World } from "../engine/types";

export function promInit(w: World): PromState {
  if (!w.prom) w.prom = { exporters: {}, targets: [], configLoaded: false, rulesLoaded: false };
  return w.prom;
}

/** Текст, который экспортёр отдаёт на /metrics. */
export function metricsText(kind: string): string {
  if (kind === "node") {
    return (
      "# HELP node_load1 Средняя загрузка за 1 минуту.\n" +
      "# TYPE node_load1 gauge\n" +
      "node_load1 2.14\n" +
      "# HELP node_memory_MemAvailable_bytes Доступная память в байтах.\n" +
      "# TYPE node_memory_MemAvailable_bytes gauge\n" +
      "node_memory_MemAvailable_bytes 1.981284864e+09\n" +
      "# HELP node_filesystem_avail_bytes Свободное место на файловой системе.\n" +
      "# TYPE node_filesystem_avail_bytes gauge\n" +
      'node_filesystem_avail_bytes{mountpoint="/"} 8.59738368e+09\n' +
      "# HELP node_cpu_seconds_total Секунды процессорного времени по режимам.\n" +
      "# TYPE node_cpu_seconds_total counter\n" +
      'node_cpu_seconds_total{cpu="0",mode="idle"} 184213.7\n' +
      'node_cpu_seconds_total{cpu="0",mode="user"} 9241.32\n'
    );
  }
  return (
    "# HELP http_requests_total Всего HTTP-запросов.\n" +
    "# TYPE http_requests_total counter\n" +
    'http_requests_total{method="GET",status="200"} 128400\n' +
    'http_requests_total{method="GET",status="500"} 12\n' +
    "# HELP http_request_duration_seconds Длительность запроса.\n" +
    "# TYPE http_request_duration_seconds histogram\n" +
    'http_request_duration_seconds_bucket{le="0.1"} 119800\n' +
    'http_request_duration_seconds_bucket{le="0.25"} 126900\n' +
    'http_request_duration_seconds_bucket{le="0.5"} 128100\n' +
    'http_request_duration_seconds_bucket{le="+Inf"} 128412\n' +
    "http_request_duration_seconds_sum 10432.7\n" +
    "http_request_duration_seconds_count 128412\n"
  );
}

def("promtool", (a, w) => {
  const p = promInit(w);
  const [sub, what, file] = a.filter((x) => !x.startsWith("-"));
  if (sub !== "check") return E("promtool: поддерживается  promtool check config|rules ФАЙЛ");
  if (!file) return E("promtool check " + (what || "config") + ": укажи файл");

  const txt = readFile(w, resolvePath(w, file));
  if (txt == null) return E("promtool: файл " + file + " не найден");

  if (what === "config") {
    if (!/scrape_configs\s*:/.test(txt))
      return E("  FAILED: в конфиге нет секции scrape_configs — Prometheus не знает, что опрашивать");
    if (!/job_name\s*:/.test(txt)) return E("  FAILED: ни одного job_name — не задано имя задачи опроса");
    if (!/targets\s*:/.test(txt))
      return E("  FAILED: у job нет targets — не указано, какие адреса опрашивать");

    const jobs = [...txt.matchAll(/job_name\s*:\s*["']?([\w-]+)["']?/g)].map((m) => m[1]);
    const addrs = [...txt.matchAll(/["']([\w.-]+:\d+)["']/g)].map((m) => m[1]);
    p.targets = addrs.map((instance, i) => {
      const port = Number(instance.split(":")[1]);
      return { job: jobs[Math.min(i, jobs.length - 1)] ?? "job", instance, up: !!p.exporters[port] };
    });
    p.configLoaded = true;
    return O(
      "  SUCCESS: " +
        file +
        " корректен\n  Найдено задач опроса: " +
        jobs.length +
        ", целей: " +
        addrs.length,
    );
  }

  if (what === "rules") {
    if (!/groups\s*:/.test(txt)) return E("  FAILED: нет секции groups — правила задаются группами");
    if (!/alert\s*:/.test(txt)) return E("  FAILED: ни одного alert: — правило должно объявлять алерт");
    if (!/expr\s*:/.test(txt)) return E("  FAILED: у правила нет expr: — не задано условие на PromQL");
    const n = (txt.match(/alert\s*:/g) || []).length;
    p.rulesLoaded = true;
    return O("  SUCCESS: " + file + " корректен\n  Правил алертов найдено: " + n);
  }

  return E("promtool check: укажи  config  или  rules");
});

def("promql", (a, w, _stdin, raw) => {
  const p = promInit(w);
  const expr = (raw.join(" ") || a.join(" ")).replace(/^['"]|['"]$/g, "").trim();
  if (!expr) return E("promql: укажи выражение, например:  promql 'up'");
  if (!p.configLoaded) return E("promql: конфиг не загружен — сначала  promtool check config prometheus.yml");

  const rows = (list: string[]): string => (list.length ? list.join("\n") : "Пустой результат (no data)");

  if (/^up\s*==\s*0$/.test(expr)) {
    return O(
      rows(p.targets.filter((t) => !t.up).map((t) => `up{job="${t.job}", instance="${t.instance}"}   0`)),
    );
  }
  if (/^up$/.test(expr)) {
    return O(rows(p.targets.map((t) => `up{job="${t.job}", instance="${t.instance}"}   ${t.up ? 1 : 0}`)));
  }
  if (/node_load1/.test(expr)) return O('node_load1{instance="localhost:9100"}   2.14');
  if (/node_filesystem_avail_bytes/.test(expr))
    return O('node_filesystem_avail_bytes{mountpoint="/"}   8589934592   (8 ГиБ)');
  if (/histogram_quantile\s*\(\s*0\.95/.test(expr)) return O('{job="app"}   0.213   (p95 = 213 мс)');
  if (/rate\s*\(\s*http_requests_total/.test(expr)) {
    if (/status\s*=\s*"5\d\d"/.test(expr))
      return O('{method="GET", status="500"}   0.02   (0.02 ошибки в секунду)');
    return O('{method="GET", status="200"}   41.3   (41.3 запроса в секунду)');
  }
  if (/^http_requests_total/.test(expr))
    return O(
      'http_requests_total{method="GET", status="200"}   128400\n' +
        'http_requests_total{method="GET", status="500"}   12',
    );
  if (/rate\s*\(/.test(expr)) return O('{job="app"}   0.7');
  return O("Пустой результат (no data) — проверь имя метрики");
});
