const crypto = require("crypto");
const { cors, sign, hasSecret, sendResend, limited, parse } = require("./_lib");

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (s, n) => String(s == null ? "" : s).slice(0, n).replace(/[\r\n]+/g, " ").trim();
const RESERVED = new Set(["to_email", "from_name", "reply_to"]);

// Copies simple form fields (name, phone, order_id, ...) into template params.
function pickFormData(data) {
  const out = {};
  if (!data || typeof data !== "object") return out;
  for (const [k, v] of Object.entries(data).slice(0, 20)) {
    if (!/^[a-z0-9_]{1,40}$/i.test(k) || RESERVED.has(k)) continue;
    if (typeof v === "string" || typeof v === "number") out[k] = clean(v, 1000);
  }
  return out;
}

// Resend sends plain content, so extra form details are appended to the message body.
function params({ to, subject, message, extra }) {
  const lines = Object.entries(extra || {}).map(([k, v]) => `${k}: ${v}`);
  return { to, subject, text: lines.length ? `${message}\n\n${lines.join("\n")}` : message };
}

function reply(res, result, extraBody) {
  if (result.ok) return res.status(200).json({ ok: true, ...extraBody });
  return res.status(result.status || 500).json({ ok: false, error: result.error });
}

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  try {
    if (limited(req, "send", 5)) {
      return res.status(429).json({ ok: false, error: "Too many requests. Try again later." });
    }
    const b = parse(req);
    if (!b) return res.status(400).json({ ok: false, error: "Request body is not valid JSON." });

    // Admin sign-in code: generated on the server, emailed only to ADMIN_EMAIL.
    // The browser receives a signed token, never the code itself.
    if (b.type === "admin-code") {
      const to = (process.env.ADMIN_EMAIL || "").toLowerCase();
      if (!EMAIL.test(to)) {
        return res.status(500).json({ ok: false, error: "Server not configured: ADMIN_EMAIL is missing or invalid." });
      }
      if (!hasSecret()) {
        return res.status(500).json({ ok: false, error: "Server not configured: CODE_SECRET must be at least 16 characters." });
      }
      const code = String(crypto.randomInt(100000, 1000000));
      const exp = Date.now() + 10 * 60 * 1000;
      const result = await sendResend(params({
        to,
        subject: "Al-Raqi admin verification code",
        message: `Your verification code is ${code}. It expires in 10 minutes.`,
      }));
      return reply(res, result, { token: `${exp}.${sign(`${to}|${exp}|${code}`)}` });
    }

    // Customer account verification email.
    if (b.type === "welcome") {
      const to = clean(b.to, 120).toLowerCase();
      if (!EMAIL.test(to)) return res.status(400).json({ ok: false, error: "A valid email address is required." });
      const name = clean(b.name, 60);
      const result = await sendResend(params({
        to,
        subject: "Al-Raqi account verification",
        message: `Hi ${name || "there"}, your Al-Raqi account was created with this email address. If this wasn’t you, please ignore this message.`,
      }));
      return reply(res, result);
    }

    // Order / financial alerts: always delivered to the configured admin list.
    if (b.type === "notify") {
      const list = (process.env.NOTIFY_EMAILS || process.env.ADMIN_EMAIL || "")
        .split(",").map((s) => s.trim()).filter((s) => EMAIL.test(s));
      if (!list.length) {
        return res.status(500).json({ ok: false, error: "Server not configured: NOTIFY_EMAILS or ADMIN_EMAIL is missing." });
      }
      const subject = clean(b.subject || "Al-Raqi notification", 120);
      const message = String(b.message || "").slice(0, 4000);
      const extra = pickFormData(b.data);
      let failed = null;
      for (const to of list) {
        const result = await sendResend(params({ to, subject, message, extra }));
        if (!result.ok) { failed = result; break; }
      }
      return reply(res, failed || { ok: true });
    }

    return res.status(400).json({ ok: false, error: "Unknown type. Use admin-code, welcome or notify." });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "Unexpected server error." });
  }
};
