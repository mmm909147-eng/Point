const crypto = require("crypto");
const { cors, sign, sendResend, limited, parse } = require("./_lib");

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (s, n) => String(s || "").slice(0, n).replace(/[\r\n]+/g, " ");

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  try {
    if (limited(req)) return res.status(429).json({ error: "Too many requests" });
    const b = parse(req);

    // Admin sign-in code: generated on the server, sent only to ADMIN_EMAIL.
    // The browser receives a signed token, never the code itself.
    if (b.type === "admin-code") {
      const to = (process.env.ADMIN_EMAIL || "").toLowerCase();
      const code = String(crypto.randomInt(100000, 1000000));
      const exp = Date.now() + 10 * 60 * 1000;
      await sendResend({
        to,
        subject: "Al-Raqi admin verification code",
        text: `Your verification code is ${code}. It expires in 10 minutes.`,
      });
      return res.status(200).json({ ok: true, token: `${exp}.${sign(`${to}|${exp}|${code}`)}` });
    }

    // Customer account verification email.
    if (b.type === "welcome") {
      const to = clean(b.to, 120).trim().toLowerCase();
      if (!EMAIL.test(to)) return res.status(400).json({ error: "Invalid email" });
      await sendResend({
        to,
        subject: "Al-Raqi account verification",
        text: `Hi ${clean(b.name, 60)}, your Al-Raqi account was created with this email address. If this wasn’t you, please ignore this message.`,
      });
      return res.status(200).json({ ok: true });
    }

    // Order / financial alerts: always go to the configured admin list.
    if (b.type === "notify") {
      const list = (process.env.NOTIFY_EMAILS || process.env.ADMIN_EMAIL || "")
        .split(",").map((s) => s.trim()).filter(Boolean);
      await sendResend({
        to: list,
        subject: clean(b.subject || "Al-Raqi notification", 120),
        text: String(b.message || "").slice(0, 4000),
      });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "Unknown type" });
  } catch (e) {
    return res.status(500).json({ error: "Send failed" });
  }
};
