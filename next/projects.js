export const PROJECTS = [
  {
    id: "linux", act: 1, topic: "Linux и файловая система", title: "Подготовить рабочее место магазина",
    goal: "Разобраться в структуре сервиса и научиться безопасно исследовать его файлы и логи.",
    why: "Перед изменением production нужно понять, где ты находишься, что лежит рядом и какие данные трогаешь.",
    output: "Карта файлов проекта и найденная причина ошибки в журнале.", directory: "/home/devops/shop-linux",
    tasks: [
      { title: "Проверь рабочую папку", instruction: "Убедись, что работаешь в каталоге проекта, а не в случайной директории.", why: "Команда в неверном каталоге может изменить не тот сервис.", pattern: "^pwd$", hint: "pwd" },
      { title: "Составь карту файлов", instruction: "Найди конфигурацию, код, скрипты и журналы магазина.", why: "Структура проекта подсказывает, где искать настройки и доказательства сбоя.", pattern: "^(find \. -type f|ls -la)$", hint: "find . -type f" },
      { title: "Найди ошибку в журнале", instruction: "Отфильтруй записи уровня error в логе приложения.", why: "Сначала собираем факты из логов, потом выбираем исправление.", pattern: "^grep -i error logs/app\\.log$", hint: "grep -i error logs/app.log" },
    ],
  },
  {
    id: "services", act: 2, topic: "Система и службы", title: "Стабилизировать сервер приложения",
    goal: "Проверить процессы, состояние служб и ресурсы узла, на котором работает магазин.",
    why: "Работающий процесс, включённый автозапуск и доступный порт — разные условия надёжности.",
    output: "Снимок состояния сервиса и проверка ресурсов хоста.", directory: "/home/devops/shop-services",
    tasks: [
      { title: "Проверь процессы", instruction: "Найди процессы приложения и веб-сервера.", why: "Симптом «сайт не отвечает» ещё не говорит, что именно остановилось.", pattern: "^ps aux$", hint: "ps aux" },
      { title: "Проверь службу", instruction: "Посмотри состояние shop-api в systemd.", why: "Статус показывает состояние, причину последнего выхода и последние сообщения.", pattern: "^systemctl status shop-api$", hint: "systemctl status shop-api" },
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
      { title: "Подготовь запуск", instruction: "Выдай скрипту право на запуск.", why: "Исполняемый бит позволяет запускать файл как программу без небезопасного chmod 777.", pattern: "^chmod \\+x scripts/healthcheck\\.sh$", hint: "chmod +x scripts/healthcheck.sh" },
      { title: "Сохрани копию", instruction: "Создай архив проекта в каталоге backups.", why: "Перед опасными изменениями должна быть проверенная точка восстановления.", pattern: "^tar -czf backups/shop\\.tar\\.gz \\.$", hint: "tar -czf backups/shop.tar.gz ." },
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
      { title: "Проверь приложение по HTTP", instruction: "Запроси health endpoint магазина.", why: "HTTP-код и заголовки отделяют сетевую проблему от ошибки приложения.", pattern: "^curl -I http://localhost:3000/health$", hint: "curl -I http://localhost:3000/health" },
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
      { title: "Зафиксируй проект", instruction: "Добавь README и создай первый коммит.", why: "Коммит — проверяемая точка, к которой команда может вернуться.", pattern: "^git commit -m .+$", hint: 'git add README.md && git commit -m "Начальный релиз магазина"' },
    ],
  },
  {
    id: "docker", act: 6, topic: "Docker", title: "Упаковать магазин в контейнер",
    goal: "Собрать образ из Dockerfile, проверить его и запустить контейнер приложения.",
    why: "Одинаковый образ уменьшает разницу между ноутбуком, CI и production.",
    output: "Собранный shop-api image и запущенный контейнер.", directory: "/home/devops/shop-docker",
    tasks: [
      { title: "Изучи рецепт образа", instruction: "Проверь Dockerfile перед сборкой.", why: "Состав образа влияет на размер, безопасность и воспроизводимость.", pattern: "^cat Dockerfile$", hint: "cat Dockerfile" },
      { title: "Собери образ", instruction: "Собери образ shop-api:dev из текущего каталога.", why: "Образ — переносимый результат сборки, контейнер — его запущенный экземпляр.", pattern: "^docker build -t shop-api:dev \\.$", hint: "docker build -t shop-api:dev ." },
      { title: "Проверь контейнеры", instruction: "Посмотри список запущенных контейнеров.", why: "После запуска проверь фактическое состояние, а не только сообщение команды.", pattern: "^docker ps$", hint: "docker ps" },
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
      { title: "Проверь конфигурацию релиза", instruction: "Прочитай workflow целиком и найди порядок этапов.", why: "Сборка, тесты и публикация должны выполняться в правильном порядке.", pattern: "^cat \\.github/workflows/deploy\\.yml$", hint: "cat .github/workflows/deploy.yml" },
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
      { title: "Проверь план", instruction: "Сформируй план изменений и прочитай, что он собирается сделать.", why: "Plan — последний безопасный шанс заметить нежелательное удаление.", pattern: "^terraform plan$", hint: "terraform plan" },
    ],
  },
  {
    id: "kubernetes", act: 9, topic: "Kubernetes", title: "Запустить магазин в кластере",
    goal: "Изучить Deployment, проверить Pod и Service и диагностировать состояние приложения.",
    why: "В Kubernetes задают желаемое состояние, а контроллеры поддерживают его и сообщают о проблемах.",
    output: "Проверенный манифест магазина и состояние workload в кластере.", directory: "/home/devops/shop-kubernetes",
    tasks: [
      { title: "Изучи манифест", instruction: "Проверь Deployment магазина перед применением.", why: "Образ, replicas и probes определяют, как кластер запускает сервис.", pattern: "^cat k8s/deployment\\.yaml$", hint: "cat k8s/deployment.yaml" },
      { title: "Проверь Pod", instruction: "Посмотри состояние Pod в текущем namespace.", why: "Running не всегда означает Ready — смотри фактическое состояние.", pattern: "^kubectl get pods$", hint: "kubectl get pods" },
      { title: "Проверь Service", instruction: "Посмотри сервисы и доступность приложения внутри кластера.", why: "Без Service у приложения может не быть стабильной точки доступа.", pattern: "^kubectl get services$", hint: "kubectl get services" },
    ],
  },
  {
    id: "sre", act: 10, topic: "Дежурство и SRE", title: "Разобрать инцидент магазина",
    goal: "Собрать временную шкалу сбоя по журналам и проверить влияние на пользователей.",
    why: "Дежурный сначала ограничивает ущерб и собирает доказательства, а затем устраняет первопричину.",
    output: "Подтверждённая причина инцидента и команды для проверки восстановления.", directory: "/home/devops/shop-sre",
    tasks: [
      { title: "Найди ошибки приложения", instruction: "Отфильтруй ошибки в журнале сервиса.", why: "Ищи корреляцию событий, а не делай вывод по одному сообщению.", pattern: "^grep -i error logs/app\\.log$", hint: "grep -i error logs/app.log" },
      { title: "Восстанови последние события", instruction: "Прочитай последние строки журнала.", why: "Последние события помогают увидеть, что произошло непосредственно перед сбоем.", pattern: "^tail -n 20 logs/app\\.log$", hint: "tail -n 20 logs/app.log" },
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
      { title: "Проверь частоту сбора", instruction: "Найди интервал scrape в конфигурации Prometheus.", why: "Слишком редкий сбор задерживает обнаружение инцидента, а слишком частый создаёт лишнюю нагрузку.", pattern: "^grep -n scrape_interval monitoring/prometheus\\.yml$", hint: "grep -n scrape_interval monitoring/prometheus.yml" },
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
      { title: "Проверь запросы", instruction: "Найди запрос панели ошибок.", why: "Панель полезна, когда запрос измеряет понятный сигнал и имеет нужные labels.", pattern: "^grep -n shop_errors monitoring/grafana-dashboard\\.json$", hint: "grep -n shop_errors monitoring/grafana-dashboard.json" },
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
      { title: "Проверь пользовательскую проверку", instruction: "Найди health item, который агент публикует для магазина.", why: "Пользовательский item связывает системный мониторинг с доступностью приложения.", pattern: "^grep -n shop\\.health monitoring/zabbix-agent\\.conf$", hint: "grep -n shop.health monitoring/zabbix-agent.conf" },
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
      { title: "Запусти CLI", instruction: "Запусти healthcheck и проверь итоговый статус.", why: "Скрипт пригоден для CI, когда у него предсказуемый вывод и код возврата.", pattern: "^python3 scripts/healthcheck\\.py$", hint: "python3 scripts/healthcheck.py" },
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
    { title: "Linux: проверь дерево релиза", instruction: "Убедись, что в каталоге есть приложение и конфигурация.", why: "Перед релизом зафиксируй состав артефакта.", pattern: "^(find \. -type f|ls -la)$", hint: "find . -type f" },
    { title: "Службы: проверь API", instruction: "Проверь состояние службы магазина.", why: "Сервис должен быть активен до проверки внешнего пути.", pattern: "^systemctl status shop-api$", hint: "systemctl status shop-api" },
    { title: "Bash: подготовь healthcheck", instruction: "Подготовь скрипт к безопасному запуску.", why: "Быстрый повторяемый preflight ловит очевидные ошибки; давай права только на выполнение.", pattern: "^chmod \\+x scripts/healthcheck\\.sh$", hint: "chmod +x scripts/healthcheck.sh" },
    { title: "Сети: проверь HTTP", instruction: "Проверь внешний health endpoint.", why: "Внутренний статус процесса не гарантирует доступность для клиента.", pattern: "^curl -I http://localhost:3000/health$", hint: "curl -I http://localhost:3000/health" },
    { title: "Git: подготовь релизную историю", instruction: "Инициализируй репозиторий и проверь его состояние.", why: "Во время инцидента нужна точная версия кода и понятная история изменений.", pattern: "^git status$", hint: "git init && git status" },
    { title: "Docker: проверь контейнеры", instruction: "Посмотри фактически запущенные контейнеры.", why: "Проверь запущенную версию после доставки.", pattern: "^docker ps$", hint: "docker ps" },
    { title: "CI/CD: проверь workflow", instruction: "Просмотри release workflow.", why: "Убедись, что автоматические проверки входят в путь выпуска.", pattern: "^cat \\.github/workflows/deploy\\.yml$", hint: "cat .github/workflows/deploy.yml" },
    { title: "Terraform: проверь план", instruction: "Перейди в каталог IaC, инициализируй Terraform и сформируй план инфраструктуры.", why: "Не применяй инфраструктурные изменения, пока не изучил план.", pattern: "^terraform plan$", hint: "cd infra && terraform init && terraform plan" },
    { title: "Kubernetes: проверь rollout", instruction: "Проверь Pod магазина после обновления.", why: "Новый rollout успешен только когда реплики готовы.", pattern: "^kubectl get pods$", hint: "kubectl get pods" },
    { title: "SRE: собери доказательства", instruction: "Вернись в корень проекта и найди последние ошибки приложения.", why: "Постмортем начинается с фактов и временной шкалы.", pattern: "^tail -n 20 logs/app\\.log$", hint: "cd .. && tail -n 20 logs/app.log" },
    { title: "Prometheus: проверь сбор", instruction: "Проверь scrape interval в конфигурации.", why: "Метрики покажут насыщение и ошибки до массовых жалоб; их частота сбора должна соответствовать задаче.", pattern: "^grep -n scrape_interval monitoring/prometheus\\.yml$", hint: "grep -n scrape_interval monitoring/prometheus.yml" },
    { title: "Grafana: проверь обзор", instruction: "Найди панель с ошибками магазина.", why: "Дежурному нужен быстрый обзор без ручного поиска по всем системам.", pattern: "^grep -n shop_errors monitoring/grafana-dashboard\\.json$", hint: "grep -n shop_errors monitoring/grafana-dashboard.json" },
    { title: "Zabbix: проверь health item", instruction: "Убедись, что агент настроен проверять приложение.", why: "Вторая система мониторинга полезна для доступности и сигналов уровня хоста.", pattern: "^grep -n shop\\.health monitoring/zabbix-agent\\.conf$", hint: "grep -n shop.health monitoring/zabbix-agent.conf" },
    { title: "Python: запусти итоговую проверку", instruction: "Запусти CLI healthcheck как финальный gate.", why: "Один скрипт собирает результаты проверок и может остановить плохой релиз.", pattern: "^python3 scripts/healthcheck\\.py$", hint: "python3 scripts/healthcheck.py" },
  ],
};

const STORAGE_PREFIX = "toa_project_world_v1:";
const ACTIVE_KEY = "toa_active_project_v1";
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function readWorld(id) {
  try { return JSON.parse(localStorage.getItem(STORAGE_PREFIX + id) || "null"); } catch { return null; }
}
function activeId() { try { return localStorage.getItem(ACTIVE_KEY) || ""; } catch { return ""; } }
function findProject(id) { return id === CAPSTONE.id ? CAPSTONE : PROJECTS.find((p) => p.id === id); }
function completedTasks(project, world = readWorld(project.id)) {
  const log = Array.isArray(world?.log) ? world.log : [];
  return project.tasks.map((task) => log.some((entry) => entry?.code === 0 && new RegExp(task.pattern).test(String(entry.cmd || "").trim())));
}
function projectComplete(project) { return completedTasks(project).every(Boolean); }
function allTopicsComplete() { return PROJECTS.every(projectComplete); }

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
  "k8s/deployment.yaml": "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: shop-api\nspec:\n  replicas: 2\n  selector:\n    matchLabels:\n      app: shop-api\n  template:\n    metadata:\n      labels:\n        app: shop-api\n    spec:\n      containers:\n        - name: shop-api\n          image: shop-api:1.0\n          ports:\n            - containerPort: 3000\n",
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
  return tasks.map((task, index) => `<li class="toa-stage ${flags[index] ? "is-done" : ""}"><span class="toa-stage-mark">${flags[index] ? "✓" : String(index + 1)}</span><span><b>${escapeHtml(task.title)}</b><small>${escapeHtml(task.instruction)}</small><details><summary>Зачем это нужно и подсказка</summary><p>${escapeHtml(task.why)}</p><code>${escapeHtml(task.hint)}</code></details></span></li>`).join("");
}
function cardMarkup(project, capstone = false) {
  const progress = progressFor(project);
  const locked = capstone && !allTopicsComplete();
  return `<article class="toa-project-card ${capstone ? "toa-capstone" : ""}"><div class="toa-project-meta">${capstone ? "ИТОГОВЫЙ ПРОЕКТ" : `АКТ ${project.act} · ${escapeHtml(project.topic)}`}<span>${progress.done}/${progress.total} шагов</span></div><h2>${escapeHtml(project.title)}</h2><p>${escapeHtml(project.goal)}</p><div class="toa-output"><b>Результат</b><span>${escapeHtml(project.output)}</span></div><button class="btn toa-open-project" type="button" data-project="${escapeHtml(project.id)}" ${locked ? "disabled" : ""}>${locked ? "Сначала заверши 14 проектов по темам" : progress.done === progress.total ? "Продолжить проект" : "Открыть рабочее место"}</button></article>`;
}
function mount(container) {
  if (!container) return;
  container.innerHTML = `<section class="toa-projects"><header class="toa-project-intro"><p class="toa-eyebrow">ПРАКТИКА НА РАБОЧЕМ ПРОЕКТЕ</p><h1>Проекты: от первой команды до production</h1><p>Один учебный бизнес — интернет-магазин «Магазин Рядом». Для каждого акта есть отдельное рабочее место, файлы и задачи в терминале. Команда изменяет виртуальное окружение, а результат сохраняется в этом браузере.</p><p class="toa-honesty"><b>Как устроена практика:</b> это безопасный симулятор, не настоящий сервер. Ошибки и файлы проектов изолированы друг от друга; итоговый capstone объединяет темы в одной среде.</p></header><div class="toa-project-grid">${PROJECTS.map((p) => cardMarkup(p)).join("")}</div><div class="toa-capstone-wrap">${cardMarkup(CAPSTONE, true)}</div></section>`;
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
  let panel = container.querySelector(".toa-workbench");
  if (!panel) {
    panel = document.createElement("section");
    panel.className = "card toa-workbench";
    const termCard = container.querySelector(".sandbox-card");
    (termCard || container).insertAdjacentElement("afterend", panel);
  }
  panel.innerHTML = `<div class="toa-work-head"><div><p class="toa-eyebrow">${id === CAPSTONE.id ? "ИТОГОВЫЙ ПРОЕКТ" : `ПРОЕКТ · АКТ ${project.act}`}</p><h2>${escapeHtml(project.title)}</h2><p>${escapeHtml(project.goal)}</p></div><button class="btn" type="button" data-project-home>К списку проектов</button></div><div class="toa-work-progress"><span>Практика: ${progress.done} из ${progress.total} шагов</span><progress max="${progress.total}" value="${progress.done}"></progress></div>${next ? `<div class="toa-current-task"><span class="toa-task-index">ШАГ ${nextIndex + 1}</span><h3>${escapeHtml(next.title)}</h3><p>${escapeHtml(next.instruction)}</p><details><summary>Зачем это нужно и подсказка</summary><p>${escapeHtml(next.why)}</p><code>${escapeHtml(next.hint)}</code></details><p class="toa-terminal-cue">Выполни команду в терминале выше. Шаг отметится после успешного выполнения.</p></div>` : `<div class="toa-finished"><h3>Проект завершён</h3><p>${escapeHtml(project.output)}</p>${id !== CAPSTONE.id ? `<p>Теперь перейди к следующему проекту по теме. Итоговый capstone откроется после завершения всех 14 тематических проектов.</p>` : "<p>Ты провёл сервис через подготовку, релиз, эксплуатацию и диагностику.</p>"}</div>`}<ol class="toa-stage-list">${stageMarkup(project, project.tasks, currentWorld)}</ol>`;
}

function refreshCurrent() {
  if (location.hash !== "#/terminal") return;
  const host = document.querySelector("#pageView");
  if (host) terminalWork(host);
}
function persistAfterCommand(world, command) {
  if (world?.toaProjectId) {
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
    @media(max-width:620px){.toa-project-intro{padding:18px}.toa-work-head{display:grid}.toa-work-head>button{width:100%}.toa-project-card{min-height:0}}
  `;
  document.head.append(style);
}

export function projectDataIsValid() {
  const ids = new Set();
  for (const project of [...PROJECTS, CAPSTONE]) {
    if (ids.has(project.id) || project.tasks.length < 3) return false;
    ids.add(project.id);
    for (const task of project.tasks) {
      try { new RegExp(task.pattern); } catch { return false; }
      if (!task.title || !task.instruction || !task.why || !task.hint) return false;
    }
  }
  return PROJECTS.length === 14 && CAPSTONE.tasks.length === 14;
}

export const ProjectApp = {
  mount, activate, terminalWork, persistAfterCommand, refreshCurrent,
  catalog: () => PROJECTS.map(({ id, title, tasks }) => ({ id, title, tasks: tasks.map(({ title: taskTitle, hint }) => ({ title: taskTitle, hint })) })),
  capstoneCatalog: () => CAPSTONE.tasks.map(({ title, hint }) => ({ title, hint })),
};

if (typeof window !== "undefined") {
  window.TOAProjects = ProjectApp;
  document.addEventListener("DOMContentLoaded", installNavigation, { once: true });
  window.addEventListener("hashchange", () => setTimeout(installNavigation, 0));
  window.addEventListener("toa-project-command", refreshCurrent);
  document.addEventListener("click", (event) => {
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
