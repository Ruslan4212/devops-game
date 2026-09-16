/**
 * Персонаж в стилистике обучающих приложений вроде Duolingo.
 *
 * Ключ этого стиля — намеренно «детские» пропорции, а не анатомический канон:
 * голова занимает около трети роста, глаза огромные, конечности короткие и
 * толстые, все формы сильно скруглены. Правильные 7.5 голов дают сухую
 * фигуру-манекен; здесь узнаваемость и дружелюбие важнее правдоподобия.
 *
 * Цвет кладётся плоско и насыщенно, без обводок: у формы есть основной тон и
 * один тон потемнее — он «сажает» объём. Градиентов нет нигде, кроме фона.
 */

export const SKIN = ["#FFD9B8", "#F5BC8E", "#D99A68", "#AE7345", "#7E4E2D"];
export const HAIRC = ["#2A211A", "#6B4224", "#C07C32", "#E7C77A", "#A8A8A8", "#D2503A", "#6B5BD6", "#2FA98C"];
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
export const EYESC = ["#4A3326", "#3E8ED0", "#4CA85F", "#7B63D6", "#8E8E8E", "#C99A3A"];
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

/** Смешивание с чёрным (k>0) или белым (k<0): нижний тон формы и блики. */
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

/* Цвета одежды намеренно насыщенные: приглушённые тона в этой стилистике
   выглядят грязно, вся палитра держится на чистом цвете. */
const OUTFIT: Record<string, string> = {
  none: "#8FA0B8",
  tshirt: "#2F8FE0",
  hoodie: "#5A6B80",
  shirt: "#F0EDE4",
  suit: "#31415C",
  tech: "#22A98C",
  bomber: "#46566E",
  turtleneck: "#48505C",
};
export const outfitColor = (top: string | undefined): string => OUTFIT[top ?? ""] ?? "#2F8FE0";

const SHOE_COLOR: Record<string, string> = {
  sneakers_old: "#8D8577",
  sneakers: "#F0EDE4",
  boots: "#6A4A2A",
  loafers: "#3A2C1E",
};
export const shoeColor = (shoes: string | undefined): string =>
  SHOE_COLOR[shoes ?? ""] ?? SHOE_COLOR.sneakers_old;

/* ---------------------------- сетка пропорций ------------------------------
   Рост примерно в три головы: голова 40..152, корпус 150..280, ноги до 348,
   обувь до 372. Это и есть «детская» схема стиля. */

const W = 200;
const H = 400;
const CX = 100;
const HEAD_CY = 96;
const HEAD_RX = 52;
const HEAD_RY = 56;
const CHIN = HEAD_CY + HEAD_RY;
const SHOULDER_Y = 162;
const BODY_BOTTOM = 280;
const LEG_BOTTOM = 348;
const FLOOR_Y = 372;
/** Линия глаз: в этом стиле она ниже середины головы. */
const EY = HEAD_CY + 8;

/* ------------------------------ волосы и борода ---------------------------- */

/**
 * Причёска в двух слоях: масса за головой и шапка поверх. Формы крупные и
 * скруглённые — мелкие пряди в этой стилистике превращаются в грязь.
 */
interface Hair {
  back?: string;
  front: string;
}

const CAP = `M${CX - 52} ${HEAD_CY - 4}c0-31 23-54 52-54s52 23 52 54c-3-13-10-22-20-26-9 6-20 9-32 9s-23-3-32-9c-10 4-17 13-20 26z`;
const CAP_LOW = `M${CX - 53} ${HEAD_CY + 10}c0-36 23-62 53-62s53 26 53 62c-4-18-11-30-22-35-10 7-20 10-31 10s-21-3-31-10c-11 5-18 17-22 35z`;

const HAIR: Record<string, Hair> = {
  короткие: {
    front:
      `<path d="${CAP}"/>` +
      `<path d="M${CX - 40} ${HEAD_CY - 6}q5 14 3 26l-8-2q-2-13 5-24z"/>` +
      `<path d="M${CX + 40} ${HEAD_CY - 6}q-5 14-3 26l8-2q2-13-5-24z"/>`,
  },
  ёжик: {
    front: `<path d="M${CX - 44} ${HEAD_CY - 24}c4-22 22-36 44-36s40 14 44 36c-12-12-27-18-44-18s-32 6-44 18z"/>`,
  },
  "с пробором": {
    front:
      `<path d="M${CX - 52} ${HEAD_CY - 4}c0-31 23-54 52-54 6 0 11 1 16 3-20 8-32 22-36 40-8-12-20-16-28-9-3 5-4 12-4 20z"/>` +
      `<path d="M${CX - 4} ${HEAD_CY - 52}c30-4 56 18 56 48 0 4 0 7-1 10-6-24-16-40-31-47-8-4-16-8-24-11z"/>`,
  },
  кудри: {
    back: `<circle cx="${CX}" cy="${HEAD_CY - 14}" r="64"/>`,
    front:
      `<path d="M${CX - 62} ${HEAD_CY - 6}a20 20 0 0 1 10-28 22 22 0 0 1 20-20 22 22 0 0 1 32-8 22 22 0 0 1 32 8 22 22 0 0 1 20 20 20 20 0 0 1 10 28c-6-20-14-31-24-34-12 9-24 13-38 13s-26-4-38-13c-10 3-18 14-24 34z"/>` +
      `<circle cx="${CX - 40}" cy="${HEAD_CY - 36}" r="13" opacity=".3"/>` +
      `<circle cx="${CX}" cy="${HEAD_CY - 52}" r="13" opacity=".3"/>` +
      `<circle cx="${CX + 40}" cy="${HEAD_CY - 36}" r="13" opacity=".3"/>`,
  },
  длинные: {
    back: `<path d="M${CX} ${HEAD_CY - 62}c34 0 60 26 60 62 0 96-4 118-10 110a11 11 0 0 1-21-3c5-78 8-100 8-80 0-28-18-48-37-48s-37 20-37 48c0 80 3 100 8 78a11 11 0 0 1-21 3c-6-110-10-118-10-96 0-36 60-62 60-62z"/>`,
    front: `<path d="${CAP_LOW}"/>`,
  },
  лысина: {
    front:
      `<path d="M${CX - 52} ${HEAD_CY + 6}c0-20 5-36 15-47-7 16-10 32-10 50z"/>` +
      `<path d="M${CX + 52} ${HEAD_CY + 6}c0-20-5-36-15-47 7 16 10 32 10 50z"/>`,
  },
  афро: {
    back: `<circle cx="${CX}" cy="${HEAD_CY - 16}" r="72"/>`,
    front: `<path d="M${CX - 62} ${HEAD_CY - 8}a30 30 0 0 1 18-42 28 28 0 0 1 44-12 28 28 0 0 1 44 12 30 30 0 0 1 18 42c-6-26-24-40-40-40s-34 14-40 40z"/>`,
  },
  "гладко назад": {
    front:
      `<path d="M${CX - 48} ${HEAD_CY - 26}c2-26 24-44 48-44s46 18 48 44c-12-16-28-24-48-24s-36 8-48 24z"/>` +
      `<path d="M${CX - 34} ${HEAD_CY - 44}q34-12 68 0" fill="none" stroke-width="4" opacity=".35"/>`,
  },
  каре: {
    back: `<path d="M${CX} ${HEAD_CY - 62}c34 0 60 26 60 62 0 58-4 80-10 72a11 11 0 0 1-21-3c5-40 8-62 8-42 0-28-18-48-37-48s-37 20-37 48c0 42 3 62 8 40a11 11 0 0 1-21 3c-6-72-10-80-10-58 0-36 60-62 60-62z"/>`,
    front: `<path d="${CAP_LOW}"/>`,
  },
  хвост: {
    back: `<path d="M${CX + 40} ${HEAD_CY - 16}c22 2 36 18 38 40 2 20-3 38-14 52-7 9-18 10-25 3-6-7-5-17 2-24 7-8 11-18 10-28-1-14-7-24-19-30z"/>`,
    front: `<path d="${CAP}"/><ellipse cx="${CX + 48}" cy="${HEAD_CY - 6}" rx="14" ry="12"/>`,
  },
  пучок: {
    front: `<path d="${CAP}"/><circle cx="${CX}" cy="${HEAD_CY - 66}" r="22"/>`,
  },
  чёлка: {
    back: `<path d="M${CX} ${HEAD_CY - 62}c34 0 60 26 60 62 0 74-4 96-10 88a11 11 0 0 1-21-3c5-56 8-78 8-58 0-28-18-48-37-48s-37 20-37 48c0 58 3 78 8 56a11 11 0 0 1-21 3c-6-88-10-96-10-74 0-36 60-62 60-62z"/>`,
    front: `<path d="${CAP_LOW}"/><path d="M${CX - 50} ${HEAD_CY - 30}q50 24 100 0v13q-50 20-100 0z"/>`,
  },
  локоны: {
    back: `<path d="M${CX} ${HEAD_CY - 62}c34 0 60 26 60 62 0 88-4 110-10 102a11 11 0 0 1-21-3c5-70 8-92 8-72 0-28-18-48-37-48s-37 20-37 48c0 72 3 92 8 70a11 11 0 0 1-21 3c-6-102-10-110-10-88 0-36 60-62 60-62z"/>`,
    front: `<path d="${CAP_LOW}"/>`,
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

/** Борода: крупная скруглённая масса по челюсти. */
const BEARD_PATHS: string[] = [
  `<path d="M${CX - 44} ${HEAD_CY + 16}c2 30 20 48 44 48s42-18 44-48c-8 20-24 32-44 32s-36-12-44-32z" opacity=".4"/>`,
  `<path d="M${CX - 46} ${HEAD_CY + 8}c0 38 20 60 46 60s46-22 46-60c-6 26-22 40-46 40s-40-14-46-40z" opacity=".95"/>`,
  `<path d="M${CX - 48} ${HEAD_CY + 2}c-2 50 20 80 48 80s50-30 48-80c-5 8-10 13-15 15 3 34-14 52-33 52s-36-18-33-52c-5-2-10-7-15-15z"/>`,
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
  const skDark = shade(sk, 0.16);
  const hc = HAIRC[a.hairc] ?? HAIRC[0];
  const hcDark = shade(hc, 0.3);
  const hcLight = shade(hc, -0.3);
  const ec = EYESC[a.eyes] ?? EYESC[0];
  const oc = outfitColor(o.top);
  const ocDark = shade(oc, 0.18);
  const sc = shoeColor(o.shoes);
  const scDark = shade(sc, 0.3);
  const bg = o.bg ?? "#141922";
  const pants = "#4A5468";
  const pantsDark = shade(pants, 0.18);
  const id = `av${s}${a.skin}${a.hair}${a.hairc}${a.eyes}${a.face}`;

  const defs =
    `<defs><clipPath id="c${id}"><rect x="0" y="0" width="${W}" height="${H}" rx="16"/></clipPath>` +
    `<radialGradient id="bg${id}" cx="50%" cy="30%" r="75%">` +
    `<stop offset="0" stop-color="${shade(bg, -0.28)}"/>` +
    `<stop offset="100%" stop-color="${shade(bg, 0.35)}"/></radialGradient></defs>`;

  const hairStyle = hairOf(a.sex, a.hair);

  /* Голова крупная и сильно скруглённая; тон потемнее снизу заменяет собой
     всю светотень. */
  const head =
    `<ellipse cx="${CX}" cy="${HEAD_CY}" rx="${HEAD_RX}" ry="${HEAD_RY}" fill="${sk}"/>` +
    `<path d="M${CX - 48} ${HEAD_CY + 26}a52 56 0 0 0 96 0 52 56 0 0 1-96 0z" fill="${skDark}" opacity=".5"/>` +
    `<ellipse cx="${CX - HEAD_RX + 2}" cy="${EY + 4}" rx="9" ry="12" fill="${sk}"/>` +
    `<ellipse cx="${CX + HEAD_RX - 2}" cy="${EY + 4}" rx="9" ry="12" fill="${skDark}"/>`;

  /* Глаза — главный элемент стиля: крупные, с большим зрачком и одним бликом. */
  const eyes =
    `<g>` +
    `<ellipse cx="${CX - 20}" cy="${EY}" rx="15" ry="17" fill="#fff"/>` +
    `<ellipse cx="${CX + 20}" cy="${EY}" rx="15" ry="17" fill="#fff"/>` +
    `<circle cx="${CX - 19}" cy="${EY + 1}" r="9.5" fill="${ec}"/>` +
    `<circle cx="${CX + 21}" cy="${EY + 1}" r="9.5" fill="${ec}"/>` +
    `<circle cx="${CX - 19}" cy="${EY + 1}" r="5" fill="#1B1414"/>` +
    `<circle cx="${CX + 21}" cy="${EY + 1}" r="5" fill="#1B1414"/>` +
    `<circle cx="${CX - 23}" cy="${EY - 4}" r="3.4" fill="#fff"/>` +
    `<circle cx="${CX + 17}" cy="${EY - 4}" r="3.4" fill="#fff"/>` +
    `</g>`;

  const brows =
    `<path d="M${CX - 32} ${EY - 23}q12-8 24-2" stroke="${hcDark}" stroke-width="6" fill="none" stroke-linecap="round"/>` +
    `<path d="M${CX + 8} ${EY - 25}q12-6 24 2" stroke="${hcDark}" stroke-width="6" fill="none" stroke-linecap="round"/>`;

  /* Нос — маленькая скруглённая деталь, а не портретная спинка. */
  const nose = `<path d="M${CX - 5} ${EY + 20}q5 6 10 0" stroke="${skDark}" stroke-width="4" fill="none" stroke-linecap="round"/>`;

  const mouth =
    a.face === 1
      ? `<path d="M${CX - 16} ${EY + 30}q16 18 32 0" stroke="#A85348" stroke-width="5" fill="none" stroke-linecap="round"/>`
      : a.face === 2
        ? `<path d="M${CX - 13} ${EY + 34}h26" stroke="#A85348" stroke-width="5" stroke-linecap="round"/>`
        : `<path d="M${CX - 13} ${EY + 32}q13 8 26 0" stroke="#A85348" stroke-width="5" fill="none" stroke-linecap="round"/>`;

  const beard =
    a.beard && a.sex === "m"
      ? `<g fill="${hcDark}">${BEARD_PATHS[a.beardStyle ?? 1] ?? BEARD_PATHS[1]}</g>`
      : "";

  const glasses = a.glasses
    ? `<g fill="none" stroke="#2A3342" stroke-width="5">` +
      `<rect x="${CX - 38}" y="${EY - 18}" width="36" height="36" rx="14"/>` +
      `<rect x="${CX + 2}" y="${EY - 18}" width="36" height="36" rx="14"/>` +
      `<path d="M${CX - 2} ${EY}h4M${CX - 38} ${EY - 6}l-12-3M${CX + 38} ${EY - 6}l12-3"/></g>`
    : "";

  const cap = a.cap
    ? `<g><path d="M${CX - 54} ${HEAD_CY - 12}c0-32 24-56 54-56s54 24 54 56z" fill="#2E8B7A"/>` +
      `<path d="M${CX - 54} ${HEAD_CY - 12}c0-32 24-56 54-56 6 0 12 1 17 3-26 6-44 27-46 53z" fill="#3FB39A"/>` +
      `<path d="M${CX} ${HEAD_CY - 12}h60c8 0 13 4 15 10-22 6-52 6-75 6z" fill="#24705F"/>` +
      `<circle cx="${CX}" cy="${HEAD_CY - 68}" r="7" fill="#24705F"/></g>`
    : "";

  /* Корпус — одна крупная скруглённая форма. Руки толстые и короткие,
     кисти-варежки без пальцев: так принято в этой стилистике. */
  const body =
    `<path d="M${CX - 16} ${CHIN - 14}h32v18q-16 10-32 0z" fill="${skDark}"/>` +
    `<path d="M${CX} ${SHOULDER_Y - 18}c-26 0-44 14-44 34v56c0 16 20 26 44 26s44-10 44-26v-56c0-20-18-34-44-34z" fill="${oc}"/>` +
    `<path d="M${CX} ${SHOULDER_Y - 18}c26 0 44 14 44 34v56c0 16-20 26-44 26z" fill="${ocDark}"/>` +
    `<path d="M${CX - 44} ${BODY_BOTTOM - 34}c0 16 20 26 44 26s44-10 44-26v12c0 16-20 26-44 26s-44-10-44-26z" fill="${ocDark}" opacity=".55"/>` +
    `<path d="M${CX - 44} ${SHOULDER_Y + 2}c-14 4-22 16-22 32v34c0 11 8 18 18 18s18-7 18-18z" fill="${oc}"/>` +
    `<path d="M${CX + 44} ${SHOULDER_Y + 2}c14 4 22 16 22 32v34c0 11-8 18-18 18s-18-7-18-18z" fill="${ocDark}"/>` +
    `<ellipse cx="${CX - 52}" cy="${SHOULDER_Y + 86}" rx="17" ry="18" fill="${sk}"/>` +
    `<ellipse cx="${CX + 52}" cy="${SHOULDER_Y + 86}" rx="17" ry="18" fill="${skDark}"/>` +
    `<path d="M${CX - 34} ${BODY_BOTTOM - 8}h30v${LEG_BOTTOM - BODY_BOTTOM}a15 15 0 0 1-30 0z" fill="${pants}"/>` +
    `<path d="M${CX + 4} ${BODY_BOTTOM - 8}h30v${LEG_BOTTOM - BODY_BOTTOM}a15 15 0 0 1-30 0z" fill="${pantsDark}"/>` +
    `<path d="M${CX - 36} ${LEG_BOTTOM - 4}h28c4 0 7 3 8 7l2 9c1 6-3 11-9 11h-33c-6 0-10-5-9-11l3-9c1-4 5-7 10-7z" fill="${sc}"/>` +
    `<path d="M${CX + 8} ${LEG_BOTTOM - 4}h28c5 0 9 3 10 7l3 9c1 6-3 11-9 11h-33c-6 0-10-5-9-11l2-9c1-4 4-7 8-7z" fill="${shade(sc, 0.18)}"/>` +
    `<path d="M${CX - 45} ${FLOOR_Y - 6}h44a5 5 0 0 1 0 10h-42a5 5 0 0 1-2-10z" fill="${scDark}"/>` +
    `<path d="M${CX + 1} ${FLOOR_Y - 6}h44a5 5 0 0 1-2 10h-42a5 5 0 0 1 0-10z" fill="${scDark}"/>`;

  const accessory = accessoryOverlay(o.accessory);

  return (
    `<svg viewBox="0 0 ${W} ${H}" width="${s}" height="${h}" role="img" aria-label="персонаж в полный рост">` +
    defs +
    `<g clip-path="url(#c${id})">` +
    `<rect width="${W}" height="${H}" fill="url(#bg${id})"/>` +
    `<ellipse cx="${CX}" cy="${FLOOR_Y + 6}" rx="56" ry="9" fill="#000" opacity=".45"/>` +
    (hairStyle.back ? `<g fill="${hc}">${hairStyle.back}</g>` : "") +
    body +
    head +
    beard +
    brows +
    eyes +
    nose +
    mouth +
    `<g fill="${hc}">${hairStyle.front}</g>` +
    `<path d="M${CX - 30} ${HEAD_CY - 40}q24-14 46-4-22-2-46 12z" fill="${hcLight}" opacity=".4"/>` +
    glasses +
    cap +
    accessory +
    `</g></svg>`
  );
}

/**
 * Аксессуар поверх фигуры. Ключевое — посадка по месту: часы на запястье,
 * кольцо на кисти, вкладыши в ушах, лямки рюкзака на плечах. Раньше часть
 * предметов висела рядом с фигурой, а цепочка, кольцо и вкладыши не рисовались
 * вовсе — их можно было купить и не увидеть на персонаже.
 */
function accessoryOverlay(id: string | null | undefined): string {
  /* Ориентиры фигуры: кисти — эллипсы в (CX∓52, HAND_Y); запястье чуть выше;
     уши — в (CX∓50, EY+4); вырез горловины — на уровне SHOULDER_Y. */
  const HAND_Y = SHOULDER_Y + 86;
  const WRIST_Y = HAND_Y - 22;
  const EAR_Y = EY + 4;
  switch (id) {
    case "watch":
      return (
        `<rect x="${CX - 62}" y="${WRIST_Y - 6}" width="21" height="13" rx="6" fill="#2A3342"/>` +
        `<circle cx="${CX - 51.5}" cy="${WRIST_Y}" r="8" fill="#C8CDD8"/>` +
        `<circle cx="${CX - 51.5}" cy="${WRIST_Y}" r="5.5" fill="#1B2230"/>` +
        `<path d="M${CX - 51.5} ${WRIST_Y}v-3.5M${CX - 51.5} ${WRIST_Y}l2.5 2" stroke="#E4E8F0" stroke-width="1.4" stroke-linecap="round"/>`
      );
    case "ring":
      return (
        `<circle cx="${CX - 58}" cy="${HAND_Y + 4}" r="6" fill="none" stroke="#E0B455" stroke-width="3.4"/>` +
        `<rect x="${CX - 63}" y="${HAND_Y - 4}" width="10" height="8" rx="3" fill="#F0CB72"/>`
      );
    case "necklace":
      /* цепочка лежит по вырезу горловины дугой от плеча до плеча */
      return (
        `<path d="M${CX - 26} ${SHOULDER_Y - 8}q26 30 52 0" fill="none" stroke="#E0B455" stroke-width="3.4" stroke-linecap="round"/>` +
        `<path d="M${CX} ${SHOULDER_Y + 10}l6 8-6 8-6-8z" fill="#F0CB72"/>`
      );
    case "earbuds":
      /* вкладыши сидят в ушах, ножка уходит вниз вдоль челюсти */
      return (
        `<g fill="#F2F0EA">` +
        `<circle cx="${CX - 50}" cy="${EAR_Y}" r="7"/><circle cx="${CX + 50}" cy="${EAR_Y}" r="7"/>` +
        `<path d="M${CX - 54} ${EAR_Y + 4}h7v13a3.5 3.5 0 0 1-7 0z"/>` +
        `<path d="M${CX + 47} ${EAR_Y + 4}h7v13a3.5 3.5 0 0 1-7 0z"/></g>` +
        `<circle cx="${CX - 50}" cy="${EAR_Y}" r="3" fill="#8FA3B8"/>` +
        `<circle cx="${CX + 50}" cy="${EAR_Y}" r="3" fill="#8FA3B8"/>`
      );
    case "headphones_neck":
      /* дужка лежит на плечах, чашки — по сторонам шеи */
      return (
        `<path d="M${CX - 34} ${SHOULDER_Y - 4}a34 30 0 0 1 68 0" fill="none" stroke="#2A3342" stroke-width="9"/>` +
        `<rect x="${CX - 44}" y="${SHOULDER_Y - 14}" width="18" height="26" rx="9" fill="#3A4557"/>` +
        `<rect x="${CX + 26}" y="${SHOULDER_Y - 14}" width="18" height="26" rx="9" fill="#3A4557"/>` +
        `<rect x="${CX - 40}" y="${SHOULDER_Y - 9}" width="10" height="16" rx="5" fill="#C8CDD8"/>` +
        `<rect x="${CX + 30}" y="${SHOULDER_Y - 9}" width="10" height="16" rx="5" fill="#C8CDD8"/>`
      );
    case "backpack":
      /* рюкзак за спиной: видно лямки на плечах и край мешка сбоку */
      return (
        `<path d="M${CX - 46} ${SHOULDER_Y + 6}q-12 6-12 22v34q0 10 10 12l4-64z" fill="#24705F"/>` +
        `<path d="M${CX + 46} ${SHOULDER_Y + 6}q12 6 12 22v34q0 10-10 12l-4-64z" fill="#2E8B7A"/>` +
        `<path d="M${CX - 26} ${SHOULDER_Y - 10}q-8 30-6 62" fill="none" stroke="#2E8B7A" stroke-width="10" stroke-linecap="round"/>` +
        `<path d="M${CX + 26} ${SHOULDER_Y - 10}q8 30 6 62" fill="none" stroke="#24705F" stroke-width="10" stroke-linecap="round"/>`
      );
    case "tote_bag":
      /* сумка висит на кисти: ручка обхватывает руку, мешок уходит вниз */
      return (
        `<path d="M${CX + 44} ${HAND_Y - 12}a10 10 0 0 1 18 0" fill="none" stroke="#8E6B33" stroke-width="4"/>` +
        `<path d="M${CX + 38} ${HAND_Y - 2}h30v40a6 6 0 0 1-6 6h-18a6 6 0 0 1-6-6z" fill="#D9B36B"/>` +
        `<path d="M${CX + 56} ${HAND_Y - 2}h12v40a6 6 0 0 1-6 6h-6z" fill="${shade("#D9B36B", 0.2)}"/>` +
        `<rect x="${CX + 45}" y="${HAND_Y + 12}" width="16" height="12" rx="3" fill="#2E8B7A"/>`
      );
    case "sunglasses":
      return (
        `<g><rect x="${CX - 38}" y="${EY - 16}" width="36" height="30" rx="12" fill="#1A1F29"/>` +
        `<rect x="${CX + 2}" y="${EY - 16}" width="36" height="30" rx="12" fill="#1A1F29"/>` +
        `<rect x="${CX - 4}" y="${EY - 6}" width="8" height="6" fill="#1A1F29"/>` +
        `<path d="M${CX - 38} ${EY - 8}l-12-4M${CX + 38} ${EY - 8}l12-4" stroke="#1A1F29" stroke-width="5" stroke-linecap="round"/></g>`
      );
    default:
      return "";
  }
}
