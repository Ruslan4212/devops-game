import { def, E, O } from "./registry";
import { initDisks } from "./disks";
import type { World } from "../engine/types";

function initLvm(w: World): NonNullable<World["lvm"]> {
  if (!w.lvm) w.lvm = { pvs: [], vgs: [], lvs: [] };
  return w.lvm;
}

/** "50G" -> 50. Без буквы G команды LVM в тренажёре не работают — как и в жизни, единицы важны. */
function sizeToGb(s: string): number | null {
  const m = s.match(/^(\d+(?:\.\d+)?)G$/i);
  return m ? Number(m[1]) : null;
}

def("pvcreate", (a, w) => {
  const lvm = initLvm(w);
  const disks = initDisks(w);
  const devArg = a.filter((x) => !x.startsWith("-"))[0];
  if (!devArg) return E("pvcreate: укажи устройство, например: pvcreate /dev/sdb1");
  const devName = devArg.replace(/^\/dev\//, "");
  const disk = disks.find((d) => d.name === devName);
  if (!disk) return E("pvcreate: " + devArg + ": такого устройства нет (смотри lsblk)");
  if (lvm.pvs.includes(devName)) return E("pvcreate: " + devArg + " уже физический том");
  lvm.pvs.push(devName);
  return O("Physical volume " + devArg + " successfully created.");
});

def("vgcreate", (a, w) => {
  const lvm = initLvm(w);
  const disks = initDisks(w);
  const ps = a.filter((x) => !x.startsWith("-"));
  if (ps.length < 2) return E("vgcreate: нужно: vgcreate ИМЯ_ГРУППЫ /dev/УСТРОЙСТВО...");
  const [vgName, ...devArgs] = ps;
  if (lvm.vgs.some((v) => v.name === vgName)) return E("vgcreate: группа " + vgName + " уже существует");
  const pvNames = devArgs.map((d) => d.replace(/^\/dev\//, ""));
  for (const pv of pvNames) {
    if (!lvm.pvs.includes(pv))
      return E("vgcreate: /dev/" + pv + " не физический том — сначала pvcreate /dev/" + pv);
  }
  const sizeG = pvNames.reduce((sum, pv) => {
    const disk = disks.find((d) => d.name === pv);
    return sum + (disk ? sizeToGb(disk.size) || 0 : 0);
  }, 0);
  lvm.vgs.push({ name: vgName, pvs: pvNames, sizeG, usedG: 0 });
  return O('Volume group "' + vgName + '" successfully created (' + sizeG + "G)");
});

def("lvcreate", (a, w) => {
  const lvm = initLvm(w);
  const lIdx = a.indexOf("-L");
  const nIdx = a.indexOf("-n");
  const positional = a.filter((x) => !x.startsWith("-"));
  const vgName = positional[positional.length - 1];
  if (lIdx < 0 || nIdx < 0 || !vgName)
    return E("lvcreate: нужно: lvcreate -L РАЗМЕРG -n ИМЯ_ТОМА ИМЯ_ГРУППЫ");
  const sizeG = sizeToGb(a[lIdx + 1] || "");
  const lvName = a[nIdx + 1];
  if (sizeG == null) return E("lvcreate: укажи размер в гигабайтах, например -L 20G");
  const vg = lvm.vgs.find((v) => v.name === vgName);
  if (!vg) return E("lvcreate: группа " + vgName + " не найдена — сначала vgcreate");
  if (vg.usedG + sizeG > vg.sizeG)
    return E(
      "lvcreate: недостаточно места в " +
        vgName +
        " — свободно " +
        (vg.sizeG - vg.usedG) +
        "G, запрошено " +
        sizeG +
        "G",
    );
  vg.usedG += sizeG;
  lvm.lvs.push({ name: lvName, vg: vgName, sizeG, mount: null });
  return O('Logical volume "' + lvName + '" created.');
});

def("mkfs.ext4", (a, w) => {
  const lvm = initLvm(w);
  const devArg = a.filter((x) => !x.startsWith("-"))[0];
  if (!devArg) return E("mkfs.ext4: укажи устройство");
  const m = devArg.match(/^\/dev\/([\w-]+)\/([\w-]+)$/);
  if (!m) return E("mkfs.ext4: " + devArg + ": ожидался путь вида /dev/группа/том");
  const lv = lvm.lvs.find((x) => x.vg === m[1] && x.name === m[2]);
  if (!lv) return E("mkfs.ext4: логический том " + devArg + " не найден");
  return O("mke2fs: создание файловой системы с журналированием ext4 на " + devArg + " — готово");
});
