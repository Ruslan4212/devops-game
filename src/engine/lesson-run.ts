import { applyFileEdit } from "./editor";
import { execLine } from "./shell";
import { newWorld } from "./world";
import type { CmdResult, DoStep, Lesson, QuizStep, Step, TypeStep, World } from "./types";

/** Что панель должна сделать после действия игрока. */
export type StepResult =
  | { status: "advance"; printOut?: string; printTone?: "ok" | "err" | null }
  | { status: "retry"; feedback: string; reveal?: string };

const norm = (s: string): string => s.toLowerCase().replace(/\s+/g, " ").trim().replace(/\s*;$/, "");

/** Короткое дружелюбное объяснение, чем набранное отличается от нужного. */
function typoHint(got: string, want: string): string {
  const g = got.trim();
  if (!g) return `Ты ничего не набрал. Нужно набрать: ${want}`;
  return `Почти. Ты набрал:  ${g}\nА нужно ровно:   ${want}`;
}

/**
 * Один заход в урок. Ведёт игрока по шагам: смотри -> повтори -> сделай -> вопрос.
 * И игра, и тесты идут через этот класс — правила прохождения одни и те же.
 */
export class LessonRun {
  readonly world: World;
  readonly lesson: Lesson;
  /** строгий режим: подсказка позже, готовый ответ — только по явному запросу и после 4 промахов */
  readonly strict: boolean;
  stepIx = 0;
  /** сколько раз игрок промахнулся на текущем шаге */
  attempts = 0;
  finished = false;

  constructor(lesson: Lesson, opts: { strict?: boolean } = {}) {
    this.lesson = lesson;
    this.strict = !!opts.strict;
    this.world = newWorld();
    lesson.setup?.(this.world);
  }

  /** После скольких промахов показывать подсказку. */
  private get hintAt(): number {
    return this.strict ? 2 : 1;
  }

  /** После скольких промахов «сделай»-шаг раскрывает готовый ответ. */
  get revealAt(): number {
    return this.strict ? 4 : 2;
  }

  /** Можно ли уже предложить кнопку «показать ответ». */
  get canReveal(): boolean {
    return !this.strict || this.attempts >= 2;
  }

  get step(): Step {
    return this.lesson.steps[this.stepIx];
  }

  get position(): { i: number; n: number } {
    return { i: this.stepIx + 1, n: this.lesson.steps.length };
  }

  /** Ответ уже раскрыт? («сделай» превращается в «повтори» после revealAt промахов) */
  get answerRevealed(): boolean {
    return this.step.kind === "do" && this.attempts >= this.revealAt;
  }

  private goNext(): void {
    this.attempts = 0;
    if (this.stepIx < this.lesson.steps.length - 1) this.stepIx++;
    else this.finished = true;
  }

  /** Для say / watch / принятого объяснения — просто идём дальше. */
  ackAndAdvance(): void {
    this.goNext();
  }

  /** Выполняет команду шага «смотри» без записи в историю (демонстрация). */
  runWatch(): { cmd: string; out: string; note: string } {
    if (this.step.kind !== "watch") throw new Error("runWatch вне watch-шага");
    const r = execLine(this.world, this.step.run, { record: false });
    return { cmd: this.step.run, out: r.out, note: this.step.note };
  }

  submitType(input: string): StepResult {
    const step = this.step as TypeStep;
    if (norm(input) === norm(step.cmd)) {
      const r = execLine(this.world, input);
      this.goNext();
      return { status: "advance", printOut: r.out, printTone: r.err ? "err" : null };
    }
    this.attempts++;
    return { status: "retry", feedback: typoHint(input, step.cmd), reveal: step.cmd };
  }

  submitDo(input: string): StepResult {
    const step = this.step as DoStep;
    const r: CmdResult = execLine(this.world, input);
    if (step.check(this.world)) {
      this.goNext();
      return { status: "advance", printOut: r.out, printTone: r.err ? "err" : null };
    }
    this.attempts++;
    let feedback = r.err ? r.out : "Это выполнилось, но задача шага ещё не закрыта.";
    if (this.attempts === this.hintAt) feedback += `\n\n💡 Подсказка: ${step.hint}`;
    const reveal = this.attempts >= this.revealAt ? step.answer : undefined;
    if (reveal) feedback += `\n\nНе получается — просто набери это:\n${step.answer}`;
    return { status: "retry", feedback, reveal };
  }

  submitQuiz(choice: number): StepResult {
    const step = this.step as QuizStep;
    if (choice === step.answer) {
      this.goNext();
      return { status: "advance", printOut: step.explain, printTone: "ok" };
    }
    this.attempts++;
    return { status: "retry", feedback: step.explain };
  }

  /** Игрок сохранил файл в редакторе (актуально для «сделай»-шагов актов 2–10). */
  applyEdit(path: string, content: string): StepResult {
    applyFileEdit(this.world, path, content);
    if (this.step.kind === "do" && (this.step as DoStep).check(this.world)) {
      this.goNext();
      return { status: "advance" };
    }
    this.attempts++;
    const step = this.step as DoStep;
    let feedback = "Файл сохранён, но задача шага ещё не закрыта.";
    if (step.kind === "do" && this.attempts === this.hintAt) feedback += `\n\n💡 ${step.hint}`;
    return {
      status: "retry",
      feedback,
      reveal: this.attempts >= this.revealAt && step.kind === "do" ? step.answer : undefined,
    };
  }

  /** Игрок нажал «показать ответ» на «сделай» шаге. */
  forceReveal(): string | null {
    if (this.step.kind !== "do") return null;
    this.attempts = Math.max(this.attempts, this.revealAt);
    return (this.step as DoStep).answer;
  }

  /** Проигрывает урок целиком «правильными» ответами — для тестов. */
  autoplay(): void {
    if (this.lesson.replay) return this.autoplayLegacy();
    let guard = 0;
    while (!this.finished && guard++ < 500) {
      const s = this.step;
      switch (s.kind) {
        case "say":
        case "watch":
          this.ackAndAdvance();
          break;
        case "type":
          this.submitType(s.cmd);
          break;
        case "do":
          // шаг может решаться правкой файла, а не командой
          if (s.editFile) this.applyEdit(s.editFile, s.answer);
          // ответ «сделай»-шага может быть многострочным (несколько команд)
          else this.autoDo(s.answer);
          break;
        case "quiz":
          this.submitQuiz(s.answer);
          break;
      }
    }
  }

  private autoDo(answer: string): void {
    const lines = answer
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
    for (const c of lines.slice(0, -1)) execLine(this.world, c);
    this.submitDo(lines[lines.length - 1] ?? answer);
  }

  /**
   * Урок-адаптер из старого задания: проигрываем его решение (`replay`) по шагам,
   * по ходу «липко» отмечая, какие «сделай»-шаги стали выполнены — ровно как это
   * делает игра, проверяя цели после каждой команды.
   */
  private autoplayLegacy(): void {
    const doIdx: number[] = [];
    this.lesson.steps.forEach((s, i) => {
      if (s.kind === "do") doIdx.push(i);
    });
    const passed = new Set<number>();
    const mark = (): void => {
      for (const di of doIdx) {
        if (!passed.has(di) && (this.lesson.steps[di] as DoStep).check(this.world)) passed.add(di);
      }
    };
    mark();
    for (const st of this.lesson.replay!) {
      if (typeof st === "string") execLine(this.world, st);
      else applyFileEdit(this.world, st.file, st.content);
      mark();
    }
    let guard = 0;
    while (!this.finished && guard++ < 500) {
      const s = this.step;
      if (s.kind === "do") {
        if (passed.has(this.stepIx)) this.goNext();
        else this.autoDo(s.answer);
      } else if (s.kind === "type") {
        this.submitType(s.cmd);
      } else if (s.kind === "quiz") {
        this.submitQuiz(s.answer);
      } else {
        this.ackAndAdvance();
      }
    }
  }
}
