const mineflayer = require("mineflayer");
const express = require("express");

// ─── Konfigurasi Bot ───────────────────────────────────────────────────────
const BOT_CONFIG = {
  host: "SMPVI2026.aternos.me",
  port: 48644,
  username: "BotPenjaga",
  version: "1.21.11",
  hideErrors: false,
  auth: "offline",
};

const RECONNECT_DELAY_MS = 10_000;
const AFK_MIN_MS = 2 * 60 * 1000;
const AFK_MAX_MS = 4 * 60 * 1000;

// ─── State Bot ─────────────────────────────────────────────────────────────
let bot = null;
let afkTimer = null;
let reconnectTimer = null;
let isShuttingDown = false;
let botStatus = "offline";
let lastDisconnectReason = "";
let connectTime = null;

// ─── Helpers ───────────────────────────────────────────────────────────────
function log(level, msg, data) {
  const ts = new Date().toLocaleTimeString("id-ID");
  const extra = data ? " " + JSON.stringify(data) : "";
  console.log(`[${ts}] [${level.toUpperCase()}] ${msg}${extra}`);
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Anti-AFK ──────────────────────────────────────────────────────────────
function scheduleAfk() {
  if (afkTimer) clearTimeout(afkTimer);
  const delay = randomBetween(AFK_MIN_MS, AFK_MAX_MS);
  afkTimer = setTimeout(doAfkMovement, delay);
}

async function doAfkMovement() {
  if (!bot || botStatus !== "online") return;
  try {
    const action = randomBetween(1, 4);
    switch (action) {
      case 1:
        log("info", "Anti-AFK: melompat");
        bot.setControlState("jump", true);
        await sleep(500);
        bot.setControlState("jump", false);
        break;
      case 2:
        log("info", "Anti-AFK: berjalan maju");
        bot.setControlState("forward", true);
        await sleep(randomBetween(400, 900));
        bot.setControlState("forward", false);
        break;
      case 3:
        log("info", "Anti-AFK: menengok acak");
        bot.look((Math.random() * Math.PI * 2) - Math.PI, (Math.random() * 0.5) - 0.25, true);
        break;
      case 4:
        log("info", "Anti-AFK: lompat + jalan");
        bot.setControlState("forward", true);
        bot.setControlState("jump", true);
        await sleep(600);
        bot.setControlState("forward", false);
        bot.setControlState("jump", false);
        break;
    }
  } catch (err) {
    log("warn", "Anti-AFK error (diabaikan): " + err.message);
  }
  scheduleAfk();
}

// ─── Reconnect ─────────────────────────────────────────────────────────────
function clearAfkTimer() {
  if (afkTimer) { clearTimeout(afkTimer); afkTimer = null; }
}

function clearReconnectTimer() {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
}

function scheduleReconnect(reason) {
  if (isShuttingDown) return;
  clearAfkTimer();
  clearReconnectTimer();
  botStatus = "reconnecting";
  lastDisconnectReason = reason;
  log("info", `Reconnect dalam ${RECONNECT_DELAY_MS / 1000}s...`, { reason });
  reconnectTimer = setTimeout(() => { if (!isShuttingDown) createBot(); }, RECONNECT_DELAY_MS);
}

// ─── Buat Bot ──────────────────────────────────────────────────────────────
function createBot() {
  clearAfkTimer();
  clearReconnectTimer();

  if (bot) {
    try { bot.removeAllListeners(); bot.end(); } catch (_) {}
    bot = null;
  }

  botStatus = "connecting";
  connectTime = null;
  log("info", "Menghubungkan ke server Minecraft...", BOT_CONFIG);

  let newBot;
  try {
    newBot = mineflayer.createBot(BOT_CONFIG);
  } catch (err) {
    log("error", "Gagal membuat bot: " + err.message);
    scheduleReconnect("createBot() gagal");
    return;
  }

  bot = newBot;

  newBot.on("login", () => {
    botStatus = "online";
    connectTime = new Date();
    log("info", "✅ Bot berhasil login ke server!");
    scheduleAfk();
  });

  newBot.on("spawn", () => log("info", "Bot telah spawn di dunia"));

  newBot.on("kicked", (reason) => {
    log("warn", "Bot di-kick: " + reason);
    scheduleReconnect("Kicked: " + reason);
  });

  newBot.on("end", (reason) => {
    log("info", "Koneksi berakhir: " + reason);
    if (botStatus !== "reconnecting") scheduleReconnect(reason || "Koneksi terputus");
  });

  newBot.on("error", (err) => {
    log("error", "Error bot: " + err.message);
    if (botStatus !== "reconnecting") scheduleReconnect("Error: " + err.message);
  });

  newBot.on("death", () => {
    log("warn", "Bot mati! Mencoba respawn...");
    try { newBot.respawn(); } catch (err) { log("error", "Gagal respawn: " + err.message); }
  });

  newBot.on("health", () => {
    if (newBot.health !== undefined && newBot.health < 5) {
      log("warn", "Kesehatan bot sangat rendah!", { health: newBot.health });
    }
  });
}

// ─── Web Server (untuk UptimeRobot) ───────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  const info = {
    status: botStatus,
    username: BOT_CONFIG.username,
    server: `${BOT_CONFIG.host}:${BOT_CONFIG.port}`,
    version: BOT_CONFIG.version,
    health: bot?.health ?? null,
    food: bot?.food ?? null,
    lastDisconnectReason,
    connectTime: connectTime?.toISOString() ?? null,
    uptime: Math.floor(process.uptime()) + " detik",
  };

  const statusColor = { online: "#4ade80", offline: "#f87171", connecting: "#facc15", reconnecting: "#fb923c" };
  const color = statusColor[botStatus] || "#888";

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta http-equiv="refresh" content="30"/>
  <title>BotPenjaga - Status</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',sans-serif;background:#0f0f0f;color:#e0e0e0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
    .card{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:36px;max-width:500px;width:100%}
    h1{font-size:22px;color:#fff;margin-bottom:4px}
    .sub{font-size:13px;color:#888;margin-bottom:20px}
    .badge{display:inline-flex;align-items:center;gap:8px;padding:6px 14px;border-radius:999px;font-size:13px;font-weight:600;background:#111;border:1px solid ${color};color:${color};margin-bottom:24px}
    .dot{width:8px;height:8px;border-radius:50%;background:${color};animation:pulse 1.5s infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .item{background:#111;border:1px solid #222;border-radius:8px;padding:12px}
    .label{font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}
    .value{font-size:13px;color:#d1d5db;font-weight:500;word-break:break-all}
    .note{margin-top:20px;padding:10px 14px;background:#0a1a2a;border:1px solid #1e3a5f;border-radius:8px;font-size:12px;color:#60a5fa}
    .footer{margin-top:16px;font-size:11px;color:#555;text-align:center}
  </style>
</head>
<body>
  <div class="card">
    <h1>⛏️ BotPenjaga</h1>
    <div class="sub">Minecraft Bot Monitor</div>
    <div class="badge"><div class="dot"></div>${botStatus.toUpperCase()}</div>
    <div class="grid">
      ${Object.entries(info).map(([k,v]) => `<div class="item"><div class="label">${k}</div><div class="value">${v ?? '—'}</div></div>`).join("")}
    </div>
    <div class="note">✅ Halaman ini aktif untuk di-ping UptimeRobot · Auto-refresh 30 detik</div>
    <div class="footer">BotPenjaga v1.0</div>
  </div>
</body>
</html>`);
});

app.get("/status", (req, res) => {
  res.json({
    status: botStatus,
    username: BOT_CONFIG.username,
    server: `${BOT_CONFIG.host}:${BOT_CONFIG.port}`,
    health: bot?.health ?? null,
    food: bot?.food ?? null,
    lastDisconnectReason,
    connectTime: connectTime?.toISOString() ?? null,
    uptime: Math.floor(process.uptime()),
  });
});

app.listen(PORT, () => {
  log("info", `Web server aktif di port ${PORT}`);
  log("info", "Memulai BotPenjaga...");
  createBot();
});
