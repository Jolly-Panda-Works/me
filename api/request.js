"use strict";
/**
 * POST /api/request - receives the profile request form and emails it to the
 * team through Resend (https://resend.com), then answers { ok: true }.
 *
 * Environment variables (Vercel -> Project -> Settings -> Environment Variables):
 *   RESEND_API_KEY        required  API key from resend.com
 *   MAIL_FROM             optional  e.g. "Jolly Panda Profile <noreply@jollypanda.ir>"
 *                                   (the domain must be verified in Resend)
 *   MAIL_TO               optional  where requests are delivered (default hello@jollypanda.ir)
 *   FORM_SECRET           optional  random string used to sign anti-bot tokens
 *                                   (falls back to RESEND_API_KEY)
 *   TURNSTILE_SITE_KEY    optional  Cloudflare Turnstile keys switch on the
 *   TURNSTILE_SECRET_KEY            extra "are you human" check
 *
 * Error codes returned as { ok: false, error }:
 *   method | invalid | token | too_fast | expired | captcha | rate | not_configured | delivery
 */
const sec = require("../server/form-security.js");

const fail = (res, status, error, extra) => res.status(status).json({ ok: false, error, ...(extra || {}) });

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return fail(res, 405, "method");
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  if (!body || typeof body !== "object") return fail(res, 400, "invalid");

  const apiKey = process.env.RESEND_API_KEY;
  const secret = sec.getSecret();
  if (!apiKey || !secret) return fail(res, 503, "not_configured");

  // 1. Honeypot: real visitors never see or fill this field. Answer "ok" so
  //    the bot learns nothing, but send nothing.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return res.status(200).json({ ok: true });
  }

  // 2. Signed, time-limited, single-use token.
  const tokenError = sec.verifyToken(secret, body.token);
  if (tokenError) return fail(res, 400, tokenError);

  const ip = String((req.headers["x-forwarded-for"] || "").split(",")[0] || req.socket?.remoteAddress || "").trim();

  // 3. Optional Cloudflare Turnstile.
  if (process.env.TURNSTILE_SECRET_KEY) {
    let human = false;
    try { human = await sec.verifyTurnstile(process.env.TURNSTILE_SECRET_KEY, body.turnstileToken, ip); } catch { human = false; }
    if (!human) return fail(res, 400, "captcha");
  }

  // 4. Rate limit.
  if (sec.rateLimited(ip || "unknown")) return fail(res, 429, "rate");

  // 5. Validate.
  const check = sec.validate(body);
  if (!check.ok) return fail(res, 400, "invalid", { fields: check.errors });

  // 6. Deliver.
  const mail = sec.buildEmail(check.value);
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || "Jolly Panda Profile <noreply@jollypanda.ir>",
        to: [process.env.MAIL_TO || "hello@jollypanda.ir"],
        reply_to: check.value.email,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      }),
    });
    if (!r.ok) {
      console.error("Resend error", r.status, await r.text().catch(() => ""));
      return fail(res, 502, "delivery");
    }
  } catch (err) {
    console.error("Resend request failed", err);
    return fail(res, 502, "delivery");
  }
  return res.status(200).json({ ok: true });
};
