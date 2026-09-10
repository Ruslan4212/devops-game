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
import { act11 } from "./act11";
import { act12 } from "./act12";
import { act13 } from "./act13";
import { act14 } from "./act14";
import { examOfAct } from "./exams";
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
  { id: 11, name: "Мониторинг: Prometheus" },
  { id: 12, name: "Grafana: дашборды" },
  { id: 13, name: "Zabbix: агент и мониторинг" },
  { id: 14, name: "Python для DevOps" },
];

const ACT_LESSONS: readonly (readonly Lesson[])[] = [
  act01,
  act02,
  act03,
  act04,
  act05,
  act06,
  act07,
  act08,
  act09,
  act10,
  act11,
  act12,
  act13,
  act14,
];

/**
 * Все 10 актов переписаны вручную в пошаговую модель
 * «смотри → повтори → сделай → вопрос»: демонстрация команды, повтор за ней,
 * самостоятельная задача с авто-подсказкой и авто-ответом, проверочный вопрос.
 * После уроков каждого акта идёт экзамен — вопросы по возрастанию сложности (d1→d7).
 */
export const LESSONS: Lesson[] = ACT_LESSONS.flatMap((lessons) => {
  const act = lessons[0]?.act;
  const exam = typeof act === "number" ? examOfAct(act) : undefined;
  return exam ? [...lessons, exam] : [...lessons];
});

export const lessonById = (id: string): Lesson | undefined => LESSONS.find((l) => l.id === id);
export const TOTAL_XP = LESSONS.reduce((s, l) => s + l.xp, 0);
