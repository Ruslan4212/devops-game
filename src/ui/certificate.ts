import { toast } from "./dom";

/**
 * Сертификат об окончании курса. Перенесён из прежней версии игры:
 * рисуется на canvas и скачивается PNG-картинкой. Выдаётся, когда пройдены
 * все уроки, экзамены и капстоун.
 */
export interface CertStats {
  /** имя, на которое выдан сертификат */
  username: string;
  xp: number;
  rank: string;
  lessonsDone: number;
  lessonsTotal: number;
  capstone: boolean;
  /** список актов курса по порядку — для строки «путь» */
  path: string[];
  /** дата выдачи, уже отформатированная */
  date: string;
}

const KEY_NAME = "devops_cert_name";
const MONO = "'IBM Plex Mono', ui-monospace, 'Courier New', monospace";
const SANS = "'IBM Plex Sans', system-ui, -apple-system, sans-serif";

/** Строки-факты сертификата (чистая функция — удобно тестировать). */
export function certificateText(s: CertStats): string[] {
  return [
    "Курс «Terminal Ops Academy» пройден полностью.",
    `Уроки и экзамены: ${s.lessonsDone} из ${s.lessonsTotal}.`,
    `Капстоун на реальном сервере: ${s.capstone ? "выполнен" : "не выполнен"}.`,
    `Итоговый ранг: ${s.rank} · ${s.xp} XP.`,
    `Путь: ${s.path.join(" → ")}.`,
  ];
}

function wrap(x: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (x.measureText(test).width > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export function buildCertificateCanvas(s: CertStats): HTMLCanvasElement {
  const W = 1200;
  const H = 820;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const x = cv.getContext("2d");
  if (!x) return cv;

  const bg = x.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0c0f14");
  bg.addColorStop(1, "#12161f");
  x.fillStyle = bg;
  x.fillRect(0, 0, W, H);

  const glow = x.createRadialGradient(W * 0.85, H * 0.05, 0, W * 0.85, H * 0.05, 640);
  glow.addColorStop(0, "rgba(139,124,245,.16)");
  glow.addColorStop(1, "rgba(139,124,245,0)");
  x.fillStyle = glow;
  x.fillRect(0, 0, W, H);

  x.strokeStyle = "rgba(240,135,63,.55)";
  x.lineWidth = 2;
  x.strokeRect(28, 28, W - 56, H - 56);
  x.strokeStyle = "rgba(255,255,255,.08)";
  x.lineWidth = 1;
  x.strokeRect(40, 40, W - 80, H - 80);

  x.textBaseline = "alphabetic";
  x.fillStyle = "#f0873f";
  x.beginPath();
  x.arc(90, 90, 6, 0, 7);
  x.fill();
  x.fillStyle = "#93a0b5";
  x.font = `600 15px ${MONO}`;
  x.fillText("TERMINAL OPS ACADEMY", 112, 96);
  x.textAlign = "right";
  x.fillStyle = "#5c6a80";
  x.fillText("СЕРТИФИКАТ О ПРОХОЖДЕНИИ КУРСА", W - 90, 96);
  x.textAlign = "left";

  x.fillStyle = "#ffb067";
  x.font = `800 72px ${SANS}`;
  x.fillText("MIDDLE DEVOPS", 90, 232);

  x.fillStyle = "#e8ecf4";
  x.font = `500 21px ${SANS}`;
  let y = 286;
  for (const line of certificateText(s)) {
    for (const sub of wrap(x, line, W - 180)) {
      x.fillText(sub, 90, y);
      y += 30;
    }
  }

  x.strokeStyle = "rgba(255,255,255,.12)";
  x.beginPath();
  x.moveTo(90, y + 14);
  x.lineTo(W - 90, y + 14);
  x.stroke();

  x.fillStyle = "#5c6a80";
  x.font = `600 14px ${MONO}`;
  x.fillText("ВЫДАН", 90, y + 58);
  x.fillStyle = "#ffffff";
  x.font = `800 46px ${SANS}`;
  x.fillText(s.username, 90, y + 106);

  x.fillStyle = "#5c6a80";
  x.font = `500 15px ${MONO}`;
  x.fillText(s.date, 90, H - 92);
  x.textAlign = "right";
  x.fillText("ruslan4212.github.io/devops-game", W - 90, H - 92);
  x.textAlign = "left";

  return cv;
}

/** Спрашивает имя (запоминает), рисует и скачивает PNG. */
export function downloadCertificate(base: Omit<CertStats, "username">): void {
  let saved = "";
  try {
    saved = localStorage.getItem(KEY_NAME) ?? "";
  } catch {
    /* приватный режим */
  }
  const name = (window.prompt("На чьё имя выдать сертификат?", saved || "") ?? "").trim();
  if (!name) return;
  try {
    localStorage.setItem(KEY_NAME, name);
  } catch {
    /* приватный режим */
  }

  const cv = buildCertificateCanvas({ ...base, username: name });
  cv.toBlob((b) => {
    if (!b) {
      toast("Не удалось сформировать картинку");
      return;
    }
    const url = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = url;
    a.download = "terminal-ops-academy-middle-devops.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast("Сертификат скачан ✓");
  }, "image/png");
}
