import { describe, expect, it } from "vitest";
import { conceptsOf, localGrade, type GradeInput } from "../src/engine/grader";

/** Вопрос как он выглядит в уроке: верный вариант плюс типичные заблуждения. */
const Q = (o: Partial<GradeInput> = {}): GradeInput => ({
  question: "Вопрос?",
  options: ["верный вариант", "неверный вариант"],
  answerIx: 0,
  explain: "",
  userAnswer: "",
  ...o,
});

const whoami = (userAnswer: string): GradeInput =>
  Q({
    question: "Что показывает команда whoami?",
    options: [
      "имя пользователя, под которым ты вошёл в систему",
      "имя сервера, на котором ты работаешь",
      "список всех пользователей системы",
    ],
    answerIx: 0,
    explain: "Она печатает того, от чьего имени сейчас выполняются команды.",
    userAnswer,
  });

const secrets = (userAnswer: string): GradeInput =>
  Q({
    question: "Почему секреты хранят в переменных окружения, а не в коде?",
    options: [
      "код одинаково работает на любом сервере, а секрет не попадает в git вместе с кодом",
      "так программа работает быстрее",
      "иначе программу вообще нельзя запустить",
    ],
    answerIx: 0,
    explain: "Секрет в коде рано или поздно утечёт вместе с репозиторием.",
    userAnswer,
  });

describe("проверка ответа понимает смысл, а не слова", () => {
  it("принимает пересказ своими словами", () => {
    expect(localGrade(whoami("печатает имя юзера, под которым я сейчас работаю")).correct).toBe(true);
  });

  it("принимает синонимы предметной области вместо слов из учебника", () => {
    const r = localGrade(
      Q({
        question: "Что делает rm -r?",
        options: ["рекурсивно удаляет каталог со всем содержимым", "переименовывает каталог"],
        explain: "Удаление необратимо: корзины в терминале нет.",
        userAnswer: "сносит папку вместе со всем, что внутри",
      }),
    );
    expect(r.correct).toBe(true);
  });

  it("принимает очень короткий, но точный ответ — ограничения на длину нет", () => {
    expect(localGrade(whoami("имя пользователя")).correct).toBe(true);
  });

  it("принимает ответ из одного слова, если это слово и есть суть", () => {
    const r = localGrade(
      Q({
        question: "Куда попадёт вывод команды, если написать > file.txt?",
        options: ["в файл", "на экран"],
        explain: "Перенаправление уводит вывод с экрана в файл.",
        userAnswer: "в файл",
      }),
    );
    expect(r.correct).toBe(true);
  });
});

describe("разбор именно моей ошибки", () => {
  it("называет тот неверный вариант, который игрок пересказал", () => {
    const r = localGrade(whoami("показывает имя сервера, на котором я сижу"));
    expect(r.correct).toBe(false);
    expect(r.feedback).toContain("имя сервера");
  });

  it("ловит перевёрнутый смысл: то же понятие, но наоборот", () => {
    const r = localGrade(
      Q({
        question: "Опасно ли rm -rf в чужой папке?",
        options: ["да, это опасно: удаление необратимо", "нет, ничего страшного"],
        explain: "Корзины в терминале нет, восстановить нечем.",
        userAnswer: "нет, это не опасно",
      }),
    );
    expect(r.correct).toBe(false);
  });

  it("говорит, чего именно не хватило, когда начало верное", () => {
    const r = localGrade(secrets("чтобы код работал на любом сервере"));
    expect(r.feedback).toMatch(/не хватает главного|Для полноты/);
  });

  it("на верный ответ подтверждает суть и подсказывает, что дополнить", () => {
    const r = localGrade(secrets("секрет не попадет в git вместе с кодом, иначе утечет"));
    expect(r.correct).toBe(true);
    expect(r.feedback).toMatch(/Верно по сути/);
  });

  it("в разборе всегда есть правильная формулировка", () => {
    const r = localGrade(
      Q({ options: ["уникальная правильная формулировка", "мимо"], userAnswer: "ерунда" }),
    );
    expect(r.feedback).toContain("уникальная правильная формулировка");
  });
});

describe("грубые случаи", () => {
  it("отклоняет пустой ответ", () => {
    expect(localGrade(whoami("")).correct).toBe(false);
  });

  it("отклоняет ответ совсем не по теме", () => {
    expect(localGrade(whoami("я люблю пиццу с ананасами по выходным")).correct).toBe(false);
  });
});

describe("разбор текста на понятия", () => {
  const keys = (t: string): string[] => conceptsOf(t).map((c) => c.key);

  it("склеивает формы одного слова", () => {
    expect(keys("процессы")[0]).toBe(keys("процессу")[0]);
    expect(keys("удалил")[0]).toBe(keys("удаление")[0]);
  });

  it("помечает отрицание, а не выбрасывает его", () => {
    expect(conceptsOf("это не опасно")[0].negated).toBe(true);
    expect(conceptsOf("это опасно")[0].negated).toBe(false);
    // отрицание не должно «протекать» на понятия из соседнего предложения
    expect(conceptsOf("не опасно, файл сохранится").at(-1)?.negated).toBe(false);
  });
});
