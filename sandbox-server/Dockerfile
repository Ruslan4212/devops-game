# Оркестратор песочниц. Сам работает в контейнере, но ему проброшен
# docker.sock хоста (docker-outside-of-docker), чтобы поднимать
# СОСЕДНИЕ контейнеры для игроков. Это доверенный код (наш, не игроков),
# поэтому доступ к сокету — осознанная граница доверия, а не дыра:
# конечный пользователь никогда не получает доступ к сокету напрямую,
# только голый shell в контейнере без сети и без capabilities.
FROM node:20-alpine

# docker CLI (без демона — демон остаётся на хосте) + сборочные тулы для node-pty
RUN apk add --no-cache docker-cli python3 make g++

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js ./

EXPOSE 8088
CMD ["node", "server.js"]
