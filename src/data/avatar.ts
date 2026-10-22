/**
 * Персонаж — полуфигура (по пояс) в тёплой «рисованной» стилистике в духе
 * Open Peeps: уверенный тёмный контур с круглыми окончаниями, плоские заливки,
 * чуть неровные органичные кривые. Взрослый, деловой образ без «детских»
 * пропорций и без градиентов.
 *
 * Рисунок собирается из слоёв, каждый — отдельная функция: фон, волосы за
 * головой, торс с одеждой, шея, голова, лицо (глаза/брови/рот по состоянию),
 * борода, волосы спереди, очки, головной убор, аксессуары магазина.
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

const clampIx = (v: unknown, len: number, dflt: number): number => {
  const n = typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : dflt;
  return n >= 0 && n < len ? n : dflt;
};

/**
 * Приводит сохранение любого возраста к допустимому виду: недостающие поля
 * берутся по умолчанию, индексы за границами палитр заменяются значениями по
 * умолчанию. Не бросает исключений на `null`, строках и мусоре из облака.
 */
export function normalizeAppearance(raw: unknown): Appearance {
  const d = defaultAppearance();
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const sex: Sex = r.sex === "f" ? "f" : "m";
  return {
    sex,
    name: typeof r.name === "string" ? r.name.slice(0, 24) : d.name,
    skin: clampIx(r.skin, SKIN.length, d.skin),
    hair: clampIx(r.hair, 3, d.hair),
    hairc: clampIx(r.hairc, HAIRC.length, d.hairc),
    eyes: clampIx(r.eyes, EYESC.length, d.eyes),
    face: clampIx(r.face, FACE.length, d.face),
    glasses: r.glasses === true,
    beard: r.beard === true,
    beardStyle: clampIx(r.beardStyle, BEARDS.length, 1),
    cap: r.cap === true,
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

const OUTFIT: Record<string, string> = {
  none: "#8FA0B8",
  tshirt: "#3B8FD9",
  hoodie: "#5F7088",
  shirt: "#F3F0E8",
  suit: "#34455F",
  tech: "#22A98C",
  bomber: "#4C5D4A",
  turtleneck: "#7A5C48",
  cardigan: "#9A7B5B",
};
export const outfitColor = (top: string | undefined): string => OUTFIT[top ?? ""] ?? "#3B8FD9";

const SHOE_COLOR: Record<string, string> = {
  sneakers_old: "#8D8577",
  sneakers: "#F0EDE4",
  boots: "#6A4A2A",
  loafers: "#3A2C1E",
  chelsea: "#5A3B26",
};
export const shoeColor = (shoes: string | undefined): string =>
  SHOE_COLOR[shoes ?? ""] ?? SHOE_COLOR.sneakers_old;

/* ------------------------------ холст и контур ----------------------------- */

const W = 200;
const H = 252;
/** Цвет контура и его толщина: единые для всей фигуры. */
const INK = "#1f2a37";
const SW = 2.7;

/** Зеркальная копия слоя относительно вертикальной оси. */
const mirror = (inner: string): string => `<g transform="translate(200 0) scale(-1 1)">${inner}</g>`;

const path = (d: string, fill: string, extra = ""): string =>
  `<path d="${d}" fill="${fill}"${extra ? " " + extra : ""}/>`;
/** Только линия (без заливки). */
const line = (d: string, extra = ""): string => `<path d="${d}" fill="none"${extra ? " " + extra : ""}/>`;

/* --------------------------------- состояние ------------------------------- */

interface Mood {
  tired: boolean;
  sad: boolean;
  sick: boolean;
  happy: boolean;
}

/** Выводит эмоцию из показателей жизни; без показателей — нейтральное лицо. */
function moodOf(o: AvatarOptions): Mood {
  const h = o.hunger;
  const hp = o.health;
  const m = o.mood;
  const sick = hp !== undefined && hp < 40;
  const tired = sick || (h !== undefined && h < 25) || (hp !== undefined && hp < 60);
  const sad = m !== undefined && m < 30;
  const happy = m !== undefined && m >= 75 && !tired && !sad;
  return { tired, sad, sick, happy };
}

/* ------------------------------ волосы и борода ---------------------------- */

interface Hair {
  /** масса за головой и плечами */
  back?: string;
  /** шапка волос на голове */
  front: string;
  /** пряди, падающие перед плечами */
  locks?: string;
}

const HAIR: Record<string, Hair> = {
  короткие: {
    front: `<path d="M59 98C54 68 70 46 100 45C130 44 147 66 141 98C139 86 136 78 130 74C116 80 96 76 84 66C78 74 68 76 64 86C61 90 60 94 59 98z"/>`,
  },
  ёжик: {
    front:
      `<path d="M60 94C56 66 74 48 100 48C126 48 144 66 140 94C137 84 134 74 128 70C116 66 84 66 72 70C66 74 63 84 60 94z"/>` +
      `<path d="M78 58l-2-6M92 54l-1-7M108 54l1-7M122 58l2-6M70 66l-5-4M130 66l5-4" fill="none"/>`,
  },
  длинные: {
    back: `<path d="M56 90C47 120 48 160 54 182C74 190 126 190 146 182C152 160 153 120 144 90z"/>`,
    front: `<path d="M59 98C54 66 72 46 100 45C128 46 146 66 141 98C140 84 134 74 124 70C112 70 104 62 100 58C96 62 88 70 76 70C66 74 61 84 59 98z"/>`,
    locks: `<path d="M59 98C54 126 56 156 60 176C68 178 72 170 70 160C66 140 66 116 64 100z"/>`,
  },
  каре: {
    back: `<path d="M55 92C45 112 47 140 57 154C72 162 84 152 100 152C116 152 128 162 143 154C153 140 155 112 145 92z"/>`,
    front:
      `<path d="M58 98C52 66 72 44 100 44C128 44 148 66 142 98C140 88 136 80 132 76C118 84 96 80 78 66C70 78 62 86 58 98z"/>` +
      `<path d="M58 98C54 120 56 138 62 150C70 148 72 130 69 112C67 104 62 100 58 98z"/>` +
      `<path d="M142 98C146 120 144 138 138 150C130 148 128 130 131 112C133 104 138 100 142 98z"/>`,
  },
  хвост: {
    back:
      `<path d="M134 64C164 62 182 90 173 124C169 140 161 150 155 160C150 148 157 132 155 114C153 96 143 84 132 78z"/>` +
      `<ellipse cx="136" cy="70" rx="6" ry="8" transform="rotate(-20 136 70)"/>`,
    front: `<path d="M59 98C54 68 70 46 100 45C130 44 147 64 141 98C139 86 135 78 128 74C112 82 90 78 74 66C68 76 62 86 59 98z"/>`,
  },
};
const HAIR_F_LONG: Hair = {
  back: `<path d="M54 90C42 122 43 172 50 216L150 216C157 172 158 122 146 90z"/>`,
  front: `<path d="M58 98C52 66 72 44 100 44C128 44 148 66 142 98C140 86 134 76 124 72C112 72 104 62 100 58C96 62 88 72 76 72C66 76 60 86 58 98z"/>`,
  locks:
    `<path d="M58 98C50 130 49 172 55 208C66 210 73 202 72 190C66 160 66 124 63 100z"/>` +
    `<path d="M142 98C150 130 151 172 145 208C134 210 127 202 128 190C134 160 134 124 137 100z"/>`,
};

function hairOf(sex: Sex, style: number): Hair {
  const list = hairStyles(sex);
  const name = list[style] ?? list[0];
  if (sex === "f" && name === "длинные") return HAIR_F_LONG;
  return HAIR[name] ?? HAIR["короткие"];
}

/** Контур шапки причёски — оставлено для совместимости. */
export function hairPath(sex: Sex, style: number): string {
  return `<g>${hairOf(sex, style).front}</g>`;
}

const BEARD_PATHS: string[] = [
  /* щетина — лёгкая тень по челюсти, без контура */
  `<path d="M60 106C61 126 76 146 100 148C124 146 139 126 140 106C136 116 128 120 118 119C110 115 90 115 82 119C72 120 64 116 60 106z" opacity=".34" stroke="none"/>`,
  /* короткая — усы и аккуратная борода по контуру подбородка */
  `<path d="M60 104C60 126 76 148 100 150C124 148 140 126 140 104C137 114 129 120 119 119C111 115 89 115 81 119C71 120 63 114 60 104z"/>`,
  /* окладистая — длинная, с удлинённым подбородком */
  `<path d="M58 100C58 130 74 160 100 168C126 160 142 130 142 100C138 112 130 118 119 118C111 114 89 114 81 118C70 118 62 112 58 100z"/>`,
];

/* ---------------------------------- лицо ----------------------------------- */

function faceLayer(a: Appearance, sk: string, hcDark: string, m: Mood, o: AvatarOptions): string {
  const ec = EYESC[a.eyes];
  const skShade = shade(sk, 0.2);
  const f = a.sex === "f";
  let s = "";

  /* глаза: небольшой белок, радужка нужного цвета, зрачок и блик */
  const eye = (cx: number): string => {
    const base =
      `<ellipse cx="${cx}" cy="101" rx="6.4" ry="${m.tired ? 4.4 : 5.2}" fill="#fff" stroke-width="1.8"/>` +
      `<circle cx="${cx}" cy="101.4" r="3.5" fill="${ec}" stroke="none"/>` +
      `<circle cx="${cx}" cy="101.4" r="1.6" fill="${INK}" stroke="none"/>` +
      `<circle cx="${cx - 1.2}" cy="100" r=".9" fill="#fff" stroke="none"/>`;
    if (!m.tired) return base;
    /* усталость: тяжёлое веко закрывает верхнюю половину глаза */
    return (
      base +
      `<path d="M${cx - 6.6} 100.6Q${cx} 94.4 ${cx + 6.6} 100.6z" fill="${sk}" stroke="none"/>` +
      line(`M${cx - 7} 100.6Q${cx} 97.6 ${cx + 7} 100.6`, `stroke-width="2.2"`) +
      line(
        `M${cx - 6} 108.4Q${cx} 111.4 ${cx + 6} 108.4`,
        `stroke="${skShade}" stroke-width="1.6" opacity=".9"`,
      )
    );
  };
  s += eye(84) + eye(116);

  /* ресницы у женского персонажа */
  if (f) {
    s += line("M77.6 99.6l-2.6-1.6M122.4 99.6l2.6-1.6", `stroke-width="1.8"`);
  }

  /* брови: грусть — внутренние концы вверх, усталость — ниже и ровнее */
  const bw = f ? 2.2 : 3.4;
  const lift = m.sad ? 3 : 0;
  const lowY = m.tired ? 1.5 : 0;
  s +=
    line(
      `M75 ${90 + lowY - (m.sad ? 0 : 1)}Q84 ${85 + lowY - lift} 93 ${90 + lowY - lift}`,
      `stroke="${hcDark}" stroke-width="${bw}"`,
    ) +
    line(
      `M107 ${90 + lowY - lift}Q116 ${85 + lowY - lift} 125 ${90 + lowY - (m.sad ? 0 : 1)}`,
      `stroke="${hcDark}" stroke-width="${bw}"`,
    );

  /* нос */
  s += line("M99.4 106Q95.8 116 100.6 118.4", `stroke-width="2.1"`);

  /* рот: выражение + эмоция */
  const smile = !m.sad && (a.face === 1 || m.happy);
  const lip = f ? "#d9707a" : "none";
  if (m.sad) {
    s += path("M91 133Q100 125.6 109 133", "none", `stroke-width="2.5"`);
  } else if (smile) {
    s += path("M90 126.5Q100 138.5 110 126.5Q100 130 90 126.5z", "#fff", `stroke-width="2.4"`);
    if (f) s += path("M90 126.5Q100 130 110 126.5", "none", `stroke="#d9707a" stroke-width="2"`);
  } else if (a.face === 2) {
    s += f
      ? path("M92 129Q100 126.4 108 129Q100 132.4 92 129z", lip, `stroke-width="2"`)
      : line("M92 129.5H108", `stroke-width="2.6"`);
  } else {
    s += f
      ? path("M92 128.4Q96 126 100 127.4Q104 126 108 128.4Q100 134 92 128.4z", lip, `stroke-width="2"`)
      : line("M92 127.6Q100 132 108 127.6", `stroke-width="2.4"`);
  }

  /* румянец и «свечение» радости */
  if (m.happy) {
    s += `<circle cx="73" cy="115" r="6" fill="#f08a8a" opacity=".38" stroke="none"/><circle cx="127" cy="115" r="6" fill="#f08a8a" opacity=".38" stroke="none"/>`;
  }
  /* бледность и капля пота при плохом самочувствии */
  if (m.sick) {
    s +=
      `<path d="M148 76q-7 11 0 15q7-4 0-15z" fill="#9fdcff" stroke-width="2"/>` +
      `<circle cx="73" cy="115" r="6" fill="#9ec9a8" opacity=".35" stroke="none"/><circle cx="127" cy="115" r="6" fill="#9ec9a8" opacity=".35" stroke="none"/>`;
  }
  void o;
  return s;
}

/* ------------------------------ одежда (торс) ------------------------------ */

const SHORT_SLEEVE = new Set(["tshirt", "tech", "none"]);

interface Torso {
  back: string;
  body: string;
  neckline: string;
  arms: string;
}

function torsoLayer(top: string | undefined, oc: string, sk: string): Torso {
  const id = top ?? "tshirt";
  const ocDark = shade(oc, 0.2);
  const ocLight = shade(oc, -0.3);
  const skShade = shade(sk, 0.14);
  const short = SHORT_SLEEVE.has(id);
  const sleeveEnd = short ? 217 : 239;

  /* торс: плечи и грудь; вырез и детали зависят от вещи */
  const shell = `M26 262V228C26 205 44 194 76 187C86 185 92 191 100 191C108 191 114 185 124 187C156 194 174 205 174 228V262z`;
  let body = path(shell, oc);
  let neckline = "";
  let back = "";

  const scoop = (d: string, fillDepth: string): string => path(fillDepth, sk, `stroke="none"`) + line(d);
  switch (id) {
    case "hoodie":
      back = path("M66 190C62 168 76 156 100 156C124 156 138 168 134 190z", ocDark);
      neckline = scoop("M80 188Q100 208 120 188", "M80 188Q100 208 120 188z");
      body += line("M92 200v22M108 200v22", `stroke-width="2.2"`);
      body += path("M70 262V240Q100 232 130 240V262z", ocDark, `opacity=".55"`);
      break;
    case "shirt":
      neckline = scoop("M82 187L100 208L118 187", "M82 187L100 208L118 187z");
      body +=
        path("M82 186L100 208L90 214L72 192z", "#fff") +
        path("M118 186L100 208L110 214L128 192z", "#fff") +
        line("M100 208V262", `stroke-width="2.2"`) +
        `<circle cx="100" cy="226" r="1.6" fill="${INK}" stroke="none"/><circle cx="100" cy="244" r="1.6" fill="${INK}" stroke="none"/>`;
      break;
    case "suit":
      neckline = scoop("M84 187L100 214L116 187", "M84 187L100 214L116 187z");
      body +=
        path("M84 187L100 214L116 187L112 262H88z", "#f3f0e8") +
        path("M100 202l-5 6 3 10-3 24h10l-3-24 3-10z", "#3ba0ff") +
        path("M78 190L98 232L86 262H62V220z", ocDark) +
        path("M122 190L102 232L114 262H138V220z", ocDark) +
        line("M76 192L94 224M124 192L106 224", `stroke="${ocLight}" stroke-width="1.6" opacity=".6"`);
      break;
    case "turtleneck":
      body += path("M82 168h36c3 0 5 2 5 5v22c0 4-4 6-8 6H85c-4 0-8-2-8-6v-22c0-3 2-5 5-5z", oc);
      body += line("M80 178h40M80 186h40", `stroke="${ocDark}" stroke-width="1.8"`);
      break;
    case "bomber":
      body += path("M80 186C84 196 116 196 120 186L124 204H76z", ocDark);
      body += line("M100 196V262", `stroke-width="2.4"`) + line("M82 238h22M118 238h-12", `stroke-width="2"`);
      break;
    case "cardigan":
      neckline = scoop("M82 187L100 212L118 187", "M82 187L100 212L118 187z");
      body +=
        path("M82 187L100 212L118 187L116 262H84z", "#efe9dc") +
        line("M84 262L100 212M116 262L100 212", `stroke-width="2.4"`) +
        `<circle cx="92" cy="236" r="1.7" fill="${INK}" stroke="none"/><circle cx="92" cy="250" r="1.7" fill="${INK}" stroke="none"/>`;
      break;
    case "tech":
      neckline = scoop("M81 187Q100 207 119 187", "M81 187Q100 207 119 187z");
      body += path("M90 228h20v6H90z", ocLight, `stroke-width="2"`);
      break;
    default:
      neckline = scoop("M81 187Q100 207 119 187", "M81 187Q100 207 119 187z");
  }

  /* рука: рукав (короткий — до локтя, дальше кожа), манжета и кисть */
  const arm = (): string => {
    const forearm = short
      ? path(`M27 ${sleeveEnd - 4}h29V240H27z`, sk, `stroke="none"`) +
        line(`M27 ${sleeveEnd}V240M56 ${sleeveEnd}V240`)
      : "";
    const sleeve = path(`M25 226C25 206 35 194 54 190L62 197C59 212 57 228 57 ${sleeveEnd}H25z`, oc);
    const cuff = short ? "" : line(`M25 ${sleeveEnd - 6}H57`, `stroke="${ocDark}" stroke-width="2"`);
    const hand =
      path("M29 236H55V248C55 254 50 258 42 258C34 258 29 254 29 248z", sk) +
      line("M52 246q-3 6 0 10", `stroke="${skShade}" stroke-width="1.8"`);
    return forearm + hand + sleeve + cuff;
  };
  const arms = arm() + mirror(arm());
  return { back, body, neckline, arms };
}

/* --------------------------------- сборка --------------------------------- */

export interface AvatarOptions {
  /** ширина в пикселях; высота считается по пропорции холста */
  size?: number;
  top?: string;
  shoes?: string;
  accessory?: string | null;
  bg?: string;
  /** показатели жизни 0..100: от них зависит эмоция и состояние лица */
  hunger?: number;
  health?: number;
  mood?: number;
}

export function avatarSVG(raw: Appearance, o: AvatarOptions = {}): string {
  const a = normalizeAppearance(raw);
  const s = o.size ?? 200;
  const h = Math.round((s * H) / W);
  const sk = SKIN[a.skin];
  const skDark = shade(sk, 0.16);
  const hc = HAIRC[a.hairc];
  const hcDark = shade(hc, 0.32);
  const hcLight = shade(hc, -0.28);
  const oc = outfitColor(o.top);
  const bg = o.bg ?? "#eaf5ff";
  const m = moodOf(o);
  const id = `av${s}`;

  const hair = hairOf(a.sex, a.hair);
  const torso = torsoLayer(o.top, oc, sk);
  const acc = accessoryOverlay(o.accessory, sk);

  /* подложка: мягкий круг за головой (тёплый и «светящийся» при хорошем настроении) */
  const halo = m.happy
    ? `<circle cx="100" cy="104" r="84" fill="#ffe7a3" opacity=".55" stroke="none"/>` +
      `<path d="M24 56l3 7 7 3-7 3-3 7-3-7-7-3 7-3zM176 40l2 5 5 2-5 2-2 5-2-5-5-2 5-2zM170 118l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#f6b73c" stroke="none"/>`
    : `<circle cx="100" cy="104" r="84" fill="${shade(bg, 0.06)}" stroke="none"/>`;

  /* голова: форма лица чуть неровная, шея, уши */
  const headD = "M60 96C60 68 78 54 100 54C122 54 140 68 140 96C140 124 124 147 100 149C76 147 60 124 60 96z";
  const ear = `<ellipse cx="59.5" cy="105" rx="6" ry="9"/><path d="M58 101q4 0 3 6" fill="none" stroke-width="1.8" stroke="${skDark}"/>`;
  const neck =
    path("M86 134H114V192C114 198 108 202 100 202C92 202 86 198 86 192z", sk) +
    path("M86 148Q100 164 114 148V134H86z", skDark, `opacity=".5" stroke="none"`);
  const head =
    ear +
    mirror(ear) +
    path(headD, sk) +
    (m.sick ? path(headD, "#a9d3b4", `opacity=".28" stroke="none"`) : "");

  const beard =
    a.beard && a.sex === "m"
      ? `<g fill="${hcDark}">${BEARD_PATHS[a.beardStyle ?? 1] ?? BEARD_PATHS[1]}</g>`
      : "";

  const glasses = a.glasses
    ? `<g fill="#bfe3ff" fill-opacity=".28" stroke="#2A3342" stroke-width="2.7">` +
      `<rect x="70" y="91" width="28" height="22" rx="8"/><rect x="102" y="91" width="28" height="22" rx="8"/>` +
      `<path d="M98 100Q100 97 102 100M70 99L60 97M130 99L140 97" fill="none"/></g>`
    : "";

  const cap = a.cap
    ? `<g stroke-width="2.7">` +
      path("M55 90C53 60 74 42 100 42C126 42 147 60 145 90C120 82 80 82 55 90z", "#2E8B7A") +
      line("M100 42C88 50 84 66 86 84M100 42C112 50 116 66 114 84", `stroke="#24705F" stroke-width="1.8"`) +
      path("M52 90Q100 78 148 90Q150 98 140 97Q100 90 60 97Q50 98 52 90z", "#24705F") +
      `<circle cx="100" cy="42" r="3.4" fill="#24705F" stroke-width="2"/></g>`
    : "";

  /* значок обуви: вид сбоку, чтобы покупка обуви была видна и на полуфигуре */
  const sc = shoeColor(o.shoes);
  const shoe =
    `<g transform="translate(10 10)"><rect width="42" height="30" rx="15" fill="#fff" opacity=".9" stroke="none"/>` +
    path("M9 20V12q0-1 2-1h4q1 3 5 3h6q5 1 7 5v1q0 1-1 1H10q-1 0-1-1z", sc, `stroke-width="2"`) +
    `</g>`;

  const g = `stroke="${INK}" stroke-width="${SW}" stroke-linecap="round" stroke-linejoin="round"`;
  const hairG = (inner: string): string => `<g fill="${hc}" stroke="${INK}">${inner}</g>`;
  const hairShine =
    a.hair === 1 && a.sex === "m"
      ? ""
      : line("M82 55Q96 50 112 52", `stroke="${hcLight}" stroke-width="2" opacity=".75"`);

  return (
    `<svg viewBox="0 0 ${W} ${H}" width="${s}" height="${h}" role="img" aria-label="персонаж: портрет по пояс">` +
    `<defs><clipPath id="c${id}"><rect width="${W}" height="${H}" rx="28"/></clipPath></defs>` +
    `<g clip-path="url(#c${id})">` +
    `<rect width="${W}" height="${H}" fill="${bg}"/>` +
    `<g ${g}>` +
    halo +
    (hair.back ? hairG(hair.back) : "") +
    `<g transform="translate(0 -8)">` +
    acc.back +
    torso.back +
    torso.arms +
    torso.body +
    neck +
    torso.neckline +
    `</g>` +
    head +
    faceLayer(a, sk, hcDark, m, o) +
    beard +
    (hair.locks ? "" : "") +
    hairG(hair.front + hairShine) +
    glasses +
    cap +
    (hair.locks ? hairG(hair.locks + mirror(hair.locks)) : "") +
    `<g transform="translate(0 -8)">${acc.front}</g>` +
    (acc.face ?? "") +
    (s >= 150 ? shoe : "") +
    `</g></g></svg>`
  );
}

/**
 * Аксессуар поверх фигуры. Ориентиры: запястье левой руки — (41, 236), кисть
 * правой — (159, 250), уши — (60|140, 105), вырез — на уровне y=190.
 */
function accessoryOverlay(
  id: string | null | undefined,
  sk: string,
): { back: string; front: string; face?: string } {
  void sk;
  const none = { back: "", front: "", face: "" };
  switch (id) {
    case "watch":
      return {
        back: "",
        front:
          path("M29 228H55V238H29z", "#2A3342", `stroke-width="2.2"`) +
          `<circle cx="42" cy="233" r="8.4" fill="#C8CDD8" stroke-width="2.2"/>` +
          `<circle cx="42" cy="233" r="5.4" fill="#1B2230" stroke="none"/>` +
          line("M42 233v-3M42 233l2.2 1.6", `stroke="#E4E8F0" stroke-width="1.3"`),
      };
    case "ring":
      return {
        back: "",
        front:
          `<rect x="147" y="244" width="11" height="6.5" rx="3" fill="#F0CB72" stroke-width="2"/>` +
          `<circle cx="152.5" cy="247" r="1.6" fill="#fff" stroke="none"/>`,
      };
    case "necklace":
      return {
        back: "",
        front:
          line("M80 189Q100 222 120 189", `stroke="#C8962E" stroke-width="2.6"`) +
          path("M100 212l5.5 7-5.5 8-5.5-8z", "#F0CB72", `stroke-width="2"`),
      };
    case "earbuds":
      return {
        back: "",
        front: "",
        face:
          `<circle cx="59" cy="107" r="5.4" fill="#F2F0EA" stroke-width="2.2"/><circle cx="141" cy="107" r="5.4" fill="#F2F0EA" stroke-width="2.2"/>` +
          line("M57 112q-1 14 2 22M143 112q1 14-2 22", `stroke="#F2F0EA" stroke-width="2.6"`),
      };
    case "headphones_neck":
      return {
        back: line("M70 184C72 164 128 164 130 184", `stroke="#2A3342" stroke-width="7"`),
        front:
          path(
            "M62 178H78a4 4 0 0 1 4 4V206a4 4 0 0 1-4 4H62a4 4 0 0 1-4-4V182a4 4 0 0 1 4-4z",
            "#3A4557",
            `stroke-width="2.4"`,
          ) +
          path(
            "M138 178H122a4 4 0 0 0-4 4V206a4 4 0 0 0 4 4H138a4 4 0 0 0 4-4V182a4 4 0 0 0-4-4z",
            "#3A4557",
            `stroke-width="2.4"`,
          ) +
          `<rect x="62" y="184" width="8" height="16" rx="4" fill="#C8CDD8" stroke="none"/><rect x="130" y="184" width="8" height="16" rx="4" fill="#C8CDD8" stroke="none"/>`,
      };
    case "backpack":
      return {
        back:
          path("M40 196Q22 200 24 226V262H46z", "#24705F") +
          mirror(path("M40 196Q22 200 24 226V262H46z", "#2E8B7A")),
        front:
          line("M74 188Q66 222 68 262", `stroke="#2E8B7A" stroke-width="8"`) +
          line("M126 188Q134 222 132 262", `stroke="#2E8B7A" stroke-width="8"`) +
          line("M74 188Q66 222 68 262", `stroke="#1f2a37" stroke-width="1" opacity=".0"`),
      };
    case "tote_bag":
      return {
        back: "",
        front:
          line("M158 196Q146 214 152 246", `stroke="#8E6B33" stroke-width="3.4"`) +
          path("M146 236H188V262H146z", "#D9B36B") +
          path("M160 236q6-12 12 0", "none", `stroke="#8E6B33" stroke-width="3"`) +
          `<rect x="158" y="244" width="18" height="10" rx="3" fill="#2E8B7A" stroke-width="2"/>`,
      };
    case "sunglasses":
      return {
        back: "",
        front: "",
        face:
          `<g fill="#1A1F29" stroke-width="2.4"><rect x="69" y="90" width="29" height="22" rx="9"/><rect x="102" y="90" width="29" height="22" rx="9"/>` +
          `<path d="M98 98Q100 95 102 98" fill="none"/><path d="M69 97L60 95M131 97L140 95" fill="none"/></g>` +
          line("M74 96l6-2M107 96l6-2", `stroke="#6c7a90" stroke-width="2" opacity=".7"`),
      };
    default:
      return none;
  }
}
