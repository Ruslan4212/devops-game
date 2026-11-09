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
    'Xc(t,i.edit,(r,o)=>{ri(t,r,o),Pe("файл сохранён: "+r,"dim")});return',
    'Xc(t,i.edit,(r,o)=>{ri(t,r,o),Pe("файл сохранён: "+r,"dim"),window.TOAProjectApp?.persistAfterCommand?.(t,"edit "+r)});return',
  ],
  [
    'return["Курс «Terminal Ops Academy» пройден полностью.",',
    'return["Сводка учебного прогресса в симуляторе.","Не является профессиональной квалификацией или подтверждением опыта в production.",',
  ],
  ['i.fillText("СЕРТИФИКАТ О ПРОХОЖДЕНИИ КУРСА",1110,96)', 'i.fillText("СВОДКА УЧЕБНОГО ПРОГРЕССА",1110,96)'],
  ['i.fillText("MIDDLE DEVOPS",90,232)', 'i.fillText("DEVOPS PRACTICE",90,232)'],
  ['o.download="terminal-ops-academy-middle-devops.png"', 'o.download="terminal-ops-academy-devops-practice.png"'],
];

for (const [before, after] of replacements) {
  const count = html.split(before).length - 1;
  if (count === 0 && html.includes(after)) continue;
  if (count !== 1) throw new Error(`Expected one bundle anchor; found ${count}: ${before.slice(0, 80)}`);
  html = html.replace(before, after);
}

const simulatedCapstoneLabel = "Капстоун на реальном сервере";
if (!html.includes("Итоговый проект в симуляторе")) {
  const count = html.split(simulatedCapstoneLabel).length - 1;
  if (count < 1) throw new Error("Expected at least one capstone label to clarify the simulator environment");
  html = html.replaceAll(simulatedCapstoneLabel, "Итоговый проект в симуляторе");
}

const hookVariants = [
  's.out&&Pe(s.out,s.err?"err":null),$s(t)}function cf(e)',
  's.out&&Pe(s.out,s.err?"err":null),$s(t),window.TOAProjectApp?.persistAfterCommand?.(t,e)}function cf(e)',
  's.out&&Pe(s.out,s.err?"err":null),$s(t),window.TOAProjectApp?.persistAfterCommand?.(t,e,s)}function cf(e)',
];
const finalHook = hookVariants[2];
if (!html.includes(finalHook)) {
  const matches = hookVariants.slice(0, 2).filter((variant) => html.includes(variant));
  if (matches.length !== 1) throw new Error(`Expected one terminal persistence hook; found ${matches.length}`);
  html = html.replace(matches[0], finalHook);
}

const apiStart = 'function cf(e){_s===null&&(_s=B("#out").innerHTML,$i(),Pe("Песочница: пробуй что угодно. help в уроке подскажет служебные команды; clear — очистить экран.","dim")),$s(In.world??(In.world=Zr())),Gc(e),Ue(!1),B("#cmd").focus()}';
const apiEnd = 'function lf(e)';
const apiVariants = [
  `${apiStart}${apiEnd}`,
  `${apiStart}window.TOAProjectApp={newWorld:Zr,mkdir:he,write:W,getWorld:()=>In.world??(In.world=Zr()),setWorld:e=>{In.world=e;if(document.body.dataset.route==="terminal"&&document.querySelector("#out")){$i();$s(e)}},refresh:e=>$s(e)};${apiEnd}`,
  `${apiStart}window.TOAProjectApp={newWorld:Zr,mkdir:he,write:W,getWorld:()=>In.world??(In.world=Zr()),setWorld:e=>{In.world=e;if(document.body.dataset.route==="terminal"&&document.querySelector("#out")){$i();$s(e)}},refresh:e=>$s(e),persistAfterCommand:(e,t)=>window.TOAProjects?.persistAfterCommand(e,t)};${apiEnd}`,
];
const finalApi = `${apiStart}window.TOAProjectApp={newWorld:Zr,mkdir:he,write:W,getWorld:()=>In.world??(In.world=Zr()),setWorld:e=>{In.world=e;if(document.body.dataset.route==="terminal"&&document.querySelector("#out")){$i();$s(e)}},refresh:e=>$s(e),persistAfterCommand:(e,t,r)=>window.TOAProjects?.persistAfterCommand(e,t,r)};${apiEnd}`;
if (!html.includes(finalApi)) {
  const matches = apiVariants.filter((variant) => html.includes(variant));
  if (matches.length !== 1) throw new Error(`Expected one terminal API anchor; found ${matches.length}`);
  html = html.replace(matches[0], finalApi);
}

const script = '<script type="module" src="./projects.js"></script>';
if (!html.includes(script)) {
  const count = html.split("</body>").length - 1;
  if (count !== 1) throw new Error(`Expected one closing body tag; found ${count}`);
  html = html.replace("</body>", `${script}</body>`);
}

await writeFile(file, html);
console.log("Patched /next route and loaded project workspaces.");
