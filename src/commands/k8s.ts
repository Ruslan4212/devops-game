import { def, E, O } from "./registry";
import { readFile, resolvePath } from "../engine/vfs";
import type { CmdResult, K8sState, World } from "../engine/types";

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

/**
 * Разбор и применение одного YAML-манифеста по полю kind — общее ядро для
 * kubectl apply -f и для helm install/upgrade (шаблон Helm рендерится в такой
 * же текст манифеста и применяется тем же способом).
 */
export function applyManifest(y: string, k: K8sState, w: World): CmdResult {
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
  if (kind === "Job") {
    k.jobs = k.jobs || [];
    const image = (y.match(/image:\s*(\S+)/) || [])[1] || "app";
    k.jobs.push({ name, image, completed: true });
    return O("job.batch/" + name + " created");
  }
  if (kind === "Ingress") {
    const host = (y.match(/host:\s*(\S+)/) || [])[1] || "app.local";
    const svcMatch = y.match(/service:\s*\n\s*name:\s*(\S+)/);
    const service = svcMatch ? svcMatch[1] : "";
    const port = Number((y.match(/number:\s*(\d+)/) || [])[1] || 80);
    k.ingresses = k.ingresses || [];
    k.ingresses.push({ name, host, service, port });
    return O("ingress.networking.k8s.io/" + name + " created");
  }
  if (kind === "PersistentVolumeClaim") {
    k.pvcs = k.pvcs || [];
    const size = (y.match(/storage:\s*(\S+)/) || [])[1] || "1Gi";
    k.pvcs.push({ name, size, bound: true });
    return O("persistentvolumeclaim/" + name + " created");
  }
  if (kind === "HorizontalPodAutoscaler") {
    k.hpas = k.hpas || [];
    const targetMatch = y.match(/scaleTargetRef:[\s\S]*?name:\s*(\S+)/);
    k.hpas.push({
      name,
      deployment: targetMatch ? targetMatch[1] : "",
      minReplicas: Number((y.match(/minReplicas:\s*(\d+)/) || [])[1] || 1),
      maxReplicas: Number((y.match(/maxReplicas:\s*(\d+)/) || [])[1] || 1),
      targetCpu: Number((y.match(/averageUtilization:\s*(\d+)/) || [])[1] || 80),
    });
    return O("horizontalpodautoscaler.autoscaling/" + name + " created");
  }
  if (kind === "ServiceAccount") {
    k.serviceAccounts = k.serviceAccounts || [];
    if (!k.serviceAccounts.includes(name)) k.serviceAccounts.push(name);
    return O("serviceaccount/" + name + " created");
  }
  if (kind === "Role") {
    k.roles = k.roles || [];
    const list = (re: RegExp): string[] => {
      const m = y.match(re);
      return m ? m[1].split(",").map((s) => s.trim().replace(/['"]/g, "")) : [];
    };
    k.roles.push({
      name,
      verbs: list(/verbs:\s*\[([^\]]*)\]/),
      resources: list(/resources:\s*\[([^\]]*)\]/),
    });
    return O("role.rbac.authorization.k8s.io/" + name + " created");
  }
  if (kind === "RoleBinding") {
    k.roleBindings = k.roleBindings || [];
    const roleMatch = y.match(/roleRef:[\s\S]*?name:\s*(\S+)/);
    const subjMatch = y.match(/subjects:[\s\S]*?name:\s*(\S+)/);
    k.roleBindings.push({
      name,
      role: roleMatch ? roleMatch[1] : "",
      serviceAccount: subjMatch ? subjMatch[1] : "",
    });
    return O("rolebinding.rbac.authorization.k8s.io/" + name + " created");
  }
  return O(kind.toLowerCase() + "/" + name + " created");
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
    return applyManifest(y, k, w);
  }

  if (sub === "auth" && rest[0] === "can-i") {
    const verb = rest[1];
    const resource = rest[2];
    const asTok = rest.find((x) => x.startsWith("--as="));
    const svcAccount = asTok ? asTok.slice("--as=".length).split(":").pop() : null;
    if (!svcAccount) return E("kubectl auth can-i: укажи --as=ИМЯ_SERVICEACCOUNT");
    const binding = (k.roleBindings || []).find((b) => b.serviceAccount === svcAccount);
    const role = binding ? (k.roles || []).find((r) => r.name === binding.role) : null;
    const allowed = !!role && role.verbs.includes(verb) && role.resources.includes(resource);
    return O(allowed ? "yes" : "no");
  }

  if (sub === "get") {
    const what = rest[0] || "";
    if (/^sa$|^serviceaccounts?$/.test(what))
      return O("NAME\n" + ((k.serviceAccounts || []).join("\n") || "(нет)"));
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
    if (/^job/.test(what))
      return O(
        "NAME       COMPLETIONS   IMAGE\n" +
          ((k.jobs || [])
            .map((j) => j.name.padEnd(11) + (j.completed ? "1/1" : "0/1").padEnd(14) + j.image)
            .join("\n") || "(нет)"),
      );
    if (/^hpa$|^horizontalpodautoscalers?$/.test(what))
      return O(
        "NAME      REFERENCE       MINPODS   MAXPODS   REPLICAS   TARGET-CPU\n" +
          ((k.hpas || [])
            .map((h) => {
              const d = k.deploys.find((x) => x.name === h.deployment);
              return (
                h.name.padEnd(10) +
                ("Deployment/" + h.deployment).padEnd(16) +
                String(h.minReplicas).padEnd(10) +
                String(h.maxReplicas).padEnd(10) +
                String(d ? d.replicas : 0).padEnd(11) +
                h.targetCpu +
                "%"
              );
            })
            .join("\n") || "(нет)"),
      );
    if (/^pvc$|^persistentvolumeclaims?$/.test(what))
      return O(
        "NAME       STATUS   CAPACITY\n" +
          ((k.pvcs || [])
            .map((p) => p.name.padEnd(11) + (p.bound ? "Bound" : "Pending").padEnd(9) + p.size)
            .join("\n") || "(нет)"),
      );
    if (/^ing/.test(what))
      return O(
        "NAME            HOST              SERVICE        PORT\n" +
          ((k.ingresses || [])
            .map((i) => i.name.padEnd(16) + i.host.padEnd(18) + i.service.padEnd(15) + i.port)
            .join("\n") || "(нет)"),
      );
    return E("kubectl get: укажи ресурс — pods | deployments | services | ingress | jobs");
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
