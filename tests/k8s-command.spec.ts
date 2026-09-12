import { describe, expect, it } from "vitest";
import { execLine } from "../src/engine/shell";
import { newWorld } from "../src/engine/world";
import { writeFile } from "../src/engine/vfs";
import { k8sInit } from "../src/commands/k8s";

const DEPLOY =
  "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: api\nspec:\n  replicas: 3\n" +
  "  template:\n    spec:\n      containers:\n        - name: api\n          image: shop:1.0\n" +
  "          env:\n            - name: DB_URL\n              value: postgres://db-main/shop\n";

describe("kubectl: Pending при нехватке ёмкости узлов", () => {
  it("без nodeCapacity все поды Running (поведение не изменилось)", () => {
    const w = newWorld();
    writeFile(w, "/home/devops/deploy.yaml", DEPLOY);
    execLine(w, "kubectl apply -f deploy.yaml");
    expect(w.k8s!.pods.every((p) => p.status === "Running")).toBe(true);
  });

  it("с nodeCapacity лишние поды уходят в Pending", () => {
    const w = newWorld();
    k8sInit(w).nodeCapacity = 2;
    writeFile(w, "/home/devops/deploy.yaml", DEPLOY);
    execLine(w, "kubectl apply -f deploy.yaml");
    const statuses = w.k8s!.pods.map((p) => p.status);
    expect(statuses.filter((s) => s === "Running").length).toBe(2);
    expect(statuses.filter((s) => s === "Pending").length).toBe(1);
  });

  it("describe pod для Pending показывает FailedScheduling", () => {
    const w = newWorld();
    k8sInit(w).nodeCapacity = 1;
    writeFile(w, "/home/devops/deploy.yaml", DEPLOY);
    execLine(w, "kubectl apply -f deploy.yaml");
    const pending = w.k8s!.pods.find((p) => p.status === "Pending")!;
    const r = execLine(w, "kubectl describe pod " + pending.name);
    expect(r.out).toContain("FailedScheduling");
  });
});
