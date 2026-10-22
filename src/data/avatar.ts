/**
 * Персонаж — «мягкий 3D» бюст: градиенты кожи и волос, складки одежды,
 * блик по краю и мягкая тень. Всё нарисовано вручную inline-SVG, без картинок.
 *
 * Слои (снизу вверх): диск-фон, задние волосы/капюшон, шея, плечи и одежда,
 * тень от головы, уши, голова, лицо (глаза, брови, нос, рот), борода, передние
 * волосы, очки/кепка, аксессуары, блик по краю.
 *
 * Идентификаторы градиентов уникальны для каждого рендера (на одной странице
 * бывает несколько персонажей).
 */

export const SKIN = ["#FFD9B8", "#F5BC8E", "#D99A68", "#AE7345", "#7E4E2D"];
export const HAIRC = ["#2A211A", "#6B4224", "#C07C32", "#E7C77A", "#A8A8A8", "#D2503A", "#6B5BD6", "#2FA98C"];
export const HAIRS_M = ["короткие", "ёжик", "длинные"];
export const HAIRS_F = ["каре", "хвост", "длинные"];
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

/** Целое в диапазоне 0..len-1, иначе значение по умолчанию. */
function pickIndex(v: unknown, len: number, def: number): number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v < len ? v : def;
}

/**
 * Приводит что угодно (старое сохранение, облако, мусор) к валидной внешности.
 * Идентификаторы опций сохраняются; неизвестные или отсутствующие — по умолчанию.
 */
export function migrateAppearance(raw: unknown): Appearance {
  const d = defaultAppearance();
  if (!raw || typeof raw !== "object") return d;
  const r = raw as Record<string, unknown>;
  const sex: Sex = r.sex === "f" ? "f" : "m";
  return {
    sex,
    name: typeof r.name === "string" ? r.name.slice(0, 24) : "",
    skin: pickIndex(r.skin, SKIN.length, d.skin),
    hair: pickIndex(r.hair, hairStyles(sex).length, d.hair),
    hairc: pickIndex(r.hairc, HAIRC.length, d.hairc),
    eyes: pickIndex(r.eyes, EYESC.length, d.eyes),
    face: pickIndex(r.face, FACE.length, d.face),
    glasses: r.glasses === true,
    beard: r.beard === true,
    beardStyle: pickIndex(r.beardStyle, BEARDS.length, 0),
    cap: r.cap === true,
  };
}

/* ------------------------------- эмоции ----------------------------------- */

export type Emotion = "happy" | "calm" | "tired" | "sad" | "hungry" | "sick";

export interface Vitals {
  hunger: number;
  health: number;
  mood: number;
}

export const EMOTION_LABEL: Record<Emotion, string> = {
  happy: "бодр и доволен",
  calm: "в норме",
  tired: "устал",
  sad: "грустит",
  hungry: "голоден",
  sick: "болеет",
};

/** Состояние персонажа по сытости, здоровью и настроению (0..100). */
export function emotionOf(v: Vitals | undefined | null): Emotion {
  if (!v) return "calm";
  const { hunger, health, mood } = v;
  if (health < 30) return "sick";
  if (hunger < 20) return "hungry";
  if (mood < 25) return "sad";
  if (health < 55 || hunger < 35 || mood < 40) return "tired";
  if (mood >= 75 && hunger >= 40 && health >= 60) return "happy";
  return "calm";
}

/* ------------------------------- цвет ------------------------------------- */

/** Смешивание с чёрным (k>0) или белым (k<0). */
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
  none: "#8FA0B8",
  tshirt: "#3B8FE0",
  hoodie: "#5A6B80",
  shirt: "#F0EDE4",
  suit: "#31415C",
  tech: "#22A98C",
  bomber: "#4E6A5A",
  turtleneck: "#48505C",
  cardigan: "#9C7B5B",
};
export const outfitColor = (top: string | undefined): string => OUTFIT[top ?? ""] ?? OUTFIT.tshirt;

const SHOE_COLOR: Record<string, string> = {
  sneakers_old: "#8D8577",
  sneakers: "#F0EDE4",
  boots: "#6A4A2A",
  loafers: "#3A2C1E",
  chelsea: "#5A3B22",
};
export const shoeColor = (shoes: string | undefined): string =>
  SHOE_COLOR[shoes ?? ""] ?? SHOE_COLOR.sneakers_old;

/* ------------------------------- геометрия -------------------------------- */

const S = 240;
const CX = 120;
const HCY = 100;
const HRX = 46;
const HRY = 52;
const CHIN = HCY + HRY;
const EY = 102;
const EXL = CX - 17;
const EXR = CX + 17;

/** Полуширина эллипса головы (с запасом `grow`) на высоте y. */
const halfW = (y: number, grow = 0): number => {
  const ry = HRY + grow;
  const t = Math.max(0, 1 - ((y - HCY) / ry) ** 2);
  return Math.round((HRX + grow) * Math.sqrt(t) * 10) / 10;
};

/** Шапка волос по черепу: внешняя дуга чуть больше головы, внутри — линия роста. */
function crown(temple: number, hairline: number, grow = 4): string {
  const x = halfW(temple, grow);
  return (
    `M${CX - x} ${temple}A${HRX + grow} ${HRY + grow} 0 0 1 ${CX + x} ${temple}` +
    `Q${CX + x - 6} ${hairline + 2} ${CX + 14} ${hairline - 1}` +
    `Q${CX - 8} ${hairline - 10} ${CX - 22} ${hairline + 8}` +
    `Q${CX - x + 2} ${hairline + 4} ${CX - x} ${temple}z`
  );
}

/** Масса длинных волос за головой. */
function mane(temple: number, bottom: number, spread: number): string {
  const x = halfW(temple, 4);
  return (
    `M${CX - x} ${temple}A${HRX + 4} ${HRY + 4} 0 0 1 ${CX + x} ${temple}` +
    `C${CX + x + 10} ${temple + 20} ${CX + spread} ${HCY + 30} ${CX + spread} ${bottom - 24}` +
    `Q${CX + spread} ${bottom} ${CX + spread - 14} ${bottom}L${CX - spread + 14} ${bottom}` +
    `Q${CX - spread} ${bottom} ${CX - spread} ${bottom - 24}` +
    `C${CX - spread} ${HCY + 30} ${CX - x - 10} ${temple + 20} ${CX - x} ${temple}z`
  );
}

/** Передние пряди вдоль лица, лежащие на плечах. */
const locks = (bottom: number): string =>
  `<path d="M${CX - 46} ${HCY - 6}C${CX - 56} ${HCY + 20} ${CX - 58} ${bottom - 20} ${CX - 52} ${bottom}Q${CX - 40} ${bottom + 4} ${CX - 36} ${bottom - 6}C${CX - 40} ${HCY + 40} ${CX - 40} ${HCY + 10} ${CX - 40} ${HCY - 14}z"/>` +
  `<path d="M${CX + 46} ${HCY - 6}C${CX + 56} ${HCY + 20} ${CX + 58} ${bottom - 20} ${CX + 52} ${bottom}Q${CX + 40} ${bottom + 4} ${CX + 36} ${bottom - 6}C${CX + 40} ${HCY + 40} ${CX + 40} ${HCY + 10} ${CX + 40} ${HCY - 14}z"/>`;

interface Hair {
  back?: string;
  front: string;
}

function hairOf(sex: Sex, style: number): Hair {
  const name = hairStyles(sex)[style] ?? hairStyles(sex)[0];
  if (sex === "f" && name === "длинные") {
    return { back: `<path d="${mane(94, 226, 60)}"/>`, front: `<path d="${crown(94, 76)}"/>${locks(214)}` };
  }
  switch (name) {
    case "ёжик":
      return { front: `<path d="${crown(86, 64, 3)}"/>` };
    case "длинные":
      return { back: `<path d="${mane(94, 226, 58)}"/>`, front: `<path d="${crown(94, 74)}"/>${locks(210)}` };
    case "каре":
      return { back: `<path d="${mane(96, 158, 56)}"/>`, front: `<path d="${crown(96, 76)}"/>` };
    case "хвост":
      return {
        back:
          `<path d="M${CX + 44} ${HCY - 26}C${CX + 78} ${HCY - 16} ${CX + 84} ${HCY + 40} ${CX + 70} ${HCY + 76}` +
          `C${CX + 66} ${HCY + 88} ${CX + 52} ${HCY + 86} ${CX + 54} ${HCY + 72}C${CX + 60} ${HCY + 44} ${CX + 58} ${HCY + 10} ${CX + 40} ${HCY - 10}z"/>`,
        front: `<path d="${crown(92, 72)}"/><circle cx="${CX + 46}" cy="${HCY - 20}" r="6" fill="#E8EEF7" opacity=".9"/>`,
      };
    default:
      return { front: `<path d="${crown(92, 70)}"/>` };
  }
}

/** Оставлено для совместимости: контур шапки причёски. */
export function hairPath(sex: Sex, style: number): string {
  return `<g>${hairOf(sex, style).front}</g>`;
}

/** Борода по линии челюсти. */
function beardPath(top: number, dip: number, extra: number): string {
  const x = halfW(top, 1);
  return (
    `M${CX - x} ${top}A${HRX + 1} ${HRY + 1} 0 0 0 ${CX + x} ${top}` +
    `Q${CX + x - 4} ${top + dip} ${CX + 20} ${top + dip - 2}Q${CX} ${top + dip - 8} ${CX - 20} ${top + dip - 2}` +
    `Q${CX - x + 4} ${top + dip} ${CX - x} ${top}z` +
    (extra ? `M${CX - 24} ${CHIN - 2}Q${CX} ${CHIN + extra} ${CX + 24} ${CHIN - 2}z` : "")
  );
}
const BEARD_PATHS = [beardPath(124, 22, 0), beardPath(116, 24, 4), beardPath(108, 26, 12)];

/* --------------------------------- сборка --------------------------------- */

export interface AvatarOptions {
  /** сторона квадрата в пикселях */
  size?: number;
  top?: string;
  shoes?: string;
  accessory?: string | null;
  bg?: string;
  /** показатели жизни — по ним выбирается эмоция */
  vitals?: Vitals | null;
  /** принудительная эмоция (перекрывает vitals) */
  emotion?: Emotion;
  /** префикс идентификаторов (по умолчанию уникальный счётчик) */
  uid?: string;
}

let seq = 0;

interface Face {
  mouth: "smile" | "grin" | "calm" | "flat" | "frown" | "wavy" | "o";
  lid: number;
  browLift: number;
  browTilt: number;
  bags: boolean;
  blush: boolean;
  pale: boolean;
}

function faceFor(face: number, emotion: Emotion): Face {
  const base: Face = {
    mouth: face === 1 ? "smile" : face === 2 ? "flat" : "calm",
    lid: face === 2 ? 0.12 : 0,
    browLift: 0,
    browTilt: face === 2 ? 1.5 : 0,
    bags: false,
    blush: false,
    pale: false,
  };
  switch (emotion) {
    case "happy":
      return { ...base, mouth: "grin", lid: 0.05, browLift: -2, browTilt: 0, blush: true };
    case "tired":
      return { ...base, mouth: "flat", lid: 0.5, browLift: 1, bags: true };
    case "sad":
      return { ...base, mouth: "frown", lid: 0.25, browLift: 0, browTilt: -4 };
    case "hungry":
      return { ...base, mouth: "o", lid: 0.2, browLift: -1, browTilt: -4, bags: true };
    case "sick":
      return { ...base, mouth: "wavy", lid: 0.45, browLift: 0, browTilt: -3, bags: true, pale: true };
    default:
      return base;
  }
}

export function avatarSVG(a: Appearance, o: AvatarOptions = {}): string {
  const s = o.size ?? 200;
  const p = o.uid ?? `av${++seq}`;
  const emotion = o.emotion ?? emotionOf(o.vitals);
  const F = faceFor(pickIndex(a.face, FACE.length, 1), emotion);

  const sk = SKIN[a.skin] ?? SKIN[1];
  const skHi = shade(sk, -0.2);
  const skLo = shade(sk, 0.16);
  const skDeep = shade(sk, 0.3);
  const hc = HAIRC[a.hairc] ?? HAIRC[0];
  const hcHi = shade(hc, -0.28);
  const hcLo = shade(hc, 0.3);
  const ec = EYESC[a.eyes] ?? EYESC[0];
  const top = o.top && OUTFIT[o.top] ? o.top : "tshirt";
  const oc = outfitColor(top);
  const ocHi = shade(oc, -0.14);
  const ocLo = shade(oc, 0.2);
  const bg = o.bg ?? "#CFE6FF";
  const sex: Sex = a.sex === "f" ? "f" : "m";

  const defs =
    `<defs>` +
    `<clipPath id="${p}clip"><circle cx="${CX}" cy="${CX}" r="${S / 2}"/></clipPath>` +
    `<radialGradient id="${p}bg" cx="50%" cy="28%" r="80%"><stop offset="0" stop-color="${shade(bg, -0.55)}"/><stop offset="1" stop-color="${bg}"/></radialGradient>` +
    `<radialGradient id="${p}sk" cx="40%" cy="32%" r="78%"><stop offset="0" stop-color="${skHi}"/><stop offset=".55" stop-color="${sk}"/><stop offset="1" stop-color="${skLo}"/></radialGradient>` +
    `<linearGradient id="${p}nk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${skDeep}" stop-opacity=".75"/><stop offset="1" stop-color="${skDeep}" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="${p}hr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hcHi}"/><stop offset=".5" stop-color="${hc}"/><stop offset="1" stop-color="${hcLo}"/></linearGradient>` +
    `<linearGradient id="${p}cl" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="${ocHi}"/><stop offset=".55" stop-color="${oc}"/><stop offset="1" stop-color="${ocLo}"/></linearGradient>` +
    `<radialGradient id="${p}ir" cx="50%" cy="38%" r="65%"><stop offset="0" stop-color="${shade(ec, -0.35)}"/><stop offset="1" stop-color="${shade(ec, 0.25)}"/></radialGradient>` +
    `<radialGradient id="${p}sh" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#0b2540" stop-opacity=".38"/><stop offset="1" stop-color="#0b2540" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="${p}hl" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="${p}bl" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ff6b7a" stop-opacity=".38"/><stop offset="1" stop-color="#ff6b7a" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="${p}rim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".4"/></linearGradient>` +
    `</defs>`;

  const hair = hairOf(sex, a.hair);
  const hf = `url(#${p}hr)`;

  /* ---- одежда ---- */
  const scoop = `M14 240C14 204 48 186 90 181Q100 181 102 184Q120 204 138 184Q140 181 150 181C192 186 226 204 226 240z`;
  const folds =
    `<path d="M52 204Q82 186 102 188" stroke="#fff" stroke-opacity=".35" stroke-width="5" fill="none" stroke-linecap="round"/>` +
    `<path d="M58 222q10 10 6 20M182 222q-10 10-6 20M120 214v26" stroke="#000" stroke-opacity=".1" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  const rib = (c: string): string =>
    `<path d="M90 181Q100 181 102 184Q120 204 138 184Q140 181 150 181" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round"/>`;
  let pre = "";
  let clothes = `<path d="${scoop}" fill="url(#${p}cl)"/>` + folds;
  switch (top) {
    case "hoodie":
      pre = `<path d="M74 196C70 160 92 148 120 148S170 160 166 196z" fill="${shade(oc, 0.25)}"/>`;
      clothes +=
        rib(shade(oc, 0.3)) +
        `<path d="M104 190v34M136 190v34" stroke="#E8EEF7" stroke-width="2.4" stroke-linecap="round"/>` +
        `<circle cx="104" cy="226" r="2.6" fill="#E8EEF7"/><circle cx="136" cy="226" r="2.6" fill="#E8EEF7"/>`;
      break;
    case "shirt":
      clothes =
        `<path d="${scoop}" fill="url(#${p}cl)"/>` +
        folds +
        `<path d="M102 183L120 214L106 222L90 190z" fill="#fff" stroke="#c9c5b8" stroke-width="1"/>` +
        `<path d="M138 183L120 214L134 222L150 190z" fill="#f6f4ee" stroke="#c9c5b8" stroke-width="1"/>` +
        `<path d="M120 214V240" stroke="#c9c5b8" stroke-width="1.6"/>` +
        `<circle cx="120" cy="226" r="2" fill="#b9b4a4"/>`;
      break;
    case "suit":
      clothes +=
        `<path d="M102 183L120 232L132 240H108L88 205z" fill="#fff"/>` +
        `<path d="M104 183L120 224L136 183L120 196z" fill="#f4f6fa"/>` +
        `<path d="M117 198h6l3 30-6 8-6-8z" fill="#3ba0ff"/>` +
        `<path d="M92 186L116 240H78L66 214z" fill="${shade(oc, 0.22)}"/>` +
        `<path d="M148 186L124 240H162L174 214z" fill="${shade(oc, 0.12)}"/>`;
      break;
    case "bomber":
      clothes +=
        rib(shade(oc, 0.35)) +
        `<path d="M120 204V240" stroke="#c9d3da" stroke-width="2.4"/>` +
        `<path d="M24 224Q34 214 48 216" stroke="${shade(oc, 0.3)}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
      break;
    case "turtleneck":
      pre = "";
      clothes +=
        `<path d="M98 150h44v36Q120 196 98 186z" fill="url(#${p}cl)"/>` +
        `<path d="M98 160h44M98 170h44M98 180h44" stroke="#000" stroke-opacity=".12" stroke-width="1.6"/>`;
      break;
    case "cardigan":
      clothes +=
        `<path d="M104 183Q120 206 136 183L130 240H110z" fill="#F0EDE4"/>` +
        `<path d="M104 184L112 240M136 184L128 240" stroke="${shade(oc, 0.3)}" stroke-width="4" stroke-linecap="round"/>` +
        `<circle cx="120" cy="214" r="2.2" fill="${shade(oc, 0.4)}"/><circle cx="120" cy="228" r="2.2" fill="${shade(oc, 0.4)}"/>`;
      break;
    case "tech":
      clothes += rib(shade(oc, 0.25)) + `<circle cx="160" cy="214" r="5" fill="#fff" fill-opacity=".85"/>`;
      break;
    default:
      clothes += rib(shade(oc, 0.25));
  }

  /* ---- голова ---- */
  const ears =
    `<ellipse cx="${CX - HRX + 1}" cy="${EY + 6}" rx="6.5" ry="10" fill="url(#${p}sk)"/>` +
    `<ellipse cx="${CX + HRX - 1}" cy="${EY + 6}" rx="6.5" ry="10" fill="url(#${p}sk)"/>` +
    `<path d="M${CX - HRX + 1} ${EY + 1}q-2.5 5 0 10M${CX + HRX - 1} ${EY + 1}q2.5 5 0 10" stroke="${skLo}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  const head =
    `<ellipse cx="${CX}" cy="${HCY}" rx="${HRX}" ry="${HRY}" fill="url(#${p}sk)"/>` +
    `<ellipse cx="${CX - 22}" cy="${HCY - 20}" rx="14" ry="10" fill="url(#${p}hl)" opacity=".7"/>` +
    (F.pale ? `<ellipse cx="${CX}" cy="${HCY}" rx="${HRX}" ry="${HRY}" fill="#cfe8d8" opacity=".32"/>` : "");

  const lidFill = shade(sk, 0.03);
  const eye = (x: number): string => {
    const topY = EY - 8 + F.lid * 9;
    return (
      `<ellipse cx="${x}" cy="${EY}" rx="9.6" ry="8" fill="#fff"/>` +
      `<circle cx="${x + 0.6}" cy="${EY + 0.6}" r="5.6" fill="url(#${p}ir)"/>` +
      `<circle cx="${x + 0.6}" cy="${EY + 0.6}" r="2.8" fill="#14101a"/>` +
      `<circle cx="${x - 1.6}" cy="${EY - 1.8}" r="1.7" fill="#fff"/>` +
      (F.lid > 0
        ? `<path d="M${x - 11} ${EY - 10}H${x + 11}V${topY}Q${x} ${topY + 3.5} ${x - 11} ${topY}z" fill="${lidFill}"/>`
        : "") +
      `<path d="M${x - 10.6} ${topY + 3}Q${x} ${topY - 4.5} ${x + 10.6} ${topY + 3}" stroke="#2a1d1a" stroke-width="2.3" fill="none" stroke-linecap="round"/>`
    );
  };
  const bags = F.bags
    ? `<path d="M${EXL - 8} ${EY + 10}q8 5 16 0M${EXR - 8} ${EY + 10}q8 5 16 0" stroke="${skDeep}" stroke-opacity=".55" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
    : "";
  const blush = F.blush
    ? `<ellipse cx="${EXL - 6}" cy="${EY + 18}" rx="9" ry="6" fill="url(#${p}bl)"/><ellipse cx="${EXR + 6}" cy="${EY + 18}" rx="9" ry="6" fill="url(#${p}bl)"/>`
    : "";

  const by = EY - 15 + F.browLift;
  const brow = (x: number, dir: 1 | -1): string => {
    const inner = by + F.browTilt * 0.6;
    const outer = by - F.browTilt * 0.4;
    const xi = x + dir * 9;
    const xo = x - dir * 10;
    return `<path d="M${xi} ${inner}Q${x} ${by - 4} ${xo} ${outer + 1.5}" stroke="${shade(hc, 0.25)}" stroke-width="4.2" fill="none" stroke-linecap="round"/>`;
  };

  const nose =
    `<path d="M${CX + 1} ${EY + 4}q4 13 -2 17q-5 2 -9 -1" stroke="${skDeep}" stroke-opacity=".5" stroke-width="2.2" fill="none" stroke-linecap="round"/>` +
    `<ellipse cx="${CX - 2}" cy="${EY + 16}" rx="4.6" ry="3" fill="url(#${p}hl)"/>`;

  const my = 136;
  const lip = "#B5584F";
  const mouths: Record<Face["mouth"], string> = {
    smile: `<path d="M${CX - 13} ${my - 1}q13 13 26 0" stroke="${lip}" stroke-width="3.6" fill="none" stroke-linecap="round"/>`,
    grin:
      `<path d="M${CX - 15} ${my - 2}q15 5 30 0q-2 14 -15 14q-13 0 -15 -14z" fill="#7a2b32"/>` +
      `<path d="M${CX - 13} ${my - 1}q13 4 26 0q-1 4 -13 4q-12 0 -13 -4z" fill="#fff"/>`,
    calm: `<path d="M${CX - 11} ${my}q11 6 22 0" stroke="${lip}" stroke-width="3.6" fill="none" stroke-linecap="round"/>`,
    flat: `<path d="M${CX - 10} ${my + 2}h20" stroke="${lip}" stroke-width="3.6" stroke-linecap="round"/>`,
    frown: `<path d="M${CX - 11} ${my + 5}q11 -8 22 0" stroke="${lip}" stroke-width="3.6" fill="none" stroke-linecap="round"/>`,
    wavy: `<path d="M${CX - 12} ${my + 3}q4 -5 8 0t8 0t8 0" stroke="${lip}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`,
    o: `<ellipse cx="${CX}" cy="${my + 3}" rx="4.4" ry="5" fill="#7a2b32"/>`,
  };

  const beard =
    a.beard && sex === "m"
      ? `<g fill="${hf}" opacity="${a.beardStyle === 0 ? 0.4 : 1}"><path d="${BEARD_PATHS[pickIndex(a.beardStyle, 3, 1)]}" fill-rule="evenodd"/></g>` +
        (a.beardStyle === 0
          ? ""
          : `<path d="M${CX - 16} ${my - 7}q16 -5 32 0q-6 5 -16 3q-10 2 -16 -3z" fill="${hf}"/>`)
      : "";

  const glasses = a.glasses
    ? `<g fill="#9fd0ff" fill-opacity=".18" stroke="#2A3342" stroke-width="3.2">` +
      `<rect x="${EXL - 14}" y="${EY - 12}" width="28" height="24" rx="10"/>` +
      `<rect x="${EXR - 14}" y="${EY - 12}" width="28" height="24" rx="10"/>` +
      `<path d="M${EXL + 14} ${EY - 3}q3 -3 6 0M${EXL - 14} ${EY - 4}l-9 -2M${EXR + 14} ${EY - 4}l9 -2" fill="none"/></g>` +
      `<path d="M${EXL - 9} ${EY - 7}l7 -2M${EXR - 9} ${EY - 7}l7 -2" stroke="#fff" stroke-opacity=".7" stroke-width="2" stroke-linecap="round"/>`
    : "";

  const cap = a.cap
    ? `<path d="M${CX - 50} ${HCY - 10}C${CX - 50} ${HCY - 52} ${CX - 24} ${HCY - 62} ${CX} ${HCY - 62}S${CX + 50} ${HCY - 52} ${CX + 50} ${HCY - 10}Q${CX} ${HCY - 18} ${CX - 50} ${HCY - 10}z" fill="#2E8B7A"/>` +
      `<path d="M${CX - 50} ${HCY - 10}C${CX - 50} ${HCY - 52} ${CX - 24} ${HCY - 62} ${CX - 4} ${HCY - 62}C${CX - 28} ${HCY - 48} ${CX - 36} ${HCY - 30} ${CX - 36} ${HCY - 14}z" fill="#3FB39A" opacity=".85"/>` +
      `<path d="M${CX - 54} ${HCY - 10}Q${CX} ${HCY - 24} ${CX + 54} ${HCY - 10}Q${CX + 56} ${HCY - 2} ${CX + 44} ${HCY - 2}Q${CX} ${HCY - 14} ${CX - 44} ${HCY - 2}Q${CX - 56} ${HCY - 2} ${CX - 54} ${HCY - 10}z" fill="#24705F"/>` +
      `<circle cx="${CX}" cy="${HCY - 61}" r="3.4" fill="#24705F"/>`
    : "";

  /* ---- аксессуары ---- */
  const accessory = accessoryOverlay(o.accessory, sk, skLo, p);

  const rim =
    `<path d="M${CX + 44} ${HCY - 12}A${HRX} ${HRY} 0 0 1 ${CX + 30} ${HCY + 40}" stroke="url(#${p}rim)" stroke-width="2" fill="none" stroke-linecap="round"/>` +
    `<path d="M170 196Q196 206 214 226" stroke="url(#${p}rim)" stroke-width="3" fill="none" stroke-linecap="round"/>`;

  return (
    `<svg class="av-svg" viewBox="0 0 ${S} ${S}" width="${s}" height="${s}" role="img" ` +
    `aria-label="портрет персонажа: ${EMOTION_LABEL[emotion]}" data-emotion="${emotion}">` +
    defs +
    `<g clip-path="url(#${p}clip)">` +
    `<rect width="${S}" height="${S}" fill="url(#${p}bg)"/>` +
    `<ellipse cx="${CX}" cy="${S - 6}" rx="96" ry="22" fill="url(#${p}sh)"/>` +
    pre +
    (hair.back ? `<g fill="${hf}">${hair.back}</g>` : "") +
    `<path d="M${CX - 17} ${CHIN - 14}h34v50q-17 16 -34 0z" fill="url(#${p}sk)"/>` +
    `<rect x="${CX - 17}" y="${CHIN - 6}" width="34" height="34" fill="url(#${p}nk)"/>` +
    clothes +
    `<ellipse cx="${CX}" cy="${CHIN + 8}" rx="24" ry="10" fill="url(#${p}sh)"/>` +
    ears +
    head +
    bags +
    blush +
    brow(EXL, 1) +
    brow(EXR, -1) +
    eye(EXL) +
    eye(EXR) +
    nose +
    mouths[F.mouth] +
    beard +
    `<g fill="${hf}">${hair.front}</g>` +
    `<path d="M${CX - 30} ${HCY - 40}q18 -14 40 -10" stroke="#fff" stroke-opacity=".28" stroke-width="5" fill="none" stroke-linecap="round" ${a.cap ? 'display="none"' : ""}/>` +
    glasses +
    cap +
    accessory +
    rim +
    `</g></svg>`
  );
}

/**
 * Аксессуар поверх бюста. Часы и кольцо — на кистях, лежащих у нижнего края;
 * цепочка — по вырезу; вкладыши — в ушах; рюкзак и сумка — лямки на плечах.
 */
function accessoryOverlay(id: string | null | undefined, sk: string, skLo: string, p: string): string {
  const hand = (x: number): string =>
    `<ellipse cx="${x}" cy="222" rx="15" ry="13" fill="url(#${p}sk)"/>` +
    `<path d="M${x - 8} 214q8 -3 16 0" stroke="${skLo}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  switch (id) {
    case "watch":
      return (
        hand(62) +
        `<rect x="40" y="206" width="44" height="12" rx="5" fill="#2A3342"/>` +
        `<circle cx="62" cy="212" r="8.5" fill="#d6dbe6"/><circle cx="62" cy="212" r="6.2" fill="#1B2230"/>` +
        `<path d="M62 212v-4M62 212l3 2" stroke="#E4E8F0" stroke-width="1.4" stroke-linecap="round"/>` +
        `<path d="M55 206q6 -3 12 0" stroke="#fff" stroke-opacity=".5" stroke-width="1.6" fill="none"/>`
      );
    case "ring":
      return (
        hand(178) +
        `<circle cx="184" cy="226" r="4.6" fill="none" stroke="#E0B455" stroke-width="2.6"/>` +
        `<circle cx="184" cy="221" r="2.6" fill="#F7E3A0"/>`
      );
    case "necklace":
      return (
        `<path d="M98 188Q120 232 142 188" fill="none" stroke="#E0B455" stroke-width="2.4" stroke-linecap="round"/>` +
        `<path d="M120 216l6 8-6 8-6-8z" fill="#F0CB72" stroke="#B88A2E" stroke-width="1"/>`
      );
    case "earbuds":
      return (
        `<circle cx="${CX - HRX + 2}" cy="${EY + 8}" r="5.4" fill="#F2F0EA"/><circle cx="${CX + HRX - 2}" cy="${EY + 8}" r="5.4" fill="#F2F0EA"/>` +
        `<circle cx="${CX - HRX + 2}" cy="${EY + 8}" r="2.2" fill="#8FA3B8"/><circle cx="${CX + HRX - 2}" cy="${EY + 8}" r="2.2" fill="#8FA3B8"/>` +
        `<path d="M${CX - HRX + 1} ${EY + 12}v14M${CX + HRX - 1} ${EY + 12}v14" stroke="#F2F0EA" stroke-width="3" stroke-linecap="round"/>`
      );
    case "headphones_neck":
      return (
        `<path d="M92 160Q82 196 102 214M148 160Q158 196 138 214" fill="none" stroke="#2A3342" stroke-width="7" stroke-linecap="round"/>` +
        `<rect x="84" y="200" width="22" height="30" rx="10" fill="#3A4557"/><rect x="134" y="200" width="22" height="30" rx="10" fill="#3A4557"/>` +
        `<rect x="89" y="206" width="12" height="18" rx="6" fill="#C8CDD8"/><rect x="139" y="206" width="12" height="18" rx="6" fill="#C8CDD8"/>`
      );
    case "backpack":
      return (
        `<path d="M70 182Q74 214 70 240M170 182Q166 214 170 240" fill="none" stroke="#2E8B7A" stroke-width="13" stroke-linecap="round"/>` +
        `<path d="M70 190Q73 216 70 236M170 190Q167 216 170 236" fill="none" stroke="#3FB39A" stroke-opacity=".7" stroke-width="3" stroke-linecap="round"/>` +
        `<rect x="56" y="214" width="12" height="7" rx="3" fill="#24705F"/><rect x="172" y="214" width="12" height="7" rx="3" fill="#24705F"/>`
      );
    case "tote_bag":
      return (
        `<path d="M168 180Q186 206 198 240" fill="none" stroke="#8E6B33" stroke-width="7" stroke-linecap="round"/>` +
        `<path d="M176 214h46v32h-46z" fill="#D9B36B"/><path d="M200 214h22v32h-22z" fill="#c29b52"/>` +
        `<rect x="184" y="224" width="14" height="10" rx="3" fill="#2E8B7A"/>`
      );
    case "sunglasses":
      return (
        `<g><rect x="${EXL - 15}" y="${EY - 10}" width="30" height="22" rx="10" fill="#1A1F29"/>` +
        `<rect x="${EXR - 15}" y="${EY - 10}" width="30" height="22" rx="10" fill="#1A1F29"/>` +
        `<rect x="${CX - 4}" y="${EY - 4}" width="8" height="4" fill="#1A1F29"/>` +
        `<path d="M${EXL - 15} ${EY - 4}l-9 -3M${EXR + 15} ${EY - 4}l9 -3" stroke="#1A1F29" stroke-width="3.4" stroke-linecap="round"/>` +
        `<path d="M${EXL - 10} ${EY - 5}l8 -2M${EXR - 10} ${EY - 5}l8 -2" stroke="#fff" stroke-opacity=".45" stroke-width="2.2" stroke-linecap="round"/></g>`
      );
    default:
      void sk;
      return "";
  }
}
