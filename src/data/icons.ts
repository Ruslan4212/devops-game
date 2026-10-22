/**
 * Иконки товаров магазина: на каждый предмет — значок Phosphor duotone
 * в скруглённой плитке, оттенок плитки задаёт категория (CSS-переменная
 * `--tile` в `.shop-tile-<категория>`). Так вся игра говорит на одном
 * визуальном языке, а товары различаются формой и цветом плитки.
 */
import { phIcon } from "./ui-icons";

const FOOD_ICONS: Record<string, string> = {
  noodles: "bowl-steam",
  grechka: "bowl-food",
  shawarma: "bread",
  lunch: "fork-knife",
  delivery: "package",
  resto: "wine",
  groceries: "shopping-cart-simple",
  coffee: "coffee",
  salad_bowl: "leaf",
  burger_combo: "hamburger",
  sushi_set: "fish",
  grandma_pelmeni: "cooking-pot",
};
const CLOTHES_ICONS: Record<string, string> = {
  tshirt: "t-shirt",
  hoodie: "hoodie",
  shirt: "shirt-folded",
  suit: "coat-hanger",
  bomber: "hoodie",
  turtleneck: "shirt-folded",
  sneakers_old: "sneaker",
  sneakers: "sneaker-move",
  boots: "boot",
  loafers: "sneaker",
  cardigan: "coat-hanger",
  chelsea: "boot",
};
const ACCESSORY_ICONS: Record<string, string> = {
  watch: "watch",
  backpack: "backpack",
  headphones_neck: "headphones",
  sunglasses: "sunglasses",
  tote_bag: "tote",
  necklace: "diamond",
  ring: "diamond",
  earbuds: "headset",
};
const HOME_ICONS: Record<string, string> = {
  hostel: "bed",
  room: "buildings",
  studio: "house-simple",
  flat2: "building-apartment",
  house: "house",
  cottage: "house-line",
  penthouse: "building-office",
};
const TECH_ICONS: Record<string, string> = {
  kbd: "keyboard",
  monitor: "monitor",
  laptop: "laptop",
  chair: "chair",
  standing_desk: "desk",
  noise_headphones: "headphones",
  smart_speaker: "speaker-hifi",
};
const TRIP_ICONS: Record<string, string> = {
  weekend: "campfire",
  sea: "island",
  asia: "globe-hemisphere-east",
  camping: "tent",
  europe: "airplane-tilt",
  cruise: "boat",
  roadtrip: "car-profile",
};
const COMFORT_ICONS: Record<string, string> = {
  plant: "potted-plant",
  aquarium: "fish-simple",
  poster_art: "image",
  gaming_console: "game-controller",
  speaker_system: "speaker-high",
  coffee_machine: "coffee-bean",
  lamp: "lamp",
  rug: "rug",
  bookshelf: "books",
};

const CATEGORY_ICONS: Record<string, Record<string, string>> = {
  food: FOOD_ICONS,
  clothes: CLOTHES_ICONS,
  accessory: ACCESSORY_ICONS,
  home: HOME_ICONS,
  tech: TECH_ICONS,
  trip: TRIP_ICONS,
  comfort: COMFORT_ICONS,
};

export type ShopIconCategory = keyof typeof CATEGORY_ICONS;

const tile = (kind: string, ph: string): string =>
  `<span class="shop-tile shop-tile-${kind}" aria-hidden="true">${phIcon(ph, 28)}</span>`;

/** Плитка с иконкой товара по категории и id; для неизвестного id — нейтральная плитка-пакет. */
export function shopItemIcon(category: ShopIconCategory, id: string): string {
  return tile(category, CATEGORY_ICONS[category]?.[id] ?? "package");
}

/** Имя значка Phosphor для товара (для тестов); `undefined`, если id не размечен. */
export function shopItemIconName(category: ShopIconCategory, id: string): string | undefined {
  return CATEGORY_ICONS[category]?.[id];
}

const CAR_ICONS: Record<string, string> = {
  bike: "bicycle",
  moto: "motorcycle",
  hatch: "car-simple",
  sedan: "car",
  suv: "jeep",
  ev: "car-battery",
  sport: "car-profile",
};

/** Иконка машины по типу кузова — для карточки в магазине. */
export function carIcon(body: string): string {
  return tile("car", CAR_ICONS[body] ?? CAR_ICONS.hatch);
}
