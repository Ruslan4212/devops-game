import { dir, file } from "./vfs";
import type { DirNode, World } from "./types";

function baseFS(): DirNode {
  return dir({
    home: dir({
      devops: dir({
        "notes.txt": file("Первый день. Дали доступ к прод-серверу.\nНичего не сломать.\n"),
      }),
    }),
    etc: dir({
      hosts: file("127.0.0.1 localhost\n10.0.0.7 db-main\n"),
      passwd: file("root:x:0:0:root:/root:/bin/bash\ndevops:x:1000:1000::/home/devops:/bin/bash\n"),
    }),
    var: dir({ log: dir() }),
    srv: dir(),
    tmp: dir(),
  });
}

export function newWorld(): World {
  return {
    user: "devops", host: "ops-01",
    fs: baseFS(), cwd: "/home/devops",
    env: { HOME: "/home/devops", USER: "devops", PATH: "/usr/bin:/bin", SHELL: "/bin/bash" },
    procs: [
      { pid: 1, user: "root", cpu: 0.0, cmd: "/sbin/init" },
      { pid: 412, user: "root", cpu: 0.3, cmd: "/usr/sbin/sshd -D" },
      { pid: 980, user: "devops", cpu: 0.1, cmd: "-bash" },
    ],
    services: {},
    ports: { 22: "sshd" },
    firewall: { 22: true, 80: true },
    git: null,
    docker: { images: [], containers: [] },
    registry: [],
    ci: { runs: [], secrets: [] },
    tf: { inited: false, plan: null, applied: [] },
    k8s: null,
    alerts: [],
    code: 0,
    log: [],
  };
}
