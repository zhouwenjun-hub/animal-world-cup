"use client";

// Reconnecting WebSocket client for the relay (script/lan-server.mjs).
//
// The relay lives on the same origin as the page, at path /ws, when used via
// the custom server (server.mjs).  This works in both LAN and online modes
// because the relay always shares the page's host:port.
//
// Usage:
//   const lan = createLanClient({ onMessage, onOpen, onClose });
//   lan.send({ t: "host", room });
//   lan.close();

export function lanWsUrl() {
  if (typeof window === "undefined") return null;
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws`;
}

export function createLanClient({ onMessage, onOpen, onClose } = {}) {
  let ws = null;
  let closed = false;
  let retry = 0;
  let helloFn = null; // re-sent on every (re)connect so the relay re-attaches us

  function connect() {
    if (closed) return;
    const url = lanWsUrl();
    if (!url) return;
    try {
      ws = new WebSocket(url);
    } catch {
      schedule();
      return;
    }
    ws.onopen = () => {
      retry = 0;
      if (helloFn) {
        try { ws.send(JSON.stringify(helloFn())); } catch {}
      }
      onOpen && onOpen();
    };
    ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      onMessage && onMessage(msg);
    };
    ws.onclose = () => {
      onClose && onClose();
      if (!closed) schedule();
    };
    ws.onerror = () => { try { ws.close(); } catch {} };
  }

  function schedule() {
    retry = Math.min(retry + 1, 6);
    setTimeout(connect, 300 * retry); // 0.3s..1.8s backoff
  }

  connect();

  return {
    // hello: a function returning the (re)attach message — stored so reconnects
    // re-announce identity (host re-attaches to its room; pad re-joins).
    setHello(fn) { helloFn = fn; if (ws && ws.readyState === 1) { try { ws.send(JSON.stringify(fn())); } catch {} } },
    send(obj) { if (ws && ws.readyState === 1) { try { ws.send(JSON.stringify(obj)); } catch {} } },
    close() { closed = true; if (ws) try { ws.close(); } catch {} },
    get ready() { return !!ws && ws.readyState === 1; },
  };
}
