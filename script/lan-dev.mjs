// Dev launcher: runs the unified server (server.mjs) with WebSocket relay on
// the same port as Next.js.  Mode is "lan" by default so the lobby shows the
// LAN IP in the QR; set MODE=online for the public preview environment.
//
// Usage:
//   node script/lan-dev.mjs            # LAN mode (default)
//   MODE=online node script/lan-dev.mjs  # online / public preview
import { spawn } from "node:child_process";
import os from "node:os";

function lanIP() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const ni of ifaces[name] || []) {
      if (ni.family === "IPv4" && !ni.internal &&
          /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ni.address)) {
        return ni.address;
      }
    }
  }
  return "localhost";
}

const mode = process.env.MODE || "";
const isOnline = mode === "online" || mode === "1" || mode === "true";

const env = { ...process.env, MODE: isOnline ? "online" : "lan" };
const proc = spawn("node", ["server.mjs"], { stdio: "inherit", env });
proc.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => { proc.kill(); process.exit(0); });
process.on("SIGTERM", () => { proc.kill(); process.exit(0); });

const ip = isOnline ? "(preview URL)" : lanIP();
const joinUrl = isOnline ? "/pad?room=XXXX" : `http://${ip}:13000/pad?room=XXXX`;
console.log(`\n\x1b[1m  Animal Cup — ${isOnline ? "Online" : "LAN"} ready\x1b[0m`);
console.log(`  Big screen / 主机:  http://localhost:13000/lobby`);
console.log(`  Phones / 手机加入:  ${joinUrl}   (or scan the QR in the lobby)\n`);
