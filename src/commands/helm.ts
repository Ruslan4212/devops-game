import { def, E, O } from "./registry";
import { getNode, readFile, resolvePath } from "../engine/vfs";
import { applyManifest, k8sInit, syncPods } from "./k8s";

/** Простой построчный разбор values.yaml: КЛЮЧ: значение, без вложенности. */
function parseValues(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^([\w-]+):\s*(.+?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

/** Подставляет {{ .Values.КЛЮЧ }} в шаблоне значениями из values.yaml. */
function renderTemplate(tpl: string, values: Record<string, string>): string {
  return tpl.replace(/\{\{\s*\.Values\.([\w.]+)\s*\}\}/g, (_all, key: string) => values[key] ?? "");
}

def("helm", (a, w) => {
  const k = k8sInit(w);
  const [sub, ...rest] = a;

  if (sub === "install" || sub === "upgrade") {
    const name = rest[0];
    const chartPath = rest[1];
    if (!name || !chartPath) return E("helm " + sub + ": нужно: helm " + sub + " ИМЯ_РЕЛИЗА ПУТЬ_К_ЧАРТУ");
    const abs = resolvePath(w, chartPath);
    const chartYaml = readFile(w, abs + "/Chart.yaml");
    if (chartYaml == null) return E("helm: " + chartPath + "/Chart.yaml не найден — это не похоже на чарт");
    const values = parseValues(readFile(w, abs + "/values.yaml") || "");
    const templatesDir = getNode(w, abs + "/templates");
    if (!templatesDir || templatesDir.type !== "dir")
      return E("helm: " + chartPath + "/templates не найдена — нечего рендерить");

    const resources: { kind: string; name: string }[] = [];
    const outputs: string[] = [];
    for (const fname of Object.keys(templatesDir.children).sort()) {
      const node = templatesDir.children[fname];
      if (node.type !== "file") continue;
      const rendered = renderTemplate(node.content, values);
      const res = applyManifest(rendered, k, w);
      if (res.err) return res;
      outputs.push(res.out);
      const kind = (rendered.match(/kind:\s*(\w+)/) || [])[1];
      const rname = (rendered.match(/name:\s*([\w-]+)/) || [])[1] || "app";
      if (kind) resources.push({ kind, name: rname });
    }

    k.helmReleases = k.helmReleases || [];
    const existing = k.helmReleases.find((r) => r.name === name);
    const chartName = chartPath.split("/").filter(Boolean).pop() || chartPath;
    if (existing) existing.resources = resources;
    else k.helmReleases.push({ name, chart: chartName, resources });
    return O("NAME: " + name + "\nSTATUS: deployed\n" + outputs.join("\n"));
  }

  if (sub === "list") {
    const rs = k.helmReleases || [];
    return O(
      "NAME       CHART\n" + (rs.map((r) => r.name.padEnd(11) + r.chart).join("\n") || "(нет релизов)"),
    );
  }

  if (sub === "uninstall") {
    const name = rest[0];
    const rs = k.helmReleases || [];
    const idx = rs.findIndex((r) => r.name === name);
    if (idx < 0) return E("helm uninstall: релиз " + name + " не найден");
    const rel = rs[idx];
    for (const r of rel.resources) {
      if (r.kind === "Deployment") k.deploys = k.deploys.filter((d) => d.name !== r.name);
      else if (r.kind === "Service") k.svcs = k.svcs.filter((s) => s.name !== r.name);
      else if (r.kind === "Job") k.jobs = (k.jobs || []).filter((j) => j.name !== r.name);
      else if (r.kind === "Ingress") k.ingresses = (k.ingresses || []).filter((i) => i.name !== r.name);
      else if (r.kind === "PersistentVolumeClaim") k.pvcs = (k.pvcs || []).filter((p) => p.name !== r.name);
      else if (r.kind === "HorizontalPodAutoscaler") k.hpas = (k.hpas || []).filter((h) => h.name !== r.name);
      else if (r.kind === "ServiceAccount")
        k.serviceAccounts = (k.serviceAccounts || []).filter((s) => s !== r.name);
      else if (r.kind === "Role") k.roles = (k.roles || []).filter((x) => x.name !== r.name);
      else if (r.kind === "RoleBinding")
        k.roleBindings = (k.roleBindings || []).filter((x) => x.name !== r.name);
    }
    syncPods(w);
    rs.splice(idx, 1);
    return O('release "' + name + '" uninstalled');
  }

  return E("helm: install | upgrade | list | uninstall");
});
