/**
 * Персонаж: SVG-портрет и палитры внешности.
 * Перенесено из прежней версии игры (p29) в типизированном виде.
 * Функции чистые — на вход внешность, на выход строка SVG.
 */

export const SKIN = ["#F2C9A0", "#E0A97B", "#C98A5E", "#9C6440", "#6E4526"];
export const HAIRC = ["#2B2118", "#6B4423", "#B5793B", "#D9B36B", "#8E8E8E", "#C7452F", "#5B4BA8", "#2E8B7A"];
export const HAIRS_M = ["короткие", "ёжик", "с пробором", "кудри", "длинные", "лысина"];
export const HAIRS_F = ["каре", "хвост", "длинные", "кудри", "пучок", "короткие"];
export const EYESC = ["#3B2F2A", "#4A6B8A", "#4E7A4E", "#6B5B95"];
export const FACE = ["спокойное", "улыбка", "серьёзное"];

export type Sex = "m" | "f";

export interface Appearance {
  sex: Sex;
  name: string;
  skin: number;
  hair: number;
  hairc: number;
  eyes: number;
  face: number;
  glasses: boolean;
  beard: boolean;
  cap: boolean;
}

export function defaultAppearance(): Appearance {
  return {
    sex: "m",
    name: "",
    skin: 1,
    hair: 0,
    hairc: 0,
    eyes: 0,
    face: 1,
    glasses: false,
    beard: false,
    cap: false,
  };
}

/** Список причёсок для выбранного пола. */
export const hairStyles = (sex: Sex): string[] => (sex === "f" ? HAIRS_F : HAIRS_M);

const HAIR_PATHS: Record<string, string> = {
  короткие:
    '<path d="M62 62c0-22 16-34 38-34s38 12 38 34c0 6-2 10-4 12-2-16-14-24-34-24s-32 8-34 24c-2-2-4-6-4-12z"/>',
  ёжик: '<path d="M62 64c0-24 18-36 38-36s38 12 38 36c-4-8-10-12-10-12s-4 6-8 4c-4-2-4-8-4-8s-6 8-12 6c-6-2-6-10-6-10s-8 10-14 8c-6-2-6-10-6-10s-8 10-12 12-4 10-4 10z"/>',
  "с пробором":
    '<path d="M62 62c0-22 16-34 38-34s38 12 38 34c0 6-2 10-4 12-2-14-10-22-24-24-6 8-16 12-30 12-6 0-12-2-16-4-2 4-2 10-2 14-0 0-0-6 0-10z"/>',
  кудри:
    '<path d="M64 60a13 13 0 0 1 13-14 14 14 0 0 1 23-8 14 14 0 0 1 23 8 13 13 0 0 1 13 14c0 8-4 14-4 14-2-16-14-24-32-24s-30 8-32 24c0 0-4-6-4-14z"/>',
  длинные:
    '<path d="M60 66c0-24 18-38 40-38s40 14 40 38c0 20-2 34-6 46l-10 2c4-16 4-32 2-44-4-14-14-20-26-20s-22 6-26 20c-2 12-2 28 2 44l-10-2c-4-12-6-26-6-46z"/>',
  лысина: '<path d="M66 66c2-12 10-18 18-20-8 6-12 12-14 22-2 0-3-1-4-2z"/>',
  каре: '<path d="M58 70c0-26 18-42 42-42s42 16 42 42c0 14-2 26-4 34l-12 2c3-10 4-22 3-32-4-16-14-22-29-22s-25 6-29 22c-1 10 0 22 3 32l-12-2c-2-8-4-20-4-34z"/>',
  хвост:
    '<path d="M62 62c0-22 16-34 38-34s38 12 38 34c0 6-2 10-4 12-2-16-14-24-34-24s-32 8-34 24c-2-2-4-6-4-12z"/><path d="M136 58c10 4 16 14 14 26-2 12-8 20-14 24 4-10 6-20 4-30-2-8-4-14-4-20z"/>',
  пучок:
    '<path d="M62 62c0-22 16-34 38-34s38 12 38 34c0 6-2 10-4 12-2-16-14-24-34-24s-32 8-34 24c-2-2-4-6-4-12z"/><circle cx="100" cy="22" r="12"/>',
};

export function hairPath(sex: Sex, style: number): string {
  const list = hairStyles(sex);
  const name = list[style] ?? list[0];
  return HAIR_PATHS[name] ?? HAIR_PATHS["короткие"];
}

const OUTFIT: Record<string, string> = {
  none: "#8892A6",
  tshirt: "#4A7FB5",
  hoodie: "#4B5563",
  shirt: "#E8E4DA",
  suit: "#2B3446",
  tech: "#1F6F5C",
};

export const outfitColor = (top: string | undefined): string => OUTFIT[top ?? ""] ?? "#4A7FB5";

export interface AvatarOptions {
  /** сторона портрета в пикселях */
  size?: number;
  /** что надето сверху — влияет на цвет одежды */
  top?: string;
  /** цвет фона портрета */
  bg?: string;
}

/** Рисует портрет персонажа. Возвращает строку SVG. */
export function avatarSVG(a: Appearance, o: AvatarOptions = {}): string {
  const s = o.size ?? 200;
  const sk = SKIN[a.skin] ?? SKIN[1];
  const hc = HAIRC[a.hairc] ?? HAIRC[0];
  const ec = EYESC[a.eyes] ?? EYESC[0];
  const oc = outfitColor(o.top);
  const bg = o.bg ?? "#141922";
  const id = "av" + s + a.skin + a.hair + a.hairc;

  const mouth =
    a.face === 1
      ? '<path d="M88 108q12 10 24 0" stroke="#8A5A44" stroke-width="3" fill="none" stroke-linecap="round"/>'
      : a.face === 2
        ? '<path d="M88 110h24" stroke="#8A5A44" stroke-width="3" stroke-linecap="round"/>'
        : '<path d="M90 108q10 6 20 0" stroke="#8A5A44" stroke-width="3" fill="none" stroke-linecap="round"/>';

  const eyes =
    '<g><ellipse cx="88" cy="88" rx="5" ry="6" fill="#fff"/><circle cx="89" cy="89" r="3" fill="' +
    ec +
    '"/><ellipse cx="112" cy="88" rx="5" ry="6" fill="#fff"/><circle cx="113" cy="89" r="3" fill="' +
    ec +
    '"/></g>';

  return (
    '<svg viewBox="0 0 200 210" width="' +
    s +
    '" height="' +
    Math.round(s * 1.05) +
    '" role="img" aria-label="персонаж">' +
    '<defs><clipPath id="' +
    id +
    '"><rect x="0" y="0" width="200" height="210" rx="14"/></clipPath></defs>' +
    '<g clip-path="url(#' +
    id +
    ')">' +
    '<rect width="200" height="210" fill="' +
    bg +
    '"/>' +
    '<circle cx="100" cy="235" r="80" fill="' +
    oc +
    '"/>' +
    (o.top === "suit"
      ? '<path d="M78 168l22 22 22-22-8-14h-28z" fill="#E8E4DA"/><path d="M96 170l4 8 4-8-4-6z" fill="#8C2F39"/>'
      : "") +
    (o.top === "hoodie" ? '<path d="M70 172q30 14 60 0v-8q-30 12-60 0z" fill="#000" opacity=".18"/>' : "") +
    '<rect x="88" y="126" width="24" height="24" rx="10" fill="' +
    sk +
    '"/>' +
    '<ellipse cx="100" cy="84" rx="40" ry="44" fill="' +
    sk +
    '"/>' +
    '<ellipse cx="61" cy="86" rx="6" ry="9" fill="' +
    sk +
    '"/><ellipse cx="139" cy="86" rx="6" ry="9" fill="' +
    sk +
    '"/>' +
    (a.beard && a.sex === "m"
      ? '<path d="M64 92c0 26 16 40 36 40s36-14 36-40c0 0-6 22-36 22S64 92 64 92z" fill="' +
        hc +
        '" opacity=".85"/>'
      : "") +
    eyes +
    mouth +
    '<g fill="' +
    hc +
    '">' +
    hairPath(a.sex, a.hair) +
    "</g>" +
    (a.glasses
      ? '<g fill="none" stroke="#2A3342" stroke-width="3"><circle cx="88" cy="88" r="12"/><circle cx="112" cy="88" r="12"/><path d="M100 88h0M76 86l-10-2M124 86l10-2"/></g>'
      : "") +
    (a.cap
      ? '<g><path d="M58 60c0-24 18-38 42-38s42 14 42 38z" fill="#2E8B7A"/><path d="M142 60c14 0 22 4 26 10-12 4-40 4-68 4z" fill="#25705F"/></g>'
      : "") +
    "</g></svg>"
  );
}
