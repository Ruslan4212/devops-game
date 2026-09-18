import { $, lockInput } from "./dom";
import { readFile } from "../engine/vfs";
import type { World } from "../engine/types";

let path: string | null = null;
let onSaved: ((path: string, content: string) => void) | null = null;

export function openEditor(w: World, abs: string, saved: (path: string, content: string) => void): void {
  path = abs;
  onSaved = saved;
  // если файла ещё нет — подставляем заготовку задания с пояснениями
  const content = readFile(w, abs) ?? w.templates?.[abs] ?? "";
  $("#edName").textContent = abs;
  $<HTMLTextAreaElement>("#edText").value = content;
  $("#edOv").classList.remove("hide");
  lockInput(true);
  setTimeout(() => $<HTMLTextAreaElement>("#edText").focus(), 40);
}

function close(): void {
  $("#edOv").classList.add("hide");
  lockInput(false);
}

export function initEditor(): void {
  const save = (): void => {
    if (path && onSaved) onSaved(path, $<HTMLTextAreaElement>("#edText").value);
    close();
  };
  $("#edSave").onclick = save;
  $("#edCancel").onclick = close;
  $<HTMLTextAreaElement>("#edText").addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      save();
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const t = e.target as HTMLTextAreaElement;
      const s = t.selectionStart;
      t.value = t.value.slice(0, s) + "  " + t.value.slice(t.selectionEnd);
      t.selectionStart = t.selectionEnd = s + 2;
    }
    // Перенос строки раньше отдавался на откуп браузеру по умолчанию — в части
    // окружений (виртуальные раскладки, некоторые методы ввода при наборе
    // кириллицы, автоматизация) Enter в textarea не вставлял \n, и две строки
    // задания слипались в одну ("#!/bin/bashecho ..."), из-за чего проверка
    // шебанга не проходила и урок было невозможно пройти. Вставляем перенос
    // строки явно, не полагаясь на нативное поведение поля.
    if (e.key === "Enter" && !e.isComposing) {
      e.preventDefault();
      const t = e.target as HTMLTextAreaElement;
      const s = t.selectionStart;
      const en = t.selectionEnd;
      t.value = t.value.slice(0, s) + "\n" + t.value.slice(en);
      t.selectionStart = t.selectionEnd = s + 1;
    }
  });
}
