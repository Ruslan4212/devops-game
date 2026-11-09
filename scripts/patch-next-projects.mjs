import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../next/index.html", import.meta.url);
let html = await readFile(file, "utf8");
const replacements = [
  [
    "const cp={today:Zu,daily:Wu,map:Qu,lessons:ep,terminal:tp,review:np,errors:sp,interview:ip,career:rp,progress:ap,settings:op};function lp(e,t,n){cp[e](t,n)}",
    'const cp={today:Zu,daily:Wu,map:Qu,lessons:ep,terminal:tp,review:np,errors:sp,interview:ip,career:rp,progress:ap,settings:op,projects:e=>window.TOAProjects?.mount(e)};function lp(e,t,n){cp[e](t,n)}',
  ],
  [
    'const Ju=["today","daily","map","lessons","terminal","review","errors","interview","career","progress","settings","lesson"],zc=',
    'const Ju=["today","daily","map","lessons","terminal","review","errors","interview","career","progress","settings","lesson","projects"],zc=',
  ],
  [
    'const Zp={today:"calendar",daily:"bolt",map:"map",lessons:"book",terminal:"terminal",review:"repeat",errors:"bug",interview:"chat",career:"briefcase",progress:"progress",settings:"settings",glossary:"keyboard",rating:"trophy"};function Qp()',
    'const Zp={today:"calendar",daily:"bolt",map:"map",lessons:"book",terminal:"terminal",review:"repeat",errors:"bug",interview:"chat",career:"briefcase",progress:"progress",settings:"settings",glossary:"keyboard",rating:"trophy",projects:"briefcase"};function Qp()',
  ],
  [
    'function tp(e,t){e.innerHTML=St("Терминал-тренажёр","Свободная песочница: пробуй любые команды, ничего не сломаешь. Задания урока здесь не проверяются.")',
    'function tp(e,t){const p=localStorage.getItem("toa_active_project_v1");e.innerHTML=St(p?"Рабочая среда проекта":"Терминал-тренажёр",p?"Команды выполняются в отдельном рабочем каталоге проекта. Результат каждого шага проверяется автоматически.":"Свободная песочница: пробуй любые команды, ничего не сломаешь. Задания урока здесь не проверяются.")',
  ],
  [
    's.out&&Pe(s.out,s.err?"err":null),$s(t)}function cf(e)',
    's.out&&Pe(s.out,s.err?"err":null),$s(t),window.TOAProjectApp?.persistAfterCommand?.(t,e)}function cf(e)',
  ],
  [
    'Xc(t,i.edit,(r,o)=>{ri(t,r,o),Pe("файл сохранён: "+r,"dim")});return',
    'Xc(t,i.edit,(r,o)=>{ri(t,r,o),Pe("файл сохранён: "+r,"dim"),window.TOAProjectApp?.persistAfterCommand?.(t,"edit "+r)});return',
  ],
  [
    'refresh:e=>$s(e)};function lf(e)',
    'refresh:e=>$s(e),persistAfterCommand:(e,t)=>window.TOAProjects?.persistAfterCommand(e,t)};function lf(e)',
  ],
];

for (const [before, after] of replacements) {
  const count = html.split(before).length - 1;
  if (count === 0 && html.includes(after)) continue;
  if (count !== 1) throw new Error(`Expected one bundle anchor; found ${count}: ${before.slice(0, 80)}`);
  html = html.replace(before, after);
}

const script = '<script type="module" src="./projects.js"></script>';
if (!html.includes(script)) {
  const count = html.split("</body>").length - 1;
  if (count !== 1) throw new Error(`Expected one closing body tag; found ${count}`);
  html = html.replace("</body>", `${script}</body>`);
}

await writeFile(file, html);
console.log("Patched /next route and loaded project workspaces.");
