/**
 * Иконки товаров магазина: одна на каждый предмет во всех категориях
 * (еда/одежда/аксессуары/жильё/техника/поездки/уют). Стиль — детальный
 * плоский вектор с лёгкой светотенью (два-три тона на форму), а не
 * одноцветный силуэт: так предмет узнаётся с первого взгляда и выглядит
 * менее абстрактно. Общий viewBox 0 0 60 44 — иконки взаимозаменяемы
 * в вёрстке карточки товара.
 */

const WRAP = (inner: string): string =>
  `<svg viewBox="0 0 60 44" width="52" height="38" role="img" aria-hidden="true">${inner}</svg>`;

const FOOD_ICONS: Record<string, string> = {
  noodles:
    '<ellipse cx="30" cy="30" rx="20" ry="8" fill="#D94F3D"/><ellipse cx="30" cy="27" rx="20" ry="8" fill="#F2704F"/><path d="M14 27c2-8 6-14 16-14s14 6 16 14" fill="none" stroke="#F2C572" stroke-width="3"/><path d="M18 22q4 6 0 10M30 18q4 8 0 14M42 22q-4 6 0 10" stroke="#F7E0A0" stroke-width="2" fill="none"/>',
  grechka:
    '<ellipse cx="30" cy="30" rx="19" ry="7" fill="#8A6A3C"/><ellipse cx="30" cy="27" rx="19" ry="7" fill="#B98A4E"/><circle cx="22" cy="25" r="2" fill="#7A5A2E"/><circle cx="30" cy="23" r="2" fill="#7A5A2E"/><circle cx="38" cy="25" r="2" fill="#7A5A2E"/><ellipse cx="34" cy="25" rx="6" ry="4" fill="#D9A85C"/>',
  shawarma:
    '<path d="M20 14h20l4 8-4 16-8 4-8-4-4-16z" fill="#E8C36A"/><path d="M20 14h20l-2 6h-16z" fill="#C7452F"/><path d="M22 22h16l-1 4h-14z" fill="#6BAA5C"/><path d="M23 27h14l-1 4h-12z" fill="#E8C36A"/>',
  lunch:
    '<rect x="12" y="16" width="36" height="20" rx="3" fill="#4A4F5C"/><rect x="14" y="18" width="15" height="8" rx="1" fill="#E8C36A"/><rect x="31" y="18" width="15" height="8" rx="1" fill="#6BAA5C"/><rect x="14" y="28" width="32" height="6" rx="1" fill="#C7452F" opacity=".85"/>',
  delivery:
    '<path d="M16 18h28l4 6v10a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2V24z" fill="#E8994A"/><path d="M16 18h28l3 4H13z" fill="#D97B2E"/><rect x="26" y="24" width="8" height="3" fill="#FFF" opacity=".7"/>',
  resto:
    '<circle cx="30" cy="26" r="13" fill="#2B3446"/><circle cx="30" cy="26" r="10" fill="#3E4A5C"/><path d="M20 26h20M24 20v12M36 20v5a2 2 0 1 1-4 0v-5" stroke="#D9B36B" stroke-width="1.5" fill="none"/><path d="M45 14v10M42 14v4a3 3 0 0 0 6 0v-4" stroke="#8E6B33" stroke-width="2" fill="none"/>',
  groceries:
    '<path d="M18 16h24l3 20H15z" fill="#C9A46A"/><path d="M18 16h24l1 4H17z" fill="#A9835A"/><path d="M24 16v-3a6 6 0 0 1 12 0v3" stroke="#6B4423" stroke-width="2" fill="none"/><circle cx="24" cy="26" r="3" fill="#C7452F"/><circle cx="32" cy="24" r="3" fill="#6BAA5C"/><circle cx="28" cy="30" r="3" fill="#E8994A"/>',
  coffee:
    '<path d="M18 16h20l-2 16a4 4 0 0 1-4 4H24a4 4 0 0 1-4-4z" fill="#F2F2F2"/><path d="M18 16h20l-1 4H19z" fill="#2B3446"/><path d="M38 20h4a4 4 0 0 1 0 8h-3" fill="none" stroke="#8A5A44" stroke-width="2"/><path d="M24 12q2-3 0-5M30 12q2-3 0-5" stroke="#B5793B" stroke-width="1.5" fill="none"/>',
  salad_bowl:
    '<path d="M14 24a16 8 0 0 0 32 0z" fill="#4A7FB5"/><ellipse cx="30" cy="24" rx="16" ry="6" fill="#6BAA5C"/><circle cx="24" cy="22" r="2.5" fill="#C7452F"/><circle cx="34" cy="21" r="2.5" fill="#E8C36A"/><circle cx="29" cy="25" r="2" fill="#fff"/>',
  burger_combo:
    '<ellipse cx="30" cy="18" rx="14" ry="6" fill="#D9A85C"/><rect x="17" y="22" width="26" height="3" fill="#6BAA5C"/><rect x="17" y="25" width="26" height="4" fill="#8A5A2E"/><rect x="17" y="29" width="26" height="3" fill="#C7452F" opacity=".8"/><path d="M16 32h28l-2 4H18z" fill="#D9A85C"/>',
  sushi_set:
    '<ellipse cx="18" cy="28" rx="7" ry="5" fill="#F2F2F2"/><rect x="14" y="21" width="8" height="8" rx="2" fill="#3E7A4E"/><circle cx="18" cy="21" r="3" fill="#C7452F"/><ellipse cx="32" cy="28" rx="7" ry="5" fill="#F2F2F2"/><rect x="28" y="21" width="8" height="8" rx="2" fill="#3E7A4E"/><circle cx="32" cy="21" r="3" fill="#E8994A"/><ellipse cx="46" cy="28" rx="6" ry="4" fill="#F2F2F2"/><circle cx="46" cy="24" r="2.5" fill="#D94F3D"/>',
  grandma_pelmeni:
    '<ellipse cx="30" cy="28" rx="19" ry="7" fill="#8A6A3C"/><path d="M18 24a5 4 0 1 1 10 0 5 4 0 1 1-10 0z" fill="#F2E0B8"/><path d="M28 24a5 4 0 1 1 10 0 5 4 0 1 1-10 0z" fill="#F2E0B8"/><path d="M38 24a5 4 0 1 1 8 0 5 4 0 1 1-8 0z" fill="#F2E0B8"/>',
};

const CLOTHES_ICONS: Record<string, string> = {
  tshirt:
    '<path d="M20 12l6-3 4 3 4-3 6 3 6 7-5 4-2-2v16H21V21l-2 2-5-4z" fill="#4A7FB5"/><path d="M26 9l4 3 4-3-1 4h-6z" fill="#3A6494"/>',
  hoodie:
    '<path d="M18 14l7-4 5 3 5-3 7 4 5 8-5 3-2-2v15H20V23l-2 2-5-3z" fill="#4B5563"/><path d="M23 10q7-4 14 0l-2 6q-5-3-10 0z" fill="#3B424D"/><circle cx="30" cy="28" r="1.6" fill="#1F2530"/>',
  shirt:
    '<path d="M19 13l7-4 4 4 4-4 7 4 5 7-5 4-2-2v15H21V22l-2 2-5-4z" fill="#E8E4DA"/><path d="M28 9l2 3 2-3" stroke="#8C2F39" stroke-width="1.5" fill="none"/><path d="M30 12v22" stroke="#C9C4B6" stroke-width="1"/>',
  suit: '<path d="M19 13l7-4 4 5 4-5 7 4 5 7-5 4-2-2v15H21V22l-2 2-5-4z" fill="#2B3446"/><path d="M27 9l3 5 3-5-3 22h-1z" fill="#E8E4DA"/><circle cx="30" cy="24" r="1.2" fill="#1A1F29"/><circle cx="30" cy="29" r="1.2" fill="#1A1F29"/>',
  bomber:
    '<path d="M18 15l8-5 4 3 4-3 8 5 4 7-5 3-2-2v15H21V23l-2 2-5-3z" fill="#3E4A5C"/><path d="M21 30h18" stroke="#D9B36B" stroke-width="1.5"/><path d="M26 10l4 3 4-3" stroke="#D9B36B" stroke-width="1.5" fill="none"/>',
  turtleneck:
    '<path d="M20 16l6-5h8l6 5 5 6-5 3-1-1v16H21V19l-1 1-5-3z" fill="#3B3F46"/><ellipse cx="30" cy="13" rx="6" ry="3" fill="#2C2F35"/>',
  sneakers_old:
    '<path d="M12 30h30l6 4v3H12z" fill="#7C7466"/><path d="M12 30c2-6 8-9 14-9h4l8 7 6 2v3z" fill="#918872"/><path d="M20 27l4-4 4 3" stroke="#5C5648" stroke-width="1.5" fill="none"/>',
  sneakers:
    '<path d="M12 30h30l6 4v3H12z" fill="#2E8B7A"/><path d="M12 30c2-6 8-9 14-9h4l8 7 6 2v3z" fill="#E8E4DA"/><path d="M20 27l4-4 4 3" stroke="#25705F" stroke-width="1.5" fill="none"/>',
  boots:
    '<path d="M16 14h10v14l6 2 8 4v3H16z" fill="#4B3621"/><path d="M16 30h32v4H16z" fill="#2E2317"/><path d="M16 14h10v4H16z" fill="#6B4A2E"/>',
  loafers:
    '<path d="M12 30h30l6 4v3H12z" fill="#2E2317"/><path d="M12 30c2-6 8-9 14-9h4l8 7 6 2v3z" fill="#4B3621"/><rect x="24" y="26" width="6" height="3" rx="1" fill="#D9B36B"/>',
  cardigan:
    '<path d="M19 13l7-4 4 4 4-4 7 4 5 7-5 4-2-2v15H21V22l-2 2-5-4z" fill="#8A6A3C"/><path d="M30 13v24" stroke="#6B4423" stroke-width="1.5"/><circle cx="30" cy="20" r="1.2" fill="#6B4423"/><circle cx="30" cy="27" r="1.2" fill="#6B4423"/><circle cx="30" cy="34" r="1.2" fill="#6B4423"/>',
  chelsea:
    '<path d="M16 14h10v16l6 1 8 5v3H16z" fill="#2E2317"/><path d="M16 34h32v3H16z" fill="#1A130D"/><path d="M26 24h4v6h-4z" fill="#4B3621"/>',
};

const ACCESSORY_ICONS: Record<string, string> = {
  watch:
    '<circle cx="30" cy="22" r="9" fill="#2A3342"/><circle cx="30" cy="22" r="6.5" fill="#E8E4DA"/><path d="M30 22V18M30 22l3 2" stroke="#2A3342" stroke-width="1.3"/><rect x="27" y="8" width="6" height="7" rx="1.5" fill="#8892A6"/><rect x="27" y="29" width="6" height="7" rx="1.5" fill="#8892A6"/>',
  backpack:
    '<path d="M20 18a10 8 0 0 1 20 0v14a3 3 0 0 1-3 3H23a3 3 0 0 1-3-3z" fill="#2E8B7A"/><path d="M23 18h14l-1 6H24z" fill="#25705F"/><rect x="26" y="12" width="8" height="3" rx="1.5" fill="none" stroke="#1E5B4E" stroke-width="1.5"/>',
  headphones_neck:
    '<path d="M18 24a12 10 0 0 1 24 0" fill="none" stroke="#2A3342" stroke-width="3"/><rect x="14" y="22" width="8" height="12" rx="3" fill="#2A3342"/><rect x="38" y="22" width="8" height="12" rx="3" fill="#2A3342"/><circle cx="18" cy="28" r="2" fill="#4A7FB5"/><circle cx="42" cy="28" r="2" fill="#4A7FB5"/>',
  sunglasses:
    '<rect x="14" y="18" width="14" height="10" rx="4" fill="#1A1F29"/><rect x="32" y="18" width="14" height="10" rx="4" fill="#1A1F29"/><rect x="28" y="21" width="4" height="3" fill="#1A1F29"/><path d="M12 20l-4-2M48 20l4-2" stroke="#1A1F29" stroke-width="2"/>',
  tote_bag:
    '<path d="M18 18h24l3 18H15z" fill="#D9B36B"/><path d="M24 18v-5a6 6 0 0 1 12 0v5" fill="none" stroke="#8E6B33" stroke-width="2.5"/><path d="M18 18h24l1 4H17z" fill="#C29A50"/>',
  necklace:
    '<path d="M20 12a10 8 0 0 0 20 0" fill="none" stroke="#D9B36B" stroke-width="2"/><circle cx="30" cy="24" r="4" fill="#E8C572"/>',
  ring: '<circle cx="30" cy="26" r="10" fill="none" stroke="#D9B36B" stroke-width="4"/><path d="M25 16l5-6 5 6z" fill="#4A7FB5"/>',
  earbuds:
    '<rect x="16" y="14" width="12" height="18" rx="4" fill="#E8E4DA"/><rect x="32" y="14" width="12" height="18" rx="4" fill="#E8E4DA"/><circle cx="22" cy="20" r="2" fill="#8892A6"/><circle cx="38" cy="20" r="2" fill="#8892A6"/>',
};

const HOME_ICONS: Record<string, string> = {
  hostel:
    '<rect x="14" y="20" width="32" height="16" fill="#5B6B8C"/><rect x="14" y="20" width="32" height="4" fill="#3E4A5C"/><rect x="18" y="26" width="6" height="6" fill="#D9B36B"/><rect x="36" y="26" width="6" height="6" fill="#2B3446"/>',
  room: '<rect x="16" y="18" width="28" height="18" fill="#6B7A99"/><path d="M16 18l14-8 14 8z" fill="#4A5A78"/><rect x="27" y="26" width="6" height="8" fill="#2B3446"/><rect x="19" y="24" width="5" height="5" fill="#D9B36B"/>',
  studio:
    '<rect x="14" y="16" width="32" height="20" fill="#7C8AA6"/><path d="M14 16l16-9 16 9z" fill="#5B6B8C"/><rect x="26" y="24" width="8" height="12" fill="#2B3446"/><rect x="18" y="22" width="6" height="6" fill="#D9B36B"/><rect x="36" y="22" width="6" height="6" fill="#D9B36B"/>',
  flat2:
    '<rect x="12" y="14" width="36" height="22" fill="#8892A6"/><rect x="12" y="14" width="36" height="4" fill="#6B7A99"/><rect x="17" y="20" width="7" height="7" fill="#D9B36B"/><rect x="27" y="20" width="7" height="7" fill="#2B3446"/><rect x="37" y="20" width="7" height="7" fill="#D9B36B"/><rect x="24" y="29" width="8" height="7" fill="#3E4A5C"/>',
  house:
    '<path d="M14 22l16-12 16 12v14H14z" fill="#A9835A"/><path d="M14 22l16-12 16 12" fill="none" stroke="#7A5A2E" stroke-width="2"/><rect x="26" y="26" width="8" height="10" fill="#4B3621"/><rect x="17" y="24" width="6" height="6" fill="#D9B36B"/><rect x="33" y="24" width="6" height="6" fill="#D9B36B"/>',
  cottage:
    '<rect x="12" y="20" width="20" height="16" fill="#B98A4E"/><path d="M12 20l10-8 10 8z" fill="#8A6A3C"/><rect x="32" y="24" width="16" height="12" fill="#A9835A"/><rect x="17" y="26" width="5" height="5" fill="#D9B36B"/><rect x="36" y="27" width="8" height="9" fill="#4B3621"/>',
  penthouse:
    '<rect x="16" y="10" width="10" height="26" fill="#5B6B8C"/><rect x="26" y="16" width="10" height="20" fill="#7C8AA6"/><rect x="36" y="6" width="10" height="30" fill="#4A5A78"/><rect x="38" y="12" width="6" height="5" fill="#D9B36B"/><rect x="18" y="16" width="5" height="5" fill="#D9B36B"/><rect x="28" y="22" width="5" height="5" fill="#D9B36B"/>',
};

const TECH_ICONS: Record<string, string> = {
  kbd:
    '<rect x="12" y="20" width="36" height="14" rx="2" fill="#2A3342"/><g fill="#4A5568">' +
    Array.from({ length: 18 })
      .map(
        (_, i) =>
          `<rect x="${15 + (i % 9) * 3.7}" y="${23 + Math.floor(i / 9) * 4}" width="3" height="3" rx=".5"/>`,
      )
      .join("") +
    "</g>",
  monitor:
    '<rect x="14" y="10" width="32" height="20" rx="2" fill="#1F2530"/><rect x="17" y="13" width="26" height="14" fill="#4A7FB5"/><rect x="26" y="30" width="8" height="4" fill="#2A3342"/><rect x="22" y="34" width="16" height="2" fill="#2A3342"/>',
  laptop:
    '<path d="M18 14h24v14H18z" fill="#1F2530"/><path d="M20 16h20v10H20z" fill="#4A7FB5"/><path d="M12 30h36l-3 4H15z" fill="#8892A6"/>',
  chair:
    '<path d="M20 10h16v14H20z" fill="#4B5563"/><rect x="18" y="24" width="20" height="4" fill="#2A3342"/><path d="M20 28l-3 8M36 28l3 8" stroke="#2A3342" stroke-width="2"/><path d="M24 36h8" stroke="#2A3342" stroke-width="3"/>',
  standing_desk:
    '<rect x="12" y="16" width="32" height="3" fill="#8A6A3C"/><rect x="16" y="19" width="3" height="15" fill="#4A4F5C"/><rect x="37" y="19" width="3" height="15" fill="#4A4F5C"/><rect x="20" y="10" width="10" height="5" rx="1" fill="#2A3342"/>',
  noise_headphones:
    '<path d="M16 24a14 12 0 0 1 28 0" fill="none" stroke="#2A3342" stroke-width="3"/><rect x="12" y="22" width="9" height="13" rx="4" fill="#2A3342"/><rect x="39" y="22" width="9" height="13" rx="4" fill="#2A3342"/><circle cx="16.5" cy="28.5" r="2" fill="#7C6BF2"/><circle cx="43.5" cy="28.5" r="2" fill="#7C6BF2"/>',
  smart_speaker:
    '<path d="M22 14h16l3 20a3 3 0 0 1-3 3H22a3 3 0 0 1-3-3z" fill="#4A4F5C"/><circle cx="30" cy="24" r="6" fill="#2A3342"/><circle cx="30" cy="24" r="2.5" fill="#7C6BF2"/>',
};

const TRIP_ICONS: Record<string, string> = {
  weekend:
    '<path d="M10 32l12-16 8 10 6-8 14 14z" fill="#5B6B8C"/><path d="M22 16l8 10-4 6-8-8z" fill="#F2F2F2"/><circle cx="42" cy="12" r="4" fill="#E8C36A"/>',
  sea: '<rect x="10" y="26" width="40" height="8" fill="#4A7FB5"/><path d="M10 26q5-3 10 0t10 0 10 0 10 0 10 0" fill="none" stroke="#6BA6DB" stroke-width="2"/><path d="M20 26v-8l10-4v12z" fill="#F2C572"/><circle cx="44" cy="12" r="5" fill="#F2C572"/>',
  asia: '<path d="M22 34V16h16v18z" fill="#C7452F"/><path d="M18 18h24l-4-4H22z" fill="#8C2F39"/><path d="M22 24h16M22 30h16" stroke="#E8C36A" stroke-width="1.5"/><path d="M28 16V10M32 16v-6" stroke="#8C2F39" stroke-width="2"/>',
  camping:
    '<path d="M14 34l14-18 14 18z" fill="#3E7A4E"/><path d="M22 34l6-14 6 14z" fill="#2E5C3A"/><circle cx="42" cy="14" r="4" fill="#F2C572"/><path d="M10 34h40" stroke="#5C4A3A" stroke-width="2"/>',
  europe:
    '<rect x="14" y="18" width="10" height="16" fill="#B98A4E"/><rect x="25" y="12" width="10" height="22" fill="#8A6A3C"/><rect x="36" y="20" width="10" height="14" fill="#A9835A"/><path d="M25 12l5-5 5 5" fill="none" stroke="#6B4423" stroke-width="2"/><rect x="28" y="18" width="4" height="4" fill="#D9B36B"/>',
  cruise:
    '<path d="M12 30h36l-4 6H16z" fill="#E8E4DA"/><rect x="18" y="14" width="24" height="14" rx="2" fill="#4A7FB5"/><rect x="21" y="17" width="4" height="4" fill="#F2F2F2"/><rect x="28" y="17" width="4" height="4" fill="#F2F2F2"/><rect x="35" y="17" width="4" height="4" fill="#F2F2F2"/><rect x="27" y="6" width="3" height="8" fill="#2B3446"/>',
  roadtrip:
    '<path d="M10 34c6-14 34-14 40 0z" fill="#8892A6"/><path d="M27 22h6v-4l-3-4-3 4z" fill="#D9B36B"/><rect x="14" y="28" width="32" height="8" rx="2" fill="#C7452F"/><circle cx="20" cy="36" r="3" fill="#1A1F29"/><circle cx="40" cy="36" r="3" fill="#1A1F29"/>',
};

const COMFORT_ICONS: Record<string, string> = {
  plant:
    '<rect x="24" y="28" width="12" height="8" fill="#A9835A"/><path d="M30 28c-8 0-10-8-10-14 6 0 10 4 10 10 0-6 4-10 10-10 0 6-2 14-10 14z" fill="#3E7A4E"/>',
  aquarium:
    '<rect x="12" y="14" width="36" height="20" rx="2" fill="#2A6F8A" opacity=".5"/><rect x="12" y="14" width="36" height="20" rx="2" fill="none" stroke="#8892A6" stroke-width="2"/><circle cx="26" cy="24" r="3" fill="#E8994A"/><path d="M18 30q4-4 8 0M34 20q4 4 8 0" stroke="#3E7A4E" stroke-width="2" fill="none"/>',
  poster_art:
    '<rect x="16" y="10" width="28" height="24" fill="#E8E4DA"/><rect x="16" y="10" width="28" height="24" fill="none" stroke="#8E6B33" stroke-width="2"/><path d="M20 28l6-8 5 5 5-9 6 12z" fill="#4A7FB5"/>',
  gaming_console:
    '<rect x="14" y="18" width="32" height="10" rx="3" fill="#1F2530"/><circle cx="22" cy="23" r="2.5" fill="#7C6BF2"/><circle cx="38" cy="21" r="1.6" fill="#C7452F"/><circle cx="42" cy="23" r="1.6" fill="#6BAA5C"/><circle cx="38" cy="25" r="1.6" fill="#E8C36A"/>',
  speaker_system:
    '<rect x="18" y="8" width="10" height="28" rx="2" fill="#2A3342"/><circle cx="23" cy="16" r="3" fill="#4A5568"/><circle cx="23" cy="27" r="4" fill="#4A5568"/><rect x="32" y="8" width="10" height="28" rx="2" fill="#2A3342"/><circle cx="37" cy="16" r="3" fill="#4A5568"/><circle cx="37" cy="27" r="4" fill="#4A5568"/>',
  coffee_machine:
    '<rect x="18" y="10" width="20" height="18" rx="2" fill="#2A3342"/><rect x="22" y="28" width="12" height="6" fill="#8892A6"/><rect x="25" y="34" width="6" height="2" fill="#D9B36B"/><circle cx="34" cy="15" r="1.5" fill="#C7452F"/>',
  lamp: '<path d="M20 12h20l-6 12H26z" fill="#E8C36A"/><rect x="29" y="24" width="2" height="10" fill="#4A4F5C"/><rect x="22" y="34" width="16" height="3" rx="1.5" fill="#2A3342"/>',
  rug: '<ellipse cx="30" cy="26" rx="22" ry="9" fill="#C7452F"/><ellipse cx="30" cy="26" rx="16" ry="6" fill="#D9B36B"/><ellipse cx="30" cy="26" rx="9" ry="3.5" fill="#C7452F"/>',
  bookshelf:
    '<rect x="14" y="10" width="32" height="26" fill="#8A6A3C"/><rect x="17" y="13" width="4" height="20" fill="#4A7FB5"/><rect x="22" y="13" width="3" height="20" fill="#C7452F"/><rect x="26" y="13" width="5" height="20" fill="#6BAA5C"/><rect x="32" y="13" width="3" height="20" fill="#E8C36A"/><rect x="36" y="13" width="6" height="20" fill="#7C6BF2"/>',
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

/** Иконка товара по категории и id. Возвращает нейтральный плейсхолдер, если для id нет своей отрисовки. */
export function shopItemIcon(category: ShopIconCategory, id: string): string {
  const inner = CATEGORY_ICONS[category]?.[id];
  return WRAP(inner ?? '<rect x="20" y="14" width="20" height="16" rx="3" fill="#4A5568"/>');
}

const CAR_SHAPES: Record<string, string> = {
  bike: '<path d="M6 34a8 8 0 1 1 16 0 8 8 0 0 1-16 0zm34 0a8 8 0 1 1 16 0 8 8 0 0 1-16 0z" fill="none" stroke="#8892A6" stroke-width="3"/><path d="M14 34l10-16h8l6 10M24 18h10" fill="none" stroke="#8892A6" stroke-width="3"/><circle cx="14" cy="34" r="3" fill="#5B6B8C"/><circle cx="40" cy="34" r="3" fill="#5B6B8C"/>',
  moto: '<path d="M8 34a7 7 0 1 1 14 0 7 7 0 0 1-14 0zm34 0a7 7 0 1 1 14 0 7 7 0 0 1-14 0z" fill="none" stroke="#8892A6" stroke-width="3"/><path d="M15 34l8-12h14l7 12M27 22h-8" fill="none" stroke="#8892A6" stroke-width="3"/><ellipse cx="30" cy="24" rx="5" ry="3" fill="#C7452F"/>',
  hatch:
    '<path d="M4 34a6 6 0 1 1 12 0 6 6 0 0 1-12 0zm36 0a6 6 0 1 1 12 0 6 6 0 0 1-12 0z" fill="#5B6B8C"/><path d="M6 30h48v-6c0-2-8-10-16-10H24c-6 0-10 4-14 10l-4 6z" fill="#4A7FB5"/><path d="M6 30h48v-4H6z" fill="#3A6494" opacity=".5"/><path d="M22 16h16l4 8H18z" fill="#1F2530" opacity=".7"/><circle cx="10" cy="34" r="3" fill="#2A3342"/><circle cx="46" cy="34" r="3" fill="#2A3342"/>',
  sedan:
    '<path d="M4 36a6 6 0 1 1 12 0 6 6 0 0 1-12 0zm40 0a6 6 0 1 1 12 0 6 6 0 0 1-12 0z" fill="#5B6B8C"/><path d="M4 32h52v-6c0-2-6-8-14-8H26c-6 0-9 3-13 8l-9 4z" fill="#4A7FB5"/><path d="M4 32h52v-4H4z" fill="#3A6494" opacity=".5"/><path d="M22 18h20l6 8H16z" fill="#1F2530" opacity=".7"/><circle cx="10" cy="36" r="3" fill="#2A3342"/><circle cx="50" cy="36" r="3" fill="#2A3342"/>',
  suv: '<path d="M6 38a6 6 0 1 1 12 0 6 6 0 0 1-12 0zm38 0a6 6 0 1 1 12 0 6 6 0 0 1-12 0z" fill="#3E4A5C"/><path d="M4 34h56v-14c0-3-6-10-14-10H22c-6 0-10 4-12 10l-6 14z" fill="#5B6B8C"/><path d="M4 34h56v-4H4z" fill="#3E4A5C" opacity=".5"/><path d="M22 18h11v6H18zM35 18h9l3 6h-12z" fill="#1F2530" opacity=".7"/><circle cx="12" cy="38" r="3.5" fill="#1A1F29"/><circle cx="52" cy="38" r="3.5" fill="#1A1F29"/>',
  ev: '<path d="M4 36a6 6 0 1 1 12 0 6 6 0 0 1-12 0zm40 0a6 6 0 1 1 12 0 6 6 0 0 1-12 0z" fill="#164F42"/><path d="M4 32h52v-6c0-2-6-8-14-8H26c-6 0-9 3-13 8l-9 4z" fill="#1F6F5C"/><path d="M22 18h20l6 8H16z" fill="#0F332A" opacity=".7"/><path d="M30 12l-6 10h6l-4 8 12-12h-7l5-6z" fill="#D9B36B"/><circle cx="10" cy="36" r="3" fill="#0F332A"/><circle cx="50" cy="36" r="3" fill="#0F332A"/>',
  sport:
    '<path d="M6 38a5 5 0 1 1 10 0 5 5 0 0 1-10 0zm38 0a5 5 0 1 1 10 0 5 5 0 0 1-10 0z" fill="#7A1F26"/><path d="M2 36h56l-6-14c-2-4-8-8-16-8H26c-6 0-10 2-14 8l-10 8z" fill="#C7452F"/><path d="M2 36h56v-3H2z" fill="#7A1F26" opacity=".6"/><path d="M22 16h16l4 6H19z" fill="#1A1F29" opacity=".7"/><circle cx="11" cy="38" r="3" fill="#1A1F29"/><circle cx="49" cy="38" r="3" fill="#1A1F29"/>',
};

/** Детальная боковая иконка машины по типу кузова (с колёсами, окнами и бликом) — для карточки в магазине. */
export function carIcon(body: string): string {
  return WRAP(CAR_SHAPES[body] ?? CAR_SHAPES.hatch);
}
