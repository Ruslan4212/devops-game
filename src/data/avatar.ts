/**
 * Персонаж: фигура в полный рост, собранная контурами SVG.
 *
 * Главное здесь — пропорции. У взрослого человека голова укладывается в рост
 * примерно 7.5 раз; в прежней версии она занимала четверть роста, из-за чего
 * фигура читалась как гном, сколько бы теней ни добавляли. Вся сетка построена
 * от высоты головы (HEAD): плечи на 1.55 головы, талия на 3, бёдра на 3.65,
 * колени на 5.35, пол на 7.55.
 *
 * Объём даётся не заливкой, а градиентами: свет падает слева сверху, поэтому
 * у каждой формы есть светлая и теневая сторона, а в сгибах — затемнение.
 * Волосы и борода — не один силуэт, а слои: масса, корни, пряди.
 */

export const SKIN = ["#F6D2B0", "#E7B48C", "#CE9468", "#A26F45", "#74492B"];
export const HAIRC = ["#241C16", "#5A3A22", "#A86B34", "#D8B778", "#9A9A9A", "#B8442F", "#5B4BA8", "#2E8B7A"];
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
export const EYESC = ["#4A3326", "#4E7BA6", "#4F7F51", "#6B5B95", "#8E8E8E", "#A9752F"];
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

/** Смешивание с чёрным (k>0) или белым (k<0) — тени и блики одной формы. */
function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number): number =>
    Math.max(0, Math.min(255, Math.round(k > 0 ? c * (1 - k) : c + (255 - c) * -k)));
  return (
    "#" +
    ((1 << 24) + (mix((n >> 16) & 255) << 16) + (mix((n >> 8) & 255) << 8) + mix(n & 255))
      .toString(16)
      .slice(1)
  );
}

const OUTFIT: Record<string, string> = {
  none: "#8892A6",
  tshirt: "#3F72A4",
  hoodie: "#4B5563",
  shirt: "#E4E0D6",
  suit: "#232B3A",
  tech: "#1F6F5C",
  bomber: "#3A4557",
  turtleneck: "#383C43",
};
export const outfitColor = (top: string | undefined): string => OUTFIT[top ?? ""] ?? "#3F72A4";

const SHOE_COLOR: Record<string, string> = {
  sneakers_old: "#7C7466",
  sneakers: "#E4E0D6",
  boots: "#4B3621",
  loafers: "#2E2317",
};
export const shoeColor = (shoes: string | undefined): string =>
  SHOE_COLOR[shoes ?? ""] ?? SHOE_COLOR.sneakers_old;

/* --------------------------- анатомическая сетка --------------------------- */

const W = 200;
const H = 400;
/** Высота головы: всё остальное — производные, как в академическом каноне. */
const HEAD = 48;
const CX = 100;
const TOP = 16;
const HEAD_CY = TOP + HEAD / 2;
const HEAD_RX = 19;
const CHIN = TOP + HEAD;
const SHOULDER_Y = Math.round(TOP + HEAD * 1.55);
const WAIST_Y = Math.round(TOP + HEAD * 3.05);
const HIP_Y = Math.round(TOP + HEAD * 3.65);
const KNEE_Y = Math.round(TOP + HEAD * 5.35);
const ANKLE_Y = Math.round(TOP + HEAD * 7.2);
const FLOOR_Y = Math.round(TOP + HEAD * 7.55);

/* ------------------------------ волосы и борода ---------------------------- */

/**
 * Причёска состоит из двух слоёв:
 *   back  — масса волос ЗА головой (длина, хвост, объём), рисуется до головы;
 *   front — шапка на черепе и чёлка, рисуется после головы.
 * Благодаря этому лицо всегда открыто: волосы обрамляют его, а не накрывают.
 * Голова занимает x 81..119, y 16..61; линия бровей — y 33.
 */
interface Hair {
  back?: string;
  front: string;
}

/** Шапка волос по черепу: общая основа почти для всех причёсок. */
const CAP = "M81 37c0-12 8-21 19-21s19 9 19 21c-4-7-11-10-19-10s-15 3-19 10z";
/** Более низкая линия роста волос — для густых причёсок. */
const CAP_LOW = "M80 42c0-14 9-26 20-26s20 12 20 26c-4-9-11-13-20-13s-16 4-20 13z";

const HAIR: Record<string, Hair> = {
  короткие: {
    front:
      `<path d="${CAP}"/>` +
      '<path d="M82 36q4-6 10-7-6 4-8 10z" opacity=".55"/>' +
      '<path d="M118 36q-4-6-10-7 6 4 8 10z" opacity=".55"/>',
  },
  ёжик: {
    front: '<path d="M82 33c1-10 8-17 18-17s17 7 18 17c-3-6-9-9-18-9s-15 3-18 9z"/>',
  },
  "с пробором": {
    front:
      '<path d="M81 34c0-11 8-18 19-18 3 0 6 1 8 2-6 2-10 6-12 11-3-4-8-5-12-3-2 3-3 5-3 8z"/>' +
      '<path d="M101 19c8-2 17 3 18 14 0 1 0 2-1 3-1-7-3-12-7-14-3-2-7-3-10-3z"/>',
  },
  кудри: {
    front:
      '<path d="M80 34a6 6 0 0 1 2-9 7 7 0 0 1 6-7 7 7 0 0 1 12-2 7 7 0 0 1 12 2 7 7 0 0 1 6 7 6 6 0 0 1 2 9c-1-6-3-9-6-10-4 3-8 4-12 4s-9-1-13-4c-4 1-6 4-7 10z"/>' +
      '<circle cx="86" cy="26" r="3" opacity=".45"/><circle cx="100" cy="21" r="3" opacity=".45"/>' +
      '<circle cx="113" cy="26" r="3" opacity=".45"/>',
  },
  длинные: {
    back: '<path d="M78 34c0-13 10-21 22-21s22 8 22 21c0 16-1 30-3 42l-9-2c3-15 3-29 1-38-5 5-12 7-19 7s-13-2-17-6c-2 9-2 22 1 37l-9 2c-2-12-3-26-3-42z"/>',
    front:
      `<path d="${CAP_LOW}"/>` +
      '<path d="M82 36q3 14 3 26l-4-1q-2-13-2-25z" opacity=".65"/>' +
      '<path d="M118 36q-3 14-3 26l4-1q2-13 2-25z" opacity=".65"/>',
  },
  лысина: {
    front:
      '<path d="M81 36c0-6 2-11 6-15-2 5-3 10-3 16z" opacity=".95"/>' +
      '<path d="M119 36c0-6-2-11-6-15 2 5 3 10 3 16z" opacity=".95"/>' +
      '<path d="M84 30q6-5 16-5 10 0 16 5-7-2-16-2-9 0-16 2z" opacity=".3"/>',
  },
  афро: {
    back: '<circle cx="100" cy="30" r="27"/>',
    front:
      '<path d="M73 32a17 17 0 0 1 9-19 16 16 0 0 1 18-6 16 16 0 0 1 18 6 17 17 0 0 1 9 19c-3-10-10-15-18-15s-15 5-18 15z"/>' +
      '<circle cx="82" cy="22" r="4" opacity=".35"/><circle cx="100" cy="14" r="4" opacity=".35"/>' +
      '<circle cx="118" cy="22" r="4" opacity=".35"/>',
  },
  "гладко назад": {
    front:
      '<path d="M82 31c0-10 8-16 18-16s18 6 18 16c0-3-1-5-2-7-4-6-10-8-16-8s-12 2-16 8c-1 2-2 4-2 7z"/>' +
      '<path d="M86 22q14-6 28 0" fill="none" stroke-width="1.2" opacity=".45"/>' +
      '<path d="M87 26q13-5 26 0" fill="none" stroke-width="1.2" opacity=".35"/>',
  },
  каре: {
    back: '<path d="M78 34c0-13 10-21 22-21s22 8 22 21c0 10-1 19-2 27l-10-1c2-9 2-18 0-24-5 5-12 7-19 7s-13-2-17-6c-2 6-2 15 0 23l-10 1c-1-8-2-17-2-27z"/>',
    front:
      `<path d="${CAP_LOW}"/>` +
      '<path d="M81 36q2 13 2 23l-5-1q-1-12-1-22z" opacity=".7"/>' +
      '<path d="M119 36q-2 13-2 23l5-1q1-12 1-22z" opacity=".7"/>',
  },
  хвост: {
    back: '<path d="M119 30c9 3 14 11 14 22 0 9-2 17-6 23l-8-4c4-6 5-13 5-20 0-9-3-16-9-19z"/>',
    front:
      `<path d="${CAP}"/>` +
      '<path d="M86 24q14-6 28 0" fill="none" stroke-width="1.2" opacity=".4"/>' +
      '<ellipse cx="118" cy="31" rx="5" ry="4"/>',
  },
  пучок: {
    front:
      `<path d="${CAP}"/>` +
      '<circle cx="100" cy="11" r="8"/>' +
      '<path d="M86 24q14-6 28 0" fill="none" stroke-width="1.2" opacity=".4"/>',
  },
  чёлка: {
    back: '<path d="M78 34c0-13 10-21 22-21s22 8 22 21c0 12-1 22-2 31l-9-1c2-11 2-21 0-28-5 5-12 7-19 7s-13-2-17-6c-2 7-2 17 0 27l-9 1c-1-9-2-19-2-31z"/>',
    front:
      `<path d="${CAP_LOW}"/>` +
      '<path d="M81 33c0-13 9-19 19-19s19 6 19 19c-3-6-9-9-19-9s-16 3-19 9z"/>' +
      '<path d="M86 33q7 4 14 0" fill="none" stroke-width="1.1" opacity=".4"/>',
  },
  локоны: {
    back: '<path d="M78 34c0-13 10-21 22-21s22 8 22 21c0 14-2 26-4 36-3-2-5-5-5-9 2-8 2-17 0-23-5 5-12 7-19 7s-13-2-17-6c-2 7-2 16 0 24 0 4-2 7-5 9-2-11-4-23-4-38z"/>',
    front:
      `<path d="${CAP_LOW}"/>` +
      '<path d="M81 38q5 6 2 12t2 12l-5 1q-4-7-1-13t-2-11z" opacity=".8"/>' +
      '<path d="M119 38q-5 6-2 12t-2 12l5 1q4-7 1-13t2-11z" opacity=".8"/>',
  },
};

function hairOf(sex: Sex, style: number): Hair {
  const list = hairStyles(sex);
  return HAIR[list[style] ?? list[0]] ?? HAIR["короткие"];
}

/** Оставлено для совместимости: контур шапки причёски. */
export function hairPath(sex: Sex, style: number): string {
  return `<g><path d="${CAP}"/>${hairOf(sex, style).front}</g>`;
}

/** Борода: масса по линии челюсти плюс усы. Индекс — плотность. */
const BEARD_PATHS: string[] = [
  `<path d="M${CX - 18} ${HEAD_CY + 6}c1 13 8 21 18 21s17-8 18-21c-3 9-9 14-18 14s-15-5-18-14z" opacity=".4"/>`,
  `<path d="M${CX - 19} ${HEAD_CY + 2}c0 17 8 27 19 27s19-10 19-27c-2 11-8 17-19 17s-17-6-19-17z" opacity=".92"/>` +
    `<path d="M${CX - 8} ${HEAD_CY + 7}q8 4 16 0-8 6-16 0z" opacity=".9"/>`,
  `<path d="M${CX - 20} ${HEAD_CY}c-1 22 8 36 20 36s21-14 20-36c-2 3-4 5-6 6 1 15-6 23-14 23s-15-8-14-23c-2-1-4-3-6-6z"/>` +
    `<path d="M${CX - 9} ${HEAD_CY + 6}q9 5 18 0-9 7-18 0z"/>`,
];

/* --------------------------------- сборка --------------------------------- */

export interface AvatarOptions {
  /** ширина в пикселях; высота считается по пропорции холста */
  size?: number;
  top?: string;
  shoes?: string;
  accessory?: string | null;
  bg?: string;
}

export function avatarSVG(a: Appearance, o: AvatarOptions = {}): string {
  const s = o.size ?? 200;
  const h = Math.round((s * H) / W);
  const sk = SKIN[a.skin] ?? SKIN[1];
  const skDark = shade(sk, 0.22);
  const skDeep = shade(sk, 0.4);
  const skLight = shade(sk, -0.3);
  const hc = HAIRC[a.hairc] ?? HAIRC[0];
  const hcDark = shade(hc, 0.42);
  const hcLight = shade(hc, -0.4);
  const ec = EYESC[a.eyes] ?? EYESC[0];
  const oc = outfitColor(o.top);
  const ocDark = shade(oc, 0.3);
  const ocDeep = shade(oc, 0.5);
  const ocLight = shade(oc, -0.16);
  const sc = shoeColor(o.shoes);
  const scDark = shade(sc, 0.42);
  const bg = o.bg ?? "#141922";
  const id = `av${s}${a.skin}${a.hair}${a.hairc}${a.eyes}${a.face}`;
  const pants = "#39404E";
  const pantsDark = shade(pants, 0.32);
  const pantsLight = shade(pants, -0.14);

  const defs =
    `<defs>` +
    `<clipPath id="c${id}"><rect x="0" y="0" width="${W}" height="${H}" rx="16"/></clipPath>` +
    `<radialGradient id="room${id}" cx="38%" cy="16%" r="82%">` +
    `<stop offset="0" stop-color="#ffffff" stop-opacity=".10"/>` +
    `<stop offset="58%" stop-color="#ffffff" stop-opacity="0"/>` +
    `<stop offset="100%" stop-color="#000000" stop-opacity=".5"/></radialGradient>` +
    `<linearGradient id="skin${id}" x1="0" y1="0" x2="1" y2="0.4">` +
    `<stop offset="0" stop-color="${skLight}"/><stop offset="52%" stop-color="${sk}"/>` +
    `<stop offset="100%" stop-color="${skDark}"/></linearGradient>` +
    `<linearGradient id="cloth${id}" x1="0" y1="0" x2="1" y2="0.3">` +
    `<stop offset="0" stop-color="${ocLight}"/><stop offset="55%" stop-color="${oc}"/>` +
    `<stop offset="100%" stop-color="${ocDark}"/></linearGradient>` +
    `<linearGradient id="pants${id}" x1="0" y1="0" x2="1" y2="0.2">` +
    `<stop offset="0" stop-color="${pantsLight}"/><stop offset="60%" stop-color="${pants}"/>` +
    `<stop offset="100%" stop-color="${pantsDark}"/></linearGradient>` +
    `<linearGradient id="hair${id}" x1="0.1" y1="0" x2="0.9" y2="1">` +
    `<stop offset="0" stop-color="${hcLight}"/><stop offset="45%" stop-color="${hc}"/>` +
    `<stop offset="100%" stop-color="${hcDark}"/></linearGradient>` +
    `<radialGradient id="iris${id}" cx="50%" cy="38%" r="62%">` +
    `<stop offset="0" stop-color="${shade(ec, -0.35)}"/><stop offset="100%" stop-color="${shade(ec, 0.35)}"/>` +
    `</radialGradient></defs>`;

  const EY = HEAD_CY - 1;
  const MY = HEAD_CY + 14;

  const head =
    // овал черепа с сужением к подбородку
    `<path d="M100 ${TOP}c11 0 19 9 19 21 0 8-2 15-5 20-3 5-8 8-14 8s-11-3-14-8c-3-5-5-12-5-20 0-12 8-21 19-21z" fill="url(#skin${id})"/>` +
    `<path d="M${CX + 8} ${HEAD_CY - 8}c4 4 6 10 6 16 0 7-3 13-8 16 6-1 10-5 12-10 2-6 2-15-1-22z" fill="${skDeep}" opacity=".22"/>` +
    `<ellipse cx="${CX - HEAD_RX}" cy="${HEAD_CY + 1}" rx="3.2" ry="5" fill="${sk}"/>` +
    `<ellipse cx="${CX + HEAD_RX}" cy="${HEAD_CY + 1}" rx="3.2" ry="5" fill="${sk}"/>`;

  const eyes =
    `<g>` +
    `<ellipse cx="${CX - 7.5}" cy="${EY}" rx="5" ry="3.3" fill="#fbfbfa"/>` +
    `<ellipse cx="${CX + 7.5}" cy="${EY}" rx="5" ry="3.3" fill="#fbfbfa"/>` +
    `<circle cx="${CX - 7.2}" cy="${EY}" r="2.6" fill="url(#iris${id})"/>` +
    `<circle cx="${CX + 7.8}" cy="${EY}" r="2.6" fill="url(#iris${id})"/>` +
    `<circle cx="${CX - 7.2}" cy="${EY}" r="1.1" fill="#140f0c"/>` +
    `<circle cx="${CX + 7.8}" cy="${EY}" r="1.1" fill="#140f0c"/>` +
    `<circle cx="${CX - 8.3}" cy="${EY - 1.2}" r=".75" fill="#fff"/>` +
    `<circle cx="${CX + 6.7}" cy="${EY - 1.2}" r=".75" fill="#fff"/>` +
    // верхнее веко: без него глаз читается пуговицей
    `<path d="M${CX - 12.5} ${EY - 1.8}q5-3.6 10 0" stroke="${skDeep}" stroke-width="1.3" fill="none" stroke-linecap="round"/>` +
    `<path d="M${CX + 2.5} ${EY - 1.8}q5-3.6 10 0" stroke="${skDeep}" stroke-width="1.3" fill="none" stroke-linecap="round"/>` +
    `</g>`;

  const brows =
    `<path d="M${CX - 13} ${EY - 5.6}q5-3.2 10-1.2" stroke="${hcDark}" stroke-width="2" fill="none" stroke-linecap="round"/>` +
    `<path d="M${CX + 3} ${EY - 6.8}q5-2 10 1.2" stroke="${hcDark}" stroke-width="2" fill="none" stroke-linecap="round"/>`;

  const nose =
    `<path d="M${CX - 0.5} ${EY + 2}q-1.6 6 0.5 8.5" stroke="${skDeep}" stroke-width="1.3" fill="none" stroke-linecap="round" opacity=".7"/>` +
    `<path d="M${CX - 3} ${EY + 10.5}q3 2 6 0" stroke="${skDeep}" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".5"/>`;

  const mouth =
    a.face === 1
      ? `<path d="M${CX - 6} ${MY}q6 5.5 12 0q-6 2.4-12 0z" fill="#8f4b43"/>`
      : a.face === 2
        ? `<path d="M${CX - 5.5} ${MY + 1}h11" stroke="#8f4b43" stroke-width="1.9" stroke-linecap="round"/>`
        : `<path d="M${CX - 5} ${MY}q5 3 10 0" stroke="#8f4b43" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;

  const beard =
    a.beard && a.sex === "m"
      ? `<g fill="url(#hair${id})">${BEARD_PATHS[a.beardStyle ?? 1] ?? BEARD_PATHS[1]}</g>`
      : "";

  const glasses = a.glasses
    ? `<g fill="none" stroke="#2A3342" stroke-width="1.8">` +
      `<rect x="${CX - 14}" y="${EY - 4.5}" width="13" height="9" rx="4"/>` +
      `<rect x="${CX + 1}" y="${EY - 4.5}" width="13" height="9" rx="4"/>` +
      `<path d="M${CX - 1} ${EY}h2M${CX - 14} ${EY - 2}l-5-1M${CX + 14} ${EY - 2}l5-1"/></g>` +
      `<rect x="${CX - 13.4}" y="${EY - 4}" width="12" height="4" rx="2" fill="#fff" opacity=".12"/>`
    : "";

  const hairStyle = hairOf(a.sex, a.hair);
  const hairBack = hairStyle.back ? `<g fill="url(#hair${id})">${hairStyle.back}</g>` : "";
  const hair =
    `<g fill="url(#hair${id})" stroke="${hcLight}" stroke-width="0">${hairStyle.front}</g>` +
    `<g fill="none" stroke="${hcLight}" stroke-width="1.1" opacity=".42" stroke-linecap="round">` +
    `<path d="M${CX - 12} ${TOP + 9}q7-5 15-3"/><path d="M${CX - 6} ${TOP + 6}q8-3 15 1"/>` +
    `<path d="M${CX - 14} ${TOP + 15}q6-4 12-4"/></g>`;

  const cap = a.cap
    ? `<g><path d="M${CX - 23} ${HEAD_CY - 4}c0-14 10-23 23-23s23 9 23 23z" fill="#2E8B7A"/>` +
      `<path d="M${CX - 23} ${HEAD_CY - 4}c0-14 10-23 23-23 4 0 7 1 10 2-11 2-19 11-20 21z" fill="#3aa78f" opacity=".7"/>` +
      `<path d="M${CX} ${HEAD_CY - 4}h26c5 0 8 2 9 5-10 3-24 3-35 3z" fill="#25705F"/></g>`
    : "";

  const ARM_TOP = SHOULDER_Y + 4;
  const WRIST_Y = HIP_Y + 8;
  const body =
    `<path d="M${CX - 6.5} ${CHIN - 6}h13v13q-6.5 5-13 0z" fill="${skDark}"/>` +
    `<path d="M${CX - 6.5} ${CHIN - 6}q6.5 7 13 0v4q-6.5 6-13 0z" fill="${skDeep}" opacity=".55"/>` +
    // торс: плечи -> талия -> бёдра, силуэт задан кривыми, а не прямоугольником
    `<path d="M100 ${SHOULDER_Y - 8}c-13 0-26 5-31 13l-4 ${WAIST_Y - SHOULDER_Y}c-1 8 8 12 17 13h36c9-1 18-5 17-13l-4-${WAIST_Y - SHOULDER_Y}c-5-8-18-13-31-13z" fill="url(#cloth${id})"/>` +
    `<path d="M${CX + 10} ${SHOULDER_Y - 5}c10 2 18 7 21 12l4 ${WAIST_Y - SHOULDER_Y}c1 7-6 11-14 12l-3-${WAIST_Y - SHOULDER_Y + 10}z" fill="${ocDeep}" opacity=".3"/>` +
    `<path d="M${CX - 20} ${SHOULDER_Y + 12}q6 26 3 48" stroke="${ocDeep}" stroke-width="1.4" fill="none" opacity=".25"/>` +
    `<path d="M${CX + 15} ${SHOULDER_Y + 16}q-4 24-2 42" stroke="${ocDeep}" stroke-width="1.4" fill="none" opacity=".2"/>` +
    // руки с сужением к запястью
    `<path d="M${CX - 24} ${SHOULDER_Y - 6}c-9 2-15 8-17 17l-5 ${WRIST_Y - ARM_TOP - 18}c-1 7 2 11 7 11s8-4 9-10l8-${WRIST_Y - ARM_TOP - 22}z" fill="url(#cloth${id})"/>` +
    `<path d="M${CX + 24} ${SHOULDER_Y - 6}c9 2 15 8 17 17l5 ${WRIST_Y - ARM_TOP - 18}c1 7-2 11-7 11s-8-4-9-10l-8-${WRIST_Y - ARM_TOP - 22}z" fill="url(#cloth${id})"/>` +
    `<path d="M${CX + 26} ${SHOULDER_Y - 4}c8 3 13 9 15 17l5 ${WRIST_Y - ARM_TOP - 18}c1 6-1 9-5 10l-6-${WRIST_Y - ARM_TOP - 14}z" fill="${ocDeep}" opacity=".3"/>` +
    // кисти
    `<path d="M${CX - 41} ${WRIST_Y - 2}c5-1 9 2 9 7l1 6c0 5-3 8-7 8s-7-3-7-8z" fill="url(#skin${id})"/>` +
    `<path d="M${CX + 41} ${WRIST_Y - 2}c-5-1-9 2-9 7l-1 6c0 5 3 8 7 8s7-3 7-8z" fill="url(#skin${id})"/>` +
    // ноги: бедро -> колено -> щиколотка
    `<path d="M${CX - 27} ${HIP_Y - 10}h26l-2 16c-2 8-4 16-5 25l-3 ${ANKLE_Y - KNEE_Y}h-15l-2-${ANKLE_Y - KNEE_Y}c-1-9-2-17-4-25z" fill="url(#pants${id})"/>` +
    `<path d="M${CX + 1} ${HIP_Y - 10}h26l-3 16c-2 8-3 16-4 25l-2 ${ANKLE_Y - KNEE_Y}h-15l-3-${ANKLE_Y - KNEE_Y}c-1-9-3-17-5-25z" fill="url(#pants${id})"/>` +
    `<path d="M${CX} ${HIP_Y - 8}v${ANKLE_Y - HIP_Y - 6}" stroke="${pantsDark}" stroke-width="1.6" opacity=".7"/>` +
    `<path d="M${CX - 19} ${HIP_Y + 8}q3 20 1 38" stroke="${pantsLight}" stroke-width="1.6" fill="none" opacity=".32"/>` +
    `<path d="M${CX - 18} ${KNEE_Y}q7 3 13 0" stroke="${pantsDark}" stroke-width="1.3" fill="none" opacity=".5"/>` +
    `<path d="M${CX + 5} ${KNEE_Y}q7 3 13 0" stroke="${pantsDark}" stroke-width="1.3" fill="none" opacity=".5"/>` +
    // обувь: верх, носок, подошва
    `<path d="M${CX - 21} ${ANKLE_Y}h15l1 9c5 2 9 5 9 8h-27c-1-6 1-12 2-17z" fill="${sc}"/>` +
    `<path d="M${CX + 6} ${ANKLE_Y}h15l2 17h-27c0-3 4-6 9-8z" fill="${sc}"/>` +
    `<path d="M${CX - 24} ${FLOOR_Y - 4}h28v4a2 2 0 0 1-2 2h-24a2 2 0 0 1-2-2z" fill="${scDark}"/>` +
    `<path d="M${CX - 4} ${FLOOR_Y - 4}h28v4a2 2 0 0 1-2 2h-24a2 2 0 0 1-2-2z" fill="${scDark}"/>`;

  const accessory = accessoryOverlay(o.accessory);

  return (
    `<svg viewBox="0 0 ${W} ${H}" width="${s}" height="${h}" role="img" aria-label="персонаж в полный рост">` +
    defs +
    `<g clip-path="url(#c${id})">` +
    `<rect width="${W}" height="${H}" fill="${bg}"/>` +
    `<rect width="${W}" height="${H}" fill="url(#room${id})"/>` +
    `<ellipse cx="${CX}" cy="${FLOOR_Y + 3}" rx="46" ry="7" fill="#000" opacity=".5"/>` +
    hairBack +
    body +
    head +
    beard +
    brows +
    eyes +
    nose +
    mouth +
    hair +
    glasses +
    cap +
    accessory +
    `</g></svg>`
  );
}

/** Оверлей для аксессуара поверх фигуры: часы/рюкзак/наушники/очки/сумка. */
function accessoryOverlay(id: string | null | undefined): string {
  const WRIST = HIP_Y + 16;
  switch (id) {
    case "watch":
      return (
        `<rect x="${CX - 45}" y="${WRIST - 4}" width="11" height="6" rx="2" fill="#2A3342"/>` +
        `<circle cx="${CX - 39.5}" cy="${WRIST - 1}" r="3.4" fill="#C8CDD8"/>`
      );
    case "backpack":
      return (
        `<path d="M${CX - 26} ${SHOULDER_Y + 8}q26-9 52 0l3 42q-29 9-58 0z" fill="#2E8B7A" opacity=".9"/>` +
        `<path d="M${CX - 16} ${SHOULDER_Y + 6}l2-9h28l2 9" fill="none" stroke="#25705F" stroke-width="3"/>`
      );
    case "headphones_neck":
      return (
        `<path d="M${CX - 15} ${CHIN + 8}a15 15 0 0 1 30 0" fill="none" stroke="#2A3342" stroke-width="4"/>` +
        `<rect x="${CX - 19}" y="${CHIN + 5}" width="7" height="10" rx="3" fill="#2A3342"/>` +
        `<rect x="${CX + 12}" y="${CHIN + 5}" width="7" height="10" rx="3" fill="#2A3342"/>`
      );
    case "sunglasses":
      return (
        `<g><rect x="${CX - 14}" y="${HEAD_CY - 5}" width="13" height="9" rx="3" fill="#1A1F29"/>` +
        `<rect x="${CX + 1}" y="${HEAD_CY - 5}" width="13" height="9" rx="3" fill="#1A1F29"/>` +
        `<rect x="${CX - 1}" y="${HEAD_CY - 3}" width="2" height="2.5" fill="#1A1F29"/></g>`
      );
    case "tote_bag":
      return (
        `<path d="M${CX + 38} ${HIP_Y}h20v26h-20z" fill="#D9B36B"/>` +
        `<path d="M${CX + 42} ${HIP_Y}v-7a6 6 0 0 1 12 0v7" fill="none" stroke="#8E6B33" stroke-width="2.5"/>` +
        `<path d="M${CX + 38} ${HIP_Y}h20v5h-20z" fill="${shade("#D9B36B", 0.25)}"/>`
      );
    default:
      return "";
  }
}
