# Тонкий прокси к Claude API — ключ Anthropic живёт только здесь, не в браузере.
FROM node:20-alpine

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js ./

EXPOSE 8089
CMD ["node", "server.js"]
