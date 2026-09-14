#!/bin/sh
# Подключить бесплатный ИИ к проверке ответов.
#   Использование:  sh set-key.sh groq ВАШ_КЛЮЧ
#   Провайдер: groq | gemini | openrouter | anthropic
set -e
cd "$(dirname "$0")"

PROVIDER="$1"
KEY="$2"
[ -n "$PROVIDER" ] && [ -n "$KEY" ] || { echo "Использование: sh set-key.sh groq ВАШ_КЛЮЧ"; exit 1; }

case "$PROVIDER" in
  groq)       VAR=GROQ_API_KEY ;;
  gemini)     VAR=GEMINI_API_KEY ;;
  openrouter) VAR=OPENROUTER_API_KEY ;;
  anthropic)  VAR=ANTHROPIC_API_KEY ;;
  *) echo "Неизвестный провайдер: $PROVIDER (нужен groq, gemini, openrouter или anthropic)"; exit 1 ;;
esac

[ -f .env ] || : > .env
grep -q "^ALLOWED_ORIGINS=" .env || \
  echo "ALLOWED_ORIGINS=https://ruslan4212.github.io,http://localhost:5173" >> .env
# затираем прежнее значение этой переменной, остальные не трогаем
grep -v "^$VAR=" .env > .env.tmp || true
echo "$VAR=$KEY" >> .env.tmp
mv .env.tmp .env
chmod 600 .env

docker compose up -d --build >/dev/null 2>&1
sleep 4
docker compose logs --tail 3 grader
echo
echo "Проверяю ответ на живом вопросе..."
curl -s -m 40 -X POST http://localhost:8089/grade \
  -H 'Content-Type: application/json' \
  -d '{"question":"Что означает Load Average 8.0 на сервере с 4 ядрами?","expected":"В среднем 8 задач боролись за 4 ядра","explain":"","options":["В среднем 8 задач боролись за 4 ядра","8 процессов запущено"],"answerIx":0,"userAnswer":"значит что на 4 ядра притендуют 8 процессов"}'
echo
