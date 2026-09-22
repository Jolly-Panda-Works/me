"use strict";
// GET /api/token -> { token, turnstileSiteKey? }
// Called by the request form when the page loads (see js/email-service.js).
const { getSecret, makeToken } = require("../server/form-security.js");

module.exports = (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method" });
  }
  const secret = getSecret();
  if (!secret) return res.status(503).json({ error: "not_configured" });
  return res.status(200).json({
    token: makeToken(secret),
    turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || null,
  });
};
