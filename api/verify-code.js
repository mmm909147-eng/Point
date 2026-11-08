const crypto = require("crypto");
const { cors, sign, hasSecret, limited, parse } = require("./_lib");

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (limited(req, "verify", 10)) return res.status(429).json({ ok: false, error: "Too many attempts" });
  if (!hasSecret()) return res.status(500).json({ ok: false, error: "Server not configured: CODE_SECRET must be at least 16 characters." });
  let valid = false;
  try {
    const b = parse(req);
    const [exp, mac] = String(b.token || "").split(".");
    const to = (process.env.ADMIN_EMAIL || "").toLowerCase();
    const good = sign(`${to}|${exp}|${String(b.code || "").trim()}`);
    valid = Date.now() < Number(exp) && !!mac &&
      crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(good));
  } catch (e) { valid = false; }
  return res.status(valid ? 200 : 401).json({ ok: valid });
};
