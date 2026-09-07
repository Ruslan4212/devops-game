/* =====================================================================
   Pipeline Sandbox Server — реальный изолированный Linux-терминал
   =====================================================================
   Что делает:
   - принимает WebSocket-подключение, первым сообщением ждёт Supabase JWT
   - проверяет токен через сам Supabase (GET /auth/v1/user) — не хранит
     и не проверяет секреты сам, доверяет валидацию тому же проекту,
     что уже использует игра
   - на валидный токен поднимает ОДИН реальный контейнер на пользователя:
     без сети (--network none), с лимитом памяти/CPU/процессов,
     read-only корневой ФС кроме /home/sandbox и /tmp
   - жёстко убивает контейнер через SANDBOX_MAX_MINUTES или при разрыве
     соединения — что наступит раньше
   - не даёт одному пользователю открыть вторую сессию, и не даёт
     общему числу сессий на сервере превысить лимит (защита самого
     сервера от перегрузки)

   Сознательно НЕ делает: docker-in-docker, kubernetes, сетевой доступ
   изнутри контейнера, произвольные образы. Это осознанное сужение
   ради безопасности первой версии на домашнем сервере без выделенной
   security-инфраструктуры — см. обсуждение в чате перед этим файлом.
   ===================================================================== */
require("dotenv").config();
const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");
const pty = require("node-pty");
const fetch = require("node-fetch");
const { execFile } = require("child_process");
const crypto = require("crypto");

const PORT = process.env.PORT || 8088;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const IMAGE = process.env.SANDBOX_IMAGE || "alpine:3.20";
const MAX_MINUTES = parseInt(process.env.SANDBOX_MAX_MINUTES || "15", 10);
const MAX_CONCURRENT = parseInt(process.env.SANDBOX_MAX_CONCURRENT || "5", 10);
const MEM_LIMIT = process.env.SANDBOX_MEM || "128m";
const CPU_LIMIT = process.env.SANDBOX_CPUS || "0.3";
const PIDS_LIMIT = process.env.SANDBOX_PIDS || "64";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("SUPABASE_URL / SUPABASE_ANON_KEY не заданы — см. .env.example");
  process.exit(1);
}

const app = express();
app.get("/health", (req, res) => res.json({ ok: true, active: sessions.size }));
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/sandbox" });

/** userId -> { containerName, timer, pty } */
const sessions = new Map();

function dockerRun(name) {
  return new Promise((resolve, reject) => {
    execFile(
      "docker",
      [
        "run", "-d", "--rm",
        "--name", name,
        "--memory", MEM_LIMIT,
        "--cpus", CPU_LIMIT,
        "--pids-limit", PIDS_LIMIT,
        "--network", "none",
        "--cap-drop", "ALL",
        "--security-opt", "no-new-privileges",
        "--read-only",
        "--tmpfs", "/tmp:rw,size=32m",
        "--tmpfs", "/home/sandbox:rw,size=32m",
        "-w", "/home/sandbox",
        IMAGE,
        "sleep", String(MAX_MINUTES * 60 + 30)
      ],
      (err, stdout, stderr) => (err ? reject(new Error(stderr || err.message)) : resolve(stdout.trim()))
    );
  });
}

function dockerKill(name) {
  execFile("docker", ["rm", "-f", name], () => {});
}

async function verifyUser(token) {
  const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY }
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data && data.id ? data : null;
}

function closeSession(userId, reason) {
  const s = sessions.get(userId);
  if (!s) return;
  clearTimeout(s.timer);
  try { s.pty && s.pty.kill(); } catch (e) {}
  try { s.ws && s.ws.readyState === 1 && s.ws.close(1000, reason || "closed"); } catch (e) {}
  dockerKill(s.containerName);
  sessions.delete(userId);
}

wss.on("connection", (ws) => {
  let userId = null;
  let authTimeout = setTimeout(() => ws.close(4001, "auth timeout"), 8000);

  ws.once("message", async (raw) => {
    clearTimeout(authTimeout);
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch (e) { return ws.close(4000, "bad request"); }
    const token = msg && msg.token;
    if (!token) return ws.close(4000, "no token");

    const user = await verifyUser(token);
    if (!user) return ws.close(4001, "unauthorized");
    userId = user.id;

    // резервируем слот СИНХРОННО (до первого await ниже) — иначе два почти
    // одновременных подключения одного пользователя проходят проверку
    // sessions.has() оба, и лимит "одна сессия на пользователя" не срабатывает
    if (sessions.has(userId)) return ws.close(4009, "session already active");
    if (sessions.size >= MAX_CONCURRENT) return ws.close(4029, "server busy, try later");
    const containerName = "pipeline-sbx-" + crypto.randomBytes(6).toString("hex");
    sessions.set(userId, { containerName, timer: null, pty: null, ws });

    try {
      await dockerRun(containerName);
    } catch (e) {
      console.error("docker run failed:", e.message);
      sessions.delete(userId);
      return ws.close(5000, "sandbox start failed");
    }

    const shell = pty.spawn("docker", ["exec", "-it", containerName, "sh"], {
      name: "xterm-256color",
      cols: 100,
      rows: 30
    });

    const timer = setTimeout(() => closeSession(userId, "time limit reached"), MAX_MINUTES * 60 * 1000);
    sessions.set(userId, { containerName, timer, pty: shell, ws });

    ws.send(JSON.stringify({ type: "ready", minutes: MAX_MINUTES }));

    shell.onData((data) => { if (ws.readyState === 1) ws.send(JSON.stringify({ type: "out", data })); });
    shell.onExit(() => closeSession(userId, "shell exited"));

    ws.on("message", (raw) => {
      let m;
      try { m = JSON.parse(raw.toString()); } catch (e) { return; }
      if (m.type === "in") shell.write(m.data);
      else if (m.type === "resize" && m.cols && m.rows) shell.resize(m.cols, m.rows);
    });

    ws.on("close", () => closeSession(userId, "client disconnected"));
    ws.on("error", () => closeSession(userId, "socket error"));
  });
});

server.listen(PORT, () => console.log(`Pipeline sandbox server on :${PORT} (image=${IMAGE}, max=${MAX_MINUTES}min, concurrent<=${MAX_CONCURRENT})`));

process.on("SIGTERM", () => { for (const uid of sessions.keys()) closeSession(uid, "server shutdown"); process.exit(0); });
