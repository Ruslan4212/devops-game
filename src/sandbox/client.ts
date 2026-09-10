/**
 * Клиент реальной песочницы: тонкая типизированная обёртка над WebSocket
 * к sandbox-server. Протокол намеренно крошечный и вынесен в чистые
 * функции — их покрывают юнит-тесты без сети.
 *
 * Поток:
 *   1) открыли сокет -> шлём { token }        (первым сообщением, иначе сервер закроет)
 *   2) сервер отвечает { type: "ready", minutes }
 *   3) дальше двунаправленно:
 *        клиент -> { type: "in", data }        нажатия клавиш
 *        клиент -> { type: "resize", cols, rows }
 *        сервер -> { type: "out", data }       вывод терминала
 */

export type ServerMsg = { type: "ready"; minutes: number } | { type: "out"; data: string };

/** Разбор сообщения сервера. Возвращает null на любой мусор. */
export function parseServerMsg(raw: string): ServerMsg | null {
  let m: unknown;
  try {
    m = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!m || typeof m !== "object") return null;
  const o = m as Record<string, unknown>;
  if (o.type === "ready" && typeof o.minutes === "number") return { type: "ready", minutes: o.minutes };
  if (o.type === "out" && typeof o.data === "string") return { type: "out", data: o.data };
  return null;
}

export const encodeAuth = (token: string): string => JSON.stringify({ token });
export const encodeInput = (data: string): string => JSON.stringify({ type: "in", data });
export const encodeResize = (cols: number, rows: number): string =>
  JSON.stringify({ type: "resize", cols, rows });

/** Коды закрытия WebSocket -> понятная причина. */
export function closeReason(code: number): string {
  switch (code) {
    case 1000:
      return "Сессия завершена.";
    case 4000:
      return "Некорректный запрос.";
    case 4001:
      return "Нужно войти в аккаунт (токен не принят).";
    case 4009:
      return "Уже открыта другая сессия песочницы. Закройте её.";
    case 4029:
      return "Сервер занят — слишком много сессий. Попробуйте позже.";
    case 5000:
      return "Не удалось поднять контейнер. Попробуйте ещё раз.";
    default:
      return "Соединение с песочницей разорвано.";
  }
}

export interface SandboxHandlers {
  /** сервер подтвердил старт, сообщил лимит времени */
  onReady: (minutes: number) => void;
  /** вывод терминала */
  onOutput: (data: string) => void;
  /** сессия закрыта (по любой причине) */
  onClose: (reason: string) => void;
}

export class SandboxClient {
  private ws: WebSocket | null = null;
  private closed = false;

  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly handlers: SandboxHandlers,
  ) {}

  open(): void {
    let ws: WebSocket;
    try {
      ws = new WebSocket(this.url);
    } catch {
      this.handlers.onClose("Неверный адрес песочницы.");
      return;
    }
    this.ws = ws;

    ws.onopen = () => ws.send(encodeAuth(this.token));
    ws.onmessage = (ev) => {
      const msg = parseServerMsg(typeof ev.data === "string" ? ev.data : "");
      if (!msg) return;
      if (msg.type === "ready") this.handlers.onReady(msg.minutes);
      else this.handlers.onOutput(msg.data);
    };
    ws.onerror = () => {
      /* onclose придёт следом с кодом — причину сообщим там */
    };
    ws.onclose = (ev) => {
      if (this.closed) return;
      this.closed = true;
      this.handlers.onClose(closeReason(ev.code));
    };
  }

  input(data: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(encodeInput(data));
  }

  resize(cols: number, rows: number): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(encodeResize(cols, rows));
  }

  close(): void {
    this.closed = true;
    try {
      this.ws?.close(1000, "client closed");
    } catch {
      /* ignore */
    }
    this.ws = null;
  }
}
