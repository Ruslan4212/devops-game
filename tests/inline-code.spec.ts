import { describe, expect, it } from "vitest";
import { looksLikeCode } from "../src/ui/inline-code";

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
