// Unified HTTP + WebSocket server for Animal Cup.
//
// Runs Next.js and the WebSocket relay on the SAME port (13000) so both
// the page and the gamepad relay share the same origin — essential for
// the online preview environment where only one port is exposed.
//
// Usage:
//   MODE=online node server.mjs   (default — public preview / internet)
//   MODE=lan    node server.mjs   (LAN play on the same port)
import { createServer } from "node:http";
import next from "next";
import { WebSocketServer } from "ws";
import { attachRelay } from "./script/lan-server.mjs";

const PORT = Number(process.env.PORT || 13000);
const MODE = process.env.MODE || "online";
const dev = process.env.NODE_ENV !== "production";

const app = next({ dev, hostname: "0.0.0.0", port: PORT });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  const wss = new WebSocketServer({ server, path: "/ws" });
  attachRelay(wss, { mode: MODE });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[server] ready on http://0.0.0.0:${PORT}  (mode=${MODE}, ws=/ws)`);
  });
});