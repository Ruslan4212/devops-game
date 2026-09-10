import { act01 } from "./act01";
import { act02 } from "./act02";
import { act03 } from "./act03";
import { act04 } from "./act04";
import { act05 } from "./act05";
import { act06 } from "./act06";
import { act07 } from "./act07";
import { act08 } from "./act08";
import { act09 } from "./act09";
import { act10 } from "./act10";
import type { Act, Lesson } from "../engine/types";

export const ACTS: Act[] = [
  { id: 1, name: "Терминал" },
  { id: 2, name: "Права и процессы" },
  { id: 3, name: "Bash-скрипты" },
  { id: 4, name: "Сети" },
  { id: 5, name: "Git" },
  { id: 6, name: "Docker" },
  { id: 7, name: "CI/CD" },
  { id: 8, name: "Terraform / IaC" },
  { id: 9, name: "Kubernetes" },
  { id: 10, name: "On-call: инциденты" },
];

/**
 * Все 10 актов переписаны вручную в пошаговую модель
 * «смотри → повтори → сделай → вопрос»: демонстрация команды, повтор за ней,
 * самостоятельная задача с авто-подсказкой и авто-ответом, проверочный вопрос.
 */
export const LESSONS: Lesson[] = [
  ...act01,
  ...act02,
  ...act03,
  ...act04,
  ...act05,
  ...act06,
  ...act07,
  ...act08,
  ...act09,
  ...act10,
];

export const lessonById = (id: string): Lesson | undefined => LESSONS.find((l) => l.id === id);
export const TOTAL_XP = LESSONS.reduce((s, l) => s + l.xp, 0);
