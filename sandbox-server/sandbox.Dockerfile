# Образ ПЕСОЧНИЦЫ (в нём сидит игрок), не оркестратора.
# Минимальный Alpine + непривилегированный пользователь. Оркестратор
# запускает его с --user 1000:1000, --network none, --cap-drop ALL,
# --read-only; здесь только готовим пользователя и рабочую папку.
#
#   docker build -f sandbox.Dockerfile -t opsacademy-sandbox:1 .
#   затем в .env: SANDBOX_IMAGE=opsacademy-sandbox:1
FROM alpine:3.20
RUN apk add --no-cache bash coreutils grep sed less procps git python3 \
 && addgroup -g 1000 sandbox \
 && adduser -D -u 1000 -G sandbox -h /home/sandbox sandbox
USER sandbox
WORKDIR /home/sandbox
CMD ["sleep", "infinity"]
