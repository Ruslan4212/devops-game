import { def, O } from "./registry";

def("alerts", (_a, w) => {
  if (!w.alerts.length) return O("✓ Активных алертов нет. Сервис здоров.");
  return O(w.alerts.map((al) => "🔴 " + al.name + "  [" + al.sev + "]\n   " + al.desc).join("\n\n"));
});

def("metrics", (_a, w) => {
  const k = w.k8s;
  const bad = !!k && k.deploys.some((d) => d.crash);
  return O(
    "http_requests_total        128400\n" +
    "http_errors_total          " + (bad ? "41200" : "12") + "\n" +
    "error_rate                 " + (bad ? "32.1%" : "0.01%") + "\n" +
    "latency_p99_ms             " + (bad ? "4200" : "180") + "\n" +
    "pods_ready                 " + (k ? k.pods.filter((p) => p.status === "Running").length : 0) + "/" + (k ? k.pods.length : 0)
  );
});
