import { CMDS, def, E, O } from "./registry";
import { metricsText } from "./prom";

def("ip", (a) => {
  const sub = a[0];
  if (sub === "addr" || sub === "a")
    return O(
      "1: lo: <LOOPBACK,UP> inet 127.0.0.1/8\n" +
        "2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP>\n" +
        "    inet 10.0.0.5/24 brd 10.0.0.255 scope global eth0",
    );
  if (sub === "route" || sub === "r")
    return O("default via 10.0.0.1 dev eth0\n" + "10.0.0.0/24 dev eth0 proto kernel scope link src 10.0.0.5");
  return E("ip: используй addr или route");
});

/** Службы, слушающие UDP: их принципиально не видно в  ss -ltn , только в  ss -lun . */
const UDP_PORTS: Record<number, string> = { 53: "systemd-resolved", 123: "chronyd", 514: "rsyslogd" };

def("ss", (a, w) => {
  const flags = a.filter((x) => x.startsWith("-")).join("");
  const wantUdp = flags.includes("u");
  const wantTcp = flags.includes("t") || !wantUdp;
  const head = "Netid State  Local Address:Port   Process\n";
  const tcp = Object.entries(w.ports).map(
    ([p, n]) => "tcp   LISTEN " + ("0.0.0.0:" + p).padEnd(20) + " " + n,
  );
  // у UDP нет состояния соединения — ss честно пишет UNCONN
  const udp = Object.entries(UDP_PORTS).map(
    ([p, n]) => "udp   UNCONN " + ("0.0.0.0:" + p).padEnd(20) + " " + n,
  );
  const rows = [...(wantTcp ? tcp : []), ...(wantUdp ? udp : [])];
  return O(head + rows.join("\n"));
});

def("ping", (a) => {
  const words = a.filter((x) => !x.startsWith("-"));
  const h = words[0];
  if (!h) return E("ping: укажи хост");
  // имя с точкой, которого нет в учебной зоне и которое не похоже на IP — до сети дело не дойдёт
  const looksLikeIp = /^\d+\.\d+\.\d+\.\d+$/.test(h);
  if (h.includes(".") && !looksLikeIp && !ZONE[h])
    return { out: "ping: " + h + ": Name or service not known", code: 2 };
  return O(
    "PING " +
      h +
      ": 56 байт\n64 байт от " +
      h +
      ": icmp_seq=1 время=12.4 мс\n" +
      "64 байт от " +
      h +
      ": icmp_seq=2 время=11.8 мс\n\n--- статистика " +
      h +
      " ---\n" +
      "2 пакета отправлено, 2 получено, 0% потерь",
  );
});

/**
 * Учебная DNS-зона: имя -> тип записи -> значения. Такой формы хватает, чтобы
 * показать не только A-запись, но и CNAME/MX/NS/TXT, ради которых в жизни и
 * зовут dig.
 */
const ZONE: Record<string, Record<string, string[]>> = {
  "example.com": {
    A: ["93.184.216.34"],
    AAAA: ["2606:2800:220:1:248:1893:25c8:1946"],
    MX: ["10 mail.example.com."],
    NS: ["a.iana-servers.net.", "b.iana-servers.net."],
    TXT: ['"v=spf1 -all"'],
  },
  "db-main": { A: ["10.0.0.7"] },
  "api.shop.local": { A: ["10.0.0.21"] },
  "shop.local": {
    A: ["10.0.0.30"],
    MX: ["10 mail.shop.local."],
    TXT: ['"v=spf1 include:_spf.shop.local -all"'],
  },
  "www.shop.local": { CNAME: ["shop.local."], A: ["10.0.0.30"] },
  "shop.internal": { A: ["10.0.0.30"] },
  "pay.shop.local": { A: ["10.0.0.31"] },
  "old-dc.shop.local": { A: ["10.9.9.9"] },
};

/** IP имени (A-запись) — общая точка правды для dig, ping и traceroute. */
const addrOf = (host: string): string | undefined => ZONE[host]?.A?.[0];

def("dig", (a) => {
  // @сервер — «спроси вот этот DNS-сервер»; для симулятора ответ от этого не меняется
  const rest = a.filter((x) => !x.startsWith("@"));
  const short = rest.includes("+short");
  const words = rest.filter((x) => !x.startsWith("+"));
  const TYPES = /^(A|AAAA|MX|CNAME|NS|TXT|PTR|SOA)$/i;
  let type = "A";
  const names: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const x = words[i];
    if (x === "-t") {
      type = (words[++i] ?? "A").toUpperCase();
      continue;
    }
    if (x.startsWith("-")) continue;
    // «dig example.com MX» — тип записи может идти вторым словом, после имени
    if (names.length && TYPES.test(x)) {
      type = x.toUpperCase();
      continue;
    }
    names.push(x);
  }
  const h = names[0];
  if (!h) return E("dig: укажи домен");

  const zone = ZONE[h];
  if (!zone) {
    if (short) return { out: "", code: 1 };
    return { out: ";; ОТВЕТ НЕ ПОЛУЧЕН: NXDOMAIN — такого имени нет в DNS", code: 1 };
  }
  const vals = zone[type];
  const question = ";; QUESTION SECTION:\n;" + h + ".   IN  " + type + "\n\n;; ANSWER SECTION:\n";
  if (!vals || !vals.length) {
    if (short) return O("");
    return O(question + ";; (записей типа " + type + " для этого имени нет — само имя существует)");
  }
  if (short) return O(vals.join("\n"));
  return O(question + vals.map((v) => h + ".  300  IN  " + type + "  " + v).join("\n"));
});

def("traceroute", (a) => {
  const h = a.filter((x) => !x.startsWith("-"))[0];
  if (!h) return E("traceroute: укажи хост");
  const ip = addrOf(h);
  if (!ip) return { out: "traceroute: unknown host " + h, code: 1 };

  const head = "traceroute to " + h + " (" + ip + "), 30 hops max, 60 byte packets";
  const hop = (n: number, addr: string, ms: string): string =>
    "  " + String(n) + "  " + addr + " (" + addr + ")  " + ms + " ms  " + ms + " ms  " + ms + " ms";

  // машина за выведенным из эксплуатации маршрутизатором: путь обрывается на полпути
  if (h === "old-dc.shop.local")
    return O(
      head +
        "\n" +
        hop(1, "10.0.0.1", "0.412") +
        "\n" +
        hop(2, "10.255.0.1", "1.108") +
        "\n  3  * * *\n  4  * * *\n  5  * * *",
    );
  if (/\.local$/.test(h) || /^10\./.test(ip))
    return O(
      head +
        "\n" +
        hop(1, "10.0.0.1", "0.412") +
        "\n" +
        hop(2, "10.255.0.1", "1.104") +
        "\n" +
        hop(3, ip, "1.830"),
    );
  return O(
    head +
      "\n" +
      hop(1, "10.0.0.1", "0.498") +
      "\n" +
      hop(2, "192.0.2.1", "4.210") +
      "\n" +
      hop(3, "198.51.100.9", "11.740") +
      "\n" +
      hop(4, ip, "12.402"),
  );
});

def("ipcalc", (a) => {
  const arg = a.filter((x) => !x.startsWith("-"))[0];
  if (!arg) return E("ipcalc: укажи адрес вида 10.0.0.5/24");
  const m = arg.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)\/(\d+)$/);
  if (!m) return E("ipcalc: нужен формат АДРЕС/ПРЕФИКС, например 10.0.0.5/24");
  const octets = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
  const bits = Number(m[5]);
  if (bits > 32 || octets.some((o) => o > 255)) return E("ipcalc: некорректный адрес или префикс");

  const toNum = (o: number[]): number => ((o[0] << 24) | (o[1] << 16) | (o[2] << 8) | o[3]) >>> 0;
  const toStr = (n: number): string => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
  const maskNum = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  const ipNum = toNum(octets);
  const net = (ipNum & maskNum) >>> 0;
  const bcast = (net | (~maskNum >>> 0)) >>> 0;
  const total = Math.pow(2, 32 - bits);
  const usable = total > 2 ? total - 2 : total;

  return O(
    "Address:   " +
      toStr(ipNum) +
      "\n" +
      "Netmask:   " +
      toStr(maskNum) +
      " = " +
      bits +
      "\n" +
      "Wildcard:  " +
      toStr(~maskNum >>> 0) +
      "\n" +
      "=>\n" +
      "Network:   " +
      toStr(net) +
      "/" +
      bits +
      "\n" +
      "HostMin:   " +
      toStr(total > 2 ? net + 1 : net) +
      "\n" +
      "HostMax:   " +
      toStr(total > 2 ? bcast - 1 : bcast) +
      "\n" +
      "Broadcast: " +
      toStr(bcast) +
      "\n" +
      "Hosts/Net: " +
      usable +
      "  (всего адресов в подсети: " +
      total +
      ")",
  );
});

def("nc", (a, w) => {
  const words = a.filter((x) => !x.startsWith("-"));
  const host = words[0];
  const port = Number(words[1]);
  if (!host || !port) return E("nc: укажи хост и порт, например  nc -zv localhost 80");

  const local = /^(localhost|127\.0\.0\.1|10\.0\.0\.5)$/.test(host);
  if (!local && !addrOf(host)) return { out: "nc: getaddrinfo: Name or service not known", code: 1 };
  const open = local ? !!w.ports[port] : w.firewall[port] === true;
  if (open) return O("Connection to " + host + " " + port + " port [tcp/*] succeeded!");
  // снаружи неразрешённый порт просто молчит (файрвол выбрасывает пакет) — это timeout,
  // а локально свободный порт отвечает быстрым отказом
  if (!local)
    return {
      out: "nc: connect to " + host + " port " + port + " (tcp) failed: Connection timed out",
      code: 1,
    };
  return { out: "nc: connect to " + host + " port " + port + " (tcp) failed: Connection refused", code: 1 };
});

def("openssl", (a, w) => {
  if (a[0] !== "s_client")
    return E("openssl: в этой игре поддержан только  openssl s_client -connect ХОСТ:ПОРТ");
  const i = a.indexOf("-connect");
  const target = a[i + 1];
  if (!target) return E("openssl: укажи  -connect ХОСТ:ПОРТ");
  const host = target.split(":")[0];
  if (!addrOf(host)) return { out: "connect: Name or service not known", code: 1 };

  const expired = !!w.httpMocks?.["https://" + host]?.body?.includes("certificate has expired");
  const chain =
    "CONNECTED(00000003)\n" +
    "depth=1 C = US, O = Let's Encrypt, CN = R11\n" +
    "depth=0 CN = " +
    host +
    "\n" +
    (expired ? "verify error:num=10:certificate has expired\nverify return:1\n" : "verify return:1\n") +
    "---\n" +
    "Certificate chain\n" +
    " 0 s:CN = " +
    host +
    "\n   i:C = US, O = Let's Encrypt, CN = R11\n" +
    " 1 s:C = US, O = Let's Encrypt, CN = R11\n   i:C = US, O = ISRG, CN = ISRG Root X1\n" +
    "---\n" +
    "SSL handshake has read 4821 bytes\n" +
    "    Protocol  : TLSv1.3\n" +
    "    Cipher    : TLS_AES_256_GCM_SHA384\n" +
    "---\n" +
    (expired
      ? "    notBefore : Jan 14 09:00:00 2026 GMT\n    notAfter  : Apr 14 09:00:00 2026 GMT\n" +
        "    Verify return code: 10 (certificate has expired)"
      : "    notBefore : Aug 20 09:00:00 2026 GMT\n    notAfter  : Nov 18 09:00:00 2026 GMT\n" +
        "    Verify return code: 0 (ok)");
  return O(chain);
});

def("curl", (a, w, stdin, raw) => {
  const url = a.filter((x) => !x.startsWith("-")).pop();
  if (!url) return E("curl: укажи URL");
  const head = a.includes("-I");

  // -v показывает весь разговор: * — действия самого curl, > — отправлено, < — получено
  if (a.includes("-v") || a.includes("--verbose")) {
    const host = url
      .replace(/^https?:\/\//, "")
      .split("/")[0]
      .split(":")[0];
    const https = url.startsWith("https://");
    const ip = addrOf(host) ?? "127.0.0.1";
    const inner = CMDS["curl"](
      a.filter((x) => x !== "-v" && x !== "--verbose"),
      w,
      stdin,
      raw,
    );
    const trace =
      "* Host " +
      host +
      ":" +
      (https ? "443" : "80") +
      " was resolved.\n" +
      "*   Trying " +
      ip +
      ":" +
      (https ? "443" : "80") +
      "...\n" +
      "* Connected to " +
      host +
      " (" +
      ip +
      ") port " +
      (https ? "443" : "80") +
      "\n" +
      (https
        ? "* TLS handshake: TLSv1.3 / TLS_AES_256_GCM_SHA384\n* Server certificate: CN=" + host + "\n"
        : "") +
      "> GET / HTTP/1.1\n> Host: " +
      host +
      "\n> User-Agent: curl/8.5.0\n> Accept: */*\n>\n" +
      (inner.code === 0 ? "< HTTP/1.1 200 OK\n< Content-Type: text/html\n<\n" : "");
    return { out: trace + inner.out, code: inner.code, err: inner.err };
  }

  // заготовленный ответ для конкретного URL (404/500/просроченный сертификат и т.п.) —
  // проверяется первым, остальные правила ниже — старые дефолты для example.com и т.д.
  const mock = w.httpMocks?.[url];
  if (mock) {
    if (mock.code !== 0) return { out: mock.body, code: mock.code, err: true };
    return O(head ? mock.headers : mock.body);
  }

  const m = url.match(/localhost:(\d+)|127\.0\.0\.1:(\d+)/);
  if (m) {
    const port = Number(m[1] || m[2]);
    // экспортёр Prometheus отдаёт метрики текстом на /metrics
    if (/\/metrics\b/.test(url)) {
      const kind = w.prom?.exporters[port];
      if (kind) return O(head ? "HTTP/1.1 200 OK\nContent-Type: text/plain" : metricsText(kind));
      return {
        out: "curl: (7) Failed to connect to localhost port " + port + ": Connection refused",
        code: 7,
      };
    }
    const cont = w.docker.containers.find((c) => c.hostPort === port && c.state === "running");
    if (cont)
      return O(
        head
          ? "HTTP/1.1 200 OK\nServer: nginx\nContent-Type: text/html"
          : "<h1>shop-api " + cont.image + "</h1>\n<p>ok</p>",
      );
    if (w.ports[port])
      return O(head ? "HTTP/1.1 200 OK\nServer: " + w.ports[port] : "<h1>" + w.ports[port] + "</h1>");
    return { out: "curl: (7) Failed to connect to localhost port " + port + ": Connection refused", code: 7 };
  }
  if (/api\.shop\.local/.test(url)) {
    if (!w.firewall[443])
      return { out: "curl: (28) Connection timed out — порт 443 закрыт файрволом", code: 28 };
    return O(head ? "HTTP/1.1 200 OK\nContent-Type: application/json" : '{"status":"ok"}');
  }
  if (/example\.com/.test(url))
    return O(head ? "HTTP/1.1 200 OK\nContent-Type: text/html" : "<html>Example Domain</html>");
  return { out: "curl: (6) Could not resolve host", code: 6 };
});

def("ufw", (a, w) => {
  const [act, port] = a.filter((x) => !x.startsWith("-"));
  if (!w.sudo) return E("ufw: нужны права root — добавь sudo");
  if (act === "allow") {
    w.firewall[parseInt(port)] = true;
    return O("Правило добавлено: разрешён порт " + port);
  }
  if (act === "deny") {
    w.firewall[parseInt(port)] = false;
    return O("Правило добавлено: запрещён порт " + port);
  }
  if (act === "status")
    return O(
      "Статус: активен\n\nПорт     Действие\n" +
        Object.entries(w.firewall)
          .map(([p, v]) => p.padEnd(9) + (v ? "ALLOW" : "DENY"))
          .join("\n"),
    );
  return E("ufw: allow|deny|status");
});
