import { GLOSSARY } from "../data/glossary";

/**
 * Временное решение: в текстах уроков команды выделены двойными пробелами
 * («команда  chmod  (от…»). Признак хрупкий, поэтому оформляем как код только
 * то, что действительно похоже на код — команду из словаря игры, путь, флаг,
 * имя файла, переменную, ключ=значение, инструкцию Dockerfile. Всё остальное
 * (в том числе одиночные слова вроде main или plan) остаётся текстом.
 * Правильное долгосрочное решение — разметить код прямо в исходниках уроков.
 */

const CYRILLIC = /[а-яё]/i;
const EXTRA_COMMANDS = [
  "set",
  "exit",
  "export",
  "source",
  "npm",
  "npx",
  "pip",
  "pip3",
  "python",
  "python3",
  "node",
  "edit",
  "nano",
  "vim",
  "ci",
  "promql",
  "promtool",
  "grafana",
  "zabbix",
  "zabbix_get",
  "zabbix_agentd",
  "helm",
];
const COMMANDS = new Set([...Object.keys(GLOSSARY.commands), ...EXTRA_COMMANDS]);
const OPERATORS = new Set(Object.keys(GLOSSARY.general));
const DOCKERFILE = /^(FROM|RUN|COPY|ADD|CMD|ENTRYPOINT|WORKDIR|ENV|EXPOSE|ARG|USER|VOLUME)\b/;

export function looksLikeCode(f: string): boolean {
  if (!f || CYRILLIC.test(f)) return false;
  const words = f.split(/\s+/);
  const head = words[0] === "sudo" && words[1] ? words[1] : words[0];
  if (COMMANDS.has(head) || OPERATORS.has(f)) return true;
  if (DOCKERFILE.test(f)) return true;
  // путь, домашний каталог, переменная, флаг: ./x, /etc, ~/x, $HOME, $#, "$1", -9, --force
  if (/^(\.{0,2}\/|~\/?|"?\$[{\w#?@*]|-{1,2}[\w])/.test(f)) return true;
  // вызовы и обращения: .get(), sys.argv[1], targets[].expr
  if (/\w*\(\)|\w\[[^\]]*\]/.test(f)) return true;
  // идентификаторы snake_case: prevent_destroy, node_modules
  if (/^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(f)) return true;
  // блок HCL и элемент YAML-списка: resource "local_file" "x", - run: npm test
  if (/^(resource|module|variable|output|provider) "/.test(f) || /^- [\w-]+:/.test(f)) return true;
  // путь внутри фрагмента или каталог со слэшем на конце: etc/nginx, dist/
  if (/\w\/[\w.*-]|\w\/$/.test(f)) return true;
  // имя файла или дотфайл: backup.sh, terraform.tfstate, .env, .gitignore
  if (/^\.?[\w-]+(\.[\w-]{1,9})+$/.test(f) || /^\.[\w-]+$/.test(f)) return true;
  // ключ=значение и переменные окружения: check=True, Restart=always, DB_URL
  if (/^[\w.-]+=\S*$/.test(f) || /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$/.test(f)) return true;
  // образ с тегом и YAML-ключ: shop:1.0, on: push
  if (/^[\w./-]+:[\w.-]+$/.test(f) || /^[a-z_-]+: \S+$/.test(f)) return true;
  // проверка test: [ -z "$X" ]; JSON-ключ: "expr": "..."; строка запроса: ?ref=v1.4.0
  if (/^\[ .*\]$/.test(f) || /^"[\w-]+":/.test(f) || /^\?\w+=/.test(f)) return true;
  // конвейеры и перенаправления
  if (/\s\|\s|\s>>?\s|&&|\|\|/.test(f)) return true;
  return false;
}

/** Фрагменты «··так··» (двойной пробел с обеих сторон, внутри строки текста). */
export const INLINE_FRAGMENT = /(?<=\S) {2}([^ \n](?:[^\n]*?[^ \n])?) {2}(?=\S|$)/gm;
