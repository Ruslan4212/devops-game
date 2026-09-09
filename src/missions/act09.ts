import { mkdirp, writeFile } from "../engine/vfs";
import { syncPods } from "../commands/k8s";
import { has, ran } from "./helpers";
import type { Mission } from "../engine/types";

export const GOOD_DEPLOY =
  "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: api\nspec:\n  replicas: 3\n" +
  "  template:\n    spec:\n      containers:\n        - image: shop:1.0\n          env:\n" +
  "            - name: DB_URL\n              value: postgres://db-main/shop\n";

export const act09: Mission[] = [
  {
    id: "9.1", act: 9, title: "Первый деплой в кластер", xp: 75,
    why: "Kubernetes работает от <b>желаемого состояния</b>: ты описываешь в YAML, что хочешь («три реплики такого образа»), а кластер сам приводит реальность к этому. <b>Pod</b> — минимальная единица, <b>Deployment</b> — то, что держит нужное число подов и катит обновления.",
    cheat: [
      ["edit deploy.yaml", "описать Deployment"],
      ["kubectl apply -f deploy.yaml", "применить манифест"],
      ["kubectl get pods", "список подов"],
      ["kubectl get deployments", "список деплойментов"],
      ["kubectl scale deployment/api --replicas=5", "изменить число реплик"],
    ],
    hints: [
      "Открой edit deploy.yaml — там заготовка манифеста",
      "Обязательны kind: Deployment, name, replicas, image и переменная DB_URL",
      "Примени: kubectl apply -f deploy.yaml, потом kubectl get pods",
    ],
    setup: (w) => {
      mkdirp(w, "/home/devops/k8s");
      w.cwd = "/home/devops/k8s";
      w.k8s = { deploys: [], pods: [], svcs: [] };
      w.templates = {
        "/home/devops/k8s/deploy.yaml":
          "# ЗАДАЧА: опиши Deployment.\n" +
          "# Обязательно: kind, name, replicas, image и env DB_URL\n" +
          "# Пример:\n" +
          "# apiVersion: apps/v1\n" +
          "# kind: Deployment\n" +
          "# metadata:\n" +
          "#   name: api\n" +
          "# spec:\n" +
          "#   replicas: 3\n" +
          "#   template:\n" +
          "#     spec:\n" +
          "#       containers:\n" +
          "#         - image: shop:1.0\n" +
          "#           env:\n" +
          "#             - name: DB_URL\n" +
          "#               value: postgres://db-main/shop\n",
      };
    },
    objs: [
      { t: "Опиши Deployment в deploy.yaml", d: "edit deploy.yaml", ok: has("/home/devops/k8s/deploy.yaml", /kind:\s*Deployment/) },
      { t: "Задай количество реплик", d: "строка replicas: 3", ok: has("/home/devops/k8s/deploy.yaml", /replicas:\s*[2-9]/) },
      { t: "Примени манифест в кластер", d: "kubectl apply -f deploy.yaml", ok: (w) => !!w.k8s && w.k8s.deploys.length > 0 },
      { t: "Проверь, что поды запустились", d: "kubectl get pods", ok: (w) => !!w.k8s && w.k8s.pods.length > 0 && w.log.some((l) => /kubectl\s+get\s+pod/.test(l.cmd)) },
      { t: "Смасштабируй до 5 реплик", d: "kubectl scale deployment/api --replicas=5", ok: (w) => !!w.k8s && w.k8s.deploys.some((d) => d.replicas >= 5) },
    ],
    solution: [
      { file: "deploy.yaml", content: GOOD_DEPLOY },
      "kubectl apply -f deploy.yaml",
      "kubectl get pods",
      "kubectl scale deployment/api --replicas=5",
    ],
  },
  {
    id: "9.2", act: 9, title: "Инцидент: CrashLoopBackOff", xp: 85, incident: true,
    why: "<b>CrashLoopBackOff</b> — самая частая поломка в Kubernetes: контейнер стартует, падает, кластер перезапускает его снова и снова. Диагностика всегда в три шага: <b>get pods</b> (увидеть статус и число рестартов) → <b>logs</b> (что пишет само приложение перед смертью) → <b>describe</b> (что говорит кластер). Логи почти всегда дают ответ.",
    cheat: [
      ["kubectl get pods", "статус и рестарты"],
      ["kubectl logs ИМЯ_ПОДА", "что пишет приложение"],
      ["kubectl describe pod ИМЯ", "события кластера"],
      ["edit deploy.yaml", "исправить манифест"],
      ["kubectl apply -f deploy.yaml", "применить исправление"],
      ["kubectl rollout status", "дождаться выката"],
    ],
    hints: [
      "kubectl get pods покажет CrashLoopBackOff и 7 рестартов",
      "kubectl logs подскажет: не задана переменная DB_URL",
      "Добавь в deploy.yaml блок env с DB_URL",
      "Примени заново: kubectl apply -f deploy.yaml и проверь kubectl get pods",
    ],
    setup: (w) => {
      mkdirp(w, "/home/devops/k8s");
      w.cwd = "/home/devops/k8s";
      writeFile(w, "/home/devops/k8s/deploy.yaml",
        "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: api\nspec:\n  replicas: 3\n" +
        "  template:\n    spec:\n      containers:\n        - image: shop:2.0\n");
      w.k8s = { deploys: [{ name: "api", replicas: 3, image: "shop:2.0", crash: true }], pods: [], svcs: [] };
      syncPods(w);
    },
    objs: [
      { t: "Найди проблемные поды", d: "kubectl get pods", ok: ran(/^kubectl\s+get\s+pod/) },
      { t: "Прочитай логи упавшего пода", d: "kubectl logs ИМЯ_ПОДА", ok: ran(/^kubectl\s+logs/) },
      { t: "Посмотри события кластера по поду", d: "kubectl describe pod ИМЯ", ok: ran(/^kubectl\s+describe/) },
      { t: "Добавь недостающую переменную DB_URL в манифест", d: "edit deploy.yaml", ok: has("/home/devops/k8s/deploy.yaml", /DB_URL/) },
      { t: "Примени исправленный манифест", d: "kubectl apply -f deploy.yaml", ok: (w) => !!w.k8s && w.k8s.deploys.every((d) => !d.crash) },
      { t: "Убедись, что все поды в статусе Running", d: "kubectl get pods", ok: (w) => !!w.k8s && w.k8s.pods.length > 0 && w.k8s.pods.every((p) => p.status === "Running") },
    ],
    solution: [
      "kubectl get pods",
      "kubectl logs api-x",
      "kubectl describe pod api-x",
      { file: "deploy.yaml", content: GOOD_DEPLOY },
      "kubectl apply -f deploy.yaml",
      "kubectl get pods",
    ],
  },
];
