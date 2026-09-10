import { describe, expect, it } from "vitest";
import { closeReason, encodeAuth, encodeInput, encodeResize, parseServerMsg } from "../src/sandbox/client";

describe("протокол песочницы — разбор сообщений сервера", () => {
  it("принимает валидный ready", () => {
    expect(parseServerMsg('{"type":"ready","minutes":15}')).toEqual({ type: "ready", minutes: 15 });
  });

  it("принимает валидный out", () => {
    expect(parseServerMsg('{"type":"out","data":"$ ls\\n"}')).toEqual({ type: "out", data: "$ ls\n" });
  });

  it("отбраковывает мусор и неизвестные типы", () => {
    const bad = [
      "",
      "не json",
      "{}",
      "null",
      "[1,2]",
      '{"type":"out"}',
      '{"type":"ready","minutes":"x"}',
      '{"type":"boom","data":"x"}',
    ];
    for (const s of bad) expect(parseServerMsg(s), s).toBeNull();
  });
});

describe("протокол песочницы — кодирование сообщений клиента", () => {
  it("auth", () => {
    expect(JSON.parse(encodeAuth("jwt-123"))).toEqual({ token: "jwt-123" });
  });
  it("input сохраняет управляющие символы", () => {
    expect(JSON.parse(encodeInput(""))).toEqual({ type: "in", data: "" });
  });
  it("resize", () => {
    expect(JSON.parse(encodeResize(120, 40))).toEqual({ type: "resize", cols: 120, rows: 40 });
  });
});

describe("протокол песочницы — коды закрытия", () => {
  it("известные коды дают внятную русскую причину", () => {
    expect(closeReason(4009)).toMatch(/сесси/i);
    expect(closeReason(4029)).toMatch(/занят/i);
    expect(closeReason(4001)).toMatch(/войти/i);
  });
  it("неизвестный код — общий текст, не падает", () => {
    expect(typeof closeReason(4999)).toBe("string");
    expect(closeReason(4999).length).toBeGreaterThan(0);
  });
});
