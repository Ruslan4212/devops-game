import { describe, expect, it } from "vitest";
import { execLine } from "../src/engine/shell";
import { newWorld } from "../src/engine/world";
import { zabbixInit } from "../src/commands/zabbix";

describe("zabbix: триггеры и problems", () => {
  it("trigger add с плохим выражением отклоняется", () => {
    const w = newWorld();
    const r = execLine(w, 'zabbix trigger add "CPU" "cpu > 5" high');
    expect(r.code).toBe(1);
    expect(zabbixInit(w).triggers.length).toBe(0);
  });

  it("trigger add сохраняет триггер, trigger list его показывает", () => {
    const w = newWorld();
    execLine(w, 'zabbix trigger add "CPU high" "last(system.cpu.load[all,avg1])>1" average');
    expect(zabbixInit(w).triggers).toEqual([
      { name: "CPU high", expr: "last(system.cpu.load[all,avg1])>1", severity: "average" },
    ]);
    const r = execLine(w, "zabbix trigger list");
    expect(r.out).toContain("CPU high");
    expect(r.out).toContain("average");
  });

  it("problems без serverReaches — все триггеры NODATA", () => {
    const w = newWorld();
    execLine(w, 'zabbix trigger add "CPU high" "last(system.cpu.load[all,avg1])>1" average');
    const r = execLine(w, "zabbix problems");
    expect(r.out).toContain("NODATA");
  });

  it("problems с serverReaches и превышенным порогом — PROBLEM", () => {
    const w = newWorld();
    const z = zabbixInit(w);
    z.serverReaches = true;
    execLine(w, 'zabbix trigger add "CPU high" "last(system.cpu.load[all,avg1])>1" average');
    const r = execLine(w, "zabbix problems");
    expect(r.out).toContain("PROBLEM");
  });

  it("problems с serverReaches и порогом ниже значения — OK", () => {
    const w = newWorld();
    const z = zabbixInit(w);
    z.serverReaches = true;
    execLine(w, 'zabbix trigger add "CPU high" "last(system.cpu.load[all,avg1])>100" average');
    const r = execLine(w, "zabbix problems");
    expect(r.out).toContain("OK");
  });

  it("problems без триггеров — сообщение, что оценивать нечего", () => {
    const w = newWorld();
    const r = execLine(w, "zabbix problems");
    expect(r.out).toMatch(/нечего оценивать/);
  });
});
