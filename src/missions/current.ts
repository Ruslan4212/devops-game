import type { Mission } from "../engine/types";

// Команде `help` нужно знать текущее задание, но задания не должны зависеть от UI.
// Поэтому ссылка живёт здесь, а UI её проставляет.
let cur: Mission | null = null;
export const setCurrentMission = (m: Mission | null): void => {
  cur = m;
};
export const currentMission = (): Mission | null => cur;
