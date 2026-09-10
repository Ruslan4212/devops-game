import { def, E, O } from "./registry";

def("ss", (_a, w) =>
  O(
    "Netid State  Local Address:Port   Process\n" +
      Object.entries(w.ports)
        .map(([p, n]) => "tcp   LISTEN 0.0.0.0:" + p.padEnd(9) + "  " + n)
        .join("\n"),
  ),
);

def("ping", (a) => {
  const h = a.filter((x) => !x.startsWith("-"))[0];
  if (!h) return E("ping: укажи хост");
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

def("dig", (a) => {
  const h = a.filter((x) => !x.startsWith("-") && !x.startsWith("+"))[0];
  if (!h) return E("dig: укажи домен");
  const known: Record<string, string> = {
    "example.com": "93.184.216.34",
    "db-main": "10.0.0.7",
    "api.shop.local": "10.0.0.21",
  };
  const ip = known[h];
  if (!ip) return { out: ";; ОТВЕТ НЕ ПОЛУЧЕН: NXDOMAIN — такого имени нет в DNS", code: 1 };
  return O(";; QUESTION SECTION:\n;" + h + ".   IN  A\n\n;; ANSWER SECTION:\n" + h + ".  300  IN  A  " + ip);
});

def("curl", (a, w) => {
  const url = a.filter((x) => !x.startsWith("-")).pop();
  if (!url) return E("curl: укажи URL");
  const head = a.includes("-I");

  const m = url.match(/localhost:(\d+)|127\.0\.0\.1:(\d+)/);
  if (m) {
    const port = Number(m[1] || m[2]);
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
