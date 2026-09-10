import { $, esc } from "./dom";
import { shortCwd } from "../engine/vfs";
import type { World } from "../engine/types";

export type Tone = "ok" | "err" | "warn" | "dim" | "info" | null;

const out = (): HTMLElement => $("#out");

export const promptFor = (w: World | null): string => (w ? `${w.user}@${w.host}:${shortCwd(w)}$` : "$");

export function setPrompt(w: World | null): void {
  $("#prompt").textContent = promptFor(w);
}

export function clearTerminal(): void {
  out().innerHTML = "";
}

export function print(text: string | null | undefined, tone: Tone = null): void {
  if (text == null) return;
  const d = document.createElement("div");
  if (tone) d.className = tone;
  d.innerHTML = esc(text);
  const o = out();
  o.appendChild(d);
  o.scrollTop = o.scrollHeight;
}

export function printCommand(w: World | null, line: string): void {
  const d = document.createElement("div");
  d.className = "cmd";
  d.innerHTML = `<b>${esc(promptFor(w))}</b> ${esc(line)}`;
  const o = out();
  o.appendChild(d);
  o.scrollTop = o.scrollHeight;
}

/** История ввода по стрелкам вверх/вниз. */
export class InputHistory {
  private items: string[] = [];
  private ix = 0;
  push(line: string): void {
    this.items.push(line);
    this.ix = this.items.length;
  }
  prev(): string | null {
    if (this.ix <= 0) return null;
    this.ix--;
    return this.items[this.ix] ?? "";
  }
  next(): string | null {
    if (this.ix >= this.items.length - 1) {
      this.ix = this.items.length;
      return "";
    }
    this.ix++;
    return this.items[this.ix] ?? "";
  }
}
