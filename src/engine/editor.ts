import { mkdirp, parentOf, resolvePath, writeFile } from "./vfs";
import type { World } from "./types";

/**
 * Единая точка сохранения файла из редактора.
 * И UI, и тесты идут через неё — иначе тест мог бы проходить там,
 * где живой игрок получает другой результат.
 */
export function applyFileEdit(w: World, path: string, content: string): string {
  const abs = resolvePath(w, path);
  mkdirp(w, parentOf(abs)[0]);
  writeFile(w, abs, content);
  // workflow должен попасть в состояние CI, иначе git push не запустит пайплайн
  if (/\.github\/workflows\/.*\.ya?ml$/.test(abs)) w.ci.workflow = content;
  return abs;
}
