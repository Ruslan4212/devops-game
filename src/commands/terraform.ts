import { def, E, O } from "./registry";
import { readFile, resolvePath } from "../engine/vfs";

def("terraform", (a, w) => {
  const [sub, ...rest] = a;
  const tf = w.tf;
  const src = readFile(w, resolvePath(w, "main.tf"));

  if (sub === "init") {
    if (src == null) return E("Ошибка: в каталоге нет .tf файлов (создай: edit main.tf)");
    tf.inited = true;
    return O("Инициализация провайдера hashicorp/local...\nTerraform успешно инициализирован!");
  }
  if (!tf.inited) return E("Ошибка: сначала terraform init");

  if (sub === "validate")
    return src && /resource\s+"/.test(src)
      ? O("Success! Конфигурация валидна.")
      : E("Ошибка: не найдено ни одного resource");

  if (sub === "plan") {
    if (!src || !/resource\s+"/.test(src)) return E("Ошибка: в main.tf нет ресурсов");
    const names = [...src.matchAll(/resource\s+"([^"]+)"\s+"([^"]+)"/g)].map((m) => m[1] + "." + m[2]);
    const add = names.filter((n) => !tf.applied.includes(n));
    const del = tf.applied.filter((n) => !names.includes(n));
    // дрейф конфигурации: ресурс помечен на пересоздание (taint или ручное изменение вне Terraform)
    const change = (tf.tainted || []).filter((n) => tf.applied.includes(n) && names.includes(n));
    tf.plan = { add, del, change };
    return O(
      "Terraform построит следующий план:\n\n" +
        add.map((n) => "  + " + n + " (создать)").join("\n") +
        (change.length
          ? "\n" +
            change
              .map((n) => "  ~ " + n + " (будет пересоздан: помечен как изменённый вне Terraform)")
              .join("\n")
          : "") +
        (del.length ? "\n" + del.map((n) => "  - " + n + " (УДАЛИТЬ)").join("\n") : "") +
        "\n\nПлан: " +
        add.length +
        " создать, " +
        change.length +
        " изменить, " +
        del.length +
        " удалить." +
        (del.length ? "\n\n⚠ ВНИМАНИЕ: план удаляет существующий ресурс. Это разрушающее изменение." : "") +
        (change.length
          ? "\n\n⚠ Обнаружен дрейф: состояние Terraform разошлось с реальностью для " + change.join(", ")
          : ""),
    );
  }

  if (sub === "apply") {
    if (!tf.plan) return E("Сначала посмотри terraform plan — не применяй вслепую");
    if (tf.plan.del.length && !rest.includes("-auto-approve"))
      return E(
        "Отменено: план содержит удаление ресурса. Если это осознанно — исправь main.tf или подтверди -auto-approve",
      );
    const r = tf.plan;
    const changed = r.change || [];
    tf.applied = [...r.add, ...tf.applied.filter((n) => !r.del.includes(n))];
    tf.tainted = (tf.tainted || []).filter((n) => !changed.includes(n));
    tf.plan = null;
    return O(
      "Применение...\nApply complete! Ресурсов: " +
        r.add.length +
        " создано, " +
        changed.length +
        " изменено, " +
        r.del.length +
        " удалено.",
    );
  }

  if (sub === "taint") {
    const nm = rest.filter((x) => !x.startsWith("-"))[0];
    if (!nm) return E("terraform taint: укажи ресурс, например  terraform taint local_file.config");
    if (!tf.applied.includes(nm)) return E("terraform taint: ресурс " + nm + " не найден в состоянии");
    tf.tainted = [...new Set([...(tf.tainted || []), nm])];
    return O("Ресурс " + nm + " помечен tainted — при следующем apply будет уничтожен и создан заново.");
  }

  if (sub === "state") {
    if (rest[0] === "list") return O(tf.applied.length ? tf.applied.join("\n") : "(состояние пусто)");
    if (rest[0] === "rm") {
      const nm = rest[1];
      if (!nm || !tf.applied.includes(nm))
        return E("terraform state rm: ресурс " + nm + " не найден в состоянии");
      tf.applied = tf.applied.filter((n) => n !== nm);
      tf.tainted = (tf.tainted || []).filter((n) => n !== nm);
      return O(
        "Removed " +
          nm +
          " from state.\n\nРесурс убран из-под управления Terraform, но САМ РЕСУРС не тронут и не удалён.",
      );
    }
    return O("Файл состояния хранит, что Terraform реально создал.");
  }
  if (sub === "destroy") {
    const n = tf.applied.length;
    tf.applied = [];
    tf.tainted = [];
    tf.plan = null;
    return O("Destroy complete! Ресурсов уничтожено: " + n + ".");
  }
  return E("terraform: init | validate | plan | apply | taint | state list|rm | destroy");
});
