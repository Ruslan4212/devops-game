import { $, esc } from "./dom";
import { BEARDS, EYESC, FACE, HAIRC, SKIN, avatarSVG, defaultAppearance, hairStyles } from "../data/avatar";
import type { Appearance, Sex } from "../data/avatar";
import type { Life } from "../engine/life";

export interface CharacterDeps {
  life: Life;
  /** сохранить прогресс после изменения внешности */
  persist: () => void;
}

type NumField = "skin" | "hair" | "hairc" | "eyes" | "face" | "beardStyle";
type BoolField = "glasses" | "beard" | "cap";

/** Экран персонажа: портрет и настройка внешности. */
export function openCharacter(d: CharacterDeps): void {
  if (!d.life.look) d.life.look = defaultAppearance();
  const look: Appearance = d.life.look;

  const chip = (on: boolean, set: string, text: string): string =>
    `<button class="ch-chip${on ? " on" : ""}" data-set="${set}">${esc(text)}</button>`;

  const row = (label: string, inner: string): string =>
    `<div class="ch-row"><span>${esc(label)}</span><div class="ch-opts">${inner}</div></div>`;

  const swatches = (label: string, field: NumField, colors: string[]): string =>
    row(
      label,
      colors
        .map(
          (c, i) =>
            `<button class="ch-sw${look[field] === i ? " on" : ""}" data-set="${field}|${i}" ` +
            `style="background:${c}" aria-label="${esc(label)} ${i + 1}"></button>`,
        )
        .join(""),
    );

  const list = (label: string, field: NumField, items: string[]): string =>
    row(label, items.map((t, i) => chip(look[field] === i, `${field}|${i}`, t)).join(""));

  const render = (): void => {
    const body = $("#modBody");
    body.innerHTML =
      `<h1>🙂 Персонаж</h1>` +
      `<div class="ch-wrap">` +
      `<div class="ch-portrait">${avatarSVG(look, {
        size: 150,
        top: d.life.wear.top,
        shoes: d.life.wear.shoes,
        accessory: d.life.accessory,
      })}</div>` +
      `<div class="ch-controls">` +
      `<div class="ch-row"><span>Имя</span>` +
      `<input id="chName" class="ch-name" maxlength="24" value="${esc(look.name)}" placeholder="как тебя зовут"></div>` +
      row("Пол", chip(look.sex === "m", "sex|m", "М") + chip(look.sex === "f", "sex|f", "Ж")) +
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
      `<div class="kb">Одежда, обувь и аксессуар берутся из «🎒 Жизнь» — смени их там, портрет обновится сам.</div>` +
      `<div class="kb">Внешность сохраняется сама и синхронизируется вместе с прогрессом.</div>` +
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
