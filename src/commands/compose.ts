import { def, E, O } from "./registry";
import { readFile, resolvePath } from "../engine/vfs";
import type { CmdResult, World } from "../engine/types";

interface ComposeService {
  name: string;
  image: string;
  hostPort: number | null;
  cPort: number | null;
}

/**
 * Упрощённый разбор docker-compose.yml: не полноценный YAML-парсер, а
 * построчный разбор ровно тех конструкций, которым учат уроки (services:,
 * отступ в 2 пробела — имя сервиса, image:, список ports: "host:container").
 * Этого достаточно для тренажёра — как и Dockerfile выше разбирается тем же способом.
 */
function parseCompose(text: string): ComposeService[] {
  const lines = text.split("\n");
  const services: ComposeService[] = [];
  let inServices = false;
  let cur: ComposeService | null = null;
  for (const raw of lines) {
    const line = raw.replace(/\r$/, "");
    if (/^services:\s*$/.test(line)) {
      inServices = true;
      continue;
    }
    if (!inServices) continue;
    const nameMatch = line.match(/^ {2}([A-Za-z0-9_-]+):\s*$/);
    if (nameMatch) {
      if (cur) services.push(cur);
      cur = { name: nameMatch[1], image: "", hostPort: null, cPort: null };
      continue;
    }
    if (!cur) continue;
    const imgMatch = line.match(/^\s+image:\s*(\S+)/);
    if (imgMatch) cur.image = imgMatch[1];
    const portMatch = line.match(/^\s+-\s*"?(\d+):(\d+)"?/);
    if (portMatch) {
      cur.hostPort = Number(portMatch[1]);
      cur.cPort = Number(portMatch[2]);
    }
  }
  if (cur) services.push(cur);
  return services;
}

function loadCompose(w: World): ComposeService[] | null {
  const text = readFile(w, resolvePath(w, "docker-compose.yml"));
  if (text == null) return null;
  const svcs = parseCompose(text);
  return svcs.length ? svcs : null;
}

def("docker-compose", (a, w): CmdResult => {
  const sub = a[0];
  const svcs = loadCompose(w);
  if (!svcs)
    return E(
      "docker-compose: не найден docker-compose.yml в " +
        w.cwd +
        " (или в нём нет ни одного сервиса под services:)",
    );

  if (sub === "up") {
    for (const s of svcs) {
      if (!s.image) continue;
      if (!w.docker.images.find((i) => i.tag === s.image)) w.docker.images.push({ tag: s.image, layers: 1 });
      const existing = w.docker.containers.find((c) => c.name === s.name);
      if (existing) {
        existing.state = "running";
        continue;
      }
      w.docker.containers.push({
        name: s.name,
        image: s.image,
        state: "running",
        hostPort: s.hostPort,
        cPort: s.cPort,
        logs: ["Starting " + s.name + " ...", "listening"],
      });
    }
    return O(svcs.map((s) => "Creating " + s.name + " ... done").join("\n"));
  }

  if (sub === "ps") {
    const names = svcs.map((s) => s.name);
    const list = w.docker.containers.filter((c) => names.includes(c.name));
    return O(
      "NAME        IMAGE            STATUS    PORTS\n" +
        (list.length
          ? list
              .map(
                (c) =>
                  c.name.padEnd(12) +
                  c.image.padEnd(17) +
                  c.state.padEnd(10) +
                  (c.hostPort ? c.hostPort + "->" + c.cPort : ""),
              )
              .join("\n")
          : "(нет контейнеров)"),
    );
  }

  if (sub === "logs") {
    const nm = a[1];
    const c = w.docker.containers.find((x) => x.name === nm);
    if (!c) return E("ERROR: No such service: " + nm);
    return O(c.logs.join("\n"));
  }

  if (sub === "down") {
    const names = svcs.map((s) => s.name);
    w.docker.containers = w.docker.containers.filter((c) => !names.includes(c.name));
    return O(svcs.map((s) => "Removing " + s.name + " ... done").join("\n"));
  }

  return E("docker-compose: up|ps|logs|down");
});
