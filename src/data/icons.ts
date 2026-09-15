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
  // Доширак: бумажный стакан быстрой лапши с отогнутой крышкой и паром —
  // именно он, а не абстрактная миска: узнаётся по конусу стакана и фольге.
  noodles:
    '<path d="M21 15h18l-3 23a3 3 0 0 1-3 3H27a3 3 0 0 1-3-3z" fill="#E7E4DD"/>' +
    '<path d="M31 15h8l-3 23a3 3 0 0 1-3 3h-3z" fill="#CBC7BE"/>' +
    '<rect x="23" y="19" width="14" height="9" rx="1" fill="#D94F3D"/>' +
    '<path d="M25 22h10M25 25h7" stroke="#F7E0A0" stroke-width="1.4" stroke-linecap="round"/>' +
    '<path d="M19 13h22l-1 3H20z" fill="#B9B5AC"/>' +
    '<path d="M40 13l7-5 2 3-7 4z" fill="#D8D4CB"/>' +
    '<path d="M27 9q2-3 0-5" stroke="#8FA3B8" stroke-width="1.5" fill="none" stroke-linecap="round" opacity=".85"/>' +
    '<path d="M33 9q2-3 0-5" stroke="#8FA3B8" stroke-width="1.5" fill="none" stroke-linecap="round" opacity=".85"/>',
  // Гречка с курицей: тарелка, горка крупы, куриная ножка
  grechka:
    '<ellipse cx="30" cy="34" rx="21" ry="7" fill="#C1C7D1"/>' +
    '<ellipse cx="30" cy="32" rx="21" ry="7" fill="#E6E9EE"/>' +
    '<path d="M18 31q4-9 12-9t12 9q-12 4-24 0z" fill="#B98A4E"/>' +
    '<circle cx="24" cy="28" r="1.3" fill="#7A5A2E"/>' +
    '<circle cx="30" cy="26" r="1.3" fill="#7A5A2E"/>' +
    '<circle cx="35" cy="28" r="1.3" fill="#7A5A2E"/>' +
    '<path d="M32 24q6-6 10-2t-2 9q-5 2-8-2z" fill="#C98A4A"/>' +
    '<path d="M40 21l5-4a2 2 0 1 1 2 3l-5 4z" fill="#EFE7D8"/>',
  // Шаурма: свёрток в бумаге, сверху виден срез начинки
  shawarma:
    '<path d="M22 12h15l6 26-10 5-9-5z" fill="#EFE7D2"/>' +
    '<path d="M30 12h7l6 26-6 3z" fill="#DCD3BC"/>' +
    '<path d="M22 12h15l-1 5H23z" fill="#C7452F"/>' +
    '<path d="M23 17h13l-1 4H24z" fill="#6BAA5C"/>' +
    '<path d="M24 21h11l-1 4H25z" fill="#E8C36A"/>' +
    '<path d="M25 25h9l-1 4h-7z" fill="#B5793B"/>',
  // Бизнес-ланч: поднос, суп и второе
  lunch:
    '<rect x="8" y="14" width="44" height="22" rx="3" fill="#464C59"/>' +
    '<rect x="10" y="16" width="40" height="18" rx="2" fill="#5A606F"/>' +
    '<circle cx="20" cy="25" r="7" fill="#E6E9EE"/>' +
    '<circle cx="20" cy="25" r="5" fill="#D98B3A"/>' +
    '<rect x="30" y="19" width="18" height="12" rx="2" fill="#E6E9EE"/>' +
    '<rect x="32" y="21" width="14" height="4" rx="1" fill="#8B5A2B"/>' +
    '<rect x="32" y="26" width="14" height="3" rx="1" fill="#6BAA5C"/>',
  // Доставка: бумажный пакет с ручками и чеком
  delivery:
    '<path d="M16 16h28l-2 24a2 2 0 0 1-2 2H20a2 2 0 0 1-2-2z" fill="#C98F55"/>' +
    '<path d="M30 16h14l-2 24a2 2 0 0 1-2 2h-8z" fill="#B47C45"/>' +
    '<path d="M24 16v-3a6 6 0 0 1 12 0v3" fill="none" stroke="#8A5A32" stroke-width="2"/>' +
    '<rect x="25" y="22" width="10" height="12" rx="1" fill="#F2EFE8"/>' +
    '<path d="M27 25h6M27 28h6M27 31h4" stroke="#B0ABA0" stroke-width="1.2" stroke-linecap="round"/>',
  // Ужин в ресторане: тарелка под клошем и бокал вина
  resto:
    '<ellipse cx="25" cy="37" rx="17" ry="4" fill="#C1C7D1"/>' +
    '<path d="M10 35a15 12 0 0 1 30 0z" fill="#D5DAE3"/>' +
    '<path d="M17 35a8 8 0 0 1 16 0z" fill="#E8ECF2"/>' +
    '<circle cx="25" cy="21" r="2" fill="#AEB5C2"/>' +
    '<path d="M45 11h9l-1 9a3.5 3.5 0 0 1-7 0z" fill="#8E2F3A"/>' +
    '<path d="M49.5 31v-8" stroke="#C1C7D1" stroke-width="2"/>' +
    '<path d="M45 32h9" stroke="#C1C7D1" stroke-width="2" stroke-linecap="round"/>',
  // Продукты на неделю: полный пакет, из которого торчат батон и зелень
  groceries:
    '<path d="M16 18h28l-3 22a2 2 0 0 1-2 2H21a2 2 0 0 1-2-2z" fill="#C9A46A"/>' +
    '<path d="M31 18h13l-3 22a2 2 0 0 1-2 2h-9z" fill="#AE8B58"/>' +
    '<path d="M22 18l3-8h4l-2 8z" fill="#E8C36A"/>' +
    '<path d="M33 18q1-8 7-9-2 5-2 9z" fill="#6BAA5C"/>' +
    '<circle cx="26" cy="15" r="4" fill="#C7452F"/>' +
    '<path d="M20 26h20" stroke="#A9835A" stroke-width="1.4" opacity=".7"/>',
  // Кофе навынос: стакан с крышкой, картонным поясом и паром
  coffee:
    '<path d="M22 16h16l-2 22a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3z" fill="#F2F0EA"/>' +
    '<path d="M31 16h7l-2 22a3 3 0 0 1-3 3h-3z" fill="#DBD7CE"/>' +
    '<rect x="21" y="23" width="18" height="8" rx="1" fill="#B5793B"/>' +
    '<path d="M20 13h20l-1 4H21z" fill="#3A4150"/>' +
    '<rect x="27" y="10" width="6" height="3" rx="1" fill="#2B3140"/>' +
    '<path d="M26 8q2-3 0-5" stroke="#8FA3B8" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".8"/>' +
    '<path d="M34 8q2-3 0-5" stroke="#8FA3B8" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".8"/>',
  // Салат-бокс: прозрачный контейнер с зеленью и овощами
  salad_bowl:
    '<path d="M16 20h28v16a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4z" fill="#CBD8DE" opacity=".5"/>' +
    '<path d="M18 26q12 6 24 0v9a3 3 0 0 1-3 3H21a3 3 0 0 1-3-3z" fill="#6BAA5C"/>' +
    '<circle cx="24" cy="27" r="3" fill="#8FC47A"/>' +
    '<circle cx="34" cy="28" r="2.5" fill="#C7452F"/>' +
    '<circle cx="29" cy="31" r="2" fill="#E8C36A"/>' +
    '<rect x="14" y="17" width="32" height="4" rx="2" fill="#E6EBEF"/>',
  // Бургер-комбо: бургер, картошка фри и стакан
  burger_combo:
    '<path d="M8 21a9 6 0 0 1 18 0z" fill="#D9A05B"/>' +
    '<rect x="8" y="21" width="18" height="3" fill="#6BAA5C"/>' +
    '<rect x="8" y="24" width="18" height="4" rx="1" fill="#8B5A2B"/>' +
    '<path d="M8 28h18a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4z" fill="#D9A05B"/>' +
    '<path d="M30 23h11l-1 14a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2z" fill="#C7452F"/>' +
    '<path d="M31 23l1-7h2l-1 7zM34 23l1-8h2l-1 8zM37 23l1-7h2l-1 7z" fill="#E8C36A"/>' +
    '<path d="M45 18h10l-2 19a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z" fill="#E6E9EE"/>' +
    '<rect x="44" y="15" width="12" height="3" rx="1" fill="#C7452F"/>' +
    '<path d="M52 15v-5" stroke="#C7452F" stroke-width="1.5"/>',
  // Сет роллов: доска, три ролла с разной начинкой и палочки
  sushi_set:
    '<rect x="8" y="25" width="40" height="11" rx="2" fill="#3A2E24"/>' +
    '<rect x="8" y="25" width="40" height="4" rx="2" fill="#4B3C2F"/>' +
    '<circle cx="18" cy="25" r="7" fill="#2B2B2B"/>' +
    '<circle cx="18" cy="25" r="5" fill="#F2EFE6"/>' +
    '<circle cx="18" cy="25" r="2.2" fill="#D9533F"/>' +
    '<circle cx="29" cy="25" r="7" fill="#2B2B2B"/>' +
    '<circle cx="29" cy="25" r="5" fill="#F2EFE6"/>' +
    '<circle cx="29" cy="25" r="2.2" fill="#E8994A"/>' +
    '<circle cx="40" cy="25" r="7" fill="#2B2B2B"/>' +
    '<circle cx="40" cy="25" r="5" fill="#F2EFE6"/>' +
    '<circle cx="40" cy="25" r="2.2" fill="#6BAA5C"/>' +
    '<path d="M50 9l3 24M55 9l-2 24" stroke="#C9A46A" stroke-width="1.6" stroke-linecap="round"/>',
  // Бабушкины пельмени: тарелка, пельмени и ложка сметаны
  grandma_pelmeni:
    '<ellipse cx="30" cy="35" rx="21" ry="7" fill="#C1C7D1"/>' +
    '<ellipse cx="30" cy="33" rx="21" ry="7" fill="#EDF0F4"/>' +
    '<path d="M19 31a6 5 0 0 1 12 0q-6 3-12 0z" fill="#F2E7D4"/>' +
    '<path d="M29 29a6 5 0 0 1 12 0q-6 3-12 0z" fill="#F7EEDE"/>' +
    '<path d="M24 26a6 5 0 0 1 12 0q-6 3-12 0z" fill="#EDDFC8"/>' +
    '<ellipse cx="34" cy="25" rx="5" ry="3" fill="#FBFBF7"/>' +
    '<path d="M22 23q3-2 6 0" stroke="#6BAA5C" stroke-width="1.4" fill="none" stroke-linecap="round"/>',
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
  // Велосипед: рама-треугольник, руль, седло, втулки
  bike:
    '<circle cx="14" cy="31" r="9" fill="none" stroke="#7E8BA3" stroke-width="2"/>' +
    '<circle cx="45" cy="31" r="9" fill="none" stroke="#7E8BA3" stroke-width="2"/>' +
    '<path d="M14 31l9-13h11l11 13M23 18h13l-5 13H14" fill="none" stroke="#9AA6BE" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<path d="M33 16h9" stroke="#9AA6BE" stroke-width="2" stroke-linecap="round"/>' +
    '<path d="M21 17h6" stroke="#C7452F" stroke-width="2.6" stroke-linecap="round"/>' +
    '<circle cx="29" cy="31" r="2" fill="#5B6B8C"/>',
  // Мотоцикл: низкая посадка, обтекатель, выхлоп
  moto:
    '<circle cx="14" cy="31" r="8.5" fill="#20242E"/><circle cx="14" cy="31" r="4" fill="#7E8BA3"/>' +
    '<circle cx="46" cy="31" r="8.5" fill="#20242E"/><circle cx="46" cy="31" r="4" fill="#7E8BA3"/>' +
    '<path d="M18 28l6-9h12l8 9-6 4H24z" fill="#C7452F"/>' +
    '<path d="M36 19l7 4-3 4-6-4z" fill="#9E3425"/>' +
    '<path d="M24 19h-6l-3 4" fill="none" stroke="#7E8BA3" stroke-width="2.4" stroke-linecap="round"/>' +
    '<rect x="26" y="16" width="11" height="4" rx="2" fill="#2B3446"/>' +
    '<path d="M42 31h9" stroke="#9AA6BE" stroke-width="3" stroke-linecap="round"/>',
  // Хэтчбек: короткий задний свес, покатая дверь багажника
  hatch:
    '<path d="M8 32l2-8c1-3 3-4 6-4h6l6-7h12c3 0 5 1 7 4l5 7c3 1 4 3 4 6v2z" fill="#7A8296"/>' +
    '<path d="M24 20l5-6h10c2 0 4 1 5 3l3 3z" fill="#AEC3D6"/>' +
    '<path d="M31 14h8c2 0 4 1 5 3l3 3h-8z" fill="#8FA8BF"/>' +
    '<path d="M8 32h48v2a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2z" fill="#4A5262"/>' +
    '<circle cx="19" cy="34" r="6" fill="#20242E"/><circle cx="19" cy="34" r="2.6" fill="#9AA6BE"/>' +
    '<circle cx="45" cy="34" r="6" fill="#20242E"/><circle cx="45" cy="34" r="2.6" fill="#9AA6BE"/>',
  // Седан: три объёма, длинный багажник, хромовая линия
  sedan:
    '<path d="M5 32l2-7c1-3 3-5 7-5h5l7-7h14c3 0 6 1 8 4l5 8c4 1 6 3 6 7z" fill="#2F6BA8"/>' +
    '<path d="M23 20l6-6h12c2 0 4 1 6 3l3 3z" fill="#B9D4EA"/>' +
    '<path d="M32 14h9c2 0 4 1 6 3l3 3h-9z" fill="#8FB6D6"/>' +
    '<path d="M5 30h54" stroke="#C9D6E4" stroke-width="1" opacity=".6"/>' +
    '<path d="M5 32h54v2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" fill="#274F77"/>' +
    '<circle cx="17" cy="34" r="6.5" fill="#20242E"/><circle cx="17" cy="34" r="2.8" fill="#C9D6E4"/>' +
    '<circle cx="46" cy="34" r="6.5" fill="#20242E"/><circle cx="46" cy="34" r="2.8" fill="#C9D6E4"/>',
  // Внедорожник: высокий кузов, рейлинги, большие колёса и клиренс
  suv:
    '<path d="M6 30l1-9c0-3 2-5 5-5h9l5-7h16c3 0 5 1 7 4l5 8c4 1 5 3 5 7v2z" fill="#3B4A3E"/>' +
    '<path d="M24 16l4-5h13c2 0 4 1 5 3l3 4z" fill="#A9C4D6"/>' +
    '<path d="M32 11h9c2 0 4 1 5 3l3 4h-9z" fill="#82A3B9"/>' +
    '<rect x="22" y="8" width="24" height="2" rx="1" fill="#2B3446"/>' +
    '<path d="M6 30h53v3a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" fill="#2B3830"/>' +
    '<circle cx="18" cy="33" r="8" fill="#20242E"/><circle cx="18" cy="33" r="3.4" fill="#B7C2D2"/>' +
    '<circle cx="46" cy="33" r="8" fill="#20242E"/><circle cx="46" cy="33" r="3.4" fill="#B7C2D2"/>',
  // Электромобиль: гладкий нос без решётки, световые полосы, знак заряда
  ev:
    '<path d="M5 32l1-8c1-4 4-6 8-6h6l6-6h14c4 0 7 2 9 5l4 7c4 1 6 3 6 8z" fill="#1F7A6B"/>' +
    '<path d="M22 18l6-6h13c3 0 5 1 7 4l2 2z" fill="#BFE3DC"/>' +
    '<path d="M32 12h9c3 0 5 1 7 4l2 2h-9z" fill="#8FC7BB"/>' +
    '<rect x="6" y="24" width="8" height="2" rx="1" fill="#DFF5EF"/>' +
    '<rect x="50" y="24" width="8" height="2" rx="1" fill="#F2B8B8"/>' +
    '<path d="M5 32h54v2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" fill="#155C51"/>' +
    '<circle cx="17" cy="34" r="6.5" fill="#20242E"/><circle cx="17" cy="34" r="2.8" fill="#CFE9E2"/>' +
    '<circle cx="46" cy="34" r="6.5" fill="#20242E"/><circle cx="46" cy="34" r="2.8" fill="#CFE9E2"/>' +
    '<path d="M31 22l-3 5h3l-1 4 4-6h-3z" fill="#DFF5EF"/>',
  // Спорткар: клиновидный профиль, низкая крыша, широкие арки, антикрыло
  sport:
    '<path d="M3 32l3-5c2-3 6-4 10-5l9-6h13c5 0 9 2 12 6l6 6c2 1 3 2 3 4z" fill="#C7302B"/>' +
    '<path d="M25 16h12c4 0 7 2 9 5l2 2-26 1z" fill="#D9E6F2"/>' +
    '<path d="M33 16h4c4 0 7 2 9 5l2 2h-8z" fill="#A9C1D6"/>' +
    '<path d="M6 27q12-4 26-4t24 3" fill="none" stroke="#E86B5C" stroke-width="1.2" opacity=".8"/>' +
    '<path d="M3 32h56v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="#8E211D"/>' +
    '<path d="M50 14h9v2h-9z" fill="#2B3446"/><path d="M52 16v4M57 16v4" stroke="#2B3446" stroke-width="1.6"/>' +
    '<path d="M11 28a8 5 0 0 1 16 0z" fill="#8E211D" opacity=".55"/>' +
    '<path d="M36 28a8 5 0 0 1 16 0z" fill="#8E211D" opacity=".55"/>' +
    '<circle cx="19" cy="33" r="7" fill="#20242E"/><circle cx="19" cy="33" r="3" fill="#E6C24A"/>' +
    '<circle cx="44" cy="33" r="7" fill="#20242E"/><circle cx="44" cy="33" r="3" fill="#E6C24A"/>',
};

/** Детальная боковая иконка машины по типу кузова (с колёсами, окнами и бликом) — для карточки в магазине. */
export function carIcon(body: string): string {
  return WRAP(CAR_SHAPES[body] ?? CAR_SHAPES.hatch);
}
