import { icon } from "../data/ui-icons";
import { $, esc } from "./dom";
import {
  BEARDS,
  EMOTION_LABEL,
  EYESC,
  FACE,
  HAIRC,
  SKIN,
  avatarSVG,
  emotionOf,
  hairStyles,
  migrateAppearance,
} from "../data/avatar";
import type { Appearance, Sex } from "../data/avatar";
import type { Life } from "../engine/life";

export interface CharacterDeps {
  life: Life;
  /** сохранить прогресс после изменения внешности */
  persist: () => void;
}

type NumField = "skin" | "hair" | "hairc" | "eyes" | "face" | "beardStyle";
type BoolField = "glasses" | "beard" | "cap";

/** Портрет текущего персонажа с учётом одежды, аксессуара и самочувствия. */
export function lifeAvatar(life: Life, size: number): string {
  const look = migrateAppearance(life.look);
  return avatarSVG(look, {
    size,
    top: life.wear?.top,
    shoes: life.wear?.shoes,
    accessory: life.accessory,
    vitals: life,
  });
}

/** Три полоски состояния: сытость, здоровье, настроение. */
export function vitalsHtml(life: Life): string {
  const bar = (ico: string, label: string, v: number): string => {
    const n = Math.max(0, Math.min(100, Math.round(v)));
    const tone = n < 25 ? " bad" : n < 50 ? " mid" : "";
    return (
      `<div class="ch-vital${tone}"><span class="ch-vital-l">${icon(ico, 16)}${esc(label)}</span>` +
      `<div class="ch-vital-bar"><i style="width:${n}%"></i></div><b>${n}</b></div>`
    );
  };
  return (
    `<div class="ch-vitals">` +
    bar("dot", "Сытость", life.hunger) +
    bar("heart", "Здоровье", life.health) +
    bar("mood", "Настроение", life.mood) +
    `</div>`
  );
}

/** Карточка персонажа для раздела «Карьера и жизнь». */
export function avatarCardHtml(life: Life): string {
  const look = migrateAppearance(life.look);
  const emo = emotionOf(life);
  return (
    `<div class="card ch-card">` +
    `<div class="ch-card-pic">${lifeAvatar(life, 112)}</div>` +
    `<div class="ch-card-info"><b>${esc(look.name || "Твой персонаж")}</b>` +
    `<span class="ch-mood ch-mood-${emo}">${esc(EMOTION_LABEL[emo])}</span>` +
    vitalsHtml(life) +
    `</div></div>`
  );
}

/** Экран персонажа: портрет и настройка внешности. */
export function openCharacter(d: CharacterDeps): void {
  d.life.look = migrateAppearance(d.life.look);
  const look: Appearance = d.life.look;

  const chip = (on: boolean, set: string, text: string): string =>
    `<button class="ch-chip${on ? " on" : ""}" data-set="${set}" aria-pressed="${on}">${esc(text)}</button>`;

  const row = (label: string, inner: string): string =>
    `<div class="ch-row"><span>${esc(label)}</span><div class="ch-opts">${inner}</div></div>`;

  const swatches = (label: string, field: NumField, colors: string[]): string =>
    row(
      label,
      colors
        .map(
          (c, i) =>
            `<button class="ch-sw${look[field] === i ? " on" : ""}" data-set="${field}|${i}" ` +
            `style="background:${c}" aria-label="${esc(label)} ${i + 1}" aria-pressed="${look[field] === i}"></button>`,
        )
        .join(""),
    );

  const list = (label: string, field: NumField, items: string[]): string =>
    row(label, items.map((t, i) => chip(look[field] === i, `${field}|${i}`, t)).join(""));

  const render = (): void => {
    const body = $("#modBody");
    const emo = emotionOf(d.life);
    body.innerHTML =
      `<h1>${icon("user", 22)}Персонаж</h1>` +
      `<div class="ch-wrap">` +
      `<div class="ch-side"><div class="ch-portrait">${lifeAvatar(d.life, 220)}</div>` +
      `<span class="ch-mood ch-mood-${emo}">${esc(EMOTION_LABEL[emo])}</span>` +
      vitalsHtml(d.life) +
      `</div>` +
      `<div class="ch-controls">` +
      `<div class="ch-row"><span>Имя</span>` +
      `<input id="chName" class="ch-name" maxlength="24" value="${esc(look.name)}" placeholder="как тебя зовут"></div>` +
      row("Пол", chip(look.sex === "m", "sex|m", "Мужской") + chip(look.sex === "f", "sex|f", "Женский")) +
      swatches("Кожа", "skin", SKIN) +
      list("Причёска", "hair", hairStyles(look.sex)) +
      swatches("Цвет волос", "hairc", HAIRC) +
      swatches("Глаза", "eyes", EYESC) +
      list("Выражение", "face", FACE) +
      row(
        "Детали",
        chip(look.glasses, "glasses|", "очки") +
          (look.sex === "m" ? chip(look.beard, "beard|", "борода") : "") +
          chip(look.cap, "cap|", "кепка"),
      ) +
      (look.sex === "m" && look.beard ? list("Стиль бороды", "beardStyle", BEARDS) : "") +
      `</div></div>` +
      `<div class="kb">${icon("bulb", 16)}Одежда и аксессуар берутся из раздела «Жизнь», выражение лица зависит от сытости, здоровья и настроения.</div>` +
      `<button class="sec" id="chClose">Готово</button>`;

    $("#chClose").onclick = () => $("#modOv").classList.add("hide");

    const name = $<HTMLInputElement>("#chName");
    name.oninput = () => {
      look.name = name.value.slice(0, 24);
      d.persist();
    };

    body.querySelectorAll<HTMLElement>("[data-set]").forEach((el) => {
      el.onclick = () => {
        const [field, raw] = (el.dataset.set ?? "").split("|");
        if (field === "sex") {
          look.sex = raw as Sex;
          look.hair = 0;
        } else if (field === "glasses" || field === "beard" || field === "cap") {
          look[field as BoolField] = !look[field as BoolField];
        } else {
          look[field as NumField] = Number(raw);
        }
        d.persist();
        render();
      };
    });
  };

  render();
  $("#modOv").classList.remove("hide");
}
