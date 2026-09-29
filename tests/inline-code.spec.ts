import { describe, expect, it } from "vitest";
import { codeConfidence, looksLikeCode } from "../src/ui/inline-code";

describe("looksLikeCode: что оформлять как код в тексте уроков", () => {
  it.each([
    "chmod",
    "chmod +x deploy.sh",
    "sudo usermod -aG docker ivan",
    "./check-db.sh",
    "/etc/nginx",
    "~/.ssh",
    "$HOME",
    "$#",
    '"$1"',
    "-9",
    "--force",
    "dist/",
    ".env",
    "backup.sh",
    "terraform.tfstate",
    "check=True",
    "DB_URL",
    "shop:1.0",
    "on: push",
    "COPY . .",
    "grep ERROR app.log | tail -n 1",
    "sys.argv[1]",
    "prevent_destroy",
    'resource "local_file" "config"',
    '[ -z "$DB_PASSWORD" ]',
  ])("код: %s", (f) => expect(looksLikeCode(f)).toBe(true));

  it.each(["main", "plan", "prod", "ERROR", "→", "300", "сменить режим", "БЭКАП", "(1)"])("не код: %s", (f) =>
    expect(looksLikeCode(f)).toBe(false),
  );
});

describe("codeConfidence: уверенно код или сомнительно", () => {
  it.each(["chmod +x deploy.sh", "/etc/nginx", "--force", "$HOME", "FROM node:20", "ps aux | grep nginx"])(
    "уверенно: %s",
    (f) => expect(codeConfidence(f)).toBe("strong"),
  );
  it.each(["backup.sh", "check=True", "prevent_destroy", "DB_URL", "shop:1.0", "dist/"])(
    "сомнительно: %s",
    (f) => expect(codeConfidence(f)).toBe("weak"),
  );
  it("не код", () => expect(codeConfidence("main")).toBeNull());
});
