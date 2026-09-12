import { def, E, O } from "./registry";
import { readFile, resolvePath } from "../engine/vfs";

const sha = (): string => Math.random().toString(16).slice(2, 14);

def("docker", (a, w) => {
  const [sub, ...rest] = a;
  const d = w.docker;

  if (sub === "build") {
    const i = rest.indexOf("-t");
    const tag = i >= 0 ? rest[i + 1] : "latest";
    const df = readFile(w, resolvePath(w, "Dockerfile"));
    if (df == null) return E("ERROR: Dockerfile не найден в " + w.cwd + " (создай его: edit Dockerfile)");
    if (!/^\s*FROM\s+\S+/im.test(df))
      return E("ERROR: в Dockerfile нет инструкции FROM — с какого базового образа собирать?");
    if (!/^\s*(CMD|ENTRYPOINT)\s+/im.test(df))
      return E("ERROR: нет CMD или ENTRYPOINT — образ соберётся, но контейнер не будет знать, что запускать");
    const steps = df.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#"));

    // приблизительный размер: alpine-основа лёгкая, multi-stage (два и больше FROM)
    // отбрасывает инструменты сборки из финального образа — совсем как в жизни
    const fromCount = steps.filter((s) => /^FROM\s+/i.test(s.trim())).length;
    const isAlpine = /alpine/i.test(df);
    const isMultiStage = fromCount >= 2;
    let sizeMb = isAlpine ? 120 : 950;
    if (isMultiStage) sizeMb = isAlpine ? 25 : 180;

    d.images.push({ tag, layers: steps.length, sizeMb });
    return O(
      steps
        .map((s, ix) => "Step " + (ix + 1) + "/" + steps.length + " : " + s.trim() + "\n ---> " + sha())
        .join("\n") +
        "\nSuccessfully built " +
        sha() +
        "\nSuccessfully tagged " +
        tag,
    );
  }

  if (sub === "images")
    return O(
      "REPOSITORY:TAG       LAYERS  SIZE\n" +
        (d.images.length
          ? d.images
              .map((i) => i.tag.padEnd(21) + String(i.layers).padEnd(8) + (i.sizeMb ? i.sizeMb + "MB" : "—"))
              .join("\n")
          : "(пусто)"),
    );

  if (sub === "rmi") {
    const tag = rest.filter((x) => !x.startsWith("-")).pop();
    const idx = d.images.findIndex((i) => i.tag === tag);
    if (idx < 0) return E("Error: No such image: " + tag);
    if (d.containers.some((c) => c.image === tag && c.state === "running"))
      return E("Error: образ используется работающим контейнером — сначала останови его (docker stop)");
    d.images.splice(idx, 1);
    return O("Untagged: " + tag);
  }

  if (sub === "run") {
    const p = rest.indexOf("-p");
    const nameI = rest.indexOf("--name");
    const eIdx = rest.reduce<number[]>((acc, x, ix) => (x === "-e" ? acc.concat(ix) : acc), []);
    const vIdx = rest.reduce<number[]>((acc, x, ix) => (x === "-v" ? acc.concat(ix) : acc), []);
    const skip = [
      p >= 0 ? rest[p + 1] : null,
      nameI >= 0 ? rest[nameI + 1] : null,
      ...eIdx.map((i) => rest[i + 1]),
      ...vIdx.map((i) => rest[i + 1]),
    ];
    const image = rest
      .filter((x) => !x.startsWith("-"))
      .filter((x) => !skip.includes(x))
      .pop();
    if (!image) return E("docker run: укажи образ");
    if (!d.images.find((i) => i.tag === image))
      return E(
        "Unable to find image '" + image + "' locally — сначала собери его (docker build -t " + image + " .)",
      );
    const name = nameI >= 0 ? rest[nameI + 1] : "cnt" + (d.containers.length + 1);
    let hostPort: number | null = null,
      cPort: number | null = null;
    if (p >= 0 && rest[p + 1]) {
      const [h, c] = rest[p + 1].split(":");
      hostPort = Number(h);
      cPort = Number(c);
    }
    const env: Record<string, string> = {};
    for (const i of eIdx) {
      const kv = rest[i + 1] || "";
      const eq = kv.indexOf("=");
      if (eq > 0) env[kv.slice(0, eq)] = kv.slice(eq + 1);
    }
    const volumes = vIdx.map((i) => rest[i + 1]).filter(Boolean) as string[];
    d.containers.push({
      name,
      image,
      state: "running",
      hostPort,
      cPort,
      logs: ["Starting server on :" + (cPort || 80), "listening"],
      env: eIdx.length ? env : undefined,
      volumes: volumes.length ? volumes : undefined,
    });
    return O(sha());
  }

  if (sub === "ps") {
    const list = rest.includes("-a") ? d.containers : d.containers.filter((c) => c.state === "running");
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
    const c = d.containers.find((x) => x.name === rest.filter((y) => !y.startsWith("-")).pop());
    if (!c) return E("Error: No such container");
    return O(c.logs.join("\n"));
  }

  if (sub === "exec") {
    const c = d.containers.find((x) => x.name === rest.filter((y) => !y.startsWith("-"))[0]);
    if (!c) return E("Error: No such container");
    w.execedContainer = true;
    return O("(внутри контейнера " + c.name + ")\n/ # ls\nbin  etc  usr  var  app\n/ # exit");
  }

  if (sub === "stop") {
    const c = d.containers.find((x) => x.name === rest.pop());
    if (!c) return E("Error: No such container");
    c.state = "exited";
    return O(c.name);
  }

  if (sub === "rm") {
    const nm = rest.filter((x) => !x.startsWith("-")).pop();
    const i = d.containers.findIndex((x) => x.name === nm);
    if (i < 0) return E("Error: No such container");
    d.containers.splice(i, 1);
    return O(nm);
  }

  if (sub === "tag") {
    d.images.push({ tag: rest[1], layers: 5 });
    return O();
  }
  if (sub === "push") {
    w.registry.push(rest[0]);
    return O(
      "The push refers to repository [" +
        rest[0] +
        "]\nlatest: digest: sha256:" +
        sha() +
        " — образ в реестре",
    );
  }
  return E("docker: неизвестная подкоманда '" + sub + "'");
});
