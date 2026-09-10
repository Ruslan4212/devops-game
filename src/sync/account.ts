import type { Progress } from "../engine/progress";
import { mergeProgress, publicStatsOf } from "./merge";
import * as cloud from "./cloud";
import type { Account } from "./cloud";

interface Deps {
  /** текущий локальный прогресс */
  getProgress: () => Progress;
  /** применить слитый прогресс (перерисовать игру) */
  applyMerged: (p: Progress) => void;
  rankOf: (xp: number) => string;
  /** показать короткое сообщение пользователю */
  toast: (text: string) => void;
}

export interface AccountApi {
  /** отложенно отправить текущий прогресс в облако (вызывать после каждого сохранения) */
  schedulePush: () => void;
}

const $ = <T extends HTMLElement = HTMLElement>(s: string): T => document.querySelector(s) as T;
const esc = (s: unknown): string => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const usernameFromEmail = (email: string): string =>
  (email.split("@")[0] || "user")
    .replace(/[^a-z0-9_]+/gi, "_")
    .slice(0, 24)
    .toLowerCase();

export function initAccount(deps: Deps): AccountApi {
  let account: Account | null = null;
  let pushTimer: number | undefined;
  let syncing = false;

  /* ---------- кнопка в шапке ---------- */
  const btn = document.createElement("button");
  btn.className = "tbtn";
  btn.id = "acctBtn";
  $(".sp").prepend(btn);
  btn.onclick = openModal;

  const refreshBtn = (): void => {
    btn.textContent = account ? "☁ " + account.email.split("@")[0] : cloud.isConfigured ? "войти" : "аккаунт";
  };
  refreshBtn();

  /* ---------- модалка входа ---------- */
  function openModal(): void {
    const body = $("#modBody");
    if (!cloud.isConfigured) {
      body.innerHTML =
        `<h1>Синхронизация между устройствами</h1>` +
        `<p>Облако пока не подключено к этой сборке. Прогресс сохраняется в этом браузере.</p>` +
        `<p>Чтобы включить вход и синхронизацию, задайте <b>VITE_SUPABASE_URL</b> и ` +
        `<b>VITE_SUPABASE_ANON_KEY</b> (см. <code>.env.example</code> и <code>supabase_schema.sql</code>).</p>` +
        `<button class="prim" id="mClose">Понятно</button>`;
      $("#modOv").classList.remove("hide");
      $("#mClose").onclick = () => $("#modOv").classList.add("hide");
      return;
    }
    if (account) {
      body.innerHTML =
        `<h1>Аккаунт</h1>` +
        `<p>Вы вошли как <b>${esc(account.email)}</b>. Прогресс синхронизируется автоматически.</p>` +
        `<button class="prim" id="mOut">Выйти</button> ` +
        `<button class="sec" id="mClose">Закрыть</button>`;
      $("#modOv").classList.remove("hide");
      $("#mOut").onclick = async () => {
        await cloud.signOut();
        $("#modOv").classList.add("hide");
      };
      $("#mClose").onclick = () => $("#modOv").classList.add("hide");
      return;
    }
    body.innerHTML =
      `<h1>Вход</h1>` +
      `<p>Один аккаунт — прогресс на всех устройствах.</p>` +
      `<form id="authForm" autocomplete="on">` +
      `<input class="authIn" id="aEmail" type="email" placeholder="почта" autocomplete="username" required>` +
      `<input class="authIn" id="aPass" type="password" placeholder="пароль (от 6 символов)" ` +
      `autocomplete="current-password" minlength="6" required>` +
      `<div class="authRow">` +
      `<button class="prim" id="aIn" type="submit">Войти</button>` +
      `<button class="sec" id="aUp" type="button">Создать аккаунт</button>` +
      `</div><div class="authErr" id="aErr"></div></form>`;
    $("#modOv").classList.remove("hide");

    const email = (): string => $<HTMLInputElement>("#aEmail").value.trim();
    const pass = (): string => $<HTMLInputElement>("#aPass").value;
    const err = (t: string): void => {
      $("#aErr").textContent = t;
    };
    const busy = (on: boolean): void => {
      $<HTMLButtonElement>("#aIn").disabled = on;
      $<HTMLButtonElement>("#aUp").disabled = on;
    };

    $("#authForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      busy(true);
      err("");
      const r = await cloud.signIn(email(), pass());
      busy(false);
      if (!r.ok) return err(translateAuthError(r.error));
      $("#modOv").classList.add("hide");
    });
    $("#aUp").addEventListener("click", async () => {
      if (!email() || pass().length < 6) return err("Введите почту и пароль не короче 6 символов.");
      busy(true);
      err("");
      const r = await cloud.signUp(email(), pass());
      busy(false);
      if (!r.ok) return err(translateAuthError(r.error));
      deps.toast("Аккаунт создан. Если включено подтверждение почты — проверьте письмо.");
      $("#modOv").classList.add("hide");
    });
  }

  /* ---------- реакция на вход/выход ---------- */
  async function onSignedIn(acc: Account): Promise<void> {
    account = acc;
    refreshBtn();
    syncing = true;
    try {
      const pulled = await cloud.pullProfile();
      const local = deps.getProgress();
      const merged = pulled.ok && pulled.value ? mergeProgress(local, pulled.value.state) : local;
      if (pulled.ok && pulled.value) deps.applyMerged(merged);
      const username = pulled.ok && pulled.value ? pulled.value.username : usernameFromEmail(acc.email);
      const push = await cloud.pushProfile(username, merged, publicStatsOf(merged, deps.rankOf));
      deps.toast(push.ok ? "Прогресс синхронизирован" : "Синхронизация: " + push.error);
    } finally {
      syncing = false;
    }
  }

  function onSignedOut(): void {
    account = null;
    refreshBtn();
  }

  cloud
    .onAuthChange((acc) => {
      if (acc) void onSignedIn(acc);
      else onSignedOut();
    })
    .catch(() => {});
  cloud
    .currentAccount()
    .then((acc) => {
      if (acc) void onSignedIn(acc);
    })
    .catch(() => {});

  /* ---------- отложенная отправка ---------- */
  function schedulePush(): void {
    if (!account || syncing) return;
    window.clearTimeout(pushTimer);
    pushTimer = window.setTimeout(async () => {
      if (!account) return;
      const p = deps.getProgress();
      await cloud.pushProfile(usernameFromEmail(account.email), p, publicStatsOf(p, deps.rankOf));
    }, 2500);
  }

  return { schedulePush };
}

function translateAuthError(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes("invalid login")) return "Неверная почта или пароль.";
  if (s.includes("already registered")) return "Такой аккаунт уже есть — просто войдите.";
  if (s.includes("password")) return "Пароль слишком короткий (нужно от 6 символов).";
  if (s.includes("email")) return "Проверьте адрес почты.";
  if (s.includes("network") || s.includes("fetch")) return "Нет связи с сервером. Попробуйте позже.";
  return raw;
}
