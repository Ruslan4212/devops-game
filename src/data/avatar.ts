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
  короткие: { front: `<path d="${CAP}"/>` },
  ёжик: {
    front: `<path d="M${CX - 48} ${HEAD_CY - 14}c2-27 22-46 48-46s46 19 48 46c-9-15-26-24-48-24s-39 9-48 24z"/>`,
  },
  "с пробором": {
    front:
      `<path d="M${CX - 52} ${HEAD_CY - 6}c0-31 23-54 52-54 8 0 15 2 21 5-16 5-27 16-31 30-9-10-22-13-31-7-6 7-9 15-11 26z"/>` +
      `<path d="M${CX + 6} ${HEAD_CY - 48}c22-5 46 9 46 38 0 4-1 7-2 10-3-19-9-32-19-38-8-5-17-8-25-10z"/>`,
  },
  кудри: {
    front:
      `<path d="M${CX - 54} ${HEAD_CY - 6}a17 17 0 0 1 8-25 19 19 0 0 1 17-18 19 19 0 0 1 29-8 19 19 0 0 1 29 8 19 19 0 0 1 17 18 17 17 0 0 1 8 25c-4-16-10-25-18-28-11 8-21 11-31 11s-20-3-31-11c-8 3-14 12-18 28z"/>` +
      `<circle cx="${CX - 32}" cy="${HEAD_CY - 32}" r="9" opacity=".35"/>` +
      `<circle cx="${CX}" cy="${HEAD_CY - 44}" r="9" opacity=".35"/>` +
      `<circle cx="${CX + 32}" cy="${HEAD_CY - 32}" r="9" opacity=".35"/>`,
  },
  длинные: {
    back: `<path d="M${CX} ${HEAD_CY - 62}c34 0 60 26 60 62 0 96-4 118-10 110a11 11 0 0 1-21-3c5-78 8-100 8-80 0-28-18-48-37-48s-37 20-37 48c0 80 3 100 8 78a11 11 0 0 1-21 3c-6-110-10-118-10-96 0-36 60-62 60-62z"/>`,
    front: `<path d="${CAP_LOW}"/>`,
  },
  лысина: {
    front:
      `<path d="M${CX - 52} ${HEAD_CY + 2}c0-16 5-30 14-40-5 13-8 26-8 42z" opacity=".95"/>` +
      `<path d="M${CX + 52} ${HEAD_CY + 2}c0-16-5-30-14-40 5 13 8 26 8 42z" opacity=".95"/>`,
  },
  афро: {
    back: `<circle cx="${CX}" cy="${HEAD_CY - 16}" r="72"/>`,
    front: `<path d="M${CX - 62} ${HEAD_CY - 8}a30 30 0 0 1 18-42 28 28 0 0 1 44-12 28 28 0 0 1 44 12 30 30 0 0 1 18 42c-6-26-24-40-40-40s-34 14-40 40z"/>`,
  },
  "гладко назад": {
    front:
      `<path d="M${CX - 50} ${HEAD_CY - 16}c0-28 22-48 50-48s50 20 50 48c-8-18-26-28-50-28s-42 10-50 28z"/>` +
      `<path d="M${CX - 34} ${HEAD_CY - 34}q34-14 68 0" fill="none" stroke-width="3" opacity=".4"/>`,
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

/** Оверлей для аксессуара поверх фигуры. */
function accessoryOverlay(id: string | null | undefined): string {
  switch (id) {
    case "watch":
      return (
        `<rect x="${CX - 62}" y="${SHOULDER_Y + 62}" width="20" height="10" rx="5" fill="#2A3342"/>` +
        `<circle cx="${CX - 52}" cy="${SHOULDER_Y + 67}" r="7" fill="#C8CDD8"/>`
      );
    case "backpack":
      return (
        `<path d="M${CX - 46} ${SHOULDER_Y + 10}q46-16 92 0l5 74q-51 16-102 0z" fill="#2E8B7A" opacity=".92"/>` +
        `<path d="M${CX - 26} ${SHOULDER_Y + 6}l3-14h46l3 14" fill="none" stroke="#24705F" stroke-width="6"/>`
      );
    case "headphones_neck":
      return (
        `<path d="M${CX - 26} ${CHIN + 10}a26 26 0 0 1 52 0" fill="none" stroke="#2A3342" stroke-width="8"/>` +
        `<rect x="${CX - 34}" y="${CHIN + 4}" width="14" height="20" rx="7" fill="#2A3342"/>` +
        `<rect x="${CX + 20}" y="${CHIN + 4}" width="14" height="20" rx="7" fill="#2A3342"/>`
      );
    case "sunglasses":
      return (
        `<g><rect x="${CX - 38}" y="${EY - 16}" width="36" height="30" rx="12" fill="#1A1F29"/>` +
        `<rect x="${CX + 2}" y="${EY - 16}" width="36" height="30" rx="12" fill="#1A1F29"/>` +
        `<rect x="${CX - 4}" y="${EY - 6}" width="8" height="6" fill="#1A1F29"/></g>`
      );
    case "tote_bag":
      return (
        `<path d="M${CX + 54} ${SHOULDER_Y + 40}h40v52h-40z" fill="#D9B36B"/>` +
        `<path d="M${CX + 62} ${SHOULDER_Y + 40}v-12a12 12 0 0 1 24 0v12" fill="none" stroke="#8E6B33" stroke-width="5"/>` +
        `<path d="M${CX + 54} ${SHOULDER_Y + 40}h40v10h-40z" fill="${shade("#D9B36B", 0.22)}"/>`
      );
    default:
      return "";
  }
}
