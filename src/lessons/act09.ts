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
    xp: 25,
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
          "Манифест Service короткий:\n\n" +
          "  apiVersion: v1\n" +
          "  kind: Service\n" +
          "  metadata:\n" +
          "    name: api\n" +
          "  spec:\n" +
          "    selector:\n" +
          "      app: api          ← какие поды обслуживать (по метке)\n" +
          "    ports:\n" +
          "      - port: 80\n\n" +
          "Теперь любой в кластере обращается к  http://api  — и не думает про поды и их IP.",
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
    xp: 20,
    intro: "Настройки и пароли держат отдельно от образа — в объектах кластера.",
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
          "Акт 9 пройден. Ты умеешь:\n\n" +
          "  • объяснить, зачем нужен оркестратор и что такое желаемое состояние\n" +
          "  • различать Pod, Deployment и Service\n" +
          "  • писать манифест и применять его  kubectl apply -f\n" +
          "  • диагностировать: get → describe → logs\n" +
          "  • чинить CrashLoopBackOff по алгоритму\n" +
          "  • масштабировать, полагаться на self-healing, откатывать выкатку\n" +
          "  • выносить настройки в ConfigMap и Secret\n\n" +
          "Дальше — последний акт: дежурство по проду, инциденты и то, как всё это\n" +
          "держится вместе.",
      },
    ],
  },
];
