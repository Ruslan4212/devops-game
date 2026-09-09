import { mkdirp, writeFile } from "../engine/vfs";
import { has, ran } from "./helpers";
import type { Mission } from "../engine/types";

export const act08: Mission[] = [
  {
    id: "8.1", act: 8, title: "Инфраструктура как код", xp: 70,
    why: "IaC значит: инфраструктура описана файлами в Git, а не кликами в панели. Цикл Terraform: <b>init</b> (скачать провайдер) → <b>plan</b> (показать, что изменится, ничего не трогая) → <b>apply</b> (применить). <b>plan никогда не пропускают</b> — это единственная защита от случайного сноса прода.",
    cheat: [
      ["edit main.tf", "описать ресурсы"],
      ["terraform init", "инициализация"],
      ["terraform plan", "что будет сделано (без изменений)"],
      ["terraform apply", "применить план"],
      ["terraform state list", "что реально создано"],
    ],
    hints: [
      "Открой edit main.tf — там заготовка с примером блока resource",
      "Затем terraform init, потом обязательно terraform plan",
      "Только после плана — terraform apply",
    ],
    setup: (w) => {
      mkdirp(w, "/home/devops/infra");
      w.cwd = "/home/devops/infra";
      w.templates = {
        "/home/devops/infra/main.tf":
          "# ЗАДАЧА: опиши хотя бы один ресурс.\n" +
          "# Синтаксис: resource \"ТИП\" \"ИМЯ\" { ... }\n" +
          "# Пример:\n" +
          "# resource \"local_file\" \"config\" {\n" +
          "#   filename = \"app.conf\"\n" +
          "#   content  = \"env=prod\"\n" +
          "# }\n",
      };
    },
    objs: [
      { t: "Опиши ресурс в main.tf", d: "edit main.tf", ok: has("/home/devops/infra/main.tf", /resource\s+"[^"]+"\s+"[^"]+"/) },
      { t: "Инициализируй Terraform", d: "terraform init", ok: (w) => w.tf.inited },
      { t: "Посмотри план изменений", d: "terraform plan", ok: ran(/^terraform\s+plan/) },
      { t: "Примени план", d: "terraform apply", ok: (w) => w.tf.applied.length > 0 },
      { t: "Проверь состояние", d: "terraform state list", ok: ran(/^terraform\s+state\s+list/) },
    ],
    solution: [
      { file: "main.tf", content: "resource \"local_file\" \"config\" {\n  filename = \"app.conf\"\n  content  = \"env=prod\"\n}\n" },
      "terraform init",
      "terraform plan",
      "terraform apply",
      "terraform state list",
    ],
  },
  {
    id: "8.2", act: 8, title: "Инцидент: план сносит прод", xp: 75, incident: true,
    why: "Самая дорогая ошибка в IaC — применить план не глядя. Terraform не спрашивает «вы уверены?», если запустить с <b>-auto-approve</b>. Правило: читать вывод plan построчно и искать строки со знаком <b>−</b> (удаление). Если удаление не планировалось — виноват конфиг, а не Terraform.",
    cheat: [
      ["terraform plan", "прочитать план внимательно"],
      ["cat main.tf", "посмотреть конфиг"],
      ["edit main.tf", "вернуть удалённый ресурс"],
      ["terraform apply", "применить безопасный план"],
      ["terraform state list", "проверить, что всё на месте"],
    ],
    hints: [
      "Запусти terraform plan — увидишь строку со знаком минус: ресурс будет УДАЛЁН",
      "Причина в том, что из main.tf пропал блок database",
      "Верни его через edit main.tf — блок resource \"local_file\" \"database\"",
      "Снова plan — удаления быть не должно, затем apply",
    ],
    setup: (w) => {
      mkdirp(w, "/home/devops/infra");
      w.cwd = "/home/devops/infra";
      writeFile(w, "/home/devops/infra/main.tf", "resource \"local_file\" \"config\" {\n  filename = \"app.conf\"\n  content  = \"env=prod\"\n}\n");
      w.tf = { inited: true, plan: null, applied: ["local_file.config", "local_file.database"] };
    },
    objs: [
      { t: "Посмотри план и заметь разрушающее изменение", d: "terraform plan", ok: ran(/^terraform\s+plan/) },
      { t: "Верни в main.tf потерянный ресурс database", d: "edit main.tf", ok: has("/home/devops/infra/main.tf", /resource\s+"local_file"\s+"database"/) },
      { t: "Убедись, что новый план ничего не удаляет", d: "terraform plan", ok: (w) => !!w.tf.plan && w.tf.plan.del.length === 0 },
      { t: "Примени безопасный план", d: "terraform apply", ok: (w) => w.tf.applied.includes("local_file.database") },
    ],
    solution: [
      "terraform plan",
      { file: "main.tf", content: "resource \"local_file\" \"config\" {\n  filename = \"app.conf\"\n}\nresource \"local_file\" \"database\" {\n  filename = \"db.conf\"\n}\n" },
      "terraform plan",
      "terraform apply",
    ],
  },
];
