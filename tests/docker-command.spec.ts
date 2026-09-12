import { describe, expect, it } from "vitest";
import { execLine } from "../src/engine/shell";
import { newWorld } from "../src/engine/world";
import { writeFile } from "../src/engine/vfs";

const SINGLE = 'FROM node:20-alpine\nWORKDIR /app\nCOPY . .\nCMD ["node","index.js"]\n';
const MULTI =
  "FROM node:20-alpine AS builder\nWORKDIR /app\nCOPY . .\nRUN npm ci\n" +
  'FROM node:20-alpine\nWORKDIR /app\nCOPY --from=builder /app .\nCMD ["node","index.js"]\n';

describe("docker: -e, -v, rmi, размер образа", () => {
  it("-e кладёт переменные окружения в контейнер", () => {
    const w = newWorld();
    writeFile(w, "/home/devops/Dockerfile", SINGLE);
    execLine(w, "docker build -t app:1.0 .");
    execLine(w, "docker run -d -e STAGE=prod -e DEBUG=false --name web app:1.0");
    const c = w.docker.containers.find((x) => x.name === "web");
    expect(c?.env).toEqual({ STAGE: "prod", DEBUG: "false" });
  });

  it("-v запоминает примонтированный том", () => {
    const w = newWorld();
    writeFile(w, "/home/devops/Dockerfile", SINGLE);
    execLine(w, "docker build -t app:1.0 .");
    execLine(w, "docker run -d -v /data/db:/var/lib/db --name db app:1.0");
    const c = w.docker.containers.find((x) => x.name === "db");
    expect(c?.volumes).toEqual(["/data/db:/var/lib/db"]);
  });

  it("multi-stage сборка даёт заметно меньший размер, чем single-stage", () => {
    const w = newWorld();
    writeFile(w, "/home/devops/Dockerfile", SINGLE);
    execLine(w, "docker build -t app:single .");
    writeFile(w, "/home/devops/Dockerfile", MULTI);
    execLine(w, "docker build -t app:multi .");
    const single = w.docker.images.find((i) => i.tag === "app:single")!;
    const multi = w.docker.images.find((i) => i.tag === "app:multi")!;
    expect(multi.sizeMb!).toBeLessThan(single.sizeMb!);
  });

  it("rmi удаляет образ, но отказывает, если его использует running-контейнер", () => {
    const w = newWorld();
    writeFile(w, "/home/devops/Dockerfile", SINGLE);
    execLine(w, "docker build -t app:1.0 .");
    execLine(w, "docker run -d --name web app:1.0");
    const blocked = execLine(w, "docker rmi app:1.0");
    expect(blocked.code).not.toBe(0);
    execLine(w, "docker stop web");
    const ok = execLine(w, "docker rmi app:1.0");
    expect(ok.code).toBe(0);
    expect(w.docker.images.find((i) => i.tag === "app:1.0")).toBeUndefined();
  });
});
