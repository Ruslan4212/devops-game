import { describe, expect, it } from "vitest";
import { certificateText } from "../src/ui/certificate";
import type { CertStats } from "../src/ui/certificate";

const base: CertStats = {
  username: "Руслан",
  xp: 1620,
  rank: "Крепкий Middle",
  lessonsDone: 123,
  lessonsTotal: 123,
  capstone: true,
  path: ["Терминал", "Git", "Docker", "Kubernetes", "On-call: инциденты"],
  date: "10 сентября 2026 г.",
};

describe("сертификат — текст", () => {
  it("перечисляет ключевые факты прохождения", () => {
    const lines = certificateText(base);
    expect(lines.join("\n")).toContain("Terminal Ops Academy");
    expect(lines.some((l) => l.includes("123 из 123"))).toBe(true);
    expect(lines.some((l) => l.includes("Крепкий Middle") && l.includes("1620 XP"))).toBe(true);
    expect(lines.some((l) => l.includes("Терминал → Git → Docker"))).toBe(true);
  });

  it("честно отражает статус капстоуна", () => {
    expect(certificateText({ ...base, capstone: false }).some((l) => l.includes("не выполнен"))).toBe(true);
    expect(certificateText({ ...base, capstone: true }).every((l) => !l.includes("не выполнен"))).toBe(true);
  });
});
