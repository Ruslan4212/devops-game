export type ThemeChoice = "system" | "light" | "dark";

const KEY = "ops_theme";

export function readTheme(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

/** «Системная» — без атрибута: тогда тему выбирает prefers-color-scheme в CSS. */
export function applyTheme(t: ThemeChoice): void {
  const root = document.documentElement;
  if (t === "system") delete root.dataset.theme;
  else root.dataset.theme = t;
}

function store(t: ThemeChoice): void {
  try {
    if (t === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, t);
  } catch {
    /* приватный режим — тема применится до перезагрузки */
  }
  applyTheme(t);
}

/** Кнопка темы в шапке: светлая ↔ тёмная относительно того, что видно сейчас. */
export function toggleTheme(): void {
  const t = readTheme();
  const dark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  store(dark ? "light" : "dark");
}

export function initThemeSwitch(scope: HTMLElement): void {
  const opts = [...scope.querySelectorAll<HTMLButtonElement>("[data-theme-opt]")];
  const sync = (t: ThemeChoice): void => {
    for (const o of opts) o.setAttribute("aria-checked", String(o.dataset.themeOpt === t));
  };
  const current = readTheme();
  applyTheme(current);
  sync(current);
  for (const o of opts) {
    o.onclick = () => {
      const t = o.dataset.themeOpt as ThemeChoice;
      store(t);
      sync(t);
    };
  }
}
