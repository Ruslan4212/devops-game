import "@xterm/xterm/css/xterm.css";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { SandboxClient, sandboxUrl } from "./client";
import type { Step } from "../engine/types";

interface Deps {
  /** access-токен текущей сессии Supabase или null, если вход не выполнен */
  getToken: () => Promise<string | null>;
  /** заголовок урока — чтобы игрок видел, к чему относится шпаргалка */
  title: string;
  /** команды этого урока по порядку: их можно отправить в настоящий контейнер одним кликом */
  commands: string[];
}

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

/**
 * Настоящий Linux рядом с уроком: тот же материал, но выполняется не симулятором,
 * а отдельным контейнером на сервере — со всеми настоящими сообщениями об ошибках.
 * У каждого игрока свой контейнер, без сети и с жёсткими лимитами, поэтому уронить
 * сервер чужими командами нельзя.
 */
export function openLiveServer(deps: Deps): void {
  const ov = document.createElement("div");
  ov.className = "cap-ov";
  ov.tabIndex = -1;
  ov.innerHTML =
    `<div class="cap-box">` +
    `<div class="cap-brief">` +
    `<div class="cap-head"><b>Настоящий сервер</b>` +
    `<button class="cap-x" id="lvX">закрыть</button></div>` +
    `<p>Это <b>не симулятор</b>, а отдельный Linux-контейнер на сервере — ровно с тем ` +
    `поведением и теми сообщениями об ошибках, что и на настоящей машине. Контейнер ` +
    `твой личный: без сети, с ограничением по памяти и процессам, удаляется после ` +
    `закрытия. Уроку он ничего не засчитывает — это место, где можно проверить руками.</p>` +
    `<div class="cap-status" id="lvStatus">Подключение…</div>` +
    `<p class="cap-sub">Команды урока «${esc(deps.title)}» — нажми, чтобы выполнить вживую:</p>` +
    `<ol class="cap-tasks" id="lvCmds">` +
    deps.commands
      .map((c) => `<li><button class="lv-cmd" data-cmd="${esc(c)}">${esc(c)}</button></li>`)
      .join("") +
    `</ol>` +
    `</div>` +
    `<div class="cap-term" id="lvTerm"></div>` +
    `</div>`;
  document.body.appendChild(ov);
  ov.focus();

  const status = ov.querySelector<HTMLElement>("#lvStatus")!;
  const termEl = ov.querySelector<HTMLElement>("#lvTerm")!;

  let client: SandboxClient | null = null;
  let term: Terminal | null = null;
  let countdown: number | undefined;
  let onResize: (() => void) | null = null;
  let ready = false;

  const dispose = (): void => {
    window.clearInterval(countdown);
    if (onResize) window.removeEventListener("resize", onResize);
    client?.close();
    term?.dispose();
    ov.remove();
  };
  ov.querySelector<HTMLButtonElement>("#lvX")!.onclick = dispose;
  ov.addEventListener("keydown", (e) => {
    if (e.key === "Escape") dispose();
  });

  ov.querySelector<HTMLElement>("#lvCmds")!.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>(".lv-cmd");
    if (!b || !ready || !client) return;
    client.input(b.dataset.cmd + "\n");
    term?.focus();
  });

  void (async () => {
    const token = await deps.getToken();
    if (!token) {
      status.innerHTML =
        `Войди в аккаунт (кнопка в шапке) — настоящий контейнер выдаётся только ` +
        `авторизованным, иначе сервер невозможно защитить от перегрузки.`;
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

    client = new SandboxClient(sandboxUrl(), token, {
      onReady: (minutes) => {
        ready = true;
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
        ready = false;
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

/** Команды урока по порядку — то, что имеет смысл повторить на настоящем сервере. */
export function lessonCommands(steps: Step[]): string[] {
  const out: string[] = [];
  for (const s of steps) {
    // у шага-вопроса answer — номер варианта, команд там нет
    const raw =
      s.kind === "watch" ? s.run : s.kind === "type" ? s.cmd : s.kind === "do" ? s.answer : undefined;
    if (!raw) continue;
    for (const line of raw.split("\n")) {
      const c = line.trim();
      if (c && !out.includes(c)) out.push(c);
    }
  }
  return out;
}
