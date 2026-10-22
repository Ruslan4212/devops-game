/**
 * Иконки товаров магазина: Tabler Icons (MIT, см. ICONS-LICENSE.txt) из общего набора
 * ui-icons — один стиль со всем интерфейсом. Цвет — currentColor, оттенок задаёт
 * карточка товара. Для каждого id своя иконка; неизвестный id получает нейтральную рамку.
 */
import { icon } from "./ui-icons";

const SIZE = 40;

const ITEM_ICON: Record<string, Record<string, string>> = {
  food: {
    noodles: "bowl-chopsticks",
    grechka: "bowl-spoon",
    shawarma: "baguette",
    lunch: "tools-kitchen-2",
    delivery: "motorbike",
    resto: "chef-hat",
    groceries: "shopping-cart",
    coffee: "coffee",
    salad_bowl: "salad",
    burger_combo: "burger",
    sushi_set: "fish",
    grandma_pelmeni: "soup",
  },
  clothes: {
    tshirt: "shirt",
    hoodie: "jacket",
    shirt: "shirt",
    suit: "tie",
    bomber: "jacket",
    turtleneck: "hanger",
    sneakers_old: "shoe",
    sneakers: "shoe",
    boots: "shoe",
    loafers: "shoe",
    cardigan: "hanger",
    chelsea: "shoe",
  },
  accessory: {
    watch: "clock",
    backpack: "backpack",
    headphones_neck: "headphones",
    sunglasses: "sunglasses",
    tote_bag: "bag",
    necklace: "sparkles",
    ring: "diamond",
    earbuds: "device-airpods",
  },
  home: {
    hostel: "bed",
    room: "door",
    studio: "home-2",
    flat2: "building-community",
    house: "home",
    cottage: "building-cottage",
    penthouse: "building-skyscraper",
  },
  tech: {
    kbd: "keyboard",
    monitor: "device-desktop",
    laptop: "device-laptop",
    chair: "armchair",
    standing_desk: "table",
    noise_headphones: "headphones",
    smart_speaker: "device-speaker",
  },
  trip: {
    weekend: "map-pin",
    sea: "beach",
    asia: "building-pavilion",
    camping: "tent",
    europe: "building-castle",
    cruise: "ship",
    roadtrip: "route-2",
  },
  comfort: {
    plant: "plant-2",
    aquarium: "fish",
    poster_art: "photo",
    gaming_console: "device-gamepad-2",
    speaker_system: "speakerphone",
    coffee_machine: "cup",
    lamp: "lamp",
    rug: "layout-grid",
    bookshelf: "books",
  },
};

export type ShopIconCategory = keyof typeof ITEM_ICON;

const PLACEHOLDER = `<svg class="ico" viewBox="0 0 24 24" width="${SIZE}" height="${SIZE}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="5" y="7" width="14" height="11" rx="3"/></svg>`;

/** Иконка товара по категории и id. Возвращает нейтральный плейсхолдер, если для id нет своей отрисовки. */
export function shopItemIcon(category: ShopIconCategory, id: string): string {
  const name = ITEM_ICON[category]?.[id];
  return (name && icon(name, SIZE)) || PLACEHOLDER;
}

const CAR_ICON: Record<string, string> = {
  hatch: "car",
  sedan: "car",
  suv: "car-suv",
  ev: "charging-pile",
  sport: "gauge",
  bike: "bike",
  moto: "motorbike",
};

/** Боковая иконка транспорта по типу кузова — для карточки в магазине. */
export function carIcon(body: string): string {
  return icon(CAR_ICON[body] ?? CAR_ICON.hatch, SIZE);
}
