import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const parts = [
  "p1.txt", "p2.txt", "p3.txt", "p6.txt", "p7.txt", "p10.txt", "p11.txt",
  "p26.txt", "p27.txt", "p28.txt", "p19.txt", "p20.txt", "p21.txt", "p22.txt",
  "p23.txt", "p24.txt", "p25.txt", "p32.txt", "p33.txt", "p34.txt", "p35.txt",
  "p36.txt", "p4.txt", "p5.txt", "p12.txt", "p8.txt", "p13.txt", "p14.txt",
  "p15.txt", "p29.txt", "p30.txt", "p31.txt", "p9.txt", "p37.txt",
];

const html = (await Promise.all(parts.map((part) => readFile(path.join(root, part), "utf8")))).join("");
await writeFile(path.join(root, "index.html"), html, "utf8");
console.log(`index.html собран из ${parts.length} частей (${Buffer.byteLength(html)} байт)`);
