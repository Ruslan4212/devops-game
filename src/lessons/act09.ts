import { mkdirp, writeFile } from "../engine/vfs";
import { has, ran, ranAny } from "../missions/helpers";
import { syncPods } from "../commands/k8s";
import type { Lesson, World } from "../engine/types";

/** Рабочий манифест Deployment: 3 реплики + переменная DB_URL (без неё контейнер падает). */
const DEPLOY_OK =
  "apiVersion: apps/v1\n" +
  "kind: Deployment\n" +
  "metadata:\n" +
  "  name: api\n" +
  "spec:\n" +
  "  replicas: 3\n" +
  "  template:\n" +
  "    spec:\n" +
  "      containers:\n" +
  "        - name: api\n" +
  "          image: shop:1.0\n" +
  "          env:\n" +
  "            - name: DB_URL\n" +
  "              value: postgres://db-main/shop\n";

/** Тот же Deployment, но с явно заданными ресурсами — так его пишут в проде. */
const DEPLOY_RESOURCES =
  "apiVersion: apps/v1\n" +
  "kind: Deployment\n" +
  "metadata:\n" +
  "  name: api\n" +
  "spec:\n" +
  "  replicas: 3\n" +
  "  template:\n" +
  "    spec:\n" +
  "      containers:\n" +
  "        - name: api\n" +
  "          image: shop:1.0\n" +
  "          env:\n" +
  "            - name: DB_URL\n" +
  "              value: postgres://db-main/shop\n" +
  "          resources:\n" +
  "            requests:\n" +
  '              cpu: "250m"\n' +
  '              memory: "256Mi"\n' +
  "            limits:\n" +
  '              memory: "512Mi"\n';

/** Тот же Deployment, но с проверками здоровья — без них выкатка бьёт по пользователям. */
const DEPLOY_PROBES =
  "apiVersion: apps/v1\n" +
  "kind: Deployment\n" +
  "metadata:\n" +
  "  name: api\n" +
  "spec:\n" +
  "  replicas: 3\n" +
  "  template:\n" +
  "    spec:\n" +
  "      containers:\n" +
  "        - name: api\n" +
  "          image: shop:1.0\n" +
  "          env:\n" +
  "            - name: DB_URL\n" +
  "              value: postgres://db-main/shop\n" +
  "          readinessProbe:\n" +
  "            httpGet:\n" +
  "              path: /healthz\n" +
  "              port: 8080\n" +
  "            initialDelaySeconds: 5\n" +
  "            periodSeconds: 5\n" +
  "          livenessProbe:\n" +
  "            httpGet:\n" +
  "              path: /healthz\n" +
  "              port: 8080\n" +
  "            initialDelaySeconds: 15\n" +
  "            periodSeconds: 10\n" +
  "            failureThreshold: 3\n";

const SERVICE_YAML =
  "apiVersion: v1\n" +
  "kind: Service\n" +
  "metadata:\n" +
  "  name: api\n" +
  "spec:\n" +
  "  selector:\n" +
  "    app: api\n" +
  "  ports:\n" +
  "    - port: 80\n";

/** Тот же Service, но с явным targetPort — портом, который слушает контейнер. */
const SERVICE_FULL =
  "apiVersion: v1\n" +
  "kind: Service\n" +
  "metadata:\n" +
  "  name: api\n" +
  "spec:\n" +
  "  selector:\n" +
  "    app: api\n" +
  "  ports:\n" +
  "    - port: 80\n" +
  "      targetPort: 8080\n";

/** Пустой каталог с манифестами Kubernetes и чистое состояние кластера. */
function seedK8s(w: World): void {
  mkdirp(w, "/home/devops/k8s");
  w.cwd = "/home/devops/k8s";
  w.k8s = { deploys: [], pods: [], svcs: [] };
}

export const act09: Lesson[] = [
  {
    id: "9.1",
    act: 9,
    title: "Зачем нужен оркестратор",
    xp: 15,
    intro: "Один контейнер запустить легко. А если их пятьдесят и они падают ночью?",
    steps: [
      {
        kind: "say",
        text:
          "В Акте 6 ты запускал контейнер командой  docker run . Для одного контейнера\n" +
          "на одном сервере — этого достаточно.\n\n" +
          "Но у реального сервиса всё иначе: 5 копий приложения для нагрузки, база, кэш,\n" +
          "очередь — и всё это на десятке серверов. Руками такое не удержать.",
      },
      {
        kind: "say",
        text:
          "Вопросы, на которые кто-то должен отвечать круглосуточно:\n\n" +
          "  • контейнер упал в 3 ночи — кто его поднимет?\n" +
          "  • нагрузка выросла — кто добавит копии и на каком сервере?\n" +
          "  • сервер вышел из строя — куда переедут его контейнеры?\n" +
          "  • выкатываем новую версию — как без простоя?",
      },
      {
        kind: "say",
        text:
          "На все эти вопросы отвечает «оркестратор контейнеров». Стандарт индустрии —\n" +
          "Kubernetes (часто пишут  k8s : буква «k», 8 букв, буква «s»).\n\n" +
          "Ты говоришь Kubernetes, ЧТО хочешь («держи 5 копий этого образа»), а он сам\n" +
          "решает, на каких серверах их запустить, следит за ними и поднимает упавшие.",
      },
      {
        kind: "quiz",
        text: "Зачем нужен Kubernetes, если контейнер можно запустить через  docker run ?",
        options: [
          "Он сам держит нужное число копий, поднимает упавшие и распределяет их по серверам",
          "Он ускоряет работу контейнеров",
          "Он полностью заменяет Docker",
        ],
        answer: 0,
        explain:
          "docker run — один контейнер вручную. Kubernetes управляет десятками контейнеров на кластере серверов.",
      },
    ],
  },
  {
    id: "9.2",
    act: 9,
    title: "Желаемое состояние",
    xp: 20,
    intro: "Ты описываешь, как ДОЛЖНО быть. Kubernetes постоянно сводит реальность к этому.",
    steps: [
      {
        kind: "say",
        text:
          "Kubernetes работает так же декларативно, как Terraform из Акта 8.\n\n" +
          "Ты не командуешь «запусти контейнер», «ещё запусти», «этот перезапусти».\n" +
          "Ты описываешь желаемое состояние (desired state): «должно работать 3 копии\n" +
          "образа shop:1.0».",
      },
      {
        kind: "say",
        text:
          "Дальше Kubernetes крутит бесконечный цикл сверки (его называют reconcile loop):\n\n" +
          "  смотрит, что есть сейчас  →  сравнивает с желаемым  →  устраняет разницу\n" +
          "  ...и так каждые несколько секунд, постоянно.\n\n" +
          "Хотел 3 пода, а работает 2 (один упал) — поднимет третий. Хотел 3, а стало 4\n" +
          "(лишний) — уберёт лишний.",
      },
      {
        kind: "say",
        text:
          "Из этого вытекает главное свойство Kubernetes — «самолечение» (self-healing).\n" +
          "Ты не пишешь скриптов «если упало — подними». Kubernetes делает это сам,\n" +
          "потому что реальность всё время расходится с желаемым, а его работа —\n" +
          "это расхождение убирать.",
      },
      {
        kind: "quiz",
        text: "Ты описал «хочу 3 пода». Один упал. Что сделает Kubernetes?",
        options: [
          "Сам поднимет новый — реальность (2) не совпадает с желаемым (3)",
          "Ничего, пока ты не запустишь его вручную",
          "Остановит оставшиеся два тоже",
        ],
        answer: 0,
        explain: "Reconcile loop постоянно сводит реальность к желаемому состоянию. В этом весь Kubernetes.",
      },
    ],
  },
  {
    id: "9.3",
    act: 9,
    title: "Pod — минимальная единица",
    xp: 20,
    intro: "Kubernetes запускает не контейнеры напрямую, а поды.",
    steps: [
      {
        kind: "say",
        text:
          "Kubernetes не работает с контейнерами напрямую. Минимальная единица, которой он\n" +
          "управляет, называется «под» (pod — «стручок»).\n\n" +
          "Под — это обёртка вокруг одного (обычно) контейнера. Иногда внутри пода\n" +
          "несколько тесно связанных контейнеров, которые делят сеть и должны жить\n" +
          "и умирать вместе.",
      },
      {
        kind: "say",
        text:
          "Ключевое свойство пода: он ЭФЕМЕРЕН, то есть одноразовый.\n\n" +
          "Под может исчезнуть в любой момент: сервер перезагрузили, Kubernetes решил\n" +
          "переместить нагрузку, ты выкатил новую версию. На его месте появится новый под —\n" +
          "с другим именем и другим внутренним IP-адресом.\n\n" +
          "Поэтому напрямую к поду не обращаются и вручную поды не создают.",
      },
      {
        kind: "say",
        text:
          "Раз поды одноразовые — как на них полагаться? Через объекты уровнем выше,\n" +
          "которые создают и пересоздают поды за тебя:\n\n" +
          "  Deployment  — держит N одинаковых подов приложения (следующий урок)\n" +
          "  Service     — даёт стабильный адрес к меняющимся подам (урок 9.8)\n\n" +
          "Ты работаешь с этими объектами, а поды — их расходный материал.",
      },
      {
        kind: "quiz",
        text: "Почему в Kubernetes не создают поды напрямую руками?",
        options: [
          "Поды одноразовые — исчезают и пересоздаются; ими управляют объекты выше, например Deployment",
          "Создавать поды запрещено лицензией",
          "Под можно создать только один на весь кластер",
        ],
        answer: 0,
        explain: "Под эфемерен. Опираются на Deployment, который сам поддерживает нужное число подов.",
      },
    ],
  },
  {
    id: "9.4",
    act: 9,
    title: "Deployment",
    xp: 20,
    intro: "Объект, который держит нужное число подов и катит обновления.",
    steps: [
      {
        kind: "say",
        text:
          "Deployment («развёртывание») — самый частый объект Kubernetes. Его задачи:\n\n" +
          "  1) держать заданное число одинаковых подов (например, 3)\n" +
          "  2) пересоздавать упавшие\n" +
          "  3) плавно катить новую версию образа и уметь откатываться",
      },
      {
        kind: "say",
        text:
          "Ты описываешь Deployment в манифесте — YAML-файле. Главные поля:\n\n" +
          "  kind: Deployment          ← что за объект\n" +
          "  metadata.name: api        ← имя\n" +
          "  spec.replicas: 3          ← сколько подов держать\n" +
          "  spec.template.spec.containers:\n" +
          "    - image: shop:1.0       ← какой образ запускать в каждом поде",
      },
      {
        kind: "say",
        text:
          "Как это прочитать целиком:\n\n" +
          "«Создай Deployment по имени api. Держи 3 пода. В каждом поде — контейнер\n" +
          "из образа shop:1.0».\n\n" +
          "Дальше Kubernetes сам создаёт 3 пода и следит, чтобы их всегда было 3.",
      },
      {
        kind: "quiz",
        text: "За что отвечает Deployment?",
        options: [
          "Держать нужное число подов, пересоздавать упавшие, катить и откатывать версии",
          "Хранить пароли приложения",
          "Раздавать IP-адреса внутри кластера",
        ],
        answer: 0,
        explain: "Deployment — про количество и обновление подов. Стабильные адреса — это Service.",
      },
    ],
  },
  {
    id: "9.5",
    act: 9,
    title: "Первый манифест: kubectl apply",
    xp: 25,
    intro: "kubectl — команда для разговора с кластером. apply -f отправляет ему манифест.",
    setup: (w) => {
      seedK8s(w);
      w.templates = {
        "/home/devops/k8s/deploy.yaml":
          "# ЗАДАЧА: опиши Deployment. Обязательно: kind, name, replicas, image\n" +
          "# и переменная окружения DB_URL. Сотри комментарий и впиши манифест.\n" +
          "# Полный пример — в теории этого урока.\n",
      };
    },
    steps: [
      {
        kind: "say",
        text:
          "Команда для управления кластером —  kubectl  (произносят «куб-контрол»).\n" +
          "Основная форма:\n\n" +
          "  kubectl apply -f файл.yaml\n\n" +
          "  apply  — «приведи кластер к тому, что описано в файле»\n" +
          "  -f     — от file, «вот файл с описанием»",
      },
      {
        kind: "say",
        text:
          "Полный манифест Deployment, который мы разбирали:\n\n" +
          "  apiVersion: apps/v1\n" +
          "  kind: Deployment\n" +
          "  metadata:\n" +
          "    name: api\n" +
          "  spec:\n" +
          "    replicas: 3\n" +
          "    template:\n" +
          "      spec:\n" +
          "        containers:\n" +
          "          - name: api\n" +
          "            image: shop:1.0\n" +
          "            env:\n" +
          "              - name: DB_URL\n" +
          "                value: postgres://db-main/shop\n\n" +
          "Блок  env  задаёт переменные окружения контейнера — приложению нужен адрес базы.",
      },
      {
        kind: "do",
        text:
          "Задача: создай манифест. Набери:\n" +
          "edit deploy.yaml\n" +
          "Сотри подсказку и впиши Deployment  api  на 3 реплики, образ shop:1.0, с переменной DB_URL. Сохрани.",
        check: (w) =>
          has("/home/devops/k8s/deploy.yaml", /kind:\s*Deployment/)(w) &&
          has("/home/devops/k8s/deploy.yaml", /replicas:\s*[2-9]/)(w) &&
          has("/home/devops/k8s/deploy.yaml", /DB_URL/)(w),
        answer: DEPLOY_OK,
        editFile: "/home/devops/k8s/deploy.yaml",
        hint: "Открой  edit deploy.yaml  и впиши манифест из теории урока (со всеми полями и блоком env DB_URL).",
      },
      {
        kind: "do",
        text: "Задача: примени манифест в кластер.",
        check: (w) => !!w.k8s && w.k8s.deploys.length > 0,
        answer: "kubectl apply -f deploy.yaml",
        hint: "Команда  kubectl apply -f  и имя файла  deploy.yaml",
      },
      {
        kind: "quiz",
        text: "Что делает  kubectl apply -f deploy.yaml ?",
        options: [
          "Приводит кластер к состоянию, описанному в манифесте deploy.yaml",
          "Скачивает файл deploy.yaml из интернета",
          "Удаляет всё, что было в кластере",
        ],
        answer: 0,
        explain:
          "apply — декларативно: «сделай так, как в файле». Повторный apply без изменений ничего не меняет.",
      },
    ],
  },
  {
    id: "9.6",
    act: 9,
    title: "Смотрим кластер: get, describe, logs",
    xp: 20,
    intro: "Три команды, которыми диагностируют почти всё в Kubernetes.",
    setup: (w) => {
      seedK8s(w);
      writeFile(w, "/home/devops/k8s/deploy.yaml", DEPLOY_OK);
      w.k8s = {
        deploys: [{ name: "api", replicas: 3, image: "shop:1.0", crash: false }],
        pods: [],
        svcs: [],
      };
      syncPods(w);
    },
    steps: [
      {
        kind: "say",
        text:
          "Три команды-инструмента, аналоги того, что ты уже знаешь:\n\n" +
          "  kubectl get ...       — список (как  ls  или  docker ps )\n" +
          "  kubectl describe ...  — подробности по одному объекту, включая события\n" +
          "  kubectl logs ...      — вывод приложения из пода (как  docker logs )",
      },
      {
        kind: "watch",
        run: "kubectl get pods",
        note:
          "Столбцы:\n" +
          "  NAME     — имя пода (случайный суффикс, потому что поды одноразовые)\n" +
          "  STATUS   — Running значит работает\n" +
          "  RESTARTS — сколько раз под перезапускался (0 — хорошо)\n\n" +
          "Три пода Running — Deployment создал ровно столько, сколько мы просили.",
      },
      { kind: "type", text: "Посмотри поды сам. Набери:  kubectl get pods", cmd: "kubectl get pods" },
      {
        kind: "watch",
        run: "kubectl get deployments",
        note:
          "Здесь виден сам Deployment:  READY 3/3  — три пода из трёх готовы.\n" +
          "Если бы было  0/3  — что-то с подами не так, идём в logs.",
      },
      {
        kind: "type",
        text: "Посмотри деплойменты. Набери:  kubectl get deployments",
        cmd: "kubectl get deployments",
      },
      {
        kind: "quiz",
        text: "Что показывает  kubectl logs ИМЯ_ПОДА ?",
        options: [
          "Вывод приложения из этого пода — то, что оно печатает",
          "Список всех подов",
          "Настройки кластера",
        ],
        answer: 0,
        explain: "logs — как docker logs: печать приложения. При падении пода причина обычно там.",
      },
    ],
  },
  {
    id: "9.7",
    act: 9,
    title: "Инцидент: CrashLoopBackOff ⚡",
    xp: 45,
    intro: "Поды не поднимаются, статус CrashLoopBackOff. Алгоритм: get → logs → describe → правка.",
    setup: (w) => {
      seedK8s(w);
      // Манифест без DB_URL: контейнер падает при старте.
      writeFile(
        w,
        "/home/devops/k8s/deploy.yaml",
        "apiVersion: apps/v1\n" +
          "kind: Deployment\n" +
          "metadata:\n" +
          "  name: api\n" +
          "spec:\n" +
          "  replicas: 3\n" +
          "  template:\n" +
          "    spec:\n" +
          "      containers:\n" +
          "        - name: api\n" +
          "          image: shop:2.0\n",
      );
      w.k8s = {
        deploys: [{ name: "api", replicas: 3, image: "shop:2.0", crash: true }],
        pods: [],
        svcs: [],
      };
      syncPods(w);
    },
    steps: [
      {
        kind: "say",
        text:
          "Выкатили новую версию, и поды не поднимаются. Это самая частая поломка\n" +
          "в Kubernetes.\n\n" +
          "Алгоритм разбора всегда один и тот же:\n\n" +
          "  1) kubectl get pods         — какой статус, сколько рестартов\n" +
          "  2) kubectl logs ИМЯ_ПОДА    — что пишет приложение перед смертью\n" +
          "  3) kubectl describe pod ИМЯ — что говорит сам кластер (события)",
      },
      {
        kind: "do",
        text: "Шаг 1. Посмотри поды — увидишь статус и число рестартов.",
        check: ran(/^kubectl\s+get\s+pods?\b/),
        answer: "kubectl get pods",
        hint: "Команда  kubectl get pods",
      },
      {
        kind: "say",
        text:
          "Статус  CrashLoopBackOff  и  RESTARTS 7 . Читается так:\n\n" +
          "«под запускается → контейнер сразу падает → Kubernetes ждёт всё дольше и\n" +
          "пробует снова → и так по кругу». BackOff = «отступление»: пауза между попытками\n" +
          "растёт, чтобы не долбить бесконечно (помнишь шторм перезапусков из Акта 2 —\n" +
          "здесь такая защита встроена).\n\n" +
          "Что именно падает — смотрим в логах.",
      },
      {
        kind: "do",
        text: "Шаг 2. Прочитай логи упавшего пода (имя возьми из вывода get pods).",
        check: ran(/^kubectl\s+logs\b/),
        answer: "kubectl logs api-x",
        hint: "Команда  kubectl logs  и имя пода (в симуляторе подойдёт любое имя вида  api-x )",
      },
      {
        kind: "say",
        text:
          "В логах:\n\n" +
          "  FATAL: переменная окружения DB_URL не задана —\n" +
          "  приложение не может подключиться к базе\n\n" +
          "Приложению нужен адрес базы данных в переменной  DB_URL , а в манифесте её нет.\n" +
          "Контейнер стартует, не находит переменную, падает. Kubernetes честно повторяет.",
      },
      {
        kind: "do",
        text: "Шаг 3. Посмотри события кластера по поду.",
        check: ran(/^kubectl\s+describe\s+pod\b/),
        answer: "kubectl describe pod api-x",
        hint: "Команда  kubectl describe pod  и имя пода",
      },
      {
        kind: "do",
        text:
          "Шаг 4. Почини манифест. Набери:\n" +
          "edit deploy.yaml\n" +
          "Добавь в контейнер блок  env  с переменной  DB_URL . Сохрани.",
        check: has("/home/devops/k8s/deploy.yaml", /DB_URL/),
        answer: DEPLOY_OK,
        editFile: "/home/devops/k8s/deploy.yaml",
        hint:
          "В  edit deploy.yaml  добавь под строкой  image:  блок:\n" +
          "          env:\n            - name: DB_URL\n              value: postgres://db-main/shop",
      },
      {
        kind: "do",
        text: "Шаг 5. Примени исправленный манифест.",
        check: (w) => !!w.k8s && w.k8s.deploys.every((d) => !d.crash),
        answer: "kubectl apply -f deploy.yaml",
        hint: "Команда  kubectl apply -f deploy.yaml",
      },
      {
        kind: "do",
        text: "Шаг 6. Убедись, что все поды в статусе Running.",
        check: (w) => !!w.k8s && w.k8s.pods.length > 0 && w.k8s.pods.every((p) => p.status === "Running"),
        answer: "kubectl get pods",
        hint: "Команда  kubectl get pods  — все поды должны быть Running",
      },
      {
        kind: "say",
        text:
          "Инцидент закрыт. CrashLoopBackOff почти всегда лечится по этому алгоритму:\n" +
          "статус → логи (там причина) → правка манифеста → apply. Частые причины:\n" +
          "нет переменной окружения, битый образ, приложение не достучалось до базы.",
      },
    ],
  },
  {
    id: "9.8",
    act: 9,
    title: "Service — стабильный адрес",
    xp: 45,
    intro: "Поды меняют IP при каждом пересоздании. Service даёт постоянную точку входа.",
    setup: (w) => {
      seedK8s(w);
      writeFile(w, "/home/devops/k8s/deploy.yaml", DEPLOY_OK);
      writeFile(w, "/home/devops/k8s/service.yaml", SERVICE_YAML);
      w.k8s = {
        deploys: [{ name: "api", replicas: 3, image: "shop:1.0", crash: false }],
        pods: [],
        svcs: [],
      };
      syncPods(w);
    },
    steps: [
      {
        kind: "say",
        text:
          "Проблема: у нас 3 пода, у каждого свой внутренний IP. Поды пересоздаются —\n" +
          "IP меняются. Как другому сервису (например, фронтенду) обращаться к нашему api,\n" +
          "если адрес всё время новый?",
      },
      {
        kind: "say",
        text:
          "Ответ — объект  Service . Он даёт ОДИН постоянный адрес (имя  api  внутри\n" +
          "кластера), за которым прячется группа подов. Service сам:\n\n" +
          "  • знает актуальный список подов (по метке-селектору)\n" +
          "  • раскидывает входящие запросы между ними (балансировка)\n" +
          "  • убирает из ротации упавшие поды",
      },
      {
        kind: "say",
        text:
          "Service бывает трёх видов — разница в том, КОМУ он виден:\n\n" +
          "  ClusterIP     — виден только внутри кластера. Это значение по умолчанию,\n" +
          "                  и 90% сервисов именно такие: база, кэш, внутреннее API.\n\n" +
          "  NodePort      — открывает один и тот же порт (30000-32767) на КАЖДОМ узле.\n" +
          "                  Грубо и неудобно, но работает без облака — часто так щупают\n" +
          "                  сервис в тестовом кластере на своём ноутбуке.\n\n" +
          "  LoadBalancer  — просит у облака (AWS/GCP/Yandex) настоящий внешний\n" +
          "                  балансировщик с публичным IP. Удобно, но каждый такой\n" +
          "                  Service — это отдельная строчка в счёте за облако.",
      },
      {
        kind: "say",
        text:
          "Манифест Service короткий:\n\n" +
          "  apiVersion: v1\n" +
          "  kind: Service\n" +
          "  metadata:\n" +
          "    name: api\n" +
          "  spec:\n" +
          "    selector:\n" +
          "      app: api          ← какие поды обслуживать (по метке)\n" +
          "    ports:\n" +
          "      - port: 80        ← на каком порту слушает САМ Service\n" +
          "        targetPort: 8080 ← на какой порт КОНТЕЙНЕРА переслать\n\n" +
          "Теперь любой в кластере обращается к  http://api  — и не думает про поды и их IP.",
      },
      {
        kind: "say",
        text:
          "Про  port  и  targetPort  спотыкаются вообще все новички, так что запомни сразу:\n\n" +
          "  port        — порт, по которому к Service стучатся ДРУГИЕ («звони на 80»)\n" +
          "  targetPort  — порт, который реально слушает приложение в контейнере (8080)\n\n" +
          "Если их перепутать местами, Service создастся без единой ошибки, get services\n" +
          "покажет красивую строчку — а запросы будут виснуть или получать «connection\n" +
          "refused». Потому что Service исправно пересылает трафик на порт, где никто\n" +
          "не слушает. Ошибки нет — просто тишина. Это очень раздражающий вид поломки.",
      },
      {
        kind: "do",
        text:
          "Задача: в манифесте указан только  port: 80 , а наше приложение слушает 8080.\n" +
          "Набери  edit service.yaml  и добавь строку  targetPort: 8080  под  port: 80 .",
        check: has("/home/devops/k8s/service.yaml", /targetPort:\s*8080/),
        answer: SERVICE_FULL,
        editFile: "/home/devops/k8s/service.yaml",
        hint: "В блоке ports, следом за  - port: 80 , с тем же отступом, что и  port :\n        targetPort: 8080",
      },
      {
        kind: "do",
        text: "Задача: примени манифест Service.",
        check: (w) => !!w.k8s && w.k8s.svcs.length > 0,
        answer: "kubectl apply -f service.yaml",
        hint: "Команда  kubectl apply -f service.yaml",
      },
      {
        kind: "type",
        text: "Посмотри сервисы. Набери:  kubectl get services",
        cmd: "kubectl get services",
      },
      {
        kind: "say",
        text:
          "Теперь — история из настоящего дежурства, за которую платят кровью.\n\n" +
          "Пятница, выкатывают api. В Deployment решили навести порядок и переименовали\n" +
          "метку подов с  app: api  на  app: api-v2 . Манифест Service при этом не трогали —\n" +
          "он же «про сеть, при чём тут метки».\n\n" +
          "Выкатились. Поды — все Running, RESTARTS 0, логи чистые, kubectl get pods\n" +
          "показывает идеальную картину. А магазин лежит: 503 на каждый запрос.",
      },
      {
        kind: "say",
        text:
          "Разгадка в том, что Service ищет поды ПО МЕТКЕ из своего selector. Метку\n" +
          "переименовали — Service больше никого не находит. У него просто пустой список\n" +
          "адресов, и слать трафик ему некуда.\n\n" +
          "Увидеть это можно одной командой — списком «живых адресов» за сервисом:\n\n" +
          "  $ kubectl get endpoints api\n" +
          "  NAME   ENDPOINTS   AGE\n" +
          "  api    <none>      40d\n\n" +
          "  ENDPOINTS: <none>  ← вот он, диагноз\n\n" +
          "Так и рождается правило: если поды Running, а сервис отвечает 503 — первым\n" +
          "делом смотри endpoints, а не логи приложения. В логах пусто, потому что до\n" +
          "приложения запрос вообще не доехал.",
      },
      {
        kind: "quiz",
        text:
          "Поды Running, логи чистые, но обращение к Service даёт 503.\n" +
          "kubectl get endpoints api показывает  ENDPOINTS: <none> . В чём причина?",
        options: [
          "selector у Service не совпадает с метками подов — Service не видит ни одного пода и слать трафик ему некуда",
          "Поды перегружены и не успевают отвечать",
          "Нужно перезапустить весь кластер",
          "У Service закончился срок действия",
        ],
        answer: 0,
        explain:
          "Пустой ENDPOINTS = «Service не нашёл ни одного подходящего пода». Почти всегда это разъехавшиеся " +
          "selector и labels. Лечится приведением метки в Deployment и selector в Service к одному значению.",
      },
      {
        kind: "quiz",
        text: "Какой тип Service выбрать для базы данных, к которой ходит только само приложение внутри кластера?",
        options: [
          "LoadBalancer — так надёжнее",
          "ClusterIP — снаружи база видна быть не должна, а внутри кластера её и так все найдут по имени",
          "NodePort — чтобы можно было подключиться с любого узла",
          "Для баз данных Service не нужен вовсе",
        ],
        answer: 1,
        explain:
          "ClusterIP — значение по умолчанию и правильный выбор для всего внутреннего. Выставлять базу наружу " +
          "через LoadBalancer — это и лишние деньги за облачный балансировщик, и открытая дверь в интернет.",
      },
      {
        kind: "quiz",
        text: "Зачем нужен Service, если поды и так работают?",
        options: [
          "Поды меняют IP при пересоздании; Service даёт постоянный адрес и балансирует запросы",
          "Service ускоряет запуск подов",
          "Без Service поды не запускаются",
        ],
        answer: 0,
        explain: "Deployment отвечает за количество подов, Service — за стабильный доступ к ним.",
      },
    ],
  },
  {
    id: "9.9",
    act: 9,
    title: "Масштабирование",
    xp: 20,
    intro: "Больше нагрузки — больше подов. Одной командой или правкой манифеста.",
    setup: (w) => {
      seedK8s(w);
      writeFile(w, "/home/devops/k8s/deploy.yaml", DEPLOY_OK);
      w.k8s = {
        deploys: [{ name: "api", replicas: 3, image: "shop:1.0", crash: false }],
        pods: [],
        svcs: [],
      };
      syncPods(w);
    },
    steps: [
      {
        kind: "say",
        text:
          "Пришла реклама, нагрузка выросла втрое. Нужно больше копий приложения.\n" +
          "В Kubernetes это одно число —  replicas .",
      },
      {
        kind: "say",
        text:
          "Быстрый способ, прямо на лету:\n\n" +
          "  kubectl scale deployment/api --replicas=5\n\n" +
          "  scale             — «измени количество»\n" +
          "  deployment/api    — какой Deployment\n" +
          "  --replicas=5      — сколько подов теперь держать\n\n" +
          "Kubernetes тут же создаст недостающие поды (было 3, станет 5).",
      },
      {
        kind: "watch",
        run: "kubectl scale deployment/api --replicas=5",
        note: "«deployment.apps/api scaled» — команда принята.",
      },
      {
        kind: "watch",
        run: "kubectl get pods",
        note: "Теперь 5 подов Running вместо трёх. Kubernetes добил недостающие.",
      },
      {
        kind: "do",
        text: "Задача: смасштабируй Deployment  api  до 5 реплик сам.",
        check: (w) => !!w.k8s && w.k8s.deploys.some((d) => d.replicas >= 5),
        answer: "kubectl scale deployment/api --replicas=5",
        hint: "Команда  kubectl scale deployment/api --replicas=5",
      },
      {
        kind: "say",
        text:
          "Важная оговорка:  kubectl scale  меняет только живой кластер, но НЕ файл\n" +
          "манифеста. Следующий  kubectl apply -f deploy.yaml  вернёт  replicas: 3  из файла.\n\n" +
          "Правильно: менять число в манифесте и коммитить (это же IaC), а  scale  оставить\n" +
          "для срочных случаев. Ещё есть автоскейлер (HPA) — он сам меняет replicas по нагрузке.",
      },
      {
        kind: "quiz",
        text: "Ты сделал  kubectl scale ... --replicas=5 , потом  kubectl apply -f deploy.yaml , где replicas: 3. Сколько подов останется?",
        options: ["3 — apply вернул значение из файла", "5 — scale важнее", "8 — числа сложатся"],
        answer: 0,
        explain:
          "apply приводит кластер к состоянию из файла. scale — временная ручная правка, apply её перетирает.",
      },
    ],
  },
  {
    id: "9.10",
    act: 9,
    title: "Самолечение: убить под",
    xp: 20,
    intro: "Удали под руками — и посмотри, что сделает Kubernetes.",
    setup: (w) => {
      seedK8s(w);
      writeFile(w, "/home/devops/k8s/deploy.yaml", DEPLOY_OK);
      w.k8s = {
        deploys: [{ name: "api", replicas: 3, image: "shop:1.0", crash: false }],
        pods: [],
        svcs: [],
      };
      syncPods(w);
    },
    steps: [
      {
        kind: "say",
        text:
          "Проверим самолечение на практике. Сейчас работает 3 пода. Мы удалим один\n" +
          "командой  kubectl delete pod ИМЯ  — как будто он упал.",
      },
      {
        kind: "watch",
        run: "kubectl get pods",
        note: "Три пода. Сейчас удалим один из них.",
      },
      {
        kind: "watch",
        run: "kubectl delete pod api-abc",
        note:
          '«pod "api-abc" deleted» — и сразу:\n' +
          "«Deployment тут же создал новый — это self-healing».\n\n" +
          "Реальность стала 2 пода, желаемое — 3. Reconcile loop увидел разницу и создал\n" +
          "недостающий. Ты для этого ничего не делал.",
      },
      {
        kind: "watch",
        run: "kubectl get pods",
        note: "Снова 3 пода. Один — новый (другое имя). Приложение потери не заметило.",
      },
      {
        kind: "do",
        text: "Задача: удали любой под сам (в симуляторе подойдёт имя  api-abc ).",
        // имя пода — случайный суффикс, поэтому проверяем сам факт вызова delete pod
        check: ranAny(/^kubectl\s+delete\s+pod\b/),
        answer: "kubectl delete pod api-abc",
        hint: "Команда  kubectl delete pod  и имя пода",
      },
      {
        kind: "quiz",
        text: "Ты удалил под руками. Что произойдёт дальше?",
        options: [
          "Deployment сразу создаст новый — реальность должна совпадать с желаемым числом",
          "Подов станет на один меньше навсегда",
          "Весь Deployment остановится",
        ],
        answer: 0,
        explain: "Это и есть self-healing. Именно поэтому в Kubernetes «уронить под» — не страшно.",
      },
    ],
  },
  {
    id: "9.11",
    act: 9,
    title: "Обновление и откат",
    xp: 25,
    intro: "Новый образ выкатывается плавно. Стало хуже — откат одной командой.",
    setup: (w) => {
      seedK8s(w);
      writeFile(w, "/home/devops/k8s/deploy.yaml", DEPLOY_OK);
      // Выкатили битую версию.
      w.k8s = {
        deploys: [{ name: "api", replicas: 3, image: "shop:3.0-beta", crash: true }],
        pods: [],
        svcs: [],
      };
      syncPods(w);
    },
    steps: [
      {
        kind: "say",
        text:
          "Когда ты меняешь  image  в манифесте и делаешь apply, Kubernetes катит обновление\n" +
          "ПЛАВНО (rolling update): поднимает пару новых подов, убеждается, что они живые,\n" +
          "гасит пару старых — и так, пока все не обновятся. Сервис при этом не падает.",
      },
      {
        kind: "watch",
        run: "kubectl get pods",
        note:
          "Но сейчас беда: выкатили  shop:3.0-beta , и поды в CrashLoopBackOff.\n" +
          "Новая версия сломана. Разбираться в бете некогда — сначала откат.",
      },
      {
        kind: "say",
        text:
          "Kubernetes хранит историю выкаток Deployment. Откат на предыдущую рабочую\n" +
          "версию — одна команда:\n\n" +
          "  kubectl rollout undo deployment/api\n\n" +
          "  rollout  — про выкатки этого Deployment\n" +
          "  undo     — «верни как было до последнего изменения»",
      },
      {
        kind: "do",
        text: "Задача: откати Deployment  api  на предыдущую версию.",
        check: (w) => !!w.k8s && w.k8s.deploys.every((d) => !d.crash),
        answer: "kubectl rollout undo deployment/api",
        hint: "Команда  kubectl rollout undo deployment/api",
      },
      {
        kind: "do",
        text: "Задача: проверь, что поды снова Running.",
        check: (w) => !!w.k8s && w.k8s.pods.length > 0 && w.k8s.pods.every((p) => p.status === "Running"),
        answer: "kubectl get pods",
        hint: "Команда  kubectl get pods",
      },
      {
        kind: "say",
        text:
          "Сервис восстановлен за секунды. Тот же принцип, что в Акте 7: сначала откат\n" +
          "(быстро), потом разбор, почему битая версия прошла проверки, и новый тест на этот\n" +
          "случай. Проверить статус выкатки можно командой  kubectl rollout status deployment/api .",
      },
    ],
  },
  {
    id: "9.12",
    act: 9,
    title: "ConfigMap и Secret",
    xp: 50,
    intro: "Настройки и пароли держат отдельно от образа — в объектах кластера.",
    setup: (w) => {
      seedK8s(w);
      w.templates = {
        "/home/devops/k8s/configmap.yaml":
          "# ЗАДАЧА: опиши ConfigMap по имени api-config с двумя ключами:\n" +
          "#   DB_URL: postgres://db-main/shop\n" +
          "#   LOG_LEVEL: info\n" +
          "# Сотри этот комментарий и впиши манифест (пример — в теории урока).\n",
        "/home/devops/k8s/secret.yaml":
          "# ЗАДАЧА: опиши Secret по имени api-secret с ключом DB_PASSWORD.\n" +
          "# Сотри этот комментарий и впиши манифест.\n",
      };
    },
    steps: [
      {
        kind: "say",
        text:
          "В инциденте 9.7 мы вписали  DB_URL  прямо в манифест Deployment. Для одной\n" +
          "переменной сойдёт, но настроек обычно десятки, и они разные для staging и prod.\n\n" +
          "Держать их в манифесте — как хардкодить пароль в коде (Акт 7). Для этого есть\n" +
          "отдельные объекты.",
      },
      {
        kind: "say",
        text:
          "  ConfigMap  — несекретные настройки: адреса сервисов, флаги, размеры пулов.\n" +
          "  Secret     — секретное: пароли, токены, ключи. Хранится закодированным,\n" +
          "               доступ к нему ограничивают отдельно.\n\n" +
          "Оба подключают к поду как переменные окружения или как файлы. Приложение\n" +
          "не знает разницы — просто читает переменную  DB_URL .",
      },
      {
        kind: "say",
        text:
          "Зачем это нужно — на примере одного очень плохого вторника.\n\n" +
          "Команда торопилась и вписала пароль от боевой базы прямо в манифест\n" +
          "Deployment. Манифест — это же инфраструктура как код, значит, он лежит в git.\n" +
          "Репозиторий был внутренний, и всех это устраивало ровно до того дня, когда\n" +
          "его зеркало по недосмотру сделали публичным.\n\n" +
          "Дальше — то, что бывает всегда: пароль меняют, но он прописан в четырёх\n" +
          "манифестах, двух CI-конфигах и в голове у одного разработчика. Ротация\n" +
          "заняла полдня, и всё это время никто не мог сказать, кто ещё успел\n" +
          "скачать репозиторий. И главное — пароль остался НАВСЕГДА в истории git,\n" +
          "даже после того, как строчку из файла убрали.",
      },
      {
        kind: "say",
        text:
          "Подключают ConfigMap и Secret к поду тремя разными способами — они решают\n" +
          "разные задачи, посмотри все три:\n\n" +
          "1) Целиком, все ключи сразу → переменные окружения. Самый частый способ:\n\n" +
          "     envFrom:\n" +
          "       - configMapRef:\n" +
          "           name: api-config\n\n" +
          "   Все ключи ConfigMap становятся переменными окружения контейнера.",
      },
      {
        kind: "say",
        text:
          "2) Один конкретный ключ под своим именем. Удобно, когда приложение ждёт\n" +
          "   переменную  DATABASE_PASSWORD , а в Secret ключ называется иначе:\n\n" +
          "     env:\n" +
          "       - name: DATABASE_PASSWORD\n" +
          "         valueFrom:\n" +
          "           secretKeyRef:\n" +
          "             name: api-secret\n" +
          "             key: DB_PASSWORD\n\n" +
          "3) Как ФАЙЛ внутри контейнера. Единственный вариант, когда настройка — это\n" +
          "   целый конфиг (nginx.conf, сертификат, application.yml):\n\n" +
          "     volumes:\n" +
          "       - name: cfg\n" +
          "         configMap:\n" +
          "           name: api-config\n\n" +
          "   ...и том монтируется в  /etc/app/ , где приложение и ищет свой конфиг.",
      },
      {
        kind: "do",
        text:
          "Задача: вынеси настройки в ConfigMap. Набери  edit configmap.yaml  и опиши\n" +
          "ConfigMap  api-config  с ключами  DB_URL  и  LOG_LEVEL . Сохрани.",
        check: (w) =>
          has("/home/devops/k8s/configmap.yaml", /kind:\s*ConfigMap/)(w) &&
          has("/home/devops/k8s/configmap.yaml", /DB_URL/)(w) &&
          has("/home/devops/k8s/configmap.yaml", /LOG_LEVEL/)(w),
        answer:
          "apiVersion: v1\n" +
          "kind: ConfigMap\n" +
          "metadata:\n" +
          "  name: api-config\n" +
          "data:\n" +
          "  DB_URL: postgres://db-main/shop\n" +
          "  LOG_LEVEL: info\n",
        editFile: "/home/devops/k8s/configmap.yaml",
        hint: "kind: ConfigMap, metadata.name: api-config, а под  data:  с отступом — две строки вида  DB_URL: postgres://db-main/shop",
      },
      {
        kind: "do",
        text: "Задача: примени ConfigMap в кластер.",
        check: (w) => !!w.k8s?.configMaps?.some((c) => c.name === "api-config"),
        answer: "kubectl apply -f configmap.yaml",
        hint: "kubectl apply -f configmap.yaml",
      },
      {
        kind: "type",
        text: "Посмотри, что получилось. Набери:  kubectl get configmaps",
        cmd: "kubectl get configmaps",
      },
      {
        kind: "say",
        text:
          "В колонке DATA — сколько ключей лежит в этом ConfigMap, дальше их имена.\n" +
          "Значения видно спокойно: тут нет ничего тайного, это адреса и флаги.\n\n" +
          "А вот пароль базы в такой список класть нельзя. Для него — Secret.",
      },
      {
        kind: "do",
        text:
          "Задача: теперь пароль. Набери  edit secret.yaml  и опиши Secret  api-secret\n" +
          "с ключом  DB_PASSWORD . Сохрани.",
        check: (w) =>
          has("/home/devops/k8s/secret.yaml", /kind:\s*Secret/)(w) &&
          has("/home/devops/k8s/secret.yaml", /DB_PASSWORD/)(w),
        answer:
          "apiVersion: v1\n" +
          "kind: Secret\n" +
          "metadata:\n" +
          "  name: api-secret\n" +
          "type: Opaque\n" +
          "stringData:\n" +
          "  DB_PASSWORD: super-secret-pw\n",
        editFile: "/home/devops/k8s/secret.yaml",
        hint: "kind: Secret, type: Opaque, а под  stringData:  строка  DB_PASSWORD: super-secret-pw",
      },
      {
        kind: "do",
        text: "Задача: примени Secret.",
        check: (w) => !!w.k8s?.secrets?.some((s) => s.name === "api-secret"),
        answer: "kubectl apply -f secret.yaml",
        hint: "kubectl apply -f secret.yaml",
      },
      {
        kind: "type",
        text: "Посмотри секреты. Набери:  kubectl get secrets",
        cmd: "kubectl get secrets",
      },
      {
        kind: "say",
        text:
          "Обрати внимание: в списке видны ИМЕНА ключей, но не значения. Так и задумано —\n" +
          "пароль не должен случайно оказаться в чьём-то скриншоте или в логах CI.\n\n" +
          "Кстати, про  stringData  и  data . В  stringData  пишут обычный текст, а Kubernetes\n" +
          "сам закодирует его в base64 при сохранении. В  data  значения кладут уже\n" +
          "закодированными. Разница только в удобстве.",
      },
      {
        kind: "say",
        text:
          "И сразу — главное заблуждение новичков про Secret, которое стоило многим\n" +
          "компаний утечки:\n\n" +
          "  base64 — ЭТО НЕ ШИФРОВАНИЕ.\n\n" +
          "Это просто способ записать любые байты буквами. Раскодировать может кто\n" +
          "угодно одной командой, ключ для этого не нужен вообще:\n\n" +
          "  $ echo c3VwZXItc2VjcmV0LXB3 | base64 -d\n" +
          "  super-secret-pw\n\n" +
          "Поэтому закоммитить Secret в git «он же закодирован» — ровно то же самое,\n" +
          "что закоммитить пароль открытым текстом. Настоящая защита Secret — это\n" +
          "ограничение доступа через RBAC (урок 9.21) плюс шифрование: SOPS,\n" +
          "Sealed Secrets или внешнее хранилище вроде Vault.",
      },
      {
        kind: "say",
        text:
          "Вторая классическая ловушка — уже не про безопасность, а про дежурство.\n\n" +
          "Ты поменял значение в ConfigMap, сделал apply, увидел «configmap/api-config\n" +
          "configured» — и ждёшь, что приложение подхватит новую настройку. Оно не\n" +
          "подхватывает. Час уходит на поиск несуществующего бага.\n\n" +
          "Причина простая: переменные окружения контейнер читает ОДИН РАЗ при старте.\n" +
          "Пока под не пересоздан, он живёт со старыми значениями. Поэтому после правки\n" +
          "ConfigMap поды надо перезапустить:\n\n" +
          "  kubectl rollout restart deployment/api\n\n" +
          "(Ключи, подключённые как ФАЙЛЫ через volume, — исключение: их содержимое\n" +
          "кластер со временем обновляет само. Но и там приложение должно уметь\n" +
          "перечитывать свой конфиг.)",
      },
      {
        kind: "say",
        text:
          "Что это даёт:\n\n" +
          "  • один и тот же образ едет в staging и prod — отличаются только ConfigMap/Secret\n" +
          "  • поменять настройку — не пересобирать образ, а обновить ConfigMap\n" +
          "  • пароли не лежат в git вместе с манифестами (для Secret есть отдельные\n" +
          "    инструменты шифрования: SOPS, Sealed Secrets, внешние хранилища)",
      },
      {
        kind: "quiz",
        text: "Чем ConfigMap отличается от Secret?",
        options: [
          "ConfigMap — несекретные настройки, Secret — пароли и ключи с ограниченным доступом",
          "ConfigMap для staging, Secret для prod",
          "Это одно и то же с разными именами",
        ],
        answer: 0,
        explain:
          "Оба выносят конфигурацию из образа. Secret дополнительно защищён и хранится закодированным.",
      },
      {
        kind: "quiz",
        text: "Коллега говорит: «Secret можно спокойно коммитить в git, он же в base64». Что не так?",
        options: [
          "Всё так, base64 — это надёжное шифрование",
          "base64 — это кодирование, а не шифрование: раскодировать может любой одной командой без ключа, так что в git попадёт фактически открытый пароль",
          "Ничего страшного, главное сделать репозиторий приватным",
          "Проблема только в том, что base64 занимает больше места",
        ],
        answer: 1,
        explain:
          "base64 нужен, чтобы хранить произвольные байты, а не чтобы прятать. Для git-репозитория секреты " +
          "шифруют (SOPS, Sealed Secrets) или держат снаружи (Vault), а доступ к самим Secret режут через RBAC.",
      },
      {
        kind: "quiz",
        text:
          "Ты поменял значение в ConfigMap и сделал apply — кластер ответил «configured».\n" +
          "Но приложение работает по-старому. Почему?",
        options: [
          "apply не применился, нужно повторить команду",
          "Переменные окружения контейнер читает один раз при старте — пока поды не пересозданы (kubectl rollout restart), они живут со старыми значениями",
          "ConfigMap нельзя менять после создания",
          "Нужно подождать сутки, пока кластер синхронизируется",
        ],
        answer: 1,
        explain:
          "Сам ConfigMap обновился мгновенно — не обновились ПОДЫ. Отсюда привычка: правка ConfigMap почти " +
          "всегда идёт в паре с  kubectl rollout restart deployment/... ",
      },
    ],
  },
  {
    id: "9.13",
    act: 9,
    title: "Проверка: развернуть сервис сам",
    xp: 35,
    intro: "С нуля: Deployment, применение, проверка подов, масштабирование.",
    setup: (w) => {
      seedK8s(w);
      w.templates = {
        "/home/devops/k8s/deploy.yaml":
          "# Опиши Deployment api: replicas 3, image shop:1.0, env DB_URL. Сотри этот комментарий.\n",
      };
    },
    steps: [
      {
        kind: "say",
        text:
          "Финал Акта 9. Разверни сервис в кластере самостоятельно. Всё знакомо;\n" +
          "ошибёшься — подсказка, ещё раз — готовый ответ.",
      },
      {
        kind: "do",
        text:
          "Шаг 1. Опиши Deployment  api : 3 реплики, образ shop:1.0, переменная DB_URL.\n" +
          "Набери:  edit deploy.yaml",
        check: (w) =>
          has("/home/devops/k8s/deploy.yaml", /kind:\s*Deployment/)(w) &&
          has("/home/devops/k8s/deploy.yaml", /replicas:\s*[2-9]/)(w) &&
          has("/home/devops/k8s/deploy.yaml", /DB_URL/)(w),
        answer: DEPLOY_OK,
        editFile: "/home/devops/k8s/deploy.yaml",
        hint: "Открой  edit deploy.yaml  и впиши полный манифест Deployment с блоком env DB_URL.",
      },
      {
        kind: "do",
        text: "Шаг 2. Примени манифест.",
        check: (w) => !!w.k8s && w.k8s.deploys.length > 0,
        answer: "kubectl apply -f deploy.yaml",
        hint: "Команда  kubectl apply -f deploy.yaml",
      },
      {
        kind: "do",
        text: "Шаг 3. Проверь, что поды запустились и в статусе Running.",
        check: (w) =>
          !!w.k8s &&
          w.k8s.pods.length > 0 &&
          w.k8s.pods.every((p) => p.status === "Running") &&
          ran(/^kubectl\s+get\s+pods?\b/)(w),
        answer: "kubectl get pods",
        hint: "Команда  kubectl get pods",
      },
      {
        kind: "do",
        text: "Шаг 4. Смасштабируй до 4 реплик.",
        check: (w) => !!w.k8s && w.k8s.deploys.some((d) => d.replicas >= 4),
        answer: "kubectl scale deployment/api --replicas=4",
        hint: "Команда  kubectl scale deployment/api --replicas=4",
      },
      {
        kind: "do",
        text: "Шаг 5. Убедись, что реплик стало больше.",
        check: ran(/^kubectl\s+get\s+deployments?\b/),
        answer: "kubectl get deployments",
        hint: "Команда  kubectl get deployments",
      },
      {
        kind: "say",
        text:
          "Хороший рубеж. Ты умеешь: объяснять оркестратор и желаемое состояние,\n" +
          "различать Pod/Deployment/Service, писать и применять манифесты,\n" +
          "диагностировать через get → describe → logs, чинить CrashLoopBackOff,\n" +
          "масштабировать, полагаться на self-healing, откатывать выкатку.\n\n" +
          "Это база. Дальше в этом же акте — то, о чём обязательно спросят на\n" +
          "собеседовании: ресурсы узлов, Pending-поды, liveness/readiness и\n" +
          "пространства имён.",
      },
    ],
  },
  {
    id: "9.14",
    act: 9,
    title: "Requests и limits: что кластер планирует",
    xp: 45,
    intro: "Прежде чем куда-то поставить под, планировщику нужно знать, сколько ему нужно места.",
    setup: (w) => {
      seedK8s(w);
      writeFile(w, "/home/devops/k8s/deploy.yaml", DEPLOY_OK);
      w.k8s = {
        deploys: [{ name: "api", replicas: 3, image: "shop:1.0", crash: false }],
        pods: [],
        svcs: [],
      };
      syncPods(w);
    },
    steps: [
      {
        kind: "say",
        text:
          "У каждого узла кластера конечное количество процессора и памяти. Когда ты\n" +
          "создаёшь под, планировщик Kubernetes должен решить: НА КАКОЙ узел его\n" +
          "поставить, чтобы там реально хватило ресурсов. Для этого в манифесте\n" +
          "указывают  requests  и  limits .",
      },
      {
        kind: "say",
        text:
          "  resources:\n" +
          "    requests:\n" +
          '      cpu: "250m"      ← гарантированный минимум (0.25 ядра)\n' +
          '      memory: "256Mi"\n' +
          "    limits:\n" +
          '      cpu: "500m"      ← жёсткий потолок\n' +
          '      memory: "512Mi"\n\n' +
          "requests  — то, что планировщик резервирует под под ГАРАНТИРОВАННО.\n" +
          "limits  — потолок, выше которого поду не дадут вырасти.",
      },
      {
        kind: "say",
        text:
          "Что будет при превышении:\n\n" +
          "  превышена память (limit)  → OOMKill, тот же убийца, что в Акте 2\n" +
          "  превышен CPU (limit)      → под не убивают, а «душат» (throttling) —\n" +
          "                               он просто работает медленнее\n\n" +
          "Без requests планировщик вообще не знает, сколько резервировать — и может\n" +
          "напихать на один узел подов больше, чем тот физически потянет.",
      },
      {
        kind: "say",
        text:
          "Теперь — зачем это на самом деле нужно. История называется «шумный сосед».\n\n" +
          "В кластере жил маленький безобидный сервис отчётов. Ему не поставили ни\n" +
          "requests, ни limits — «он же крошечный, чего там указывать». Полгода всё\n" +
          "было отлично.\n\n" +
          "Потом кто-то заказал отчёт за весь год. Сервис честно попытался собрать его\n" +
          "в памяти и начал расти: гигабайт, два, четыре. Limits нет — значит, потолка\n" +
          "нет, и он ел память узла, пока она не кончилась.",
      },
      {
        kind: "say",
        text:
          "Дальше начинается самое неприятное. Когда на узле кончается память, ядро\n" +
          "зовёт OOM killer (ты видел его в Акте 2) — и тот убивает процессы, чтобы\n" +
          "спасти узел. Но убивает он НЕ ТОЛЬКО виновника.\n\n" +
          "В ту ночь вместе с сервисом отчётов на том же узле легли платёжный шлюз и\n" +
          "две реплики api. Дежурный увидел падение платежей и полтора часа искал\n" +
          "проблему в платежах — потому что в голову не приходило, что виноват\n" +
          "отчётный сервис на соседнем поде.\n\n" +
          "Вот ради чего ставят limits: они не столько защищают сам под, сколько\n" +
          "защищают ОТ него всех соседей по узлу.",
      },
      {
        kind: "say",
        text:
          "Как подбирают цифры — три живых примера, они очень разные:\n\n" +
          "1) HTTP-API на Go или Node. Памяти ест мало и ровно, CPU скачет по нагрузке.\n" +
          "     requests: cpu 100m, memory 128Mi\n" +
          "     limits:   memory 256Mi, а CPU-limit часто НЕ ставят вовсе —\n" +
          "               чтобы на всплеске запросов сервис мог занять свободное ядро\n" +
          "               и ответить быстро, а не тормозить из-за троттлинга.",
      },
      {
        kind: "say",
        text:
          "2) Java-сервис. Тут особая ловушка: JVM смотрит на limit памяти контейнера и\n" +
          "   выбирает по нему размер кучи. Если поставить memory limit 512Mi и не\n" +
          "   настроить JVM, она может решить взять под кучу почти всё — и любой всплеск\n" +
          "   сверху кучи (потоки, метаданные) даст мгновенный OOMKill.\n" +
          "     requests: memory 1Gi, limits: memory 1Gi — и явно ограниченная куча внутри.\n\n" +
          "3) Ночная батч-задача (Job). Работает 20 минут и ей нужно МНОГО, но разово.\n" +
          "     requests: cpu 2, memory 4Gi — планировщик честно найдёт ей место.\n" +
          "   Здесь как раз жадные requests — правильно: лучше подождать свободный узел,\n" +
          "   чем встать в середине обработки.",
      },
      {
        kind: "do",
        text:
          "Задача: добавь ресурсы в наш манифест. Набери  edit deploy.yaml  и допиши\n" +
          "контейнеру блок  resources : requests cpu 250m / memory 256Mi,\n" +
          "limits memory 512Mi. Сохрани.",
        check: (w) =>
          has("/home/devops/k8s/deploy.yaml", /requests:/)(w) &&
          has("/home/devops/k8s/deploy.yaml", /memory:\s*"?256Mi/)(w) &&
          has("/home/devops/k8s/deploy.yaml", /limits:/)(w),
        answer: DEPLOY_RESOURCES,
        editFile: "/home/devops/k8s/deploy.yaml",
        hint:
          "Внутри контейнера, рядом с  image: , добавь:\n" +
          "          resources:\n" +
          "            requests:\n" +
          '              cpu: "250m"\n' +
          '              memory: "256Mi"\n' +
          "            limits:\n" +
          '              memory: "512Mi"',
      },
      {
        kind: "do",
        text: "Задача: примени обновлённый манифест.",
        check: (w) =>
          !!w.k8s && w.k8s.deploys.length > 0 && ranAny(/^kubectl\s+apply\s+-f\s+deploy\.yaml/)(w),
        answer: "kubectl apply -f deploy.yaml",
        hint: "kubectl apply -f deploy.yaml",
      },
      {
        kind: "say",
        text:
          "Есть ещё одна вещь, про которую спрашивают на собеседованиях: по соотношению\n" +
          "requests и limits Kubernetes сам раздаёт подам «класс качества» (QoS). От него\n" +
          "зависит, кого убьют ПЕРВЫМ, когда на узле кончится память:\n\n" +
          "  Guaranteed  — requests равны limits. Убивают в последнюю очередь.\n" +
          "                Так делают для баз и платежей.\n" +
          "  Burstable   — requests есть, но меньше limits. Обычный середняк.\n" +
          "  BestEffort  — не указано вообще ничего. Идут под нож ПЕРВЫМИ.\n\n" +
          "То есть под без requests и limits — это не «под без настроек». Это под,\n" +
          "который кластер считает наименее ценным в кластере. Тот самый сервис\n" +
          "отчётов, кстати, был BestEffort.",
      },
      {
        kind: "quiz",
        text:
          "Под с limits.memory 512Mi вырос до 600Mi. Соседний под с limits.cpu 500m\n" +
          "пытается занять целое ядро. Что произойдёт с каждым?",
        options: [
          "Первый под убьют (OOMKilled) и перезапустят; второй не убьют, а просто замедлят — CPU душат троттлингом",
          "Обоих убьют одинаково",
          "Обоих просто замедлят",
          "Ничего не произойдёт, limits — рекомендация",
        ],
        answer: 0,
        explain:
          "Память отобрать у процесса нельзя — её превышение лечится только убийством (OOMKilled, статус " +
          "виден в describe). CPU — ресурс делимый, его просто урезают по времени: под живёт, но работает медленнее.",
      },
      {
        kind: "quiz",
        text: "Чем requests отличается от limits?",
        options: [
          "requests — гарантированный минимум для планирования; limits — жёсткий потолок, выше которого не дадут вырасти",
          "requests — это CPU, limits — это память",
          "limits можно не указывать, они ни на что не влияют",
        ],
        answer: 0,
        explain:
          "Без requests планировщик размещает поды вслепую. Превышение memory limit убивает под, CPU limit — душит троттлингом.",
      },
    ],
  },
  {
    id: "9.15",
    act: 9,
    title: "Под завис в Pending ⚡",
    xp: 35,
    intro: "Статус Pending — это ещё не CrashLoopBackOff. Это совсем другая проблема.",
    setup: (w) => {
      seedK8s(w);
      writeFile(w, "/home/devops/k8s/deploy.yaml", DEPLOY_OK);
      w.k8s = {
        deploys: [{ name: "api", replicas: 3, image: "shop:1.0", crash: false }],
        pods: [],
        svcs: [],
        nodeCapacity: 2,
      };
      syncPods(w);
    },
    steps: [
      {
        kind: "say",
        text:
          "Жалоба: «часть подов api вообще не запускается, а логов от них нет».\n" +
          "Это подозрительно — у CrashLoopBackOff хотя бы есть логи падения. Смотрим статус.",
      },
      {
        kind: "do",
        text: "Шаг 1. Посмотри поды.",
        check: ran(/^kubectl\s+get\s+pods?\b/),
        answer: "kubectl get pods",
        hint: "kubectl get pods",
      },
      {
        kind: "say",
        text:
          "Два пода Running, один —  Pending . У Pending нет RESTARTS вообще: контейнер\n" +
          "ещё ни разу не запускался. Логов от него тоже не будет — планировщик даже не\n" +
          "нашёл, куда его поставить. Это проблема ПЛАНИРОВАНИЯ, а не приложения.",
      },
      {
        kind: "do",
        text: "Шаг 2. Посмотри события по зависшему поду (имя возьми из get pods).",
        check: ranAny(/^kubectl\s+describe\s+pod\b/),
        answer: "kubectl describe pod api-x",
        hint: "kubectl describe pod  и имя пода из get pods",
      },
      {
        kind: "say",
        text:
          "  Warning FailedScheduling  0/1 nodes are available: insufficient cpu/memory\n\n" +
          "Узлам кластера физически не хватает ресурсов под ещё один под. Это НЕ баг в\n" +
          "коде — искать его в  kubectl logs  бесполезно, там нечему появиться.",
      },
      {
        kind: "say",
        text:
          "Что обычно делают в такой ситуации:\n\n" +
          "  • добавить ещё один узел в кластер (реальные деньги — реальный сервер)\n" +
          "  • уменьшить requests, если они были поставлены с большим запасом\n" +
          "  • подвинуть менее важную нагрузку в сторону, освободив место\n" +
          "  • на время — уменьшить число реплик до того, что реально помещается",
      },
      {
        kind: "do",
        text: "Шаг 3. Пока не добавили узел — временно уменьши число реплик до 2, чтобы флот был здоровым.",
        check: (w) => !!w.k8s && w.k8s.deploys.some((d) => d.replicas === 2),
        answer: "kubectl scale deployment/api --replicas=2",
        hint: "kubectl scale deployment/api --replicas=2",
      },
      {
        kind: "do",
        text: "Шаг 4. Проверь — все оставшиеся поды должны быть Running.",
        check: (w) => !!w.k8s && w.k8s.pods.length > 0 && w.k8s.pods.every((p) => p.status === "Running"),
        answer: "kubectl get pods",
        hint: "kubectl get pods",
      },
      {
        kind: "quiz",
        text: "Под в статусе Pending уже 10 минут, RESTARTS нет и logs пустые. Куда смотреть в первую очередь?",
        options: [
          "kubectl describe pod — раздел Events почти наверняка назовёт причину: нехватка ресурсов на узлах или похожая проблема планирования",
          "kubectl logs — там наверняка есть трейсбек",
          "Перезапустить весь кластер",
        ],
        answer: 0,
        explain:
          "Pending — под ещё не запускался, значит logs пуст по определению. Причина всегда в Events через describe.",
      },
    ],
  },
  {
    id: "9.16",
    act: 9,
    title: "Liveness и readiness: две разные проверки",
    xp: 45,
    intro: "Их путают чаще всего на собеседовании — и путаница дорого стоит в проде.",
    setup: (w) => {
      seedK8s(w);
      writeFile(w, "/home/devops/k8s/deploy.yaml", DEPLOY_OK);
      w.k8s = {
        deploys: [{ name: "api", replicas: 3, image: "shop:1.0", crash: false }],
        pods: [],
        svcs: [],
      };
      syncPods(w);
    },
    steps: [
      {
        kind: "say",
        text:
          "Kubernetes сам не знает, здорово ли приложение внутри пода — «поднялся» ещё\n" +
          "не значит «готов работать». Для этого в манифесте задают ПРОБЫ (probes) —\n" +
          "периодические проверки здоровья. Их два вида, и путать их нельзя.",
      },
      {
        kind: "say",
        text:
          "  livenessProbe   — «жив ли контейнер вообще?»\n" +
          "                    Провалилась → Kubernetes считает контейнер зависшим\n" +
          "                    и ПЕРЕЗАПУСКАЕТ его.\n\n" +
          "  readinessProbe  — «готов ли контейнер принимать трафик ПРЯМО СЕЙЧАС?»\n" +
          "                    Провалилась → под временно убирают из Service (трафик\n" +
          "                    не идёт), но НЕ перезапускают.",
      },
      {
        kind: "say",
        text:
          "Почему разница критична. Представь: приложение при старте 30 секунд\n" +
          "прогревает кэш. Если на это время нет readinessProbe (или её перепутали с\n" +
          "liveness) — Service начнёт слать туда трафик до готовности, пользователи\n" +
          "получат ошибки. А если СЛИШКОМ агрессивная livenessProbe решит, что\n" +
          "медленный прогрев — это «зависание», она будет перезапускать под\n" +
          "бесконечно, так и не дав ему прогреться. Это устраивает свой личный\n" +
          "рестарт-шторм, знакомый по Акту 2.",
      },
      {
        kind: "say",
        text:
          "Как это выглядит на дежурстве — реальный сценарий, который случается\n" +
          "буквально у всех хотя бы раз.\n\n" +
          "Выкатываем новую версию api. Rolling update идёт красиво: Kubernetes гасит\n" +
          "старый под, поднимает новый, видит «контейнер запустился» — и считает его\n" +
          "готовым. Service тут же начинает слать на него запросы.\n\n" +
          "Но приложению нужно 25 секунд, чтобы поднять пул соединений к базе и\n" +
          "прогреть кэш. Все эти 25 секунд оно отвечает пятисотками. Умножь на\n" +
          "количество подов — и вся выкатка превращается в несколько минут ошибок\n" +
          "у живых пользователей.",
      },
      {
        kind: "say",
        text:
          "И самое обидное: в мониторинге всё зелёное. Поды Running, рестартов нет,\n" +
          "деплой «успешен», kubectl rollout status рапортует об успехе. Ошибки видят\n" +
          "только пользователи и график 5xx.\n\n" +
          "Лечится одной строчкой — readinessProbe. С ней Kubernetes НЕ пускает трафик\n" +
          "в под, пока проба не ответит «готов». Под поднимается, 25 секунд молча\n" +
          "прогревается вне ротации, и только потом Service добавляет его к себе.\n\n" +
          "Вывод, который стоит запомнить намертво: liveness спасает от ЗАВИСШИХ\n" +
          "подов, а readiness — от ошибок при КАЖДОЙ выкатке. На практике вторая\n" +
          "экономит гораздо больше нервов.",
      },
      {
        kind: "say",
        text:
          "Пробы бывают трёх видов — по способу проверки. Выбирают по тому, что\n" +
          "приложение вообще умеет:\n\n" +
          "1) HTTP GET — для всего, что отвечает по HTTP. Самый частый вариант:\n\n" +
          "     readinessProbe:\n" +
          "       httpGet:\n" +
          "         path: /healthz\n" +
          "         port: 8080\n\n" +
          "   Код ответа 200-399 — здоров, всё остальное — нет.",
      },
      {
        kind: "say",
        text:
          "2) TCP-сокет — для того, что не говорит по HTTP: база, брокер очередей.\n" +
          "   Проверяется только одно: порт открыт и принимает соединение.\n\n" +
          "     livenessProbe:\n" +
          "       tcpSocket:\n" +
          "         port: 5432\n\n" +
          "3) exec — запустить команду внутри контейнера, успех = код возврата 0.\n" +
          "   Спасает, когда здоровье нельзя проверить снаружи:\n\n" +
          "     livenessProbe:\n" +
          "       exec:\n" +
          '         command: ["pg_isready", "-U", "postgres"]',
      },
      {
        kind: "say",
        text:
          "У каждой пробы есть тайминги, и именно в них прячутся неприятности:\n\n" +
          "  initialDelaySeconds: 10  — подождать перед ПЕРВОЙ проверкой\n" +
          "  periodSeconds: 5         — как часто проверять\n" +
          "  failureThreshold: 3      — сколько провалов подряд считать приговором\n\n" +
          "Для медленного старта есть третья, отдельная проба — startupProbe. Пока она\n" +
          "не прошла, liveness и readiness ВООБЩЕ не запускаются. Это правильный ответ\n" +
          "для приложения, которое стартует полторы минуты: не нужно раздувать\n" +
          "initialDelaySeconds у liveness (и тем самым откладывать защиту от зависаний\n" +
          "на всю жизнь пода) — достаточно дать startupProbe щедрый лимит на старт.",
      },
      {
        kind: "do",
        text:
          "Задача: добавь подам проверки здоровья. Набери  edit deploy.yaml  и допиши\n" +
          "контейнеру  readinessProbe  и  livenessProbe  — обе HTTP GET на  /healthz , порт 8080.\n" +
          "Сохрани.",
        check: (w) =>
          has("/home/devops/k8s/deploy.yaml", /readinessProbe:/)(w) &&
          has("/home/devops/k8s/deploy.yaml", /livenessProbe:/)(w) &&
          has("/home/devops/k8s/deploy.yaml", /path:\s*\/healthz/)(w),
        answer: DEPLOY_PROBES,
        editFile: "/home/devops/k8s/deploy.yaml",
        hint:
          "Внутри контейнера, рядом с  image: , добавь два блока:\n" +
          "          readinessProbe:\n" +
          "            httpGet:\n" +
          "              path: /healthz\n" +
          "              port: 8080\n" +
          "          livenessProbe:\n" +
          "            httpGet:\n" +
          "              path: /healthz\n" +
          "              port: 8080",
      },
      {
        kind: "do",
        text: "Задача: примени манифест с пробами.",
        check: (w) =>
          !!w.k8s && w.k8s.deploys.length > 0 && ranAny(/^kubectl\s+apply\s+-f\s+deploy\.yaml/)(w),
        answer: "kubectl apply -f deploy.yaml",
        hint: "kubectl apply -f deploy.yaml",
      },
      {
        kind: "say",
        text:
          "Напоследок — ошибка, которая превращает пробу из защиты в оружие против\n" +
          "тебя самого. Называется «каскадный отказ».\n\n" +
          "Кажется логичным сделать readinessProbe честной: пусть  /healthz  сходит\n" +
          "в базу и проверит, что она отвечает. Тогда под, потерявший базу, сам\n" +
          "выйдет из ротации. Красиво?\n\n" +
          "Нет. База моргнула на пять секунд — и проба провалилась СРАЗУ У ВСЕХ подов,\n" +
          "потому что база у них общая. Все до одного вылетели из Service одновременно.\n" +
          "У сервиса стало ноль живых адресов, и пятисекундная икота базы превратилась\n" +
          "в полный отказ сервиса, который сам себя уже не чинит.",
      },
      {
        kind: "say",
        text:
          "Поэтому правило такое:\n\n" +
          "  • проба проверяет ТОЛЬКО сам контейнер — «я жив, я могу обслуживать»\n" +
          "  • зависимости (база, соседний сервис) в пробу не тянут\n" +
          "  • livenessProbe делают максимально тупой и дешёвой: она умеет\n" +
          "    ПЕРЕЗАПУСКАТЬ, а значит, ошибка в ней стоит дороже всего\n\n" +
          "Отдельно проверять здоровье базы — работа мониторинга (Акт 11), а не пробы.",
      },
      {
        kind: "quiz",
        text:
          "Приложение стартует 90 секунд. Дежурный поставил livenessProbe с\n" +
          "initialDelaySeconds: 10. Что будет происходить с подом?",
        options: [
          "Он спокойно запустится — liveness подождёт, сколько нужно",
          "Через 10 секунд проба начнёт падать, Kubernetes сочтёт под зависшим и перезапустит его — и так по кругу, под никогда не доживёт до готовности",
          "Под перейдёт в Pending",
          "Kubernetes сам увеличит задержку",
        ],
        answer: 1,
        explain:
          "Это классический самодельный CrashLoopBackOff: приложение исправно, убивает его собственная проба. " +
          "Правильное решение — startupProbe с запасом на старт, после которой уже включаются liveness и readiness.",
      },
      {
        kind: "quiz",
        text: "Почему readinessProbe не стоит делать так, чтобы она ходила в базу данных?",
        options: [
          "Это слишком медленно работает",
          "База общая для всех подов: если она моргнёт, пробы провалятся у всех разом, все поды одновременно выпадут из Service — и короткий сбой базы превратится в полный отказ сервиса",
          "Kubernetes запрещает сетевые запросы в пробах",
          "Никакой проблемы нет, так и надо делать",
        ],
        answer: 1,
        explain:
          "Проба отвечает за здоровье СВОЕГО контейнера. Как только в неё попадает общая зависимость, " +
          "она начинает синхронно выкашивать весь сервис — это и есть каскадный отказ.",
      },
      {
        kind: "quiz",
        text: "В чём разница между liveness и readiness пробами?",
        options: [
          "liveness: под завис — перезапустить; readiness: под не готов — временно убрать из Service, но НЕ перезапускать",
          "Это два названия одной и той же проверки",
          "liveness проверяет память, readiness — процессор",
        ],
        answer: 0,
        explain: "Перепутать их — либо рестарт-шторм на медленном старте, либо трафик идёт на неготовый под.",
      },
    ],
  },
  {
    id: "9.17",
    act: 9,
    title: "Пространства имён: свой уголок в общем кластере",
    xp: 20,
    intro: "Один кластер, несколько команд — у каждой свой namespace, чтобы не мешать друг другу.",
    steps: [
      {
        kind: "say",
        text:
          "В компании один физический кластер Kubernetes часто делят между командами:\n" +
          "у команды заказов свои Deployment и Service, у команды платежей — свои.\n" +
          "Без разделения имена бы конфликтовали, а команда заказов могла бы случайно\n" +
          "увидеть или задеть чужое.",
      },
      {
        kind: "say",
        text:
          "Решение — «пространство имён» (namespace): логическая перегородка внутри\n" +
          "одного кластера.\n\n" +
          "  kubectl get pods -n payments     — поды только в namespace payments\n" +
          "  kubectl apply -f deploy.yaml -n orders\n\n" +
          "Без  -n  команды работают в namespace  default . Имя  api  в namespace\n" +
          "orders и имя  api  в namespace payments — два РАЗНЫХ объекта, не конфликтуют.",
      },
      {
        kind: "say",
        text:
          "Типичное разделение по окружениям в одном кластере:\n\n" +
          "  namespace staging   — тестовое окружение\n" +
          "  namespace production — боевое\n\n" +
          "На namespace можно повесить отдельные ограничения по ресурсам (quota) и\n" +
          "права доступа (RBAC) — у команды заказов нет доступа менять что-то в\n" +
          "namespace платежей, даже случайно.",
      },
      {
        kind: "quiz",
        text: "Зачем нужны namespaces в Kubernetes?",
        options: [
          "Логически разделить один кластер между командами/окружениями — свои имена, ресурсы и права доступа",
          "Ускорить работу подов",
          "Namespace — это просто синоним Deployment",
        ],
        answer: 0,
        explain:
          "Один физический кластер, много изолированных «комнат» — имена не конфликтуют, доступ разграничен.",
      },
    ],
  },
  {
    id: "9.18",
    act: 9,
    title: "Финал акта: тесно в кластере ⚡⚡",
    xp: 50,
    intro: "Выкатка новой версии не помещается в кластер. Разберись и наведи порядок.",
    setup: (w) => {
      seedK8s(w);
      writeFile(w, "/home/devops/k8s/deploy.yaml", DEPLOY_OK);
      w.k8s = {
        deploys: [{ name: "api", replicas: 4, image: "shop:1.0", crash: false }],
        pods: [],
        svcs: [],
        nodeCapacity: 3,
      };
      syncPods(w);
    },
    steps: [
      {
        kind: "say",
        text:
          "Команда попросила поднять число реплик api до 4 перед завтрашней распродажей.\n" +
          "Применили — а часть подов не поднимается. Разберись и приведи кластер в\n" +
          "здоровое состояние.",
      },
      {
        kind: "do",
        text: "Шаг 1. Посмотри поды.",
        check: ran(/^kubectl\s+get\s+pods?\b/),
        answer: "kubectl get pods",
        hint: "kubectl get pods",
      },
      {
        kind: "do",
        text: "Шаг 2. Посмотри события у зависшего пода.",
        check: ranAny(/^kubectl\s+describe\s+pod\b/),
        answer: "kubectl describe pod api-x",
        hint: "kubectl describe pod  и имя пода из get pods",
      },
      {
        kind: "say",
        text:
          "FailedScheduling — узлам не хватает места на 4-й под. Это не баг в коде,\n" +
          "чинить манифест бессмысленно. До того как добавят узел, безопасно вернуться\n" +
          "к числу реплик, которое кластер реально тянет.",
      },
      {
        kind: "do",
        text: "Шаг 3. Верни число реплик до 3 — ровно то, что кластер может разместить.",
        check: (w) => !!w.k8s && w.k8s.deploys.some((d) => d.replicas === 3),
        answer: "kubectl scale deployment/api --replicas=3",
        hint: "kubectl scale deployment/api --replicas=3",
      },
      {
        kind: "do",
        text: "Шаг 4. Убедись, что все поды снова Running.",
        check: (w) => !!w.k8s && w.k8s.pods.length > 0 && w.k8s.pods.every((p) => p.status === "Running"),
        answer: "kubectl get pods",
        hint: "kubectl get pods",
      },
      {
        kind: "say",
        text:
          "Кластер здоров. Осталось поставить настоящую задачу — на инфраструктуру:\n" +
          "добавить узел (или включить автоскейлер узлов), чтобы к распродаже 4\n" +
          "реплики помещались без танцев со scale.\n\n" +
          "Акт 9 пройден полностью. Дальше — дежурство по проду: инциденты, алерты\n" +
          "и то, как всё это держится вместе под давлением.",
      },
    ],
  },
  {
    id: "9.19",
    act: 9,
    title: "Вход снаружи: Ingress",
    xp: 45,
    intro: "Service даёт стабильный адрес ВНУТРИ кластера. Снаружи, из интернета, по нему не достучаться.",
    setup: (w) => {
      seedK8s(w);
      writeFile(w, "/home/devops/k8s/deploy.yaml", DEPLOY_OK);
      writeFile(w, "/home/devops/k8s/service.yaml", SERVICE_YAML);
      w.k8s = { deploys: [], pods: [], svcs: [] };
    },
    steps: [
      {
        kind: "say",
        text:
          "Service отвечает на вопрос «как одним подам достучаться до других внутри кластера».\n" +
          "Но у обычного Service нет адреса, который понимает браузер снаружи. Открывать для\n" +
          "КАЖДОГО сервиса отдельный внешний IP — дорого и неудобно, если сервисов десятки.\n\n" +
          "Ingress — это один общий «вход» в кластер, который смотрит на домен и путь в запросе\n" +
          "и решает, к какому Service его направить.",
      },
      {
        kind: "say",
        text:
          "Пример:\n\n" +
          "  apiVersion: networking.k8s.io/v1\n" +
          "  kind: Ingress\n" +
          "  metadata:\n" +
          "    name: shop-ingress\n" +
          "  spec:\n" +
          "    rules:\n" +
          "      - host: shop.local\n" +
          "        http:\n" +
          "          paths:\n" +
          "            - path: /\n" +
          "              backend:\n" +
          "                service:\n" +
          "                  name: api\n" +
          "                  port:\n" +
          "                    number: 80\n\n" +
          "Читается так: «запрос на домен shop.local с путём / отправь в Service api на порт 80».",
      },
      {
        kind: "say",
        text:
          "Прежде чем писать манифест — про грабли, на которые наступает примерно\n" +
          "каждый, кто трогает Ingress впервые.\n\n" +
          "Ingress — это НЕ программа. Это просто запись правил, лист бумаги. Чтобы\n" +
          "правила кто-то исполнял, в кластере должен быть установлен ingress-контроллер\n" +
          "(чаще всего ingress-nginx, в облаках — свой) — вот он и есть тот процесс,\n" +
          "который реально принимает запросы из интернета.",
      },
      {
        kind: "say",
        text:
          "Как это выглядит в жизни: человек пишет манифест, применяет, видит\n" +
          "«ingress.networking.k8s.io/shop-ingress created», радуется — и получает\n" +
          "в браузере пустоту. Час уходит на проверку манифеста, в котором всё верно.\n\n" +
          "Подсказка была прямо в выводе:\n\n" +
          "  $ kubectl get ingress\n" +
          "  NAME           HOSTS        ADDRESS   PORTS   AGE\n" +
          "  shop-ingress   shop.local             80      3m\n\n" +
          "  ADDRESS пустой  ← правило есть, исполнять его некому\n\n" +
          "Пустой ADDRESS — почти всегда «контроллер не установлен» либо «он не\n" +
          "подхватил этот Ingress» (не тот ingressClassName). Манифест тут ни при чём.",
      },
      {
        kind: "do",
        text: "Шаг 1. Сначала подними сам сервис — примени Deployment и Service.",
        check: (w) => !!w.k8s && w.k8s.deploys.length > 0 && w.k8s.svcs.length > 0,
        answer: "kubectl apply -f deploy.yaml\nkubectl apply -f service.yaml",
        hint: "kubectl apply -f deploy.yaml, затем kubectl apply -f service.yaml",
      },
      {
        kind: "do",
        text:
          "Шаг 2. Опиши Ingress: домен  shop.local , путь  / , backend — сервис  api  на порту 80.\n" +
          "Набери:  edit ingress.yaml",
        check: (w) =>
          has("ingress.yaml", /kind:\s*Ingress/)(w) &&
          has("ingress.yaml", /host:\s*shop\.local/)(w) &&
          has("ingress.yaml", /service:\s*\n\s*name:\s*api/)(w),
        answer:
          "apiVersion: networking.k8s.io/v1\n" +
          "kind: Ingress\n" +
          "metadata:\n" +
          "  name: shop-ingress\n" +
          "spec:\n" +
          "  rules:\n" +
          "    - host: shop.local\n" +
          "      http:\n" +
          "        paths:\n" +
          "          - path: /\n" +
          "            backend:\n" +
          "              service:\n" +
          "                name: api\n" +
          "                port:\n" +
          "                  number: 80\n",
        editFile: "/home/devops/k8s/ingress.yaml",
        hint: "kind: Ingress, host: shop.local, backend → service → name: api, port → number: 80.",
      },
      {
        kind: "do",
        text: "Шаг 3. Примени манифест Ingress.",
        check: ranAny(/^kubectl\s+apply\s+-f\s+ingress\.yaml/),
        answer: "kubectl apply -f ingress.yaml",
        hint: "kubectl apply -f ingress.yaml",
      },
      {
        kind: "do",
        text: "Шаг 4. Проверь, что вход настроен.",
        check: ran(/^kubectl\s+get\s+ing/),
        answer: "kubectl get ingress",
        hint: "kubectl get ingress",
      },
      {
        kind: "say",
        text:
          "Ради чего вообще городят Ingress — три задачи, которые он закрывает.\n" +
          "Они разные, и в реальном кластере обычно работают все три сразу.\n\n" +
          "1) Один домен, разные пути — разные сервисы. Так собирают «единый сайт»\n" +
          "   из нескольких независимых команд:\n\n" +
          "     - path: /api      → service: api\n" +
          "     - path: /images   → service: media\n" +
          "     - path: /         → service: frontend\n\n" +
          "   Снаружи это один shop.ru, внутри — три разных Deployment.",
      },
      {
        kind: "say",
        text:
          "2) Разные домены — на один вход. Один внешний IP обслуживает всё:\n\n" +
          "     - host: shop.ru        → service: frontend\n" +
          "     - host: api.shop.ru    → service: api\n" +
          "     - host: admin.shop.ru  → service: admin\n\n" +
          "   Без Ingress каждому понадобился бы свой LoadBalancer, то есть свой\n" +
          "   платный внешний адрес. Три сервиса — тройной счёт от облака. Сорок\n" +
          "   сервисов — сам понимаешь.",
      },
      {
        kind: "say",
        text:
          "3) HTTPS в одном месте. Сертификат кладут в Secret и ссылаются на него:\n\n" +
          "     spec:\n" +
          "       tls:\n" +
          "         - hosts: [shop.ru]\n" +
          "           secretName: shop-tls\n\n" +
          "   Шифрование заканчивается на Ingress, дальше внутри кластера трафик идёт\n" +
          "   обычным HTTP. Это называется «TLS termination», и это очень удобно:\n" +
          "   сертификат обновляется в ОДНОМ месте, а не в сорока приложениях.\n" +
          "   Обычно рядом ставят cert-manager, который сам продлевает Let's Encrypt —\n" +
          "   и про «ой, у нас протух сертификат на проде» можно забыть навсегда.",
      },
      {
        kind: "quiz",
        text:
          "Ты применил Ingress, kubectl get ingress показывает его в списке,\n" +
          "но колонка ADDRESS пустая и сайт не открывается. Первая версия?",
        options: [
          "Ошибка в манифесте — надо переписать правила",
          "В кластере не установлен (или не подхватил этот Ingress) ingress-контроллер: правило создано, но исполнять его некому",
          "Нужно перезапустить поды приложения",
          "Service удалён",
        ],
        answer: 1,
        explain:
          "Ingress сам по себе ничего не делает — это только запись правил. Работу выполняет контроллер " +
          "(ingress-nginx и подобные). Нет контроллера или не совпал ingressClassName — ADDRESS так и останется пустым.",
      },
      {
        kind: "quiz",
        text: "Чем Ingress отличается от Service?",
        options: [
          "Ничем, это два названия одного и того же",
          "Service — стабильный адрес ВНУТРИ кластера, Ingress — единая точка входа снаружи по домену/пути",
          "Ingress нужен только для баз данных",
          "Service работает только с одним подом, Ingress — с несколькими",
        ],
        answer: 1,
        explain:
          "Service решает внутреннюю задачу («под умер — трафик тут же нашёл живой»). Ingress решает внешнюю: " +
          "один вход в кластер, который по домену и пути раскидывает запросы на нужные Service.",
      },
    ],
  },
  {
    id: "9.20",
    act: 9,
    title: "Разовая задача: Job",
    xp: 25,
    intro:
      "Перед релизом нужно один раз прогнать миграцию базы. Deployment для этого не подходит — он держит процесс живым вечно.",
    setup: (w) => {
      seedK8s(w);
    },
    steps: [
      {
        kind: "say",
        text:
          "Deployment создан для процессов, которые должны работать ПОСТОЯННО: под упал —\n" +
          "тут же поднялся новый. Но у миграции базы данных другая природа: она должна\n" +
          "выполниться РОВНО ОДИН РАЗ и завершиться. Если обернуть её в Deployment, Kubernetes\n" +
          "решит, что процесс упал, и будет перезапускать миграцию бесконечно.\n\n" +
          "Для одноразовых задач в Kubernetes есть отдельный тип ресурса — Job.",
      },
      {
        kind: "say",
        text:
          "Манифест Job почти как у Deployment, только  kind: Job  и без replicas:\n\n" +
          "  apiVersion: batch/v1\n" +
          "  kind: Job\n" +
          "  metadata:\n" +
          "    name: db-migrate\n" +
          "  spec:\n" +
          "    template:\n" +
          "      spec:\n" +
          "        containers:\n" +
          "          - name: migrate\n" +
          "            image: shop-migrate:1.0\n" +
          "        restartPolicy: Never",
      },
      {
        kind: "do",
        text: "Задача: опиши Job миграции базы (образ shop-migrate:1.0). Набери:  edit job.yaml",
        check: (w) => has("job.yaml", /kind:\s*Job/)(w) && has("job.yaml", /image:\s*shop-migrate:1\.0/)(w),
        answer:
          "apiVersion: batch/v1\n" +
          "kind: Job\n" +
          "metadata:\n" +
          "  name: db-migrate\n" +
          "spec:\n" +
          "  template:\n" +
          "    spec:\n" +
          "      containers:\n" +
          "        - name: migrate\n" +
          "          image: shop-migrate:1.0\n" +
          "      restartPolicy: Never\n",
        editFile: "/home/devops/k8s/job.yaml",
        hint: "kind: Job, containers[0].image: shop-migrate:1.0",
      },
      {
        kind: "do",
        text: "Задача: примени манифест.",
        check: (w) => !!w.k8s?.jobs?.some((j) => j.image === "shop-migrate:1.0"),
        answer: "kubectl apply -f job.yaml",
        hint: "kubectl apply -f job.yaml",
      },
      {
        kind: "do",
        text: "Задача: убедись, что задача выполнилась до конца.",
        check: ran(/^kubectl\s+get\s+job/),
        answer: "kubectl get jobs",
        hint: "kubectl get jobs",
      },
      {
        kind: "quiz",
        text: "Почему миграцию БД нельзя запускать через Deployment?",
        options: [
          "Deployment вообще не умеет запускать контейнеры",
          "Deployment следит, чтобы процесс работал ПОСТОЯННО, и будет бесконечно перезапускать завершившуюся миграцию",
          "Deployment требует Service рядом",
          "Разницы нет, оба варианта равнозначны",
        ],
        answer: 1,
        explain:
          "Deployment = «этот процесс должен жить вечно». Job = «выполнись один раз и остановись». " +
          "Разная семантика для разных задач.",
      },
    ],
  },
  {
    id: "9.21",
    act: 9,
    title: "Кому что можно: RBAC",
    xp: 30,
    intro:
      "Мониторингу нужно ЧИТАТЬ список подов. Не создавать, не удалять — только читать. Как это ограничить?",
    setup: (w) => {
      seedK8s(w);
    },
    steps: [
      {
        kind: "say",
        text:
          "По умолчанию под может действовать в кластере с очень скромными правами — и это правильно:\n" +
          "чем меньше прав у сервиса, тем меньше вреда от взлома или ошибки в его коде.\n\n" +
          "Когда сервису реально нужны права (например, мониторингу — читать список подов),\n" +
          "их выдают точечно через RBAC (Role-Based Access Control, «доступ по ролям»).\n" +
          "Три детали пазла: ServiceAccount (кто), Role (что можно) и RoleBinding (связка).",
      },
      {
        kind: "do",
        text:
          "Шаг 1. Заведи «личность» для мониторинга — ServiceAccount monitoring-sa.\n" +
          "Набери:  edit sa.yaml",
        check: (w) =>
          has("sa.yaml", /kind:\s*ServiceAccount/)(w) && has("sa.yaml", /name:\s*monitoring-sa/)(w),
        answer: "apiVersion: v1\nkind: ServiceAccount\nmetadata:\n  name: monitoring-sa\n",
        editFile: "/home/devops/k8s/sa.yaml",
        hint: "kind: ServiceAccount, metadata.name: monitoring-sa",
      },
      {
        kind: "do",
        text: "Примени файл.",
        check: (w) => !!w.k8s?.serviceAccounts?.includes("monitoring-sa"),
        answer: "kubectl apply -f sa.yaml",
        hint: "kubectl apply -f sa.yaml",
      },
      {
        kind: "say",
        text:
          "Теперь опиши, ЧТО разрешено — Role. Ей всё равно, кому она достанется, она просто\n" +
          "список разрешений:\n\n" +
          "  rules:\n" +
          '    - resources: ["pods"]\n' +
          '      verbs: ["get", "list"]\n\n' +
          "Можно читать поды (get, list) — и всё. Не создавать, не удалять.",
      },
      {
        kind: "do",
        text: "Шаг 2. Опиши Role pod-reader с этими правами. Набери:  edit role.yaml",
        check: (w) => has("role.yaml", /kind:\s*Role/)(w) && has("role.yaml", /verbs:\s*\["get"/)(w),
        answer:
          "apiVersion: rbac.authorization.k8s.io/v1\n" +
          "kind: Role\n" +
          "metadata:\n" +
          "  name: pod-reader\n" +
          "rules:\n" +
          '  - resources: ["pods"]\n' +
          '    verbs: ["get", "list"]\n',
        editFile: "/home/devops/k8s/role.yaml",
        hint: 'kind: Role, resources: ["pods"], verbs: ["get", "list"]',
      },
      {
        kind: "do",
        text: "Примени Role.",
        check: (w) => !!w.k8s?.roles?.some((r) => r.name === "pod-reader" && r.verbs.includes("get")),
        answer: "kubectl apply -f role.yaml",
        hint: "kubectl apply -f role.yaml",
      },
      {
        kind: "say",
        text:
          "Осталось связать «кто» и «что можно» — RoleBinding. Без неё Role так и останется\n" +
          "просто описанием на бумаге, ни на кого не действующим.",
      },
      {
        kind: "do",
        text: "Шаг 3. Свяжи monitoring-sa с pod-reader через RoleBinding. Набери:  edit rolebinding.yaml",
        check: (w) =>
          has("rolebinding.yaml", /kind:\s*RoleBinding/)(w) &&
          has("rolebinding.yaml", /name:\s*monitoring-sa/)(w) &&
          has("rolebinding.yaml", /name:\s*pod-reader/)(w),
        answer:
          "apiVersion: rbac.authorization.k8s.io/v1\n" +
          "kind: RoleBinding\n" +
          "metadata:\n" +
          "  name: monitoring-binding\n" +
          "subjects:\n" +
          "  - kind: ServiceAccount\n" +
          "    name: monitoring-sa\n" +
          "roleRef:\n" +
          "  kind: Role\n" +
          "  name: pod-reader\n",
        editFile: "/home/devops/k8s/rolebinding.yaml",
        hint: "subjects[0].name: monitoring-sa, roleRef.name: pod-reader",
      },
      {
        kind: "do",
        text: "Примени RoleBinding.",
        check: (w) =>
          !!w.k8s?.roleBindings?.some((b) => b.serviceAccount === "monitoring-sa" && b.role === "pod-reader"),
        answer: "kubectl apply -f rolebinding.yaml",
        hint: "kubectl apply -f rolebinding.yaml",
      },
      {
        kind: "say",
        text:
          "Проверить права можно не заходя в реальный под, а прямо с рабочей машины —\n" +
          "командой  kubectl auth can-i :\n\n" +
          "  kubectl auth can-i ГЛАГОЛ РЕСУРС --as=ЛИЧНОСТЬ\n\n" +
          "  can-i    — «а мне/ему можно?», ответ yes или no\n" +
          "  --as=    — «проверь, как будто я вот этот ServiceAccount»\n\n" +
          "Полное имя ServiceAccount для  --as=  выглядит так:\n\n" +
          "  system:serviceaccount:НЕЙМСПЕЙС:ИМЯ\n\n" +
          "Для monitoring-sa в namespace default это будет\n" +
          "  system:serviceaccount:default:monitoring-sa",
      },
      {
        kind: "do",
        text:
          "Задача: проверь права напрямую — может ли monitoring-sa читать поды (get pods)?\n" +
          "Используй  kubectl auth can-i get pods --as=system:serviceaccount:default:monitoring-sa",
        check: ran(/^kubectl\s+auth\s+can-i\s+get\s+pods\s+--as=.*monitoring-sa/),
        answer: "kubectl auth can-i get pods --as=system:serviceaccount:default:monitoring-sa",
        hint: "kubectl auth can-i get pods --as=system:serviceaccount:default:monitoring-sa",
      },
      {
        kind: "quiz",
        text: "Что произойдёт, если создать Role, но не создать RoleBinding?",
        options: [
          "Role сработает автоматически для всех подов",
          "Ничего не изменится — Role сама по себе никого ни к чему не привязывает, нужна RoleBinding",
          "Kubernetes выдаст ошибку и не даст создать под",
          "Все ServiceAccount получат права из этой Role по умолчанию",
        ],
        answer: 1,
        explain:
          "Role — это просто список разрешений на бумаге. Реально действует только связка через RoleBinding: " +
          "«вот ЭТОТ ServiceAccount получает права из ЭТОЙ Role».",
      },
    ],
  },
  {
    id: "9.22",
    act: 9,
    title: "Данные, которые переживают под: PersistentVolumeClaim",
    xp: 25,
    intro: "Под пересоздался — и все файлы, которые он писал на диск, исчезли вместе со старым подом.",
    setup: (w) => {
      seedK8s(w);
    },
    steps: [
      {
        kind: "say",
        text:
          "Помнишь: под эфемерен, его в любой момент могут пересоздать. Всё, что контейнер\n" +
          "написал на СВОЙ диск, живёт ровно столько же, сколько сам под — и исчезает вместе с ним.\n\n" +
          "Для базы данных или загруженных пользователями файлов это неприемлемо. Нужно\n" +
          "хранилище, которое живёт ОТДЕЛЬНО от пода и просто подключается к новому,\n" +
          "когда старый исчезает.",
      },
      {
        kind: "say",
        text:
          "За это отвечает PersistentVolumeClaim (PVC, «запрос на постоянный том»):\n\n" +
          "  apiVersion: v1\n" +
          "  kind: PersistentVolumeClaim\n" +
          "  metadata:\n" +
          "    name: db-data\n" +
          "  spec:\n" +
          "    accessModes:\n" +
          "      - ReadWriteOnce\n" +
          "    resources:\n" +
          "      requests:\n" +
          "        storage: 5Gi\n\n" +
          "Ты не создаёшь диск сам — просто ЗАПРАШИВАЕШЬ его размер, а Kubernetes находит подходящий.",
      },
      {
        kind: "do",
        text: "Задача: запроси постоянный том db-data на 5Gi. Набери:  edit pvc.yaml",
        check: (w) =>
          has("pvc.yaml", /kind:\s*PersistentVolumeClaim/)(w) && has("pvc.yaml", /storage:\s*5Gi/)(w),
        answer:
          "apiVersion: v1\n" +
          "kind: PersistentVolumeClaim\n" +
          "metadata:\n" +
          "  name: db-data\n" +
          "spec:\n" +
          "  accessModes:\n" +
          "    - ReadWriteOnce\n" +
          "  resources:\n" +
          "    requests:\n" +
          "      storage: 5Gi\n",
        editFile: "/home/devops/k8s/pvc.yaml",
        hint: "kind: PersistentVolumeClaim, resources.requests.storage: 5Gi",
      },
      {
        kind: "do",
        text: "Примени запрос на том.",
        check: (w) => !!w.k8s?.pvcs?.some((p) => p.name === "db-data"),
        answer: "kubectl apply -f pvc.yaml",
        hint: "kubectl apply -f pvc.yaml",
      },
      {
        kind: "do",
        text: "Проверь, что том выделен (статус Bound).",
        check: ran(/^kubectl\s+get\s+pvc/),
        answer: "kubectl get pvc",
        hint: "kubectl get pvc",
      },
      {
        kind: "say",
        text:
          "Дальше PVC подключают к поду как обычный volume в манифесте Deployment — и куда бы\n" +
          "Kubernetes ни переместил под при пересоздании, данные на этом томе останутся целы.",
      },
      {
        kind: "quiz",
        text: "Почему для базы данных в Kubernetes используют PVC, а не просто пишут файлы внутрь контейнера?",
        options: [
          "PVC работает быстрее, чем диск контейнера",
          "Диск контейнера живёт не дольше самого пода — при пересоздании данные исчезнут; PVC существует отдельно от пода",
          "PVC — обязательное требование для запуска любого контейнера",
          "Разницы нет, это просто два названия одного и того же",
        ],
        answer: 1,
        explain:
          "Под эфемерен, а PVC — нет. Именно поэтому для БД и любых важных данных используют том, " +
          "существующий независимо от жизненного цикла конкретного пода.",
      },
    ],
  },
  {
    id: "9.23",
    act: 9,
    title: "Масштабирование само по себе: HPA",
    xp: 45,
    intro: "kubectl scale --replicas=N ты уже умеешь. А если нагрузка скачет ночью, пока ты спишь?",
    setup: (w) => {
      seedK8s(w);
      w.k8s = {
        deploys: [{ name: "api", replicas: 2, image: "shop:1.0", crash: false }],
        pods: [],
        svcs: [],
      };
      syncPods(w);
    },
    steps: [
      {
        kind: "say",
        text:
          "kubectl scale — ручное масштабирование: ты решил, ты набрал команду. Но нагрузка\n" +
          "интернет-магазина скачет сама — распродажа среди ночи, наплыв после рекламы.\n" +
          "Сидеть и вручную добавлять реплики круглосуточно — не работа для человека.\n\n" +
          "HorizontalPodAutoscaler (HPA) следит за нагрузкой САМ и меняет число реплик\n" +
          "в заданных границах — без единой команды от тебя.",
      },
      {
        kind: "say",
        text:
          "Манифест:\n\n" +
          "  apiVersion: autoscaling/v2\n" +
          "  kind: HorizontalPodAutoscaler\n" +
          "  metadata:\n" +
          "    name: api-hpa\n" +
          "  spec:\n" +
          "    scaleTargetRef:\n" +
          "      kind: Deployment\n" +
          "      name: api\n" +
          "    minReplicas: 2\n" +
          "    maxReplicas: 6\n" +
          "    metrics:\n" +
          "      - type: Resource\n" +
          "        resource:\n" +
          "          name: cpu\n" +
          "          target:\n" +
          "            averageUtilization: 70\n\n" +
          "Читается так: «следи за Deployment api. Пока средняя загрузка CPU выше 70% —\n" +
          "добавляй реплики, но не больше 6. Упала нагрузка — убирай, но не меньше 2».",
      },
      {
        kind: "say",
        text:
          "И сразу — ловушка, на которой HPA подводит людей в самый неподходящий момент.\n\n" +
          "Чёрная пятница. HPA настроен неделю назад, все спокойны. Нагрузка растёт,\n" +
          "поды задыхаются, время ответа ползёт вверх — а реплик как было две, так и\n" +
          "осталось две. Автоскейлер не сделал ничего.\n\n" +
          "Смотрят в HPA и видят вот это:\n\n" +
          "  $ kubectl get hpa\n" +
          "  NAME      REFERENCE         TARGETS           REPLICAS\n" +
          "  api-hpa   Deployment/api    <unknown>/70%     2\n\n" +
          "  TARGETS: <unknown>  ← он просто не знает, какая сейчас загрузка",
      },
      {
        kind: "say",
        text:
          "Причина обычно одна, и она из прошлого урока: у контейнера НЕ ЗАДАН\n" +
          "requests.cpu.\n\n" +
          "Дело в том, что «загрузка CPU 70%» для HPA — это не 70% ядра сервера.\n" +
          "Это 70% ОТ requests пода. Не задан requests — не от чего считать процент,\n" +
          "метрика получается <unknown>, и HPA честно не делает ничего: он не может\n" +
          "принять решение вслепую.\n\n" +
          "Отсюда правило: HPA по CPU работает ТОЛЬКО в паре с requests.cpu.\n" +
          "(Вторая по частоте причина <unknown> — в кластере не установлен\n" +
          "metrics-server, тот самый компонент, который вообще собирает эти цифры.)",
      },
      {
        kind: "do",
        text:
          "Задача: опиши HPA для Deployment api — от 2 до 6 реплик, порог CPU 70%.\n" +
          "Набери:  edit hpa.yaml",
        check: (w) =>
          has("hpa.yaml", /kind:\s*HorizontalPodAutoscaler/)(w) &&
          has("hpa.yaml", /maxReplicas:\s*6/)(w) &&
          has("hpa.yaml", /averageUtilization:\s*70/)(w),
        answer:
          "apiVersion: autoscaling/v2\n" +
          "kind: HorizontalPodAutoscaler\n" +
          "metadata:\n" +
          "  name: api-hpa\n" +
          "spec:\n" +
          "  scaleTargetRef:\n" +
          "    kind: Deployment\n" +
          "    name: api\n" +
          "  minReplicas: 2\n" +
          "  maxReplicas: 6\n" +
          "  metrics:\n" +
          "    - type: Resource\n" +
          "      resource:\n" +
          "        name: cpu\n" +
          "        target:\n" +
          "          averageUtilization: 70\n",
        editFile: "/home/devops/k8s/hpa.yaml",
        hint: "scaleTargetRef.name: api, minReplicas: 2, maxReplicas: 6, averageUtilization: 70",
      },
      {
        kind: "do",
        text: "Примени HPA.",
        check: (w) => !!w.k8s?.hpas?.some((h) => h.deployment === "api" && h.maxReplicas === 6),
        answer: "kubectl apply -f hpa.yaml",
        hint: "kubectl apply -f hpa.yaml",
      },
      {
        kind: "do",
        text: "Проверь, что автоскейлер работает и следит за api.",
        check: ran(/^kubectl\s+get\s+hpa/),
        answer: "kubectl get hpa",
        hint: "kubectl get hpa",
      },
      {
        kind: "say",
        text:
          "По чему вообще можно масштабироваться — три разных подхода, от простого\n" +
          "к взрослому:\n\n" +
          "1) По CPU. То, что мы сделали. Отлично подходит для сервисов, которые\n" +
          "   реально упираются в процессор: рендеринг, обработка картинок, вычисления.\n\n" +
          "2) По своей метрике приложения — например, запросов в секунду на под.\n" +
          "   Для обычного HTTP-API это честнее: сервис, который ходит в базу и ждёт\n" +
          "   ответа, может задыхаться от нагрузки при CPU 30%. По процессору ты такой\n" +
          "   сервис не отмасштабируешь вовремя — он «не выглядит» загруженным.",
      },
      {
        kind: "say",
        text:
          "3) По длине очереди — и это, пожалуй, самый честный вариант для воркеров.\n" +
          "   Если в очереди 10 000 необработанных задач, нужно больше обработчиков,\n" +
          "   и неважно, какой у них CPU. Так масштабируют через KEDA — надстройку,\n" +
          "   которая умеет смотреть в RabbitMQ, Kafka, очереди облаков.\n\n" +
          "Отдельно стоит знать про «флаппинг»: нагрузка прыгает — HPA то добавляет,\n" +
          "то убирает поды, и сервис трясёт. Поэтому уменьшение числа реплик\n" +
          "по умолчанию идёт с задержкой (окно стабилизации, обычно 5 минут):\n" +
          "вверх HPA реагирует быстро, вниз — не спеша, чтобы не срезать мощность\n" +
          "прямо перед следующим всплеском.",
      },
      {
        kind: "say",
        text:
          "И два последствия, про которые часто забывают.\n\n" +
          "Первое: HPA и жёстко прописанные  replicas  в манифесте — это конфликт.\n" +
          "HPA поднял до 6 подов, кто-то запускает  kubectl apply -f deploy.yaml , где\n" +
          "написано  replicas: 2  — и реплики схлопываются прямо под нагрузкой.\n" +
          "Потом HPA снова их поднимет, но провал уже случился. Поэтому у деплойментов\n" +
          "под управлением HPA поле  replicas  из манифеста просто УБИРАЮТ.\n\n" +
          "Второе: HPA добавляет ПОДЫ, но не добавляет СЕРВЕРЫ. Если узлам не хватает\n" +
          "места, новые поды повиснут в Pending — ровно та картина из урока 9.15.\n" +
          "За добавление узлов отвечает другой механизм, Cluster Autoscaler. В проде\n" +
          "их держат в паре: HPA плодит поды, Cluster Autoscaler подвозит под них железо.",
      },
      {
        kind: "quiz",
        text: "kubectl get hpa показывает  TARGETS: <unknown>/70% , число реплик не меняется. Что проверить первым?",
        options: [
          "Перезапустить HPA",
          "Заданы ли у контейнера requests.cpu (и работает ли metrics-server): проценты HPA считает ОТ requests, без них метрику просто не от чего вычислять",
          "Увеличить maxReplicas",
          "Пересоздать Deployment",
        ],
        answer: 1,
        explain:
          "«70% CPU» для HPA — это 70% от requests.cpu, а не от мощности узла. Нет requests — нет метрики — " +
          "нет масштабирования. Именно поэтому урок про requests/limits идёт раньше этого.",
      },
      {
        kind: "quiz",
        text: "Почему у Deployment, которым управляет HPA, из манифеста обычно убирают поле replicas?",
        options: [
          "Kubernetes запрещает их вместе",
          "Иначе они дерутся: HPA поднял реплики под нагрузкой, а очередной apply вернёт число из файла и схлопнет сервис в самый неподходящий момент",
          "replicas замедляет работу HPA",
          "Это просто дело вкуса, разницы нет",
        ],
        answer: 1,
        explain:
          "Два хозяина у одного числа — гарантированный сюрприз на проде. Либо числом управляет человек через " +
          "манифест, либо HPA. Смешивать нельзя.",
      },
      {
        kind: "quiz",
        text: "Зачем в HPA задают И minReplicas, И maxReplicas, а не просто «масштабируй как хочешь»?",
        options: [
          "Это ничего не значащие поля для галочки",
          "minReplicas — минимум для отказоустойчивости, maxReplicas — потолок, чтобы всплеск нагрузки не съел весь бюджет на сервера",
          "Kubernetes требует их синтаксически, но не использует",
          "minReplicas и maxReplicas должны всегда быть равны",
        ],
        answer: 1,
        explain:
          "Без минимума кластер может схлопнуть сервис до одной реплики в затишье. Без потолка — разогнать " +
          "расходы до небес на одном ложном скачке метрики. Границы — это осознанный компромисс.",
      },
    ],
  },
  {
    id: "9.24",
    act: 9,
    title: "Пакет манифестов: Helm",
    xp: 30,
    intro:
      "Один и тот же сервис катят в dev, staging и prod — с разным числом реплик и версией образа. Три копии YAML — плохая идея.",
    setup: (w) => {
      mkdirp(w, "/home/devops/charts/shop/templates");
      writeFile(w, "/home/devops/charts/shop/Chart.yaml", "apiVersion: v2\nname: shop\nversion: 0.1.0\n");
      writeFile(w, "/home/devops/charts/shop/values.yaml", "replicas: 3\nimage: shop:1.0\n");
      writeFile(
        w,
        "/home/devops/charts/shop/templates/deployment.yaml",
        "apiVersion: apps/v1\n" +
          "kind: Deployment\n" +
          "metadata:\n" +
          "  name: shop\n" +
          "spec:\n" +
          "  replicas: {{ .Values.replicas }}\n" +
          "  template:\n" +
          "    spec:\n" +
          "      containers:\n" +
          "        - name: shop\n" +
          "          image: {{ .Values.image }}\n" +
          "          env:\n" +
          "            - name: DB_URL\n" +
          "              value: postgres://db-main/shop\n",
      );
      w.cwd = "/home/devops/charts";
      w.k8s = { deploys: [], pods: [], svcs: [] };
    },
    steps: [
      {
        kind: "say",
        text:
          "Сейчас манифест пишут руками под каждое окружение: в dev — 1 реплика и образ :dev,\n" +
          "в prod — 5 реплик и образ :stable. Три копии одного и того же YAML с парой других чисел —\n" +
          "рецепт рассинхронизации: кто-то поправит в одном месте и забудет про остальные.",
      },
      {
        kind: "say",
        text:
          "Helm решает это через «чарт» — папку с шаблоном и отдельным файлом значений:\n\n" +
          "  shop/\n" +
          "    Chart.yaml           — имя и версия чарта\n" +
          "    values.yaml          — значения по умолчанию (replicas: 3, image: shop:1.0)\n" +
          "    templates/\n" +
          "      deployment.yaml    — тот же манифест, но вместо чисел — {{ .Values.replicas }}\n\n" +
          "Один шаблон, а конкретные цифры каждый раз подставляются из values.yaml.",
      },
      {
        kind: "watch",
        run: "helm install shop-release ./shop",
        note:
          "Helm взял шаблон, подставил вместо {{ .Values.replicas }} и {{ .Values.image }} значения\n" +
          "из values.yaml и применил получившийся манифест — ровно как kubectl apply, но без\n" +
          "необходимости писать готовый YAML руками.",
      },
      {
        kind: "type",
        text: "Установи релиз сам. Набери:  helm install shop-release ./shop",
        cmd: "helm install shop-release ./shop",
      },
      {
        kind: "do",
        text: "Задача: убедись, что Deployment создался с ПРАВИЛЬНЫМИ значениями из values.yaml (3 реплики, shop:1.0).",
        check: (w) =>
          !!w.k8s?.deploys.some((d) => d.name === "shop" && d.replicas === 3 && d.image === "shop:1.0"),
        answer: "kubectl get deployments",
        hint: "kubectl get deployments — сравни replicas и image со значениями из values.yaml",
      },
      {
        kind: "say",
        text:
          "Helm ведёт собственный учёт того, что он поставил в кластер. Список\n" +
          "установленных релизов смотрят командой:\n\n" +
          "  helm list\n\n" +
          "list  — «покажи все релизы Helm в этом окружении» (как  kubectl get , но для релизов).",
      },
      {
        kind: "do",
        text: "Задача: посмотри список установленных релизов.",
        check: ran(/^helm\s+list/),
        answer: "helm list",
        hint: "helm list",
      },
      {
        kind: "say",
        text:
          "Понадобится другое окружение — не переписывают шаблон, а подставляют свой values.yaml\n" +
          "(например, values-prod.yaml с replicas: 5). Шаблон в templates/ остаётся один и тот же.",
      },
      {
        kind: "say",
        text:
          "Удаляют релиз симметричной командой —  helm uninstall :\n\n" +
          "  helm uninstall shop-release\n\n" +
          "Она уберёт из кластера ВСЕ ресурсы, которые Helm создал при  install  для этого\n" +
          "релиза (Deployment, Service и так далее) — не нужно удалять их по одному вручную.",
      },
      {
        kind: "do",
        text: "Задача: релиз shop-release больше не нужен — удали его вместе со всеми его ресурсами одной командой.",
        check: (w) => !w.k8s?.deploys.some((d) => d.name === "shop"),
        answer: "helm uninstall shop-release",
        hint: "helm uninstall shop-release",
      },
      {
        kind: "quiz",
        text: "В чём главное преимущество Helm-чарта перед копией одного и того же YAML для каждого окружения?",
        options: [
          "Helm делает манифесты быстрее применяющимися",
          "Один шаблон переиспользуется для всех окружений — меняются только значения в values.yaml, а не сам манифест",
          "Helm — обязательное требование для запуска Kubernetes",
          "Разницы нет, это просто более длинная команда",
        ],
        answer: 1,
        explain:
          "Шаблон один — источник правды один. Разное поведение по окружениям достигается разными " +
          "values-файлами, а не редактированием копий манифеста в трёх местах.",
      },
    ],
  },
];
