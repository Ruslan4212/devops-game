import { getNode, readFile, resolvePath } from "../engine/vfs";
import type { World } from "../engine/types";

/** Команда была выполнена успешно (код 0). */
/**
 * Команда без префикса sudo. На боевом сервере половину таких команд набирают
 * через sudo по привычке, и шаблон вида /^ss\b/ не срабатывал, хотя человек
 * сделал ровно то, что просили.
 */
const bare = (cmd: string): string => cmd.trim().replace(/^sudo\s+/, "");

export const ran =
  (re: RegExp) =>
  (w: World): boolean =>
    w.log.some((l) => (re.test(l.cmd) || re.test(bare(l.cmd))) && l.code === 0);

/** Команда была выполнена, независимо от кода возврата — для диагностики, где ошибка ожидаема. */
export const ranAny =
  (re: RegExp) =>
  (w: World): boolean =>
    w.log.some((l) => re.test(l.cmd) || re.test(bare(l.cmd)));

/** Файл существует и (опционально) его содержимое подходит под шаблон. */
export const has =
  (path: string, re?: RegExp) =>
  (w: World): boolean => {
    const c = readFile(w, resolvePath(w, path));
    return c != null && (re ? re.test(c) : true);
  };

/** Узел (файл или каталог) существует по абсолютному пути. */
export const exists =
  (abs: string) =>
  (w: World): boolean =>
    !!getNode(w, abs);
