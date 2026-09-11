import "@xterm/xterm/css/xterm.css";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { SandboxClient } from "./client";
import { CAPSTONE_TASKS as TASKS } from "../data/capstone-tasks";

interface Deps {
  /** access-токен текущей сессии Supabase или null, если не выполнен вход */
  getToken: () => Promise<string | null>;
  toast: (text: string) => void;
  /** игрок отметил капстоун как пройденный */
  onDone?: () => void;
}

const SANDBOX_URL = import.meta.env.VITE_SANDBOX_URL as string | undefined;

export function openCapstone(deps: Deps): void {
  const ov = document.createElement("div");
  ov.className = "cap-ov";
  ov.tabIndex = -1;
  ov.innerHTML =
    `<div class="cap-box">` +
    `<div class="cap-brief">` +
    `<div class="cap-head"><b>Капстоун — реальный сервер</b>` +
    `<button class="cap-x" id="capX">закрыть</button></div>` +
    `<p>Ниже — <b>настоящий изолированный Linux-контейнер</b>, не симулятор. ` +
    `Он без сети и без Docker внутри (ради безопасности сервера, где он крутится) — ` +
    `часть заданий выполняешь по-настоящему (Linux, bash, git, python3), часть — ` +
    `пишешь файл и объясняешь, как на реальном ревью. Сессия ограничена по времени; ` +
    `контейнер удаляется после закрытия.</p>` +
    `<ol class="cap-tasks">` +
    TASKS.map((t) => `<li>${t}</li>`).join("") +
    `</ol>` +
    `<div class="cap-status" id="capStatus">Подключение…</div>` +
    `<button class="cap-done" id="capDone">✓ Я выполнил все задания — завершить курс</button>` +
    `</div>` +
    `<div class="cap-term" id="capTerm"></div>` +
    `</div>`;
  document.body.appendChild(ov);
  ov.focus();

  const status = ov.querySelector<HTMLElement>("#capStatus")!;
  const termEl = ov.querySelector<HTMLElement>("#capTerm")!;
  const doneBtn = ov.querySelector<HTMLButtonElement>("#capDone")!;

  // Проверить выполнение на реальном сервере автоматически нельзя — это ручная
  // работа, как код-ревью капстоуна в буткемпе. Игрок подтверждает сам.
  doneBtn.onclick = () => {
    deps.onDone?.();
    deps.toast("🎓 Курс завершён. Ранг подтверждён капстоуном.");
    doneBtn.textContent = "✓ Капстоун засчитан";
    doneBtn.disabled = true;
  };
  let client: SandboxClient | null = null;
  let term: Terminal | null = null;
  let countdown: number | undefined;
  let onResize: (() => void) | null = null;

  const dispose = (): void => {
    window.clearInterval(countdown);
    if (onResize) window.removeEventListener("resize", onResize);
    client?.close();
    term?.dispose();
    ov.remove();
  };
  ov.querySelector<HTMLButtonElement>("#capX")!.onclick = dispose;
  ov.addEventListener("keydown", (e) => {
    if (e.key === "Escape") dispose();
  });

  if (!SANDBOX_URL) {
    status.innerHTML =
      `Свой sandbox-сервер не подключён к этой сборке (нет <b>VITE_SANDBOX_URL</b>).<br>` +
      `Разверни <code>sandbox-server/</code> по инструкции в его README, либо потренируйся ` +
      `на бесплатных внешних песочницах: ` +
      `<a href="https://killercoda.com/playgrounds/scenario/ubuntu" target="_blank" rel="noopener">Killercoda</a>, ` +
      `<a href="https://labs.play-with-docker.com" target="_blank" rel="noopener">Play with Docker</a>.`;
    return;
  }

  void (async () => {
    const token = await deps.getToken();
    if (!token) {
      status.innerHTML = `Войди в аккаунт (кнопка в шапке) — песочница доступна только авторизованным.`;
      return;
    }

    term = new Terminal({
      fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
      fontSize: 13,
      theme: { background: "#080b11", foreground: "#e7edf5" },
      cursorBlink: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(termEl);
    fit.fit();

    client = new SandboxClient(SANDBOX_URL, token, {
      onReady: (minutes) => {
        let left = minutes * 60;
        const paint = (): void => {
          const mm = String(Math.floor(left / 60)).padStart(2, "0");
          const ss = String(left % 60).padStart(2, "0");
          status.textContent = `Контейнер запущен. Осталось ${mm}:${ss}`;
          if (left-- <= 0) window.clearInterval(countdown);
        };
        paint();
        countdown = window.setInterval(paint, 1000);
        term!.focus();
      },
      onOutput: (data) => term!.write(data),
      onClose: (reason) => {
        window.clearInterval(countdown);
        status.textContent = reason;
        term?.write("\r\n\x1b[90m— сессия завершена —\x1b[0m\r\n");
      },
    });
    client.open();

    term.onData((d) => client!.input(d));
    onResize = () => {
      fit.fit();
      client!.resize(term!.cols, term!.rows);
    };
    window.addEventListener("resize", onResize);
  })();
}
