/**
 * Персонаж: SVG-портрет и палитры внешности.
 * Перенесено из прежней версии игры (p29) в типизированном виде.
 * Функции чистые — на вход внешность, на выход строка SVG.
 */

export const SKIN = ["#F2C9A0", "#E0A97B", "#C98A5E", "#9C6440", "#6E4526"];
export const HAIRC = ["#2B2118", "#6B4423", "#B5793B", "#D9B36B", "#8E8E8E", "#C7452F", "#5B4BA8", "#2E8B7A"];
export const HAIRS_M = [
  "короткие",
  "ёжик",
  "с пробором",
  "кудри",
  "длинные",
  "лысина",
  "афро",
  "гладко назад",
];
export const HAIRS_F = ["каре", "хвост", "длинные", "кудри", "пучок", "короткие", "чёлка", "локоны"];
export const EYESC = ["#3B2F2A", "#4A6B8A", "#4E7A4E", "#6B5B95", "#8E8E8E", "#A9752F"];
export const FACE = ["спокойное", "улыбка", "серьёзное"];
/** Стили бороды (используются, только когда beard=true у мужского персонажа). */
export const BEARDS = ["щетина", "короткая", "окладистая"];

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
  /** индекс в BEARDS — какая именно борода, если beard=true */
  beardStyle?: number;
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
    beardStyle: 0,
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
  афро: '<path d="M100 22a38 38 0 0 0-38 38 34 34 0 0 0 6 20 30 30 0 0 1 6-24 30 30 0 0 1 10-22 26 26 0 0 1 14 16 26 26 0 0 1 16-18 28 28 0 0 1 12 20 28 28 0 0 1 8 26 34 34 0 0 0 4-18 38 38 0 0 0-38-38z"/>',
  "гладко назад":
    '<path d="M62 58c0-20 16-32 38-32s38 12 38 32c0 4-1 7-2 9-4-12-16-18-36-18s-32 6-36 18c-1-2-2-5-2-9z"/>',
  чёлка:
    '<path d="M58 66c0-24 18-38 42-38s42 14 42 38c0 12-1 22-3 30l-8-2c2-10 2-20-2-26-6 6-16 8-24 8-10 0-20-4-26-12-4 6-6 14-6 24l-9 2c-4-10-6-16-6-24z"/>',
  локоны:
    '<path d="M60 64a13 13 0 0 1 12-13 14 14 0 0 1 14-15 14 14 0 0 1 14 8 14 14 0 0 1 22 0 14 14 0 0 1 14-8 14 14 0 0 1 14 15 13 13 0 0 1 12 13c0 10-3 20-6 28l-8-4c3-10 3-18 1-26-6 6-14 8-22 8s-16-2-22-8c-2 8-2 16 1 26l-8 4c-3-8-6-18-6-28z"/>',
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
  bomber: "#3E4A5C",
  turtleneck: "#3B3F46",
};

export const outfitColor = (top: string | undefined): string => OUTFIT[top ?? ""] ?? "#4A7FB5";

const SHOE_COLOR: Record<string, string> = {
  sneakers_old: "#7C7466",
  sneakers: "#E8E4DA",
  boots: "#4B3621",
  loafers: "#2E2317",
};
export const shoeColor = (shoes: string | undefined): string =>
  SHOE_COLOR[shoes ?? ""] ?? SHOE_COLOR.sneakers_old;

const BEARD_PATHS: string[] = [
  // щетина — лёгкая тень по краю подбородка
  '<path d="M66 96c2 20 14 32 34 32s32-12 34-32c-6 14-18 22-34 22s-28-8-34-22z" opacity=".55"/>',
  // короткая — плотнее, доходит до скул
  '<path d="M64 92c0 24 16 36 36 36s36-12 36-36c0 0-6 20-36 20S64 92 64 92z" opacity=".85"/>',
  // окладистая — густая, с чёткой линией
  '<path d="M62 88c-2 28 14 44 38 44s40-16 38-44c-4 4-8 8-10 8 2 20-12 30-28 30s-30-10-28-30c-2 0-6-4-10-8z"/>',
];

export interface AvatarOptions {
  /** сторона фигуры в пикселях (ширина; высота считается пропорционально) */
  size?: number;
  /** что надето сверху — влияет на цвет одежды */
  top?: string;
  /** что надето на ногах — влияет на цвет обуви */
  shoes?: string;
  /** надетый аксессуар одним слотом: watch/backpack/headphones_neck/sunglasses/tote_bag */
  accessory?: string | null;
  /** цвет фона */
  bg?: string;
}

/** Рисует персонажа в полный рост. Возвращает строку SVG. */
export function avatarSVG(a: Appearance, o: AvatarOptions = {}): string {
  const s = o.size ?? 200;
  const h = Math.round(s * 2);
  const sk = SKIN[a.skin] ?? SKIN[1];
  const hc = HAIRC[a.hairc] ?? HAIRC[0];
  const ec = EYESC[a.eyes] ?? EYESC[0];
  const oc = outfitColor(o.top);
  const sc = shoeColor(o.shoes);
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

  const beard =
    a.beard && a.sex === "m"
      ? '<g fill="' + hc + '">' + (BEARD_PATHS[a.beardStyle ?? 1] ?? BEARD_PATHS[1]) + "</g>"
      : "";

  const glasses = a.glasses
    ? '<g fill="none" stroke="#2A3342" stroke-width="3"><circle cx="88" cy="88" r="12"/><circle cx="112" cy="88" r="12"/><path d="M100 88h0M76 86l-10-2M124 86l10-2"/></g>'
    : "";

  const cap = a.cap
    ? '<g><path d="M58 60c0-24 18-38 42-38s42 14 42 38z" fill="#2E8B7A"/><path d="M142 60c14 0 22 4 26 10-12 4-40 4-68 4z" fill="#25705F"/></g>'
    : "";

  /* полный рост: шея, торс, руки, ноги, обувь */
  const torsoAccent =
    o.top === "suit"
      ? '<path d="M78 168l22 22 22-22-8-14h-28z" fill="#E8E4DA"/><path d="M96 170l4 8 4-8-4-6z" fill="#8C2F39"/>'
      : o.top === "hoodie"
        ? '<path d="M70 172q30 14 60 0v-8q-30 12-60 0z" fill="#000" opacity=".18"/>'
        : o.top === "turtleneck"
          ? '<path d="M84 150q16 10 32 0v10q-16 8-32 0z" fill="' + sk + '" opacity=".9"/>'
          : "";

  const body =
    '<rect x="88" y="126" width="24" height="20" rx="8" fill="' +
    sk +
    '"/>' +
    /* руки */
    '<rect x="52" y="152" width="18" height="86" rx="9" fill="' +
    oc +
    '"/><rect x="130" y="152" width="18" height="86" rx="9" fill="' +
    oc +
    '"/>' +
    '<ellipse cx="61" cy="240" rx="9" ry="10" fill="' +
    sk +
    '"/><ellipse cx="139" cy="240" rx="9" ry="10" fill="' +
    sk +
    '"/>' +
    /* торс */
    '<path d="M64 168q6-16 36-16t36 16l6 76q-42 12-84 0z" fill="' +
    oc +
    '"/>' +
    torsoAccent +
    /* ноги */
    '<rect x="72" y="246" width="22" height="92" rx="8" fill="#3A3F4B"/>' +
    '<rect x="106" y="246" width="22" height="92" rx="8" fill="#3A3F4B"/>' +
    /* обувь */
    '<ellipse cx="83" cy="342" rx="16" ry="9" fill="' +
    sc +
    '"/><ellipse cx="117" cy="342" rx="16" ry="9" fill="' +
    sc +
    '"/>';

  const accessory = accessoryOverlay(o.accessory);

  return (
    '<svg viewBox="0 0 200 360" width="' +
    s +
    '" height="' +
    h +
    '" role="img" aria-label="персонаж в полный рост">' +
    '<defs><clipPath id="' +
    id +
    '"><rect x="0" y="0" width="200" height="360" rx="14"/></clipPath></defs>' +
    '<g clip-path="url(#' +
    id +
    ')">' +
    '<rect width="200" height="360" fill="' +
    bg +
    '"/>' +
    body +
    '<ellipse cx="100" cy="84" rx="40" ry="44" fill="' +
    sk +
    '"/>' +
    '<ellipse cx="61" cy="86" rx="6" ry="9" fill="' +
    sk +
    '"/><ellipse cx="139" cy="86" rx="6" ry="9" fill="' +
    sk +
    '"/>' +
    beard +
    eyes +
    mouth +
    '<g fill="' +
    hc +
    '">' +
    hairPath(a.sex, a.hair) +
    "</g>" +
    glasses +
    cap +
    accessory +
    "</g></svg>"
  );
}

/** Оверлей для аксессуара поверх фигуры: часы/рюкзак/наушники/очки/сумка. */
function accessoryOverlay(id: string | null | undefined): string {
  switch (id) {
    case "watch":
      return '<rect x="55" y="228" width="12" height="8" rx="2" fill="#2A3342"/>';
    case "backpack":
      return '<path d="M76 156q24-10 48 0l4 40q-28 10-56 0z" fill="#2E8B7A" opacity=".9"/><path d="M84 158l2-10h28l2 10" fill="none" stroke="#25705F" stroke-width="3"/>';
    case "headphones_neck":
      return '<path d="M78 146a22 22 0 0 1 44 0" fill="none" stroke="#2A3342" stroke-width="5"/><rect x="72" y="142" width="10" height="14" rx="4" fill="#2A3342"/><rect x="118" y="142" width="10" height="14" rx="4" fill="#2A3342"/>';
    case "sunglasses":
      return (
        '<g><rect x="76" y="82" width="20" height="12" rx="4" fill="#1A1F29"/>' +
        '<rect x="104" y="82" width="20" height="12" rx="4" fill="#1A1F29"/>' +
        '<rect x="96" y="86" width="8" height="3" fill="#1A1F29"/></g>'
      );
    case "tote_bag":
      return '<path d="M148 200h20v30h-20z" fill="#D9B36B"/><path d="M152 200v-8a6 6 0 0 1 12 0v8" fill="none" stroke="#8E6B33" stroke-width="3"/>';
    default:
      return "";
  }
}
