import { def, E, O } from "./registry";
import { readFile, resolvePath } from "../engine/vfs";
import type { K8sState, World } from "../engine/types";

export function k8sInit(w: World): K8sState {
  if (!w.k8s) w.k8s = { deploys: [], pods: [], svcs: [] };
  return w.k8s;
}

/** Пересобирает поды под желаемое состояние деплойментов — это и есть reconcile-цикл k8s. */
export function syncPods(w: World): void {
  const k = k8sInit(w);
  k.pods = [];
  let scheduled = 0;
  for (const d of k.deploys) {
    for (let i = 0; i < d.replicas; i++) {
      // узлам не хватает места — планировщик не находит, куда поставить под
      const noRoom = k.nodeCapacity != null && scheduled >= k.nodeCapacity;
      scheduled++;
      k.pods.push({
        name: d.name + "-" + Math.random().toString(36).slice(2, 7),
        deploy: d.name,
        status: noRoom ? "Pending" : d.crash ? "CrashLoopBackOff" : "Running",
        restarts: noRoom ? 0 : d.crash ? 7 : 0,
      });
    }
  }
}

def("kubectl", (a, w) => {
  const k = k8sInit(w);
  const [sub, ...rest] = a;

  if (sub === "apply") {
    const i = rest.indexOf("-f");
    const f = i >= 0 ? rest[i + 1] : null;
    if (!f) return E("kubectl apply: укажи файл: kubectl apply -f deploy.yaml");
    const y = readFile(w, resolvePath(w, f));
    if (y == null) return E("error: файл " + f + " не найден");
    if (!/kind:\s*\w+/.test(y))
      return E("error: в манифесте нет поля kind — Kubernetes не понимает, что создавать");
    const kind = (y.match(/kind:\s*(\w+)/) || [])[1];
    const name = (y.match(/name:\s*([\w-]+)/) || [])[1] || "app";

    if (kind === "Deployment") {
      const reps = Number((y.match(/replicas:\s*(\d+)/) || [])[1] || 1);
      const hasEnvDb = /DB_URL/.test(y);
      const existing = k.deploys.find((x) => x.name === name);
      if (!existing)
        k.deploys.push({
          name,
          replicas: reps,
          image: (y.match(/image:\s*(\S+)/) || [])[1] || "app",
          crash: !hasEnvDb,
        });
      else {
        existing.replicas = reps;
        existing.crash = !hasEnvDb;
      }
      syncPods(w);
      return O("deployment.apps/" + name + (existing ? " configured" : " created"));
    }
    if (kind === "Service") {
      k.svcs.push({ name, port: Number((y.match(/port:\s*(\d+)/) || [])[1] || 80) });
      return O("service/" + name + " created");
    }
    return O(kind.toLowerCase() + "/" + name + " created");
  }

  if (sub === "get") {
    const what = rest[0] || "";
    if (/^pod/.test(what)) {
      if (!k.pods.length) return O("Ресурсы не найдены.");
      return O(
        "NAME                  STATUS             RESTARTS\n" +
          k.pods.map((p) => p.name.padEnd(22) + p.status.padEnd(19) + p.restarts).join("\n"),
      );
    }
    if (/^deploy/.test(what)) {
      if (!k.deploys.length) return O("Ресурсы не найдены.");
      return O(
        "NAME       READY   IMAGE\n" +
          k.deploys
            .map(
              (d) =>
                d.name.padEnd(11) +
                (d.crash ? "0/" + d.replicas : d.replicas + "/" + d.replicas).padEnd(8) +
                d.image,
            )
            .join("\n"),
      );
    }
    if (/^s(vc|ervice)/.test(what))
      return O("NAME       PORT\n" + (k.svcs.map((s) => s.name.padEnd(11) + s.port).join("\n") || "(нет)"));
    return E("kubectl get: укажи ресурс — pods | deployments | services");
  }

  if (sub === "describe") {
    const p = k.pods.find((x) => x.name === rest[1]) || k.pods[0];
    if (!p) return E("не найдено");
    return O(
      "Name:     " +
        p.name +
        "\nStatus:   " +
        p.status +
        "\nRestarts: " +
        p.restarts +
        "\n\nEvents:\n" +
        (p.status === "Running"
          ? "  Normal  Started   контейнер запущен"
          : p.status === "Pending"
            ? "  Warning FailedScheduling   0/1 nodes are available: insufficient cpu/memory на узлах кластера"
            : "  Warning BackOff   перезапуск контейнера\n  Warning Failed    контейнер завершился с кодом 1"),
    );
  }

  if (sub === "logs") {
    const nm = rest.filter((x) => !x.startsWith("-")).pop();
    const p = k.pods.find((x) => x.name === nm) || k.pods.find((x) => x.status !== "Running") || k.pods[0];
    if (!p) return E("не найдено подов");
    return O(
      p.status === "Running"
        ? "server listening on :8080\nGET /health 200"
        : "FATAL: переменная окружения DB_URL не задана — приложение не может подключиться к базе\nexit status 1",
    );
  }

  if (sub === "scale") {
    const r = (rest.find((x) => x.startsWith("--replicas")) || "").split("=")[1];
    const nm =
      (rest.find((x) => x.includes("/")) || "").split("/")[1] || rest.filter((x) => !x.startsWith("-")).pop();
    const d = k.deploys.find((x) => x.name === nm) || k.deploys[0];
    if (!d) return E("не найден deployment");
    if (!r) return E("укажи --replicas=N");
    d.replicas = Number(r);
    syncPods(w);
    return O("deployment.apps/" + d.name + " scaled");
  }

  if (sub === "rollout") {
    const d = k.deploys[0];
    if (!d) return E("нет деплойментов");
    if (rest[0] === "undo") {
      d.crash = false;
      d.image = d.image.replace(/:.*/, ":stable");
      syncPods(w);
      w.alerts = [];
      return O("deployment.apps/" + d.name + " rolled back — вернулись на предыдущую рабочую версию");
    }
    if (rest[0] === "status")
      return O(
        d.crash
          ? "Waiting for deployment rollout to finish... поды не поднимаются"
          : 'deployment "' + d.name + '" successfully rolled out',
      );
    return E("kubectl rollout status|undo");
  }

  if (sub === "delete") {
    const nm = rest.filter((x) => !x.startsWith("-")).pop();
    const i = k.pods.findIndex((p) => p.name === nm);
    if (i < 0) return E("не найден под " + nm);
    k.pods.splice(i, 1);
    syncPods(w);
    return O('pod "' + nm + '" deleted\n(Deployment тут же создал новый — это self-healing)');
  }

  if (sub === "exec") return O("(внутри пода)\n/app # env | grep DB\n(пусто — переменной нет)");
  return E("kubectl: apply | get | describe | logs | scale | rollout | delete");
});
