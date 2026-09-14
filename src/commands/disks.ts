import { def, E, O } from "./registry";
import { mkdirp, resolvePath } from "../engine/vfs";
import type { World } from "../engine/types";

export function initDisks(w: World): NonNullable<World["disks"]> {
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

/** Логический том вида /dev/ИМЯ_VG/ИМЯ_LV, если такой путь указывает именно на него. */
function findLv(w: World, devPath: string) {
  const m = devPath.match(/^\/dev\/([\w-]+)\/([\w-]+)$/);
  if (!m || !w.lvm) return null;
  return w.lvm.lvs.find((lv) => lv.vg === m[1] && lv.name === m[2]) || null;
}

def("mount", (a, w) => {
  const disks = initDisks(w);
  const ps = a.filter((x) => !x.startsWith("-"));
  if (ps.length < 2) return E("mount: нужно: mount /dev/УСТРОЙСТВО ТОЧКА_МОНТИРОВАНИЯ");
  const [devArg, mountArg] = ps;
  const abs = resolvePath(w, mountArg);

  const lv = findLv(w, devArg);
  if (lv) {
    if (lv.mount) return E("mount: " + devArg + " уже смонтирован в " + lv.mount);
    mkdirp(w, abs);
    lv.mount = abs;
    return O();
  }

  const devName = devArg.replace(/^\/dev\//, "");
  const disk = disks.find((d) => d.name === devName);
  if (!disk) return E("mount: " + devArg + ": такого устройства нет (смотри lsblk)");
  if (disk.mount) return E("mount: " + devArg + " уже смонтирован в " + disk.mount);
  mkdirp(w, abs);
  disk.mount = abs;
  return O();
});

def("umount", (a, w) => {
  const disks = initDisks(w);
  const target = a.filter((x) => !x.startsWith("-"))[0];
  if (!target) return E("umount: укажи устройство или точку монтирования");

  const lv = findLv(w, target);
  if (lv) {
    if (!lv.mount) return E("umount: " + target + ": не смонтировано");
    lv.mount = null;
    return O();
  }

  const abs = target.startsWith("/dev/") ? null : resolvePath(w, target);
  const devName = target.replace(/^\/dev\//, "");
  const disk = disks.find((d) => d.name === devName || d.mount === abs);
  if (!disk || !disk.mount) return E("umount: " + target + ": не смонтировано");
  disk.mount = null;
  return O();
});
