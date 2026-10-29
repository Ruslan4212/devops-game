#!/usr/bin/env python3
"""
Поиск «осиротевших» дисков (.vmdk) на датасторах vCenter.

Скрипт ничего не удаляет и не меняет — только читает инвентарь:
  1. собирает все диски, которые используют виртуалки и шаблоны
     (текущие диски, цепочки снапшотов, layoutEx);
  2. обходит файловую систему каждого датастора через HostDatastoreBrowser;
  3. выводит .vmdk, которые не принадлежат ни одной ВМ.

Пример:
  export VC_PASSWORD='...'
  ./find_orphaned_vmdk.py -s vcsa.lab.local -u administrator@vsphere.local --insecure
  ./find_orphaned_vmdk.py -s vcsa.lab.local -u admin@vsphere.local --csv orphans.csv --min-age-days 30

Зависимость: pip install pyvmomi
"""

import argparse
import csv
import datetime as dt
import getpass
import json
import os
import ssl
import sys

try:
    from pyVim.connect import SmartConnect, Disconnect
    from pyVim.task import WaitForTask
    from pyVmomi import vim, vmodl
except ImportError:
    sys.exit("Нужен pyVmomi: pip install pyvmomi")


# Служебные каталоги, в которых .vmdk не являются дисками ВМ
# (NetApp-снапшоты NFS, HA, vSAN/VMFS-метаданные и т.п.).
HIDDEN_PREFIX = "."


def parse_args():
    p = argparse.ArgumentParser(description="Найти .vmdk, не подключённые ни к одной ВМ")
    p.add_argument("-s", "--server", required=True, help="адрес vCenter (VCSA)")
    p.add_argument("-u", "--user", required=True, help="пользователь, например administrator@vsphere.local")
    p.add_argument("-p", "--password", help="пароль (лучше через переменную VC_PASSWORD)")
    p.add_argument("--port", type=int, default=443)
    p.add_argument("--insecure", action="store_true", help="не проверять TLS-сертификат vCenter")
    p.add_argument("-d", "--datastore", action="append", default=[],
                   help="проверить только этот датастор (можно несколько раз)")
    p.add_argument("--min-age-days", type=int, default=0,
                   help="показывать только диски, не менявшиеся N дней")
    p.add_argument("--include-hidden", action="store_true",
                   help="искать и в скрытых каталогах (.snapshot, .sdd.sf и т.п.)")
    p.add_argument("--no-fcd", action="store_true",
                   help="не запрашивать First Class Disks (CNS/Kubernetes PV)")
    p.add_argument("--csv", help="сохранить результат в CSV")
    p.add_argument("--json", help="сохранить результат в JSON")
    return p.parse_args()


def connect(args):
    password = args.password or os.environ.get("VC_PASSWORD") or getpass.getpass(
        f"Пароль для {args.user}@{args.server}: ")
    ctx = ssl._create_unverified_context() if args.insecure else ssl.create_default_context()
    return SmartConnect(host=args.server, user=args.user, pwd=password, port=args.port, sslContext=ctx)


def collect(si, root, obj_type, props):
    """Быстро забрать свойства всех объектов типа через PropertyCollector."""
    content = si.RetrieveContent()
    view = content.viewManager.CreateContainerView(root, [obj_type], True)
    try:
        spec = vmodl.query.PropertyCollector.FilterSpec(
            objectSet=[vmodl.query.PropertyCollector.ObjectSpec(
                obj=view, skip=True,
                selectSet=[vmodl.query.PropertyCollector.TraversalSpec(
                    name="traverse", path="view", skip=False, type=vim.view.ContainerView)])],
            propSet=[vmodl.query.PropertyCollector.PropertySpec(type=obj_type, pathSet=props)])
        result = []
        opts = vmodl.query.PropertyCollector.RetrieveOptions()
        page = content.propertyCollector.RetrievePropertiesEx([spec], opts)
        while page:
            for obj in page.objects:
                result.append((obj.obj, {p.name: p.val for p in obj.propSet}))
            if not page.token:
                break
            page = content.propertyCollector.ContinueRetrievePropertiesEx(page.token)
        return result
    finally:
        view.Destroy()


def split_path(path):
    """'[ds1] vm/vm.vmdk' -> ('ds1', 'vm/vm.vmdk')."""
    path = path.strip()
    if not path.startswith("["):
        return None, path
    ds, _, rest = path[1:].partition("]")
    return ds, rest.strip().lstrip("/")


def used_disks(si, datacenter):
    """Множество (datastore, путь) всех файлов дисков, занятых ВМ в датацентре."""
    used = set()
    warnings = []
    vms = collect(si, datacenter.vmFolder, vim.VirtualMachine,
                  ["name", "config.hardware.device", "layoutEx.file"])
    for vm, props in vms:
        name = props.get("name") or vm._moId
        files = props.get("layoutEx.file") or []
        for f in files:
            if f.type in ("diskDescriptor", "diskExtent"):
                key = split_path(f.name)
                used.add(key)
        devices = props.get("config.hardware.device")
        if devices is None:
            warnings.append(f"ВМ {name}: нет конфигурации (inaccessible/orphaned) — её диски могли попасть в список")
            continue
        for dev in devices:
            if not isinstance(dev, vim.vm.device.VirtualDisk):
                continue
            backing = dev.backing
            while backing is not None:  # текущий диск + вся цепочка родителей (снапшоты, linked clone)
                fname = getattr(backing, "fileName", None)
                if fname:
                    key = split_path(fname)
                    used.add(key)
                backing = getattr(backing, "parent", None)
    return used, warnings, len(vms)


def fcd_paths(si, datastore):
    """Пути First Class Disks на датасторе -> имя FCD."""
    result = {}
    mgr = si.RetrieveContent().vStorageObjectManager
    for oid in mgr.ListVStorageObject(datastore):
        try:
            obj = mgr.RetrieveVStorageObject(oid, datastore)
            path = getattr(obj.config.backing, "filePath", None)
            if path:
                result[split_path(path)] = obj.config.name
        except vim.fault.NotFound:
            continue
    return result


def browse_vmdk(datastore):
    """Все дескрипторы дисков на датасторе (flat/delta-экстенты API скрывает сам)."""
    spec = vim.host.DatastoreBrowser.SearchSpec(
        matchPattern=["*.vmdk"],
        query=[vim.host.DatastoreBrowser.VmDiskQuery(
            details=vim.host.DatastoreBrowser.VmDiskQuery.Details(
                diskType=True, capacityKb=True, thin=True))],
        details=vim.host.DatastoreBrowser.FileInfo.Details(
            fileType=True, fileSize=True, modification=True),
        sortFoldersFirst=True)
    task = datastore.browser.SearchDatastoreSubFolders_Task(f"[{datastore.name}]", spec)
    WaitForTask(task)
    for folder in task.info.result or []:
        _, folder_rel = split_path(folder.folderPath)
        for f in folder.file or []:
            rel = f"{folder_rel.rstrip('/')}/{f.path}" if folder_rel else f.path
            yield rel, f


def hint_for(rel, key, fcds, vsan_basenames):
    if key in fcds:
        return f"FCD '{fcds[key]}' (Kubernetes PV / CNS) — проверь в CNS"
    if "contentlib-" in rel:
        return "Content Library — шаблон библиотеки, не удалять вручную"
    if os.path.basename(rel) in vsan_basenames:
        return "vSAN: такое же имя есть у диска ВМ — вероятно, тот же диск под другим путём"
    return ""


def human(size):
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if size < 1024 or unit == "TB":
            return f"{size:.1f} {unit}"
        size /= 1024


def main():
    args = parse_args()
    si = connect(args)
    try:
        content = si.RetrieveContent()
        now = dt.datetime.now(dt.timezone.utc)
        orphans, all_warnings = [], []

        for dc in collect(si, content.rootFolder, vim.Datacenter, ["name"]):
            dc_obj, dc_name = dc[0], dc[1]["name"]
            used, warnings, vm_count = used_disks(si, dc_obj)
            all_warnings += warnings
            print(f"[{dc_name}] ВМ и шаблонов: {vm_count}, используемых файлов дисков: {len(used)}",
                  file=sys.stderr)

            for ds, props in collect(si, dc_obj.datastoreFolder, vim.Datastore,
                                     ["name", "summary.accessible", "summary.type"]):
                ds_name = props["name"]
                if args.datastore and ds_name not in args.datastore:
                    continue
                if not props.get("summary.accessible"):
                    all_warnings.append(f"Датастор {ds_name} недоступен — пропущен")
                    continue
                print(f"  сканирую {ds_name} ...", file=sys.stderr)

                fcds = {}
                if not args.no_fcd:
                    try:
                        fcds = fcd_paths(si, ds)
                    except vmodl.MethodFault as e:
                        all_warnings.append(f"{ds_name}: не удалось получить FCD ({e.msg})")
                vsan_basenames = set()
                if props.get("summary.type") == "vsan":
                    vsan_basenames = {os.path.basename(p) for d, p in used if d == ds_name}

                try:
                    files = list(browse_vmdk(ds))
                except vmodl.MethodFault as e:
                    all_warnings.append(f"{ds_name}: ошибка обхода ({e.msg})")
                    continue

                for rel, f in files:
                    if not args.include_hidden and any(
                            part.startswith(HIDDEN_PREFIX) for part in rel.split("/")[:-1]):
                        continue
                    key = (ds_name, rel)
                    if key in used:
                        continue
                    modified = f.modification
                    age = (now - modified).days if modified else None
                    if args.min_age_days and age is not None and age < args.min_age_days:
                        continue
                    orphans.append({
                        "datacenter": dc_name,
                        "datastore": ds_name,
                        "path": f"[{ds_name}] {rel}",
                        "size_bytes": f.fileSize or 0,
                        "capacity_gb": round((getattr(f, "capacityKb", 0) or 0) / 1024 / 1024, 2),
                        "thin": getattr(f, "thin", None),
                        "modified": modified.isoformat() if modified else "",
                        "age_days": age,
                        "hint": hint_for(rel, key, fcds, vsan_basenames),
                    })
    finally:
        Disconnect(si)

    orphans.sort(key=lambda o: o["size_bytes"], reverse=True)

    if orphans:
        print(f"\n{'РАЗМЕР':>10}  {'ВОЗРАСТ':>7}  ПУТЬ")
        for o in orphans:
            age = f"{o['age_days']}д" if o["age_days"] is not None else "?"
            line = f"{human(o['size_bytes']):>10}  {age:>7}  {o['path']}"
            if o["hint"]:
                line += f"   <- {o['hint']}"
            print(line)
    total = sum(o["size_bytes"] for o in orphans)
    print(f"\nНайдено неподключённых дисков: {len(orphans)}, занимают: {human(total)}")

    for w in all_warnings:
        print(f"ВНИМАНИЕ: {w}", file=sys.stderr)

    if args.csv:
        with open(args.csv, "w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=list(orphans[0].keys()) if orphans else ["path"])
            writer.writeheader()
            writer.writerows(orphans)
        print(f"CSV: {args.csv}", file=sys.stderr)
    if args.json:
        with open(args.json, "w", encoding="utf-8") as fh:
            json.dump(orphans, fh, ensure_ascii=False, indent=2)
        print(f"JSON: {args.json}", file=sys.stderr)


if __name__ == "__main__":
    main()
