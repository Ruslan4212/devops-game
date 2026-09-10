/* =====================================================================
   Ops Academy Sandbox Server — реальный изолированный Linux-терминал
   =====================================================================
   Для капстоуна курса: вошедший в аккаунт игрок получает НАСТОЯЩИЙ
   контейнер (не симулятор) прямо в браузере и применяет весь курс —
   Linux, systemd, git, docker внутри — на живой машине.

   Модель доверия и изоляции:
   - подключение только по WebSocket, первым сообщением — Supabase JWT;
     токен проверяется у самого Supabase (GET /auth/v1/user), сервер
     не хранит и не подписывает ничего сам;
   - Origin входящего соединения сверяется с ALLOWED_ORIGINS — чтобы
     чужой сайт с украденным токеном не мог гонять песочницы за наш счёт;
   - на валидный вход — ОДИН контейнер на пользователя:
       --network none            нет сети (это домашний IP оператора)
       --cap-drop ALL            ни одной capability
       --security-opt no-new-privileges
       --read-only + tmpfs       корень только на чтение, писать в /home/sandbox и /tmp
       --user 1000:1000          не root внутри
       --memory / --memory-swap  без swap-обхода лимита памяти
       --cpus / --pids-limit     потолок CPU и числа процессов
   - контейнер жёстко убивается по таймауту SANDBOX_MAX_MINUTES или при
     разрыве соединения — что раньше;
   - одна сессия на пользователя; не больше SANDBOX_MAX_CONCURRENT на сервер;
   - грубый rate-limit по IP на попытки подключения.

   Сознательно НЕ делает: docker-in-docker, kubernetes, сеть изнутри
   песочницы, произвольные образы. Осознанное сужение ради безопасности
   первой версии на сервере без выделенной security-инфраструктуры.
   ===================================================================== */
"use strict";

require("dotenv").config();
const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");
const pty = require("node-pty");
const { execFile } = require("child_process");
const crypto = require("crypto");

/* ------------------------------- конфиг ------------------------------- */
const PORT = Number(process.env.PORT || 8088);
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const IMAGE = process.env.SANDBOX_IMAGE || "alpine:3.20";
const MAX_MINUTES = Number(process.env.SANDBOX_MAX_MINUTES || 15);
const MAX_CONCURRENT = Number(process.env.SANDBOX_MAX_CONCURRENT || 5);
const MEM_LIMIT = process.env.SANDBOX_MEM || "128m";
const CPU_LIMIT = process.env.SANDBOX_CPUS || "0.3";
const PIDS_LIMIT = process.env.SANDBOX_PIDS || "64";

const AUTH_TIMEOUT_MS = 8000;
const VERIFY_TIMEOUT_MS = 5000;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_PER_IP = 10;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("SUPABASE_URL / SUPABASE_ANON_KEY не заданы — см. .env.example");
  process.exit(1);
}

/* --------------------------- структурный лог -------------------------- */
const log = (level, msg, extra) =>
  console.log(JSON.stringify({ ts: new Date().toISOString(), level, msg, ...extra }));

/* ---------------------------- rate limit ----------------------------- */
/** ip -> массив таймстемпов попыток за окно */
const attempts = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const arr = (attempts.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  arr.push(now);
  attempts.set(ip, arr);
  return arr.length > RATE_MAX_PER_IP;
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, arr] of attempts) {
    const live = arr.filter((t) => now - t < RATE_WINDOW_MS);
    if (live.length) attempts.set(ip, live);
    else attempts.delete(ip);
  }
}, RATE_WINDOW_MS).unref();

/* ------------------------------ docker ------------------------------- */
function dockerRun(name) {
  return new Promise((resolve, reject) => {
    execFile(
      "docker",
      [
        "run", "-d", "--rm",
        "--name", name,
        "--user", "1000:1000",
        "--memory", MEM_LIMIT,
        "--memory-swap", MEM_LIMIT,
        "--cpus", CPU_LIMIT,
        "--pids-limit", PIDS_LIMIT,
        "--ulimit", "nproc=" + PIDS_LIMIT + ":" + PIDS_LIMIT,
        "--ulimit", "nofile=256:256",
        "--network", "none",
        "--cap-drop", "ALL",
        "--security-opt", "no-new-privileges",
        "--read-only",
        "--tmpfs", "/tmp:rw,size=32m,mode=1777",
        "--tmpfs", "/home/sandbox:rw,size=32m,uid=1000,gid=1000",
        "-w", "/home/sandbox",
        IMAGE,
        "sleep", String(MAX_MINUTES * 60 + 30),
      ],
      { timeout: 15_000 },
      (err, stdout, stderr) =>
        err ? reject(new Error((stderr || err.message).trim())) : resolve(stdout.trim()),
    );
  });
}

function dockerKill(name) {
  execFile("docker", ["rm", "-f", name], () => {});
}

async function verifyUser(token) {
  try {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data && data.id ? data : null;
  } catch {
    return null;
  }
}

/* ----------------------------- сессии ------------------------------- */
/** userId -> { containerName, timer, pty, ws } */
const sessions = new Map();

function closeSession(userId, reason) {
  const s = sessions.get(userId);
  if (!s) return;
  sessions.delete(userId);
  clearTimeout(s.timer);
  try { s.pty && s.pty.kill(); } catch { /* уже мёртв */ }
  try { s.ws && s.ws.readyState === 1 && s.ws.close(1000, reason || "closed"); } catch { /* ignore */ }
  dockerKill(s.containerName);
  log("info", "session closed", { userId, reason, active: sessions.size });
}

/* ------------------------------ сервер ------------------------------ */
const app = express();
app.disable("x-powered-by");
app.get("/health", (_req, res) => res.json({ ok: true, active: sessions.size, max: MAX_CONCURRENT }));

const server = http.createServer(app);
const wss = new WebSocketServer({
  server,
  path: "/sandbox",
  maxPayload: 64 * 1024,
  verifyClient: ({ origin, req }, done) => {
    const ip = req.socket.remoteAddress || "?";
    if (ALLOWED_ORIGINS.length && origin && !ALLOWED_ORIGINS.includes(origin)) {
      log("warn", "origin rejected", { origin, ip });
      return done(false, 403, "origin not allowed");
    }
    if (rateLimited(ip)) {
      log("warn", "rate limited", { ip });
      return done(false, 429, "too many attempts");
    }
    done(true);
  },
});

wss.on("connection", (ws, req) => {
  const ip = req.socket.remoteAddress || "?";
  let userId = null;
  const authTimeout = setTimeout(() => ws.close(4001, "auth timeout"), AUTH_TIMEOUT_MS);

  ws.once("message", async (raw) => {
    clearTimeout(authTimeout);
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return ws.close(4000, "bad request"); }
    const token = msg && typeof msg.token === "string" ? msg.token : null;
    if (!token) return ws.close(4000, "no token");

    const user = await verifyUser(token);
    if (!user) return ws.close(4001, "unauthorized");
    userId = user.id;

    // слот резервируем СИНХРОННО (до await ниже), иначе два почти
    // одновременных подключения одного пользователя оба проходят проверку
    if (sessions.has(userId)) return ws.close(4009, "session already active");
    if (sessions.size >= MAX_CONCURRENT) return ws.close(4029, "server busy, try later");
    const containerName = "opsacad-sbx-" + crypto.randomBytes(6).toString("hex");
    sessions.set(userId, { containerName, timer: null, pty: null, ws });

    try {
      await dockerRun(containerName);
    } catch (e) {
      log("error", "docker run failed", { userId, ip, err: e.message });
      sessions.delete(userId);
      return ws.close(5000, "sandbox start failed");
    }

    const shell = pty.spawn("docker", ["exec", "-i", containerName, "sh"], {
      name: "xterm-256color",
      cols: 100,
      rows: 30,
    });

    const timer = setTimeout(() => closeSession(userId, "time limit reached"), MAX_MINUTES * 60 * 1000);
    sessions.set(userId, { containerName, timer, pty: shell, ws });
    log("info", "session started", { userId, ip, container: containerName, active: sessions.size });

    ws.send(JSON.stringify({ type: "ready", minutes: MAX_MINUTES }));

    shell.onData((data) => { if (ws.readyState === 1) ws.send(JSON.stringify({ type: "out", data })); });
    shell.onExit(() => closeSession(userId, "shell exited"));

    ws.on("message", (buf) => {
      let m;
      try { m = JSON.parse(buf.toString()); } catch { return; }
      if (m.type === "in" && typeof m.data === "string") shell.write(m.data);
      else if (m.type === "resize" && Number.isInteger(m.cols) && Number.isInteger(m.rows)) {
        shell.resize(Math.min(m.cols, 300), Math.min(m.rows, 100));
      }
    });

    ws.on("close", () => closeSession(userId, "client disconnected"));
    ws.on("error", () => closeSession(userId, "socket error"));
  });
});

server.listen(PORT, () =>
  log("info", "sandbox server up", {
    port: PORT, image: IMAGE, maxMinutes: MAX_MINUTES, maxConcurrent: MAX_CONCURRENT,
    origins: ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : "любой (ALLOWED_ORIGINS не задан)",
  }),
);

function shutdown(sig) {
  log("info", "shutting down", { sig, active: sessions.size });
  for (const uid of [...sessions.keys()]) closeSession(uid, "server shutdown");
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
