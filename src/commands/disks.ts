import { def, E, O } from "./registry";
import { mkdirp, resolvePath } from "../engine/vfs";
import type { World } from "../engine/types";

function initDisks(w: World): NonNullable<World["disks"]> {
  if (!w.disks) w.disks = [{ name: "sdb1", size: "50G", mount: null }];
  return w.disks;
}

def("lsblk", (_a, w) => {
  const disks = initDisks(w);
  return O(
    "NAME   SIZE   MOUNTPOINT\n" +
      "sda1   20G    /\n" +
      disks.map((d) => d.name.padEnd(7) + d.size.padEnd(7) + (d.mount || "")).join("\n"),
  );
});

def("mount", (a, w) => {
  const disks = initDisks(w);
  const ps = a.filter((x) => !x.startsWith("-"));
  if (ps.length < 2) return E("mount: нужно: mount /dev/УСТРОЙСТВО ТОЧКА_МОНТИРОВАНИЯ");
  const [devArg, mountArg] = ps;
  const devName = devArg.replace(/^\/dev\//, "");
  const disk = disks.find((d) => d.name === devName);
  if (!disk) return E("mount: " + devArg + ": такого устройства нет (смотри lsblk)");
  if (disk.mount) return E("mount: " + devArg + " уже смонтирован в " + disk.mount);
  const abs = resolvePath(w, mountArg);
  mkdirp(w, abs);
  disk.mount = abs;
  return O();
});

def("umount", (a, w) => {
  const disks = initDisks(w);
  const target = a.filter((x) => !x.startsWith("-"))[0];
  if (!target) return E("umount: укажи устройство или точку монтирования");
  const abs = target.startsWith("/dev/") ? null : resolvePath(w, target);
  const devName = target.replace(/^\/dev\//, "");
  const disk = disks.find((d) => d.name === devName || d.mount === abs);
  if (!disk || !disk.mount) return E("umount: " + target + ": не смонтировано");
  disk.mount = null;
  return O();
});
