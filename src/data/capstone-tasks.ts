/**
 * Задания капстоуна — реального изолированного Linux-контейнера (не симулятора,
 * см. src/sandbox/). По одному на каждый акт курса.
 *
 * ВАЖНО: контейнер намеренно урезан ради безопасности сервера оператора
 * (sandbox-server/server.js): --network none, без docker-in-docker, без
 * Kubernetes. Установлены только: bash, coreutils, grep, sed, less, procps,
 * git, python3 (см. sandbox-server/sandbox.Dockerfile). Поэтому задания по
 * сети, Docker, Terraform, Kubernetes, Prometheus/Grafana/Zabbix — это
 * «напиши правильный файл и объясни» (как и на настоящем ревью IaC), а
 * задания по Linux, bash, git и Python выполняются по-настоящему.
 */
export const CAPSTONE_TASKS: string[] = [
  "Акт 1. Осмотреться на сервере: whoami, id, pwd, uname -a, cat /etc/os-release. Найти самый большой файл в своём домашнем каталоге: du -a ~ | sort -rn | head -5.",
  "Акт 2. Создать каталог ~/app, положить туда deploy.sh (cat > ~/app/deploy.sh <<'EOF' ... EOF), выставить ему права 750 (chmod) и убедиться через ls -l. Посмотреть свои процессы: ps -ef | grep $(whoami).",
  'Акт 3. Дописать deploy.sh: шебанг, set -euo pipefail, аргумент $1 (окружение), проверка что цель задана ([ -z "$1" ] && exit 1), вывод даты. Запустить: ./deploy.sh prod. Проверить код возврата: echo $?',
  "Акт 4. Сети внутри этой песочницы намеренно нет (--network none — чтобы игроки не могли использовать чужой сервер как прокси). Вместо curl — напиши в ~/app/diagnosis.txt разбор сценария: nginx отдаёт 502 клиентам, curl с самого сервера на бэкенд висит по таймауту. Что проверяешь по шагам и какой вывод из каждого шага.",
  'Акт 5. В ~/app: git init, git config user.email/user.name, положить index.html, git add . && git commit -m "capstone: init". Создать ветку feature/banner, изменить файл, закоммитить, слить в main (git merge). Посмотреть историю: git log --oneline --graph --all.',
  "Акт 6. Docker внутри песочницы недоступен (сама песочница уже в контейнере — docker-in-docker сознательно исключён). Напиши в ~/app/Dockerfile корректный multi-stage Dockerfile для статики (сборочный слой + FROM nginx:alpine, COPY только собранного артефакта) и объясни в комментарии, зачем два FROM.",
  "Акт 7. Создать ~/app/.github/workflows/ci.yml: триггер on: push, джоба с шагом bash -n deploy.sh (эту проверку синтаксиса можно реально выполнить — попробуй: bash -n ~/app/deploy.sh). В комментарии — где хранить секреты пайплайна и почему не в самом yaml.",
  "Акт 8. Terraform и сеть недоступны — напиши по памяти ~/app/main.tf с ресурсом (провайдер, variable, resource, output) для деплоя статики в облачное хранилище. В комментарии распиши, что покажет terraform plan перед apply и на какие строки (+/-/~) смотреть внимательнее всего.",
  "Акт 9. kubectl в песочнице нет — напиши ~/app/deploy.yaml (Deployment: replicas 2, образ capstone:1.0, requests/limits, readinessProbe) и ~/app/svc.yaml (Service на него). В комментарии объясни разницу readiness/liveness и что будет, если readinessProbe вообще не задать.",
  "Акт 10. Собери ~/app/runbook.sh: скрипт вызывает deploy.sh, делает git tag с меткой версии и печатает отчёт (что сделано, во сколько, код возврата каждого шага). Запусти и проверь, что при ошибке любого шага (set -e) скрипт останавливается, а не продолжает молча.",
  "Акт 11. Prometheus недоступен (нет сети до реального сервиса) — напиши ~/app/prometheus.yml (scrape_configs с job_name и targets) и ~/app/alerts.yml (правило alert с expr и for: 5m). В комментарии объясни, зачем for, а не голое условие.",
  "Акт 12. Grafana недоступна — напиши ~/app/dashboard.json: один panel с targets[].expr на rate() метрики (не на голый counter) и полем unit. В комментарии — почему именно rate(), а не сама метрика.",
  "Акт 13. Zabbix-агента нет — напиши ~/app/zabbix_agentd.conf с Server=, ServerActive=, Hostname= и одним UserParameter=. В комментарии — что произойдёт, если Server= не вписать, и почему в UserParameter нельзя без проверки подставлять параметр ключа в команду.",
  'Акт 14. python3 в песочнице есть — напиши и ЗАПУСТИ ~/app/report.py: читает список файлов ~/app через subprocess.run(["ls", "-la", ...]) (список аргументов, не shell=True), разбирает вывод, печатает количество файлов и выходит sys.exit(0). Сеть недоступна — requests сюда не добавляй, объясни в комментарии, почему в реальном скрипте на requests.get всегда нужен timeout=.',
];
