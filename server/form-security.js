"use strict";
/**
 * Anti-bot + validation helpers for the profile request form.
 *
 * Layers (all server-side, so bots that skip the page's JavaScript fail):
 *   1. Signed, time-limited token  - issued by /api/token when the form loads.
 *      A submission needs a valid signature, must be at least MIN_AGE_MS old
 *      (people need a few seconds to fill a form, bots don't) and is single-use.
 *   2. Honeypot field ("website")  - invisible to people; bots fill it in.
 *   3. Cloudflare Turnstile        - optional, enabled by env vars.
 *   4. Per-IP rate limit           - best effort (in memory, per instance).
 *   5. Strict validation + length limits on every field.
 */
const crypto = require("crypto");

const MIN_AGE_MS = 3000;
const MAX_AGE_MS = 2 * 60 * 60 * 1000;

const PLANS = { basic: "Basic", professional: "Professional", custom: "Custom" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+()\-\s]{7,20}$/;
const SLUG_RE = /^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])?$/;

function getSecret(env = process.env) {
  return env.FORM_SECRET || env.RESEND_API_KEY || "";
}

function sign(secret, payload) {
  return crypto.createHmac("sha256", secret).update(String(payload)).digest("hex");
}

// token = "<issued-at ms>.<random nonce>.<hmac of both>"
function makeToken(secret, now = Date.now()) {
  const nonce = crypto.randomBytes(8).toString("hex");
  return `${now}.${nonce}.${sign(secret, `${now}.${nonce}`)}`;
}

const usedTokens = new Map(); // token -> expiry (best effort, per instance)

function verifyToken(secret, token, now = Date.now()) {
  if (!secret || typeof token !== "string") return "token";
  const [tsStr, nonce, sig] = token.split(".");
  const ts = Number(tsStr);
  if (!Number.isFinite(ts) || !nonce || !sig) return "token";
  const expected = sign(secret, `${tsStr}.${nonce}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return "token";
  const age = now - ts;
  if (age < MIN_AGE_MS) return "too_fast";
  if (age > MAX_AGE_MS) return "expired";

  for (const [t, exp] of usedTokens) if (exp < now) usedTokens.delete(t);
  if (usedTokens.has(token)) return "token";
  usedTokens.set(token, ts + MAX_AGE_MS);
  return null;
}

const hits = new Map(); // ip -> [timestamps]
function rateLimited(ip, now = Date.now(), limit = 5, windowMs = 10 * 60 * 1000) {
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  if (list.length >= limit) { hits.set(ip, list); return true; }
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return false;
}

async function verifyTurnstile(secret, token, ip, fetchImpl = fetch) {
  if (!token || typeof token !== "string") return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);
  const res = await fetchImpl("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  if (!res.ok) return false;
  const data = await res.json();
  return data && data.success === true;
}

const clean = (v, max) =>
  String(v == null ? "" : v)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim()
    .slice(0, max);

/** Returns { ok, errors, value }. */
function validate(body) {
  const v = {
    fullName: clean(body.fullName, 100),
    phone: clean(body.phone, 20),
    email: clean(body.email, 254),
    profession: clean(body.profession, 100),
    selectedPlan: clean(body.selectedPlan, 20),
    profileSlug: clean(body.profileSlug, 30).toLowerCase(),
    projectDetails: clean(body.projectDetails, 3000),
    lang: body.lang === "fa" ? "fa" : "en",
  };
  const errors = [];
  if (v.fullName.length < 2) errors.push("fullName");
  if (!PHONE_RE.test(v.phone)) errors.push("phone");
  if (!EMAIL_RE.test(v.email)) errors.push("email");
  if (v.profession.length < 2) errors.push("profession");
  if (!PLANS[v.selectedPlan]) errors.push("selectedPlan");
  if (!SLUG_RE.test(v.profileSlug)) errors.push("profileSlug");
  if (v.projectDetails.length < 1) errors.push("projectDetails");
  return { ok: errors.length === 0, errors, value: v };
}

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function buildEmail(v, domain = "https://me.jollypanda.ir") {
  const url = `${domain}/bio/${v.profileSlug}`;
  const rows = [
    ["Full name", v.fullName],
    ["Phone", v.phone],
    ["Email", v.email],
    ["Profession", v.profession],
    ["Plan", PLANS[v.selectedPlan]],
    ["Requested address", url],
    ["Site language", v.lang === "fa" ? "Persian (fa)" : "English (en)"],
    ["Project details", v.projectDetails],
  ];
  const text = rows.map(([k, val]) => `${k}: ${val}`).join("\n");
  const html = `<table cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">${rows
    .map(([k, val]) => `<tr><th align="left" valign="top" style="border-bottom:1px solid #eee;white-space:nowrap">${esc(k)}</th><td style="border-bottom:1px solid #eee;white-space:pre-wrap">${esc(val)}</td></tr>`)
    .join("")}</table>`;
  return { subject: `New Jolly Panda Profile request - ${v.profileSlug}`, text, html };
}

module.exports = {
  MIN_AGE_MS, MAX_AGE_MS, PLANS,
  getSecret, makeToken, verifyToken, rateLimited, verifyTurnstile, validate, buildEmail,
};
