const crypto = require("crypto");

const RESEND_URL = "https://api.resend.com/emails";

// CORS + method guard. Returns true when the request was fully handled.
function cors(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") { res.status(204).end(); return true; }
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed. Use POST." });
    return true;
  }
  return false;
}

// CODE_SECRET must be set; otherwise signed tokens could be forged.
const hasSecret = () => String(process.env.CODE_SECRET || "").length >= 16;
const sign = (s) =>
  crypto.createHmac("sha256", process.env.CODE_SECRET || "").update(s).digest("hex");

const escHtml = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Sends one email through the Resend REST API.
// Always resolves to { ok, status, error? } and never throws.
// The API key is read from the server environment only.
async function sendResend({ to, subject, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!apiKey) return { ok: false, status: 500, error: "Server not configured: RESEND_API_KEY is missing." };
  if (!from) return { ok: false, status: 500, error: "Server not configured: MAIL_FROM is missing." };
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (!recipients.length) return { ok: false, status: 400, error: "No recipient address." };

  const payload = {
    from,
    to: recipients,
    subject,
    text,
    html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#10223f;white-space:pre-line">${escHtml(text)}</div>`,
  };
  if (process.env.ADMIN_EMAIL) payload.reply_to = process.env.ADMIN_EMAIL;

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ctl.signal,
    });
    const raw = await r.text();
    let body = {};
    try { body = JSON.parse(raw); } catch (e) { /* non-JSON error body */ }
    if (r.ok) return { ok: true, status: 200, id: body.id };
    const detail = String(body.message || raw || "no details").slice(0, 200);
    return {
      ok: false,
      status: r.status === 429 ? 429 : r.status >= 400 && r.status < 500 ? 502 : 504,
      error: `Resend rejected the request (${r.status}): ${detail}`,
    };
  } catch (e) {
    const timeout = e && e.name === "AbortError";
    return {
      ok: false,
      status: timeout ? 504 : 502,
      error: timeout ? "Resend did not respond in time." : "Could not reach Resend: " + (e && e.message),
    };
  } finally {
    clearTimeout(timer);
  }
}

// Simple per-IP limiter with a separate bucket per route
// (resets when the function instance recycles).
const hits = new Map();
function limited(req, bucket = "default", max = 5, windowMs = 10 * 60 * 1000) {
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  const key = bucket + ":" + ip;
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) hits.clear(); // keep memory bounded
  return list.length > max;
}

function parse(req) {
  try {
    return typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  } catch (e) {
    return null; // malformed JSON
  }
}

module.exports = { cors, sign, hasSecret, sendResend, limited, parse };
