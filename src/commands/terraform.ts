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
    return src && /resource\s+"/.test(src) ? O("Success! Конфигурация валидна.") : E("Ошибка: не найдено ни одного resource");

  if (sub === "plan") {
    if (!src || !/resource\s+"/.test(src)) return E("Ошибка: в main.tf нет ресурсов");
    const names = [...src.matchAll(/resource\s+"([^"]+)"\s+"([^"]+)"/g)].map((m) => m[1] + "." + m[2]);
    const add = names.filter((n) => !tf.applied.includes(n));
    const del = tf.applied.filter((n) => !names.includes(n));
    tf.plan = { add, del };
    return O("Terraform построит следующий план:\n\n" +
      add.map((n) => "  + " + n + " (создать)").join("\n") +
      (del.length ? "\n" + del.map((n) => "  - " + n + " (УДАЛИТЬ)").join("\n") : "") +
      "\n\nПлан: " + add.length + " создать, 0 изменить, " + del.length + " удалить." +
      (del.length ? "\n\n⚠ ВНИМАНИЕ: план удаляет существующий ресурс. Это разрушающее изменение." : ""));
  }

  if (sub === "apply") {
    if (!tf.plan) return E("Сначала посмотри terraform plan — не применяй вслепую");
    if (tf.plan.del.length && !rest.includes("-auto-approve"))
      return E("Отменено: план содержит удаление ресурса. Если это осознанно — исправь main.tf или подтверди -auto-approve");
    const r = tf.plan;
    tf.applied = [...r.add, ...tf.applied.filter((n) => !r.del.includes(n))];
    tf.plan = null;
    return O("Применение...\nApply complete! Ресурсов: " + r.add.length + " создано, " + r.del.length + " удалено.");
  }

  if (sub === "state") {
    if (rest[0] === "list") return O(tf.applied.length ? tf.applied.join("\n") : "(состояние пусто)");
    return O("Файл состояния хранит, что Terraform реально создал.");
  }
  if (sub === "destroy") { tf.applied = []; return O("Destroy complete!"); }
  return E("terraform: init | validate | plan | apply | state list | destroy");
});
