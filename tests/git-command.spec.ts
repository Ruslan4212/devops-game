import { describe, expect, it } from "vitest";
import { execLine } from "../src/engine/shell";
import { newWorld } from "../src/engine/world";

describe("git: amend, restore --staged, tag, конфликт слияния", () => {
  it("commit --amend меняет сообщение последнего коммита, не создавая новый", () => {
    const w = newWorld();
    execLine(w, "git init");
    execLine(w, "git add .");
    execLine(w, 'git commit -m "первый коммит"');
    const before = w.git!.commits.length;
    execLine(w, 'git commit --amend -m "первый коммит (поправил)"');
    expect(w.git!.commits.length).toBe(before);
    expect(w.git!.commits[w.git!.commits.length - 1].msg).toBe("первый коммит (поправил)");
  });

  it("restore --staged убирает файл из индекса, не трогая сам файл", () => {
    const w = newWorld();
    execLine(w, "git init");
    execLine(w, "git add .");
    expect(w.git!.staged.length).toBeGreaterThan(0);
    const f = w.git!.staged[0];
    execLine(w, "git restore --staged " + f);
    expect(w.git!.staged).not.toContain(f);
  });

  it("tag добавляет и перечисляет метки релизов", () => {
    const w = newWorld();
    execLine(w, "git init");
    execLine(w, "git tag v1.0.0");
    const r = execLine(w, "git tag");
    expect(r.out.trim()).toBe("v1.0.0");
  });

  it("merge с заскриптованным conflictFile сообщает о конфликте вместо fast-forward", () => {
    const w = newWorld();
    execLine(w, "git init");
    execLine(w, "git switch -c feature");
    execLine(w, "git switch main");
    w.git!.conflictFile = "index.js";
    const r = execLine(w, "git merge feature");
    expect(r.code).not.toBe(0);
    expect(r.out).toContain("CONFLICT");
    expect(w.git!.merged || []).not.toContain("feature");
  });

  it("конфликт разрешается: add конфликтного файла + commit снимает conflictFile", () => {
    const w = newWorld();
    execLine(w, "git init");
    w.git!.conflictFile = "index.js";
    execLine(w, "git add index.js");
    execLine(w, 'git commit -m "разрешил конфликт"');
    expect(w.git!.conflictFile).toBeNull();
  });
});
