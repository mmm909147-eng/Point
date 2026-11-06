const crypto = require("crypto");
const { cors, sign, limited, parse } = require("./_lib");

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (limited(req, 10)) return res.status(429).json({ error: "Too many attempts" });
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
