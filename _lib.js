const crypto = require("crypto");

// Basic CORS + method guard. Returns true if the request was fully handled.
function cors(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");
  if (req.method === "OPTIONS") { res.status(204).end(); return true; }
  if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return true; }
  return false;
}

const sign = (s) =>
  crypto.createHmac("sha256", process.env.CODE_SECRET).update(s).digest("hex");

async function sendResend({ to, subject, text }) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + process.env.RESEND_API_KEY, // server-side only
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      text,
    }),
  });
  if (!r.ok) throw new Error("Resend " + r.status);
  return r.json();
}

// Simple per-IP limiter (resets when the function instance recycles).
const hits = new Map();
function limited(req, max = 5, windowMs = 10 * 60 * 1000) {
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  return list.length > max;
}

const parse = (req) =>
  typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

module.exports = { cors, sign, sendResend, limited, parse };
