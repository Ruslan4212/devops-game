import { afterEach, describe, expect, it, vi } from "vitest";
import { explainTopic, gradeAnswer, judgeCommand } from "../src/engine/grader";

const input = {
  question: "Чем > отличается от >>?",
  options: ["> перезаписывает, >> дописывает", "ничем"],
  answerIx: 0,
  explain: "Одна скобка стирает файл.",
  userAnswer: "одна затирает, две дописывают",
};

afterEach(() => vi.unstubAllGlobals());

function stub(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const calls: { url: string; init: RequestInit }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return handler(url, init);
    }),
  );
  return calls;
}

describe("проверка ответов через функцию Claude в Supabase", () => {
  it("вердикт Claude возвращается как есть, без пометки local", async () => {
    const calls = stub(() => Response.json({ correct: true, feedback: "Верно: > стирает, >> дописывает." }));
    const r = await gradeAnswer(input);
    expect(r).toEqual({ correct: true, feedback: "Верно: > стирает, >> дописывает." });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toMatch(/\/functions\/v1\/grader\/grade$/);
    expect((calls[0].init.headers as Record<string, string>).apikey).toBeTruthy();
    const sent = JSON.parse(String(calls[0].init.body));
    expect(sent.expected).toBe("> перезаписывает, >> дописывает");
    expect(sent.userAnswer).toBe(input.userAnswer);
  });

  it("если функция недоступна — честный откат на локальный разбор", async () => {
    stub(() => new Response("{}", { status: 502 }));
    expect((await gradeAnswer(input)).local).toBe(true);
  });

  it("если нет сети — тоже локальный разбор, игра не останавливается", async () => {
    stub(() => {
      throw new TypeError("Failed to fetch");
    });
    expect((await gradeAnswer(input)).local).toBe(true);
  });

  it("ответ не того вида не принимается за вердикт", async () => {
    stub(() => Response.json({ ok: true }));
    expect((await gradeAnswer(input)).local).toBe(true);
  });

  it("пустой ответ не тратит запрос к модели", async () => {
    const calls = stub(() => Response.json({ correct: true, feedback: "x" }));
    const r = await gradeAnswer({ ...input, userAnswer: "   " });
    expect(r.local).toBe(true);
    expect(calls).toHaveLength(0);
  });

  it("практическое задание судится той же функцией", async () => {
    const calls = stub(() =>
      Response.json({ correct: false, feedback: "Это список, а не путь. Подумай про pwd." }),
    );
    const r = await judgeCommand({
      lesson: "1.2",
      task: "узнай, где ты",
      expected: "pwd",
      command: "ls",
      output: "a b",
    });
    expect(r?.correct).toBe(false);
    expect(calls[0].url).toMatch(/\/grader\/command$/);
  });

  it("объяснение получает тип шага и то, где ученик застрял", async () => {
    const calls = stub(() => Response.json({ explanation: "Разбор." }));
    await explainTopic({
      topic: "chmod",
      kind: "do",
      attempt: "Ученик ввёл: chmod 999 a.sh\nТерминал ответил: chmod: invalid mode",
    });
    const sent = JSON.parse(String(calls[0].init.body));
    expect(sent.kind).toBe("do");
    expect(sent.attempt).toContain("chmod 999 a.sh");
    expect(calls[0].url).toMatch(/\/grader\/explain$/);
  });

  it("объяснение темы: текст или null", async () => {
    stub(() => Response.json({ explanation: "Подробно с примерами…" }));
    expect(await explainTopic({ topic: "chmod" })).toBe("Подробно с примерами…");
    stub(() => new Response("{}", { status: 502 }));
    expect(await explainTopic({ topic: "chmod" })).toBeNull();
  });
});
