// Генератор src/data/phosphor.ts из пакета Phosphor Icons (duotone).
// Запуск: node tools/gen-phosphor.mjs <каталог assets/duotone> > src/data/phosphor.ts && npx prettier --write src/data/phosphor.ts
// Берём только используемые значки — бандл не раздувается.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const USED = [
  // интерфейс
  "book-open",
  "user",
  "shopping-bag",
  "briefcase",
  "medal",
  "chat-circle-text",
  "certificate",
  "cloud",
  "lightning",
  "question",
  "arrow-counter-clockwise",
  "dots-three",
  "repeat",
  "eye",
  "keyboard",
  "target",
  "brain",
  "check",
  "x",
  "warning",
  "lightbulb",
  "lock",
  "calendar-blank",
  "chalkboard-teacher",
  "map-trifold",
  "bug",
  "trophy",
  "confetti",
  "arrows-clockwise",
  "heart",
  "flag",
  "moon",
  "sun",
  "download-simple",
  "terminal-window",
  "graduation-cap",
  "coins",
  "fire",
  "star",
  "smiley",
  "code",
  "wallet",
  "arrow-right",
  "arrow-up",
  "info",
  "check-circle",
  "x-circle",
  "clock",
  "robot",
  "rocket-launch",
  "circle",
  "dot-outline",
  "magnifying-glass",
  "ranking",
  "fork-knife",
  "thermometer",
  "chart-bar",
  "gear",
  "list",
  "circle-half",
  // магазин
  "bowl-steam",
  "bowl-food",
  "bread",
  "package",
  "wine",
  "shopping-cart-simple",
  "coffee",
  "leaf",
  "hamburger",
  "fish",
  "cooking-pot",
  "t-shirt",
  "hoodie",
  "shirt-folded",
  "coat-hanger",
  "sneaker",
  "sneaker-move",
  "boot",
  "watch",
  "backpack",
  "headphones",
  "sunglasses",
  "tote",
  "diamond",
  "headset",
  "bed",
  "buildings",
  "house-simple",
  "building-apartment",
  "house",
  "house-line",
  "building-office",
  "monitor",
  "laptop",
  "chair",
  "desk",
  "speaker-hifi",
  "campfire",
  "island",
  "globe-hemisphere-east",
  "tent",
  "airplane-tilt",
  "boat",
  "car-profile",
  "potted-plant",
  "fish-simple",
  "image",
  "game-controller",
  "speaker-high",
  "coffee-bean",
  "lamp",
  "rug",
  "books",
  "bicycle",
  "motorcycle",
  "car-simple",
  "car",
  "jeep",
  "car-battery",
];

const dir = process.argv[2];
if (!dir) throw new Error("usage: gen-phosphor.mjs <assets/duotone dir>");

const out = [];
for (const name of [...new Set(USED)].sort()) {
  const svg = readFileSync(join(dir, `${name}-duotone.svg`), "utf8");
  const tone = [];
  const line = [];
  for (const m of svg.matchAll(/<(\w+)\s([^>]*?)\/>/g)) {
    if (m[1] !== "path") throw new Error(`${name}: неподдерживаемый элемент <${m[1]}>`);
    const d = /\sd="([^"]+)"|^d="([^"]+)"/.exec(m[2]);
    const path = d[1] ?? d[2];
    (/opacity="0\.2"/.test(m[2]) ? tone : line).push(path);
  }
  if (!tone.length || !line.length) throw new Error(`${name}: нет tone/line`);
  out.push(
    `  ${JSON.stringify(name)}: { tone: ${JSON.stringify(tone.join(""))}, line: ${JSON.stringify(line.join(""))} },`,
  );
}

process.stdout.write(`/**
 * СГЕНЕРИРОВАНО tools/gen-phosphor.mjs — не править руками.
 * Phosphor Icons (duotone), https://phosphoricons.com
 * MIT License, Copyright (c) 2020-present Phosphor Icons.
 * viewBox 0 0 256 256: tone — фоновая заливка (opacity 0.2 в оригинале), line — контур.
 */
export interface PhosphorIcon {
  tone: string;
  line: string;
}

export const PHOSPHOR: Record<string, PhosphorIcon> = {
${out.join("\n")}
};
`);
