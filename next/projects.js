export const PROJECTS = [
  {
    id: "linux", act: 1, topic: "Linux и файловая система", title: "Подготовить рабочее место магазина",
    goal: "Разобраться в структуре сервиса и научиться безопасно исследовать его файлы и логи.",
    why: "Перед изменением production нужно понять, где ты находишься, что лежит рядом и какие данные трогаешь.",
    output: "Карта файлов проекта и найденная причина ошибки в журнале.", directory: "/home/devops/shop-linux",
    tasks: [
      { title: "Проверь рабочую папку", instruction: "Убедись, что работаешь в каталоге проекта, а не в случайной директории.", why: "Команда в неверном каталоге может изменить не тот сервис.", pattern: "^pwd$", hint: "pwd" },
      { title: "Составь карту файлов", instruction: "Найди конфигурацию, код, скрипты и журналы магазина.", why: "Структура проекта подсказывает, где искать настройки и доказательства сбоя.", pattern: "^(find \. -type f|ls -la)$", hint: "find . -type f" },
      { title: "Сохрани и проверь отчёт", instruction: "Отфильтруй ошибки приложения, сохрани их в incident-report.txt и прочитай файл.", why: "После записи проверь содержимое артефакта: успешный код команды сам по себе не доказывает, что файл полезен.", pattern: "^cat incident-report\\.txt$", hint: "grep -i error logs/app.log > incident-report.txt && cat incident-report.txt", verify: (world) => /ERROR.*database timeout/i.test(projectFile(world, "/home/devops/shop-linux/incident-report.txt") || "") },
    ],
  },
  {
    id: "services", act: 2, topic: "Система и службы", title: "Стабилизировать сервер приложения",
    goal: "Проверить процессы, состояние служб и ресурсы узла, на котором работает магазин.",
    why: "Работающий процесс, включённый автозапуск и доступный порт — разные условия надёжности.",
    output: "Снимок состояния сервиса и проверка ресурсов хоста.", directory: "/home/devops/shop-services",
    tasks: [
      { title: "Проверь процессы", instruction: "Найди процессы приложения и веб-сервера.", why: "Симптом «сайт не отвечает» ещё не говорит, что именно остановилось.", pattern: "^ps aux$", hint: "ps aux" },
      { title: "Сохрани статус службы", instruction: "Сохрани статус shop-api в service-status.txt и проверь, что он active.", why: "Сохрани вывод диагностики как артефакт смены и проверь содержимое, а не только код возврата.", pattern: "^cat service-status\\.txt$", hint: "systemctl status shop-api > service-status.txt && cat service-status.txt", verify: (world) => /Active:\s+active \(running\)/i.test(projectFile(world, "/home/devops/shop-services/service-status.txt") || "") },
      { title: "Оцени ресурсы", instruction: "Проверь свободное место на файловых системах.", why: "Заполненный диск часто ломает запись логов, базу и деплой.", pattern: "^df -h$", hint: "df -h" },
    ],
  },
  {
    id: "bash", act: 3, topic: "Bash и автоматизация", title: "Собрать проверку здоровья сервиса",
    goal: "Использовать готовый shell-скрипт и проверить, что он сообщает о состоянии магазина.",
    why: "Повторяемая проверка должна запускаться одинаково человеком, cron и CI.",
    output: "Запущенная healthcheck-проверка и резервная копия каталога проекта.", directory: "/home/devops/shop-bash",
    tasks: [
      { title: "Изучи скрипт", instruction: "Прочитай скрипт проверки до запуска.", why: "Не запускай неизвестный код вслепую, особенно с правами root.", pattern: "^cat scripts/healthcheck\\.sh$", hint: "cat scripts/healthcheck.sh" },
      { title: "Подготовь запуск", instruction: "Выдай скрипту право на запуск и проверь его режим.", why: "Исполняемый бит позволяет запускать файл как программу без небезопасного chmod 777.", pattern: "^chmod \\+x scripts/healthcheck\\.sh$", hint: "chmod +x scripts/healthcheck.sh", verify: (world) => /x/.test(projectFileNode(world, "/home/devops/shop-bash/scripts/healthcheck.sh")?.mode?.slice(0, 3) || "") },
      { title: "Сохрани копию", instruction: "Создай архив проекта и проверь, что файл архива не пустой.", why: "Перед опасными изменениями должна быть проверенная точка восстановления.", pattern: "^tar -czf backups/shop\\.tar\\.gz \\.$", hint: "tar -czf backups/shop.tar.gz .", verify: (world) => Boolean(projectFile(world, "/home/devops/shop-bash/backups/shop.tar.gz")) },
    ],
  },
  {
    id: "network", act: 4, topic: "Сети и HTTP", title: "Найти путь запроса к магазину",
    goal: "Проверить адреса, открытые порты и HTTP-ответ приложения.",
    why: "Сбой может быть в DNS, маршруте, firewall, порте или самом приложении — проверяй слой за слоем.",
    output: "Диагностика интерфейсов, слушающих портов и health endpoint.", directory: "/home/devops/shop-network",
    tasks: [
      { title: "Проверь интерфейсы", instruction: "Посмотри сетевые адреса сервера.", why: "Без правильного адреса дальнейшие сетевые проверки бессмысленны.", pattern: "^ip addr$", hint: "ip addr" },
      { title: "Найди слушающие порты", instruction: "Посмотри, какие процессы принимают соединения.", why: "Открытый firewall не поможет, если приложение не слушает нужный порт.", pattern: "^ss -tulpn$", hint: "ss -tulpn" },
      { title: "Проверь приложение по HTTP", instruction: "Запроси health endpoint магазина и проверь HTTP 200.", why: "HTTP-код и заголовки отделяют сетевую проблему от ошибки приложения.", pattern: "^curl -I http://localhost:3000/health$", hint: "curl -I http://localhost:3000/health", outputPattern: "^HTTP/1\\.1 200 OK" },
    ],
  },
  {
    id: "git", act: 5, topic: "Git и совместная работа", title: "Подготовить безопасный релиз",
    goal: "Создать историю изменений магазина и зафиксировать конфигурацию перед релизом.",
    why: "История позволяет проверить, что изменилось, откатить ошибку и согласовать работу команды.",
    output: "Репозиторий с первым коммитом конфигурации магазина.", directory: "/home/devops/shop-git",
    tasks: [
      { title: "Создай репозиторий", instruction: "Инициализируй Git в каталоге магазина.", why: "Без репозитория изменения нельзя надёжно отслеживать и сравнивать.", pattern: "^git init$", hint: "git init" },
      { title: "Проверь изменения", instruction: "Посмотри, какие файлы ещё не добавлены.", why: "Перед коммитом важно увидеть весь набор изменений.", pattern: "^git status$", hint: "git status" },
      { title: "Зафиксируй проект", instruction: "Добавь README и создай первый коммит.", why: "Коммит — проверяемая точка, к которой команда может вернуться.", pattern: "^git commit -m .+$", hint: 'git add README.md && git commit -m "Начальный релиз магазина"', verify: (world) => world.git?.commits?.some((commit) => commit.files?.includes("README.md")) === true },
    ],
  },
  {
    id: "docker", act: 6, topic: "Docker", title: "Упаковать магазин в контейнер",
    goal: "Собрать образ из Dockerfile, проверить его и запустить контейнер приложения.",
    why: "Одинаковый образ уменьшает разницу между ноутбуком, CI и production.",
    output: "Собранный shop-api image и запущенный контейнер.", directory: "/home/devops/shop-docker",
    tasks: [
      { title: "Изучи рецепт образа", instruction: "Проверь Dockerfile перед сборкой.", why: "Состав образа влияет на размер, безопасность и воспроизводимость.", pattern: "^cat Dockerfile$", hint: "cat Dockerfile" },
      { title: "Собери образ", instruction: "Собери образ shop-api:dev из текущего каталога.", why: "Образ — переносимый результат сборки, контейнер — его запущенный экземпляр.", pattern: "^docker build -t shop-api:dev \\.$", hint: "docker build -t shop-api:dev .", verify: (world) => world.docker?.images?.some((image) => image.tag === "shop-api:dev") === true },
      { title: "Запусти контейнер", instruction: "Запусти собранный образ на порту 8080 и проверь docker ps.", why: "Сборка образа не запускает приложение. Проверь, что экземпляр действительно работает и порт опубликован.", pattern: "^docker ps$", hint: "docker run -d --name shop-api -p 8080:3000 shop-api:dev && docker ps", verify: (world) => world.docker?.containers?.some((container) => container.name === "shop-api" && container.image === "shop-api:dev" && container.state === "running" && container.hostPort === 8080) === true },
    ],
  },
  {
    id: "cicd", act: 7, topic: "CI/CD", title: "Построить конвейер релиза",
    goal: "Проверить workflow магазина и проследить изменения pipeline перед доставкой.",
    why: "Автоматические тесты и проверки ловят дефекты до того, как они попадут к покупателям.",
    output: "Проверенный workflow с тестами и этапом доставки.", directory: "/home/devops/shop-cicd",
    tasks: [
      { title: "Найди workflow", instruction: "Посмотри файлы автоматизации в .github/workflows.", why: "Пайплайн — часть исходного кода, он должен быть видим и проверяем.", pattern: "^ls \\.github/workflows$", hint: "ls .github/workflows" },
      { title: "Проверь этап тестов", instruction: "Найди в workflow запуск тестов.", why: "Релиз без автоматической проверки превращает каждое изменение в риск.", pattern: "^grep -n test \\.github/workflows/deploy\\.yml$", hint: "grep -n test .github/workflows/deploy.yml" },
      { title: "Сохрани review workflow", instruction: "Сохрани workflow в release-review.yml и проверь, что там есть тесты и сборка.", why: "Артефакт ревью позволяет проверить обязательные gates до публикации.", pattern: "^cat release-review\\.yml$", hint: "cat .github/workflows/deploy.yml > release-review.yml && cat release-review.yml", verify: (world) => /npm test/.test(projectFile(world, "/home/devops/shop-cicd/release-review.yml") || "") && /docker build/.test(projectFile(world, "/home/devops/shop-cicd/release-review.yml") || "") },
    ],
  },
  {
    id: "terraform", act: 8, topic: "Terraform и IaC", title: "Описать инфраструктуру магазина",
    goal: "Инициализировать Terraform, изучить план изменений и проверить конфигурацию инфраструктуры.",
    why: "План до применения показывает, что именно изменится, и помогает не удалить production случайно.",
    output: "Проверенный Terraform plan для среды магазина.", directory: "/home/devops/shop-terraform",
    tasks: [
      { title: "Изучи инфраструктуру", instruction: "Прочитай декларативное описание ресурсов.", why: "Сначала пойми желаемое состояние, затем меняй его.", pattern: "^cat infra/main\\.tf$", hint: "cat infra/main.tf" },
      { title: "Подготовь Terraform", instruction: "Перейди в каталог инфраструктуры и инициализируй Terraform.", why: "Init загружает провайдеры и подготавливает backend рядом с конфигурацией.", pattern: "^terraform init$", hint: "cd infra && terraform init" },
      { title: "Проверь план", instruction: "Сформируй план изменений и убедись, что он создаёт ресурс и ничего не удаляет.", why: "Plan — последний безопасный шанс заметить нежелательное удаление.", pattern: "^terraform plan$", hint: "terraform plan", verify: (world) => (world.tf?.plan?.add?.length || 0) > 0 && (world.tf?.plan?.del?.length || 0) === 0 },
    ],
  },
  {
    id: "kubernetes", act: 9, topic: "Kubernetes", title: "Запустить магазин в кластере",
    goal: "Изучить Deployment, проверить Pod и Service и диагностировать состояние приложения.",
    why: "В Kubernetes задают желаемое состояние, а контроллеры поддерживают его и сообщают о проблемах.",
    output: "Проверенный манифест магазина и состояние workload в кластере.", directory: "/home/devops/shop-kubernetes",
    tasks: [
      { title: "Изучи манифест", instruction: "Проверь Deployment магазина перед применением.", why: "Образ, replicas и probes определяют, как кластер запускает сервис.", pattern: "^cat k8s/deployment\\.yaml$", hint: "cat k8s/deployment.yaml" },
      { title: "Примени Deployment", instruction: "Создай Deployment по манифесту и проверь готовность Pod.", why: "Манифест описывает желаемое состояние, а apply просит контроллер кластера привести систему к нему.", pattern: "^kubectl get pods$", hint: "kubectl apply -f k8s/deployment.yaml && kubectl get pods", verify: (world) => world.k8s?.deploys?.some((deployment) => deployment.name === "shop-api" && deployment.replicas >= 2 && !deployment.crash) === true && world.k8s?.pods?.some((pod) => pod.status === "Running") === true },
      { title: "Опубликуй Service", instruction: "Примени Service магазина и проверь его порт.", why: "Pod меняются, поэтому клиентам нужна стабильная точка доступа, которая выбирает готовые реплики.", pattern: "^kubectl get services$", hint: "kubectl apply -f k8s/service.yaml && kubectl get services", verify: (world) => world.k8s?.svcs?.some((service) => service.name === "shop-api" && service.port === 3000) === true },
    ],
  },
  {
    id: "sre", act: 10, topic: "Дежурство и SRE", title: "Разобрать инцидент магазина",
    goal: "Собрать временную шкалу сбоя по журналам и проверить влияние на пользователей.",
    why: "Дежурный сначала ограничивает ущерб и собирает доказательства, а затем устраняет первопричину.",
    output: "Подтверждённая причина инцидента и команды для проверки восстановления.", directory: "/home/devops/shop-sre",
    tasks: [
      { title: "Найди ошибки приложения", instruction: "Отфильтруй ошибки в журнале сервиса.", why: "Ищи корреляцию событий, а не делай вывод по одному сообщению.", pattern: "^grep -i error logs/app\\.log$", hint: "grep -i error logs/app.log" },
      { title: "Собери временную шкалу", instruction: "Сохрани последние события в incident-timeline.txt и проверь, что там есть ошибка базы.", why: "Отчёт сохраняет последовательность доказательств для передачи смены и постмортема.", pattern: "^cat incident-timeline\\.txt$", hint: "tail -n 20 logs/app.log > incident-timeline.txt && cat incident-timeline.txt", verify: (world) => /ERROR.*database timeout/i.test(projectFile(world, "/home/devops/shop-sre/incident-timeline.txt") || "") },
      { title: "Проверь состояние службы", instruction: "Проверь, восстановился ли shop-api.", why: "Инцидент закрывают после проверки сервиса и пользовательского пути.", pattern: "^systemctl status shop-api$", hint: "systemctl status shop-api" },
    ],
  },
  {
    id: "prometheus", act: 11, topic: "Prometheus и метрики", title: "Подключить метрики магазина",
    goal: "Проверить endpoint метрик и найти настройки scrape для приложения.",
    why: "Метрики показывают тренды и насыщение ресурсов до того, как пользователи начнут жаловаться.",
    output: "Проверенный endpoint и конфигурация сбора метрик.", directory: "/home/devops/shop-prometheus",
    tasks: [
      { title: "Изучи конфигурацию", instruction: "Прочитай конфигурацию Prometheus и target магазина.", why: "Если target не собирается, панели будут показывать пустые данные.", pattern: "^cat monitoring/prometheus\\.yml$", hint: "cat monitoring/prometheus.yml" },
      { title: "Найди scrape job", instruction: "Найди job, которая собирает метрики приложения.", why: "Явное имя job упрощает запросы и диагностику.", pattern: "^grep -n shop monitoring/prometheus\\.yml$", hint: "grep -n shop monitoring/prometheus.yml" },
      { title: "Сохрани интервал сбора", instruction: "Сохрани scrape_interval в review-файл и проверь значение.", why: "Отдельный артефакт конфигурации помогает ревьюить частоту сбора до изменения мониторинга.", pattern: "^cat monitoring/scrape-review\\.txt$", hint: "grep -n scrape_interval monitoring/prometheus.yml > monitoring/scrape-review.txt && cat monitoring/scrape-review.txt", verify: (world) => /scrape_interval:\s*15s/.test(projectFile(world, "/home/devops/shop-prometheus/monitoring/scrape-review.txt") || "") },
    ],
  },
  {
    id: "grafana", act: 12, topic: "Grafana", title: "Собрать дашборд дежурного",
    goal: "Разобрать datasource и dashboard магазина, затем найти на нём ключевые сигналы.",
    why: "Хороший дашборд помогает быстро ответить: пользователи страдают, где проблема и как давно.",
    output: "Дашборд с доступностью, задержкой и ошибками.", directory: "/home/devops/shop-grafana",
    tasks: [
      { title: "Найди источник данных", instruction: "Проверь настройку datasource для Prometheus.", why: "Панель не покажет данные, если источник указан неверно.", pattern: "^cat monitoring/grafana-datasource\\.yml$", hint: "cat monitoring/grafana-datasource.yml" },
      { title: "Изучи панели", instruction: "Открой JSON дашборда магазина.", why: "Дашборд — тоже конфигурация, её можно хранить и ревьюить как код.", pattern: "^cat monitoring/grafana-dashboard\\.json$", hint: "cat monitoring/grafana-dashboard.json" },
      { title: "Сохрани запрос панели", instruction: "Сохрани выражение панели ошибок в review-файл и проверь 5xx-фильтр.", why: "Панель полезна, когда запрос измеряет понятный сигнал и имеет нужные labels.", pattern: "^cat monitoring/error-panel-review\\.txt$", hint: "grep -n shop_errors monitoring/grafana-dashboard.json > monitoring/error-panel-review.txt && cat monitoring/error-panel-review.txt", verify: (world) => /status=~/.test(projectFile(world, "/home/devops/shop-grafana/monitoring/error-panel-review.txt") || "") },
    ],
  },
  {
    id: "zabbix", act: 13, topic: "Zabbix", title: "Добавить хост магазина в мониторинг",
    goal: "Проверить настройки агента, item и порог тревоги для хоста приложения.",
    why: "Мониторинг должен обнаружить проблему вовремя и дать дежурному полезную точку проверки.",
    output: "Проверенная конфигурация агента и метрики хоста.", directory: "/home/devops/shop-zabbix",
    tasks: [
      { title: "Изучи агента", instruction: "Проверь конфигурацию Zabbix agent.", why: "Неверный Server или hostname мешает серверу получать данные.", pattern: "^cat monitoring/zabbix-agent\\.conf$", hint: "cat monitoring/zabbix-agent.conf" },
      { title: "Проверь имя хоста", instruction: "Найди hostname, под которым сервер зарегистрирован в мониторинге.", why: "Hostname агента должен совпадать с именем узла в Zabbix, иначе данные попадут не к тому хосту.", pattern: "^grep -n Hostname monitoring/zabbix-agent\\.conf$", hint: "grep -n Hostname monitoring/zabbix-agent.conf" },
      { title: "Сохрани health item", instruction: "Сохрани UserParameter проверки в review-файл и проверь endpoint.", why: "Сверь ключ мониторинга с endpoint приложения, прежде чем привязывать item к триггеру.", pattern: "^cat monitoring/health-item-review\\.txt$", hint: "grep -n shop.health monitoring/zabbix-agent.conf > monitoring/health-item-review.txt && cat monitoring/health-item-review.txt", verify: (world) => /UserParameter=shop\.health,curl -fsS http:\/\/localhost:3000\/health/.test(projectFile(world, "/home/devops/shop-zabbix/monitoring/health-item-review.txt") || "") },
    ],
  },
  {
    id: "python", act: 14, topic: "Python для DevOps", title: "Автоматизировать healthcheck",
    goal: "Проверить Python-скрипт, который читает статус магазина и возвращает код для CI.",
    why: "Python удобен, когда bash-команд уже не хватает для структурированных данных и повторного использования.",
    output: "Запускаемый healthcheck CLI с понятным результатом и кодом возврата.", directory: "/home/devops/shop-python",
    tasks: [
      { title: "Изучи реализацию", instruction: "Прочитай скрипт проверки магазина.", why: "Понимай, какие проверки выполняет автоматизация и что она считает ошибкой.", pattern: "^cat scripts/healthcheck\\.py$", hint: "cat scripts/healthcheck.py" },
      { title: "Проверь входные данные", instruction: "Найди в проекте пример JSON статуса.", why: "Структурированные данные нужно проверять по полям, а не поиском случайной подстроки.", pattern: "^cat status\\.json$", hint: "cat status.json" },
      { title: "Запусти CLI", instruction: "Запусти healthcheck и проверь итоговый статус.", why: "Скрипт пригоден для CI, когда у него предсказуемый вывод и код возврата.", pattern: "^python3 scripts/healthcheck\\.py$", hint: "python3 scripts/healthcheck.py", outputPattern: "shop-api: healthy" },
    ],
  },
];

export const CAPSTONE = {
  id: "capstone", title: "С нуля до production: платформа магазина",
  goal: "Подготовить магазин к росту: безопасная конфигурация, автоматическая доставка, масштабирование и наблюдаемость.",
  why: "DevOps — это связанная система: код, инфраструктура, релиз, эксплуатация и обратная связь должны работать вместе.",
  output: "Проверенный план релиза и эксплуатации магазина с диагностикой отказа.",
  directory: "/home/devops/shop-platform",
  tasks: [
    { title: "Linux: зафиксируй доказательство сбоя", instruction: "Сохрани ошибки приложения в incident-report.txt и прочитай отчёт.", why: "До изменений зафиксируй наблюдаемый симптом как артефакт для расследования и ревью.", pattern: "^cat incident-report\\.txt$", hint: "grep -i error logs/app.log > incident-report.txt && cat incident-report.txt", verify: (world) => /ERROR.*database timeout/i.test(projectFile(world, "/home/devops/shop-platform/incident-report.txt") || "") },
    { title: "Службы: проверь API", instruction: "Проверь состояние службы магазина.", why: "Сервис должен быть активен до проверки внешнего пути.", pattern: "^systemctl status shop-api$", hint: "systemctl status shop-api", outputPattern: "Active:\\s+active \\(running\\)" },
    { title: "Bash: подготовь healthcheck", instruction: "Подготовь скрипт к безопасному запуску и проверь право исполнения.", why: "Быстрый повторяемый preflight ловит очевидные ошибки; давай права только на выполнение.", pattern: "^chmod \\+x scripts/healthcheck\\.sh$", hint: "chmod +x scripts/healthcheck.sh", verify: (world) => /x/.test(projectFileNode(world, "/home/devops/shop-platform/scripts/healthcheck.sh")?.mode?.slice(0, 3) || "") },
    { title: "Сети: проверь HTTP", instruction: "Проверь внешний health endpoint и HTTP 200.", why: "Внутренний статус процесса не гарантирует доступность для клиента.", pattern: "^curl -I http://localhost:3000/health$", hint: "curl -I http://localhost:3000/health", outputPattern: "^HTTP/1\\.1 200 OK" },
    { title: "Git: зафиксируй релиз", instruction: "Создай коммит проекта и проверь чистое рабочее дерево.", why: "Во время инцидента нужна точная версия кода и понятная история изменений.", pattern: "^git status$", hint: 'git init && git add README.md && git commit -m "Подготовка релиза" && git status', verify: (world) => world.git?.commits?.some((commit) => commit.files?.includes("README.md")) === true },
    { title: "Docker: собери и запусти релиз", instruction: "Собери образ release, запусти контейнер и проверь docker ps.", why: "Проверь именно запущенный экземпляр версионированного образа после доставки.", pattern: "^docker ps$", hint: "docker build -t shop-api:release . && docker run -d --name shop-api -p 8080:3000 shop-api:release && docker ps", verify: (world) => world.docker?.containers?.some((container) => container.name === "shop-api" && container.image === "shop-api:release" && container.state === "running") === true },
    { title: "CI/CD: проверь workflow", instruction: "Просмотри release workflow и подтверди, что в нём есть запуск тестов.", why: "Убедись, что автоматические проверки входят в путь выпуска.", pattern: "^cat \\.github/workflows/deploy\\.yml$", hint: "cat .github/workflows/deploy.yml", outputPattern: "npm test" },
    { title: "Terraform: проверь план", instruction: "Перейди в каталог IaC, инициализируй Terraform и проверь план без нежданных удалений.", why: "Не применяй инфраструктурные изменения, пока не изучил план.", pattern: "^terraform plan$", hint: "cd infra && terraform init && terraform plan", verify: (world) => (world.tf?.plan?.add?.length || 0) > 0 && (world.tf?.plan?.del?.length || 0) === 0 },
    { title: "Kubernetes: примени rollout", instruction: "Вернись в корень проекта, примени Deployment и проверь готовые Pod магазина.", why: "После работы в infra вернись к корню репозитория; новый rollout успешен только когда желаемые реплики готовы.", pattern: "^kubectl get pods$", hint: "cd .. && kubectl apply -f k8s/deployment.yaml && kubectl get pods", verify: (world) => world.k8s?.deploys?.some((deployment) => deployment.name === "shop-api" && deployment.replicas >= 2 && !deployment.crash) === true && world.k8s?.pods?.some((pod) => pod.status === "Running") === true },
    { title: "SRE: собери доказательства", instruction: "Найди последние ошибки приложения в журнале и подтверди таймаут базы.", why: "Постмортем начинается с фактов и временной шкалы.", pattern: "^tail -n 20 logs/app\\.log$", hint: "tail -n 20 logs/app.log", outputPattern: "ERROR database timeout" },
    { title: "Prometheus: проверь сбор", instruction: "Проверь scrape interval в конфигурации и фактическое значение 15s.", why: "Метрики покажут насыщение и ошибки до массовых жалоб; их частота сбора должна соответствовать задаче.", pattern: "^grep -n scrape_interval monitoring/prometheus\\.yml$", hint: "grep -n scrape_interval monitoring/prometheus.yml", outputPattern: "scrape_interval:\\s*15s" },
    { title: "Grafana: проверь обзор", instruction: "Найди панель ошибок и проверь её PromQL-запрос.", why: "Дежурному нужен быстрый обзор без ручного поиска по всем системам.", pattern: "^grep -n shop_errors monitoring/grafana-dashboard\\.json$", hint: "grep -n shop_errors monitoring/grafana-dashboard.json", outputPattern: "shop_errors.*status=~" },
    { title: "Zabbix: проверь health item", instruction: "Убедись, что агент опрашивает health endpoint магазина.", why: "Вторая система мониторинга полезна для доступности и сигналов уровня хоста.", pattern: "^grep -n shop\\.health monitoring/zabbix-agent\\.conf$", hint: "grep -n shop.health monitoring/zabbix-agent.conf", outputPattern: "UserParameter=shop\\.health,curl -fsS http://localhost:3000/health" },
    { title: "Python: запусти итоговую проверку", instruction: "Запусти CLI healthcheck как финальный gate и проверь healthy.", why: "Один скрипт собирает результаты проверок и может остановить плохой релиз.", pattern: "^python3 scripts/healthcheck\\.py$", hint: "python3 scripts/healthcheck.py", outputPattern: "shop-api: healthy" },
  ],
};

export const PROJECT_REVIEWS = {
  linux: { question: "В логах найдена ошибка сохранения заказа. Какой следующий шаг надёжнее?", options: ["Сразу перезапустить весь сервер", "Сопоставить время ошибки с состоянием API и базы, собрать дополнительные признаки", "Удалить старые логи, чтобы освободить место"], answer: 1, explain: "Одна запись — сигнал, а не доказанная первопричина. Сначала сопоставь события и влияние на запрос." },
  services: { question: "systemd показывает enabled, но сервис inactive. Что это означает?", options: ["Сервис точно работает", "Сервис включён в автозапуск, но сейчас остановлен", "Порт сервиса открыт"], answer: 1, explain: "enabled управляет запуском при старте системы; active показывает состояние прямо сейчас." },
  bash: { question: "Скрипт должен запускаться владельцем. Какие права обычно нужны?", options: ["777 — всем полный доступ", "Только право исполнения владельцу, без лишнего доступа остальным", "000 — чтобы никто не изменил файл"], answer: 1, explain: "Принцип минимальных прав: не выдавай доступ всем, если скрипт запускает только владелец." },
  network: { question: "curl не получает ответ от API. Как диагностировать проблему?", options: ["Проверить только DNS и сразу менять конфигурацию", "Проверить адрес, маршрут, слушающий порт и HTTP-ответ по слоям", "Перезагрузить сервер, не собирая данные"], answer: 1, explain: "Проверки по слоям сужают область отказа: адрес и маршрут, порт, затем само приложение." },
  git: { question: "Зачем перед commit смотреть git status?", options: ["Чтобы увидеть, какие файлы попадут в коммит и что останется незакоммиченным", "Чтобы автоматически отправить изменения в production", "Чтобы удалить историю предыдущих коммитов"], answer: 0, explain: "status показывает рабочее дерево и индекс. Коммит должен содержать осознанно выбранные изменения." },
  docker: { question: "Чем образ отличается от контейнера?", options: ["Образ — шаблон приложения, контейнер — запущенный экземпляр этого шаблона", "Контейнер — файл Dockerfile", "Это два названия одного и того же объекта"], answer: 0, explain: "Образ собирают и версионируют; контейнер запускают из образа и наблюдают за его состоянием." },
  cicd: { question: "Тесты в pipeline завершились с ошибкой. Что должен сделать релизный процесс?", options: ["Остановить публикацию и показать причину сбоя", "Опубликовать образ и исправить тесты позже", "Повторять deploy, пока не повезёт"], answer: 0, explain: "Тесты — gate перед публикацией. Не выпускай артефакт, если обязательная проверка не прошла." },
  terraform: { question: "В terraform plan видно удаление production-базы, которого не ждали. Что делать?", options: ["Применить план, чтобы синхронизировать состояние", "Остановиться и выяснить причину плана до apply", "Удалить state-файл и повторить apply"], answer: 1, explain: "Plan — возможность обнаружить риск до изменения инфраструктуры. Не применяй неожиданный план." },
  kubernetes: { question: "Что делает Deployment, если одна из двух реплик Pod перестала быть Ready?", options: ["Контроллер стремится вернуть число готовых реплик к желаемому состоянию", "Кластер автоматически исправляет исходный код приложения", "Service удаляет остальные Pod"], answer: 0, explain: "Deployment задаёт желаемое число реплик; контроллер поддерживает его и сообщает о проблемных Pod." },
  sre: { question: "Во время инцидента какой порядок действий полезнее?", options: ["Найти виноватого, затем проверить пользовательский эффект", "Снизить ущерб, восстановить сервис, зафиксировать факты и провести разбор причин", "Удалить алерты, чтобы команда могла продолжить работу"], answer: 1, explain: "Сначала безопасность пользователей и восстановление. Затем факты, временная шкала и системные меры без поиска виноватого." },
  prometheus: { question: "Что произойдёт, если Prometheus не может scrape target?", options: ["Появятся свежие значения метрик из приложения", "Target станет недоступным/неуспешным, а новые samples не поступят", "Grafana автоматически исправит endpoint"], answer: 1, explain: "Проверь статус target, доступность endpoint, labels и scrape-конфигурацию. Старые точки не означают, что сбор продолжается." },
  grafana: { question: "Панель Grafana пустая, хотя Prometheus работает. Что проверить первым?", options: ["Datasource, запрос панели и совпадение labels", "Цветовую тему браузера", "Увеличить ширину панели, не проверяя запрос"], answer: 0, explain: "Дашборд отображает результат запроса к datasource. Проверь подключение и фильтры запроса до оформления." },
  zabbix: { question: "В Zabbix нет данных с агента, хотя сам агент запущен. Что проверить?", options: ["Совпадают ли Hostname, адрес сервера и item key", "Переназначить агенту случайный hostname", "Отключить все triggers"], answer: 0, explain: "Сервер связывает данные с конкретным host и items. Несовпадение имени, доступности или ключа ломает сбор." },
  python: { question: "Почему healthcheck CLI должен возвращать ненулевой код при отказе базы?", options: ["Чтобы CI и автоматизация могли остановить небезопасный релиз", "Чтобы скрыть детали ошибки от дежурного", "Потому что любой Python-скрипт должен завершаться кодом 1"], answer: 0, explain: "Код возврата — контракт с автоматизацией: 0 означает успех, ненулевой код сообщает о неуспехе." },
  capstone: { question: "Какой порядок лучше защищает production при выпуске версии?", options: ["Сразу применить инфраструктуру, затем собрать образ и посмотреть алерты", "Проверить код и тесты, собрать версионированный образ, изучить план, развернуть и проверить health/метрики", "Изменить production вручную, чтобы не ждать pipeline"], answer: 1, explain: "Безопасный релиз связывает проверенный код, неизменяемый артефакт, просмотренный план, контролируемый rollout и проверку пользовательского пути." },
};

const STORAGE_PREFIX = "toa_project_world_v1:";
const ACTIVE_KEY = "toa_active_project_v1";
const REVIEW_PREFIX = "toa_project_review_v1:";
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function readWorld(id) {
  try { return JSON.parse(localStorage.getItem(STORAGE_PREFIX + id) || "null"); } catch { return null; }
}
function activeId() { try { return localStorage.getItem(ACTIVE_KEY) || ""; } catch { return ""; } }
function findProject(id) { return id === CAPSTONE.id ? CAPSTONE : PROJECTS.find((p) => p.id === id); }
function reviewFor(project) { return PROJECT_REVIEWS[project.id]; }
function reviewPassed(project) { try { return localStorage.getItem(REVIEW_PREFIX + project.id) === "passed"; } catch { return false; } }
function projectFileNode(world, path) {
  if (!world?.fs || !path) return null;
  const parts = path.split("/").filter(Boolean);
  let node = world.fs;
  for (const part of parts) node = node?.type === "dir" ? node.children?.[part] : null;
  return node?.type === "file" ? node : null;
}
function projectFile(world, path) {
  const node = projectFileNode(world, path);
  return node ? String(node.content ?? "") : null;
}
function taskSatisfied(task, world) {
  const log = Array.isArray(world?.log) ? world.log : [];
  const commandSucceeded = log.some((entry) => entry?.code === 0 && new RegExp(task.pattern).test(String(entry.cmd || "").trim()));
  if (!commandSucceeded || (task.verify && !task.verify(world))) return false;
  if (!task.outputPattern) return true;
  const evidence = Array.isArray(world?.toaCommandEvidence) ? world.toaCommandEvidence : [];
  return evidence.some((item) => item?.code === 0 && new RegExp(task.pattern).test(String(item.command || "").trim()) && new RegExp(task.outputPattern, "i").test(String(item.output || "")));
}
export function projectTaskCompletion(project, world) {
  return project.tasks.map((task) => taskSatisfied(task, world));
}
function completedTasks(project, world = readWorld(project.id)) {
  return projectTaskCompletion(project, world);
}
function projectComplete(project) { return completedTasks(project).every(Boolean) && reviewPassed(project); }
function allTopicsComplete() { return PROJECTS.every(projectComplete); }

export function buildPortfolioMarkdown({ worlds = {}, reviews = {} } = {}) {
  const date = new Date().toISOString().slice(0, 10);
  const sections = [...PROJECTS, CAPSTONE].map((project) => {
    const world = worlds[project.id] || {};
    const log = Array.isArray(world.log) ? world.log : [];
    const evidence = Array.isArray(world.toaCommandEvidence) ? world.toaCommandEvidence : [];
    const tasks = project.tasks.map((task) => {
      const pattern = new RegExp(task.pattern);
      const entry = log.find((item) => item?.code === 0 && pattern.test(String(item.cmd || "").trim()));
      if (!taskSatisfied(task, world)) return `- [ ] ${task.title}`;
      const result = evidence.find((item) => item.code === 0 && pattern.test(String(item.command || "").trim()));
      const output = String(result?.output || "Команда выполнена; симулятор не вернул текстовый вывод.").trim().replace(/```/g, "'''");
      return `- [x] ${task.title} — \`${String(entry.cmd).trim()}\`\n\n  Результат:\n\n  > ${output.replace(/\n/g, "\n  > ")}`;
    });
    return `## ${project.title}\n\n**Цель:** ${project.goal}\n\n**Результат:** ${project.output}\n\n**Практика:** ${tasks.join("\n")}\n\n**Проверка понимания:** ${reviews[project.id] ? "пройдена" : "не пройдена"}`;
  });
  return `# Портфолио: DevOps-практика на проекте «Магазин Рядом»\n\nСформировано: ${date}\n\nЭто отчёт о шагах, выполненных в учебном виртуальном терминале. Он не подтверждает работу с production-системами.\n\n${sections.join("\n\n---\n\n")}\n`;
}

const COMMON_FILES = {
  "README.md": "# Магазин Рядом\n\nAPI заказов. Цель учебного проекта — безопасно доставлять изменения и быстро находить сбои.\n",
  "app.js": "// Учебный сервис заказов\nconst service = 'shop-api';\nconsole.log(`${service} ready`);\n",
  "package.json": '{\n  "name": "shop-api",\n  "version": "1.0.0",\n  "scripts": { "test": "node test.js", "start": "node app.js" }\n}\n',
  "logs/app.log": "2026-11-01T10:00:00Z INFO shop-api started\n2026-11-01T10:02:10Z ERROR database timeout while saving order\n2026-11-01T10:02:12Z WARN retry scheduled\n2026-11-01T10:03:00Z INFO health check passed\n",
  "scripts/healthcheck.sh": "#!/bin/bash\necho Проверяю shop-api\ncurl -I http://shop.local/health\n",
  "scripts/healthcheck.py": "#!/usr/bin/env python3\nimport json\n\nwith open('status.json', encoding='utf-8') as status_file:\n    status = json.load(status_file)\n\nhealthy = status.get('api') == 'ok' and status.get('database') == 'ok'\nprint('shop-api: healthy' if healthy else 'shop-api: unhealthy')\nraise SystemExit(0 if healthy else 1)\n",
  "status.json": '{\n  "api": "ok",\n  "database": "ok",\n  "release": "2026.11.1"\n}\n',
  "Dockerfile": "FROM node:22-alpine\nWORKDIR /app\nCOPY package.json app.js ./\nUSER node\nCMD [\"node\", \"app.js\"]\n",
  "docker-compose.yml": "services:\n  shop-api:\n    build: .\n    ports:\n      - \"8080:3000\"\n    restart: unless-stopped\n",
  ".github/workflows/deploy.yml": "name: shop-api\non: [push, pull_request]\njobs:\n  test:\n    steps:\n      - run: npm test\n  build:\n    needs: test\n    steps:\n      - run: docker build -t shop-api:${GITHUB_SHA} .\n",
  "infra/main.tf": 'resource "local_file" "shop_config" {\n  filename = "shop.conf"\n  content  = "environment=staging"\n}\n',
  "k8s/deployment.yaml": "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: shop-api\nspec:\n  replicas: 2\n  selector:\n    matchLabels:\n      app: shop-api\n  template:\n    metadata:\n      labels:\n        app: shop-api\n    spec:\n      containers:\n        - name: shop-api\n          image: shop-api:1.0\n          env:\n            - name: DB_URL\n              valueFrom:\n                secretKeyRef:\n                  name: shop-api\n                  key: database-url\n          ports:\n            - containerPort: 3000\n",
  "k8s/service.yaml": "apiVersion: v1\nkind: Service\nmetadata:\n  name: shop-api\nspec:\n  selector:\n    app: shop-api\n  ports:\n    - port: 3000\n      targetPort: 3000\n",
  "monitoring/prometheus.yml": "global:\n  scrape_interval: 15s\nscrape_configs:\n  - job_name: shop-api\n    static_configs:\n      - targets: ['shop-api:3000']\n",
  "monitoring/grafana-datasource.yml": "apiVersion: 1\ndatasources:\n  - name: Prometheus\n    type: prometheus\n    url: http://prometheus:9090\n    isDefault: true\n",
  "monitoring/grafana-dashboard.json": '{\n  "title": "Shop API / дежурный",\n  "panels": [{ "title": "shop_errors", "expr": "rate(http_requests_total{status=~\\\"5..\\\"}[5m])" }, { "title": "p95 latency", "expr": "histogram_quantile(0.95, shop_request_duration_seconds_bucket)" }]\n}\n',
  "monitoring/zabbix-agent.conf": "Server=127.0.0.1\nServerActive=127.0.0.1\nHostname=shop-api-01\nUserParameter=shop.health,curl -fsS http://localhost:3000/health\n",
};

function seedWorld(project) {
  const app = window.TOAProjectApp;
  const world = app.newWorld();
  const root = project.directory;
  app.mkdir(world, root);
  for (const dir of ["logs", "scripts", "backups", ".github/workflows", "infra", "k8s", "monitoring"]) app.mkdir(world, `${root}/${dir}`);
  for (const [path, content] of Object.entries(COMMON_FILES)) app.write(world, `${root}/${path}`, content);
  world.cwd = root;
  world.env.HOME = "/home/devops";
  world.services["shop-api"] = { desc: "Shop orders API", state: "active", enabled: true, needsPort: 3000, journal: ["shop-api: started", "shop-api: health check passed"] };
  world.services.nginx = { desc: "Shop web gateway", state: "active", enabled: true, needsPort: 80, journal: ["nginx: accepting requests"] };
  world.services.prometheus = { desc: "Prometheus metrics collector", state: "active", enabled: true, needsPort: 9090, journal: ["prometheus: scraping shop-api"] };
  world.services.grafana = { desc: "Grafana dashboard service", state: "active", enabled: true, needsPort: 3001, journal: ["grafana: ready"] };
  world.services["zabbix-agent"] = { desc: "Zabbix host agent", state: "active", enabled: true, needsPort: 10050, journal: ["zabbix-agent: listening"] };
  Object.assign(world.ports, { 80: "nginx", 3000: "shop-api", 3001: "grafana", 9090: "prometheus", 10050: "zabbix-agent" });
  world.toaProjectId = project.id;
  return world;
}

function saveWorld(world) {
  if (!world?.toaProjectId) return;
  try { localStorage.setItem(STORAGE_PREFIX + world.toaProjectId, JSON.stringify(world)); } catch { /* storage can be disabled */ }
}
function activate(id) {
  const project = findProject(id);
  if (!project) return;
  const app = window.TOAProjectApp;
  const current = app.getWorld();
  if (current?.toaProjectId) saveWorld(current);
  const world = readWorld(id) || seedWorld(project);
  app.setWorld(world);
  saveWorld(world);
  localStorage.setItem(ACTIVE_KEY, id);
}
function progressFor(project) {
  const flags = completedTasks(project);
  return { flags, done: flags.filter(Boolean).length, total: flags.length };
}
function stageMarkup(project, tasks, world) {
  const flags = completedTasks(project, world);
  const evidence = Array.isArray(world?.toaCommandEvidence) ? world.toaCommandEvidence : [];
  return tasks.map((task, index) => {
    const pattern = new RegExp(task.pattern);
    const record = [...evidence].reverse().find((item) => item.code === 0 && pattern.test(String(item.command || "").trim()));
    const proof = record ? `<details><summary>Моя команда и результат</summary><code>${escapeHtml(record.command)}</code><pre class="toa-command-output">${escapeHtml(record.output || "Команда выполнена без текстового вывода.")}</pre></details>` : "";
    return `<li class="toa-stage ${flags[index] ? "is-done" : ""}"><span class="toa-stage-mark">${flags[index] ? "✓" : String(index + 1)}</span><span><b>${escapeHtml(task.title)}</b><small>${escapeHtml(task.instruction)}</small>${proof}<details><summary>Зачем это нужно и подсказка</summary><p>${escapeHtml(task.why)}</p><code>${escapeHtml(task.hint)}</code></details></span></li>`;
  }).join("");
}
function reviewMarkup(project) {
  const review = reviewFor(project);
  return `<div class="toa-review"><span class="toa-task-index">ПРОВЕРКА ПОНИМАНИЯ</span><h3>${escapeHtml(review.question)}</h3><p>Выбери объяснение, которое лучше всего подходит к этому проекту.</p><div class="toa-review-options">${review.options.map((option, index) => `<button class="btn toa-answer-choice" type="button" data-project-answer="${escapeHtml(project.id)}" data-answer-index="${index}">${escapeHtml(option)}</button>`).join("")}</div><p class="toa-review-feedback" aria-live="polite"></p></div>`;
}
function cardMarkup(project, capstone = false) {
  const progress = progressFor(project);
  const locked = capstone && !allTopicsComplete();
  const checked = reviewPassed(project);
  const nextAction = progress.done === progress.total && !checked ? "Пройти проверку понимания" : progress.done === progress.total && checked ? "Проект завершён · открыть" : "Открыть рабочее место";
  return `<article class="toa-project-card ${capstone ? "toa-capstone" : ""}"><div class="toa-project-meta">${capstone ? "ИТОГОВЫЙ ПРОЕКТ" : `АКТ ${project.act} · ${escapeHtml(project.topic)}`}<span>${progress.done}/${progress.total} шагов${checked ? " · понимание ✓" : ""}</span></div><h2>${escapeHtml(project.title)}</h2><p>${escapeHtml(project.goal)}</p><div class="toa-output"><b>Результат</b><span>${escapeHtml(project.output)}</span></div><button class="btn toa-open-project" type="button" data-project="${escapeHtml(project.id)}" ${locked ? "disabled" : ""}>${locked ? "Сначала заверши 14 проектов по темам" : nextAction}</button></article>`;
}
function mount(container) {
  if (!container) return;
  const reportReady = projectComplete(CAPSTONE);
  container.innerHTML = `<section class="toa-projects"><header class="toa-project-intro"><p class="toa-eyebrow">ПРАКТИКА НА РАБОЧЕМ ПРОЕКТЕ</p><h1>Проекты: от первой команды до production</h1><p>Один учебный бизнес — интернет-магазин «Магазин Рядом». Для каждого акта есть отдельное рабочее место, файлы и задачи в терминале. Команда изменяет виртуальное окружение, а результат сохраняется в этом браузере.</p><p class="toa-honesty"><b>Как устроена практика:</b> это безопасный симулятор, не настоящий сервер. Ошибки и файлы проектов изолированы друг от друга; итоговый capstone объединяет темы в одной среде.</p>${reportReady ? '<button class="btn primary toa-export-portfolio" type="button" data-export-portfolio>Скачать отчёт-портфолио (.md)</button>' : ""}</header><div class="toa-project-grid">${PROJECTS.map((p) => cardMarkup(p)).join("")}</div><div class="toa-capstone-wrap">${cardMarkup(CAPSTONE, true)}</div></section>`;
}
function downloadPortfolio() {
  if (!projectComplete(CAPSTONE)) return;
  const worlds = Object.fromEntries([...PROJECTS, CAPSTONE].map((project) => [project.id, readWorld(project.id)]));
  const reviews = Object.fromEntries([...PROJECTS, CAPSTONE].map((project) => [project.id, reviewPassed(project)]));
  const blob = new Blob([buildPortfolioMarkdown({ worlds, reviews })], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "devops-portfolio-shop.md";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function terminalWork(container) {
  const id = activeId();
  const project = findProject(id);
  if (!project || !container || !window.TOAProjectApp) return;
  const world = window.TOAProjectApp.getWorld();
  if (world?.toaProjectId !== id) activate(id);
  const currentWorld = window.TOAProjectApp.getWorld();
  const progress = progressFor(project);
  const nextIndex = progress.flags.indexOf(false);
  const next = nextIndex < 0 ? null : project.tasks[nextIndex];
  const checked = reviewPassed(project);
  let panel = container.querySelector(".toa-workbench");
  if (!panel) {
    panel = document.createElement("section");
    panel.className = "card toa-workbench";
    const termCard = container.querySelector(".sandbox-card");
    (termCard || container).insertAdjacentElement("afterend", panel);
  }
  panel.innerHTML = `<div class="toa-work-head"><div><p class="toa-eyebrow">${id === CAPSTONE.id ? "ИТОГОВЫЙ ПРОЕКТ" : `ПРОЕКТ · АКТ ${project.act}`}</p><h2>${escapeHtml(project.title)}</h2><p>${escapeHtml(project.goal)}</p></div><button class="btn" type="button" data-project-home>К списку проектов</button></div><div class="toa-work-progress"><span>Практика: ${progress.done} из ${progress.total} шагов · ${checked ? "проверка понимания пройдена" : "проверка понимания впереди"}</span><progress max="${progress.total}" value="${progress.done}"></progress></div>${next ? `<div class="toa-current-task"><span class="toa-task-index">ШАГ ${nextIndex + 1}</span><h3>${escapeHtml(next.title)}</h3><p>${escapeHtml(next.instruction)}</p><details><summary>Зачем это нужно и подсказка</summary><p>${escapeHtml(next.why)}</p><code>${escapeHtml(next.hint)}</code></details><p class="toa-terminal-cue">Выполни команду в терминале выше. Шаг отметится после успешного выполнения.</p></div>` : checked ? `<div class="toa-finished"><h3>Проект завершён</h3><p>${escapeHtml(project.output)}</p>${id !== CAPSTONE.id ? `<p>Теперь переходи к следующему проекту по теме. Итоговый capstone откроется после завершения всех 14 тематических проектов и проверок понимания.</p>` : "<p>Ты провёл сервис через подготовку, релиз, эксплуатацию и диагностику.</p>"}</div>` : reviewMarkup(project)}<ol class="toa-stage-list">${stageMarkup(project, project.tasks, currentWorld)}</ol>`;
}

function refreshCurrent() {
  if (location.hash !== "#/terminal") return;
  const host = document.querySelector("#pageView");
  if (host) terminalWork(host);
}
function persistAfterCommand(world, command, result) {
  if (world?.toaProjectId) {
    const lastLog = Array.isArray(world.log) ? world.log.at(-1) : null;
    world.toaCommandEvidence ||= [];
    world.toaCommandEvidence.push({
      command: String(lastLog?.cmd || command || "").trim(),
      code: Number(result?.code ?? lastLog?.code ?? 0),
      output: String(result?.out ?? ""),
      recordedAt: new Date().toISOString(),
    });
    world.toaCommandEvidence = world.toaCommandEvidence.slice(-300);
    saveWorld(world);
    window.dispatchEvent(new CustomEvent("toa-project-command", { detail: { projectId: world.toaProjectId, command } }));
  }
}
function installNavigation() {
  installStyles();
  const side = document.querySelector("#side");
  if (side && !side.querySelector('[data-r="projects"]')) {
    const link = document.createElement("a");
    link.href = "#/projects";
    link.dataset.r = "projects";
    link.innerHTML = '<span class="si" aria-hidden="true">▦</span><span>Проекты</span>';
    const terminal = side.querySelector('[data-r="terminal"]');
    terminal ? terminal.insertAdjacentElement("afterend", link) : side.append(link);
  }
  const page = document.querySelector("#pageView");
  if (page && !page.__toaProjectObserver) {
    const observer = new MutationObserver(() => { if (location.hash === "#/terminal" && !page.querySelector(".toa-workbench")) terminalWork(page); });
    observer.observe(page, { childList: true, subtree: true });
    page.__toaProjectObserver = observer;
  }
  if (location.hash === "#/projects" && page) mount(page);
  if (location.hash === "#/terminal" && activeId()) {
    const project = findProject(activeId());
    if (project && window.TOAProjectApp) {
      const world = window.TOAProjectApp.getWorld();
      if (world?.toaProjectId !== project.id) activate(project.id);
      const loaded = window.TOAProjectApp.getWorld();
      if (loaded?.toaProjectId && document.querySelector("#out")) window.TOAProjectApp.refresh(loaded);
    }
  }
  refreshCurrent();
}

function installStyles() {
  if (document.getElementById("toa-project-styles")) return;
  const style = document.createElement("style");
  style.id = "toa-project-styles";
  style.textContent = `
    .toa-projects{max-width:1120px;margin:0 auto;padding:8px 0 56px}.toa-project-intro{padding:24px 28px;margin:0 0 18px;border:1px solid var(--line,#273241);border-radius:18px;background:linear-gradient(145deg,rgba(239,125,46,.1),rgba(20,25,34,.94))}.toa-project-intro h1{margin:4px 0 10px;font-size:clamp(26px,4vw,38px)}.toa-project-intro>p:not(.toa-eyebrow){max-width:850px;line-height:1.65;color:var(--muted,#a5afbd)}.toa-eyebrow{margin:0 0 6px;color:var(--accent,#ef8c48);font-size:11px;font-weight:800;letter-spacing:.12em}.toa-honesty{padding:12px 14px;border-left:3px solid var(--accent,#ef8c48);background:rgba(0,0,0,.15)}.toa-project-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,310px),1fr));gap:14px}.toa-project-card{display:flex;flex-direction:column;gap:12px;padding:20px;border:1px solid var(--line,#273241);border-radius:16px;background:var(--card,#171d27);min-height:265px}.toa-project-card h2{font-size:19px;margin:0}.toa-project-card>p,.toa-work-head p{margin:0;line-height:1.55;color:var(--muted,#a5afbd)}.toa-project-meta{display:flex;justify-content:space-between;gap:10px;color:var(--muted,#a5afbd);font-size:10px;font-weight:800;letter-spacing:.07em}.toa-project-meta span{letter-spacing:0;white-space:nowrap}.toa-output{display:grid;gap:4px;margin-top:auto;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.04);font-size:13px}.toa-output span{color:var(--muted,#a5afbd);line-height:1.45}.toa-open-project{width:100%;margin-top:4px}.toa-open-project:disabled{opacity:.55;cursor:not-allowed}.toa-capstone-wrap{margin-top:20px}.toa-capstone{border-color:rgba(239,140,72,.65);background:linear-gradient(145deg,rgba(239,125,46,.12),var(--card,#171d27))}.toa-workbench{margin-top:18px!important;padding:20px!important}.toa-work-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.toa-work-head h2{margin:0 0 8px}.toa-work-head>button{white-space:nowrap}.toa-work-progress{display:grid;grid-template-columns:1fr;gap:7px;margin:16px 0}.toa-work-progress progress{width:100%;height:10px;accent-color:var(--accent,#ef8c48)}.toa-current-task,.toa-finished{padding:16px;border:1px solid rgba(239,140,72,.4);border-radius:13px;background:rgba(239,125,46,.07)}.toa-current-task h3,.toa-finished h3{margin:7px 0}.toa-current-task p,.toa-finished p{line-height:1.55}.toa-task-index{font-size:10px;font-weight:800;letter-spacing:.12em;color:var(--accent,#ef8c48)}.toa-current-task details,.toa-stage details{margin-top:9px}.toa-current-task details p,.toa-stage details p{color:var(--muted,#a5afbd);line-height:1.5}.toa-current-task code,.toa-stage code{display:inline-block;padding:7px 9px;border-radius:7px;background:#0b0f14;color:#b7e4ca}.toa-terminal-cue{font-size:12px;color:var(--muted,#a5afbd)}.toa-stage-list{list-style:none;padding:0;margin:16px 0 0;display:grid;gap:9px}.toa-stage{display:flex;gap:11px;align-items:flex-start;padding:11px;border:1px solid var(--line,#273241);border-radius:11px}.toa-stage>span:last-child{display:grid;gap:3px}.toa-stage small{font-size:12px;line-height:1.45;color:var(--muted,#a5afbd)}.toa-stage-mark{display:grid;place-items:center;width:24px;height:24px;flex:none;border-radius:50%;background:rgba(255,255,255,.08);font-size:12px}.toa-stage.is-done .toa-stage-mark{background:rgba(65,200,148,.18);color:#55d8a6}.toa-stage.is-done b{text-decoration:line-through;opacity:.72}
    .toa-review{margin-top:16px;padding:16px;border:1px solid rgba(93,164,255,.45);border-radius:13px;background:rgba(93,164,255,.07)}.toa-review h3{margin:8px 0}.toa-review>p{line-height:1.5}.toa-review-options{display:grid;gap:8px}.toa-answer-choice{text-align:left;white-space:normal;line-height:1.45}.toa-review-feedback{min-height:1.3em;color:var(--muted,#a5afbd)}
    .toa-command-output{white-space:pre-wrap;overflow-wrap:anywhere;padding:10px;border-radius:8px;background:#0b0f14;color:#cbd5e1;font:12px/1.5 ui-monospace,monospace}.toa-export-portfolio{margin-top:14px}
    @media(max-width:620px){.toa-project-intro{padding:18px}.toa-work-head{display:grid}.toa-work-head>button{width:100%}.toa-project-card{min-height:0}}
  `;
  document.head.append(style);
}

export function projectDataIsValid() {
  const ids = new Set();
  for (const project of [...PROJECTS, CAPSTONE]) {
    const review = PROJECT_REVIEWS[project.id];
    if (ids.has(project.id) || project.tasks.length < 3 || !review || review.options.length !== 3 || review.answer < 0 || review.answer >= review.options.length) return false;
    ids.add(project.id);
    for (const task of project.tasks) {
      try { new RegExp(task.pattern); } catch { return false; }
      if (!task.title || !task.instruction || !task.why || !task.hint) return false;
    }
  }
  return PROJECTS.length === 14 && CAPSTONE.tasks.length === 14 && Object.keys(PROJECT_REVIEWS).length === 15;
}

export const ProjectApp = {
  mount, activate, terminalWork, persistAfterCommand, refreshCurrent,
  catalog: () => PROJECTS.map((project) => ({ id: project.id, title: project.title, tasks: project.tasks.map(({ title, hint }) => ({ title, hint })), review: reviewFor(project) })),
  capstoneCatalog: () => ({ tasks: CAPSTONE.tasks.map(({ title, hint }) => ({ title, hint })), review: reviewFor(CAPSTONE) }),
};

if (typeof window !== "undefined") {
  window.TOAProjects = ProjectApp;
  document.addEventListener("DOMContentLoaded", installNavigation, { once: true });
  window.addEventListener("hashchange", () => setTimeout(installNavigation, 0));
  window.addEventListener("toa-project-command", refreshCurrent);
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-export-portfolio]")) { downloadPortfolio(); return; }
    const answerButton = event.target.closest("[data-project-answer]");
    if (answerButton) {
      const project = findProject(answerButton.dataset.projectAnswer);
      const review = project && reviewFor(project);
      if (!project || !review || !completedTasks(project).every(Boolean)) return;
      const feedback = answerButton.closest(".toa-review")?.querySelector(".toa-review-feedback");
      if (Number(answerButton.dataset.answerIndex) === review.answer) {
        localStorage.setItem(REVIEW_PREFIX + project.id, "passed");
        if (feedback) feedback.textContent = review.explain;
        setTimeout(() => terminalWork(document.querySelector("#pageView")), 250);
      } else if (feedback) {
        feedback.textContent = "Пока неверно. Вернись к задаче и объяснению «зачем», затем попробуй ещё раз.";
      }
      return;
    }
    const projectButton = event.target.closest("[data-project]");
    if (projectButton) {
      const id = projectButton.dataset.project;
      if (id === CAPSTONE.id && !allTopicsComplete()) return;
      activate(id);
      location.hash = "#/terminal";
      setTimeout(refreshCurrent, 0);
      return;
    }
    if (event.target.closest("[data-project-home]")) location.hash = "#/projects";
  });
}
