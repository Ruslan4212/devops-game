import { describe, expect, it } from "vitest";
import { execLine } from "../src/engine/shell";
import { newWorld } from "../src/engine/world";
import { writeFile } from "../src/engine/vfs";
import type { World } from "../src/engine/types";

const MAIN_TF = 'resource "local_file" "config" {\n  filename = "app.conf"\n  content  = "env=prod"\n}\n';

function seeded(): World {
  const w = newWorld();
  writeFile(w, "/home/devops/main.tf", MAIN_TF);
  execLine(w, "terraform init");
  execLine(w, "terraform plan");
  execLine(w, "terraform apply");
  return w;
}

describe("terraform: taint, дрейф, state rm, destroy", () => {
  it("taint помечает ресурс, plan показывает его как ~ (изменить), apply пересоздаёт", () => {
    const w = seeded();
    const t = execLine(w, "terraform taint local_file.config");
    expect(t.code).toBe(0);

    const plan = execLine(w, "terraform plan");
    expect(plan.out).toContain("~ local_file.config");
    expect(plan.out).toContain("1 изменить");

    const apply = execLine(w, "terraform apply");
    expect(apply.out).toContain("1 изменено");
    expect(w.tf.tainted).toEqual([]);
  });

  it("без taint plan не показывает изменений (поведение не поменялось)", () => {
    const w = seeded();
    const plan = execLine(w, "terraform plan");
    expect(plan.out).toContain("0 создать, 0 изменить, 0 удалить");
  });

  it("state rm убирает ресурс из состояния, не трогая main.tf", () => {
    const w = seeded();
    const r = execLine(w, "terraform state rm local_file.config");
    expect(r.code).toBe(0);
    expect(w.tf.applied).not.toContain("local_file.config");
    // ресурс снова появится в плане как "создать", раз main.tf не менялся
    const plan = execLine(w, "terraform plan");
    expect(plan.out).toContain("+ local_file.config");
  });

  it("destroy сносит всё состояние и печатает количество", () => {
    const w = seeded();
    const d = execLine(w, "terraform destroy");
    expect(d.out).toContain("уничтожено: 1");
    expect(w.tf.applied).toEqual([]);
  });
});
