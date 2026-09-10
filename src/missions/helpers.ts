import { getNode, readFile, resolvePath } from "../engine/vfs";
import type { World } from "../engine/types";

/** Команда была выполнена успешно (код 0). */
export const ran =
  (re: RegExp) =>
  (w: World): boolean =>
    w.log.some((l) => re.test(l.cmd) && l.code === 0);

/** Команда была выполнена, независимо от кода возврата — для диагностики, где ошибка ожидаема. */
export const ranAny =
  (re: RegExp) =>
  (w: World): boolean =>
    w.log.some((l) => re.test(l.cmd));

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
