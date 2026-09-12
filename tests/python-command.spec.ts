import { describe, expect, it } from "vitest";
import { execLine } from "../src/engine/shell";
import { newWorld } from "../src/engine/world";
import { mkdirp, writeFile } from "../src/engine/vfs";

const DIR = "/home/devops/scripts";

const RETRY_SCRIPT =
  "#!/usr/bin/env python3\n" +
  "import sys\n" +
  "import time\n" +
  "import requests\n" +
  "\n" +
  "for attempt in range(3):\n" +
  '    r = requests.get("http://metrics-nonexistent:9999/export", timeout=5)\n' +
  "    time.sleep(2)\n" +
  "sys.exit(1)\n";

const ENV_SCRIPT_OK = '#!/usr/bin/env python3\nimport os\ntoken = os.environ["API_TOKEN"]\nprint(token)\n';

const ENV_SCRIPT_MISSING =
  '#!/usr/bin/env python3\nimport os\ntoken = os.environ["API_TOKEN"]\nprint(token)\n';

const ENV_SCRIPT_DEFAULT =
  '#!/usr/bin/env python3\nimport os\nlevel = os.environ.get("LOG_LEVEL", "info")\nprint(level)\n';

describe("python: retry-цикл вокруг requests", () => {
  it("недоступный сервис без retry падает с одной ошибкой", () => {
    const w = newWorld();
    w.py = { venv: true, pkgs: ["requests"], ran: 0 };
    mkdirp(w, DIR);
    writeFile(
      w,
      "/home/devops/scripts/x.py",
      '#!/usr/bin/env python3\nimport requests\nr = requests.get("http://metrics-nonexistent:9999/export", timeout=5)\n',
    );
    w.cwd = "/home/devops/scripts";
    const r = execLine(w, "python3 x.py");
    expect(r.code).toBe(1);
    expect(r.out).not.toContain("попытка");
  });

  it("retry-цикл показывает все попытки перед провалом", () => {
    const w = newWorld();
    w.py = { venv: true, pkgs: ["requests"], ran: 0 };
    mkdirp(w, DIR);
    writeFile(w, "/home/devops/scripts/x.py", RETRY_SCRIPT);
    w.cwd = "/home/devops/scripts";
    const r = execLine(w, "python3 x.py");
    expect(r.out).toContain("попытка 1/3");
    expect(r.out).toContain("попытка 3/3");
    expect(r.out).toContain("все попытки исчерпаны");
    expect(r.code).toBe(1);
  });
});

describe("python: os.environ / os.getenv", () => {
  it("os.environ[KEY] без переменной и без try/except — KeyError", () => {
    const w = newWorld();
    w.py = { venv: true, pkgs: [], ran: 0 };
    mkdirp(w, DIR);
    writeFile(w, "/home/devops/scripts/x.py", ENV_SCRIPT_MISSING);
    w.cwd = "/home/devops/scripts";
    const r = execLine(w, "python3 x.py");
    expect(r.code).toBe(1);
    expect(r.out).toContain("KeyError");
  });

  it("os.environ[KEY] с заданной переменной окружения печатает значение", () => {
    const w = newWorld();
    w.py = { venv: true, pkgs: [], ran: 0 };
    w.env.API_TOKEN = "s3cr3t";
    mkdirp(w, DIR);
    writeFile(w, "/home/devops/scripts/x.py", ENV_SCRIPT_OK);
    w.cwd = "/home/devops/scripts";
    const r = execLine(w, "python3 x.py");
    expect(r.code).toBe(0);
    expect(r.out).toContain("s3cr3t");
  });

  it("os.environ.get с значением по умолчанию не падает, если переменной нет", () => {
    const w = newWorld();
    w.py = { venv: true, pkgs: [], ran: 0 };
    mkdirp(w, DIR);
    writeFile(w, "/home/devops/scripts/x.py", ENV_SCRIPT_DEFAULT);
    w.cwd = "/home/devops/scripts";
    const r = execLine(w, "python3 x.py");
    expect(r.code).toBe(0);
    expect(r.out).toContain("по умолчанию");
  });
});
