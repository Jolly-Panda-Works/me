#!/usr/bin/env node
/**
 * Jolly Panda Profile — update-prices.mjs
 *
 * Persian prices = package USD price (content/pricing.json) x today's dollar
 * rate from the Navasan API, shown in Rial ("۵۰ میلیون ریال").
 *
 * Writes: lang/fa.json (pricing.plans.*.price, pricing.updated),
 *         fa/plans/index.html (static fallback text of the same fields + <time datetime>),
 *         content/last-rate.json (used as a sanity check on the next run).
 *
 * Env:  NAVASAN_API_KEY   (required)  free key: https://t.me/navasan_contact_bot
 *       NAVASAN_ITEM      (optional)  default from content/pricing.json ("usd_sell")
 *       NAVASAN_UNIT      (optional)  "toman" (default) or "rial" — unit of the API value
 *       DRY_RUN=1         print the result, write nothing
 *       NAVASAN_BASE      (optional)  override the API base URL (testing)
 *
 * No dependencies; Node 18+. If anything looks wrong the script exits with an
 * error and leaves every file untouched, so a bad rate never reaches the site.
 */
import fs from "node:fs";

const DRY = process.env.DRY_RUN === "1";
const KEY = process.env.NAVASAN_API_KEY;
const CFG_PATH = "content/pricing.json";
const FA_PATH = "lang/fa.json";
const FA_HTML = "fa/plans/index.html";
const RATE_PATH = "content/last-rate.json";
const MAX_JUMP = 0.3; // refuse a rate that moved more than 30% since the last run

const fail = (msg) => { console.error("update-prices: " + msg); process.exit(1); };
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const writeJson = (p, o) => fs.writeFileSync(p, JSON.stringify(o, null, 2) + "\n");

// Persian digits / separators -> plain number
function toNumber(v) {
  const map = "۰۱۲۳۴۵۶۷۸۹";
  const s = String(v).replace(/[۰-۹]/g, (d) => map.indexOf(d)).replace(/[,٬\s]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

async function fetchRate(item) {
  // The docs show http://; try https first and fall back.
  const bases = process.env.NAVASAN_BASE ? [process.env.NAVASAN_BASE] : ["https://api.navasan.tech", "http://api.navasan.tech"];
  let lastErr;
  for (const base of bases) {
    try {
      const url = `${base}/latest/?api_key=${encodeURIComponent(KEY)}&item=${encodeURIComponent(item)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`HTTP ${res.status} ${body.message || ""}`.trim());
      const entry = body[item];
      const n = toNumber(entry && entry.value);
      if (!(n > 0)) throw new Error("no usable value for '" + item + "' in the response");
      return n;
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

// Money formatting: Rial, in millions, Persian digits — matches the existing copy.
const fmtMillion = (rial) => Math.round(rial / 1e6).toLocaleString("fa-IR");
const roundRial = (rial, stepM) => Math.max(stepM, Math.round(rial / (stepM * 1e6)) * stepM) * 1e6;

function priceText(usd, rate, stepM) {
  if (Array.isArray(usd)) {
    return `${fmtMillion(roundRial(usd[0] * rate, stepM))} تا ${fmtMillion(roundRial(usd[1] * rate, stepM))} میلیون ریال`;
  }
  return `${fmtMillion(roundRial(usd * rate, stepM))} میلیون ریال`;
}

async function main() {
  if (!KEY) fail("NAVASAN_API_KEY is not set");
  const cfg = readJson(CFG_PATH);
  const item = process.env.NAVASAN_ITEM || cfg.navasan.item;
  const unit = (process.env.NAVASAN_UNIT || cfg.navasan.unit || "toman").toLowerCase();
  if (!["toman", "rial"].includes(unit)) fail("NAVASAN_UNIT must be 'toman' or 'rial'");

  const raw = await fetchRate(item);
  const rialPerUsd = unit === "toman" ? raw * 10 : raw;
  const toman = rialPerUsd / 10;

  const prev = fs.existsSync(RATE_PATH) ? readJson(RATE_PATH).toman : 0;
  if (prev > 0 && Math.abs(toman - prev) / prev > MAX_JUMP) {
    fail(`rate ${toman} differs from last rate ${prev} by more than ${MAX_JUMP * 100}% — refusing to publish. ` +
         `If this is real, set "toman" to 0 in ${RATE_PATH} and run again.`);
  }

  const fa = readJson(FA_PATH);
  const plans = fa.pricing.plans;
  for (const id of Object.keys(cfg.usd)) {
    if (!plans[id]) fail(`plan '${id}' from ${CFG_PATH} is missing in ${FA_PATH}`);
    plans[id].price = priceText(cfg.usd[id], rialPerUsd, cfg.roundToMillionRial);
  }

  const now = new Date();
  fa.pricing.updated = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Tehran",
  }).format(now);
  const isoDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran" }).format(now); // YYYY-MM-DD

  console.log(`rate: ${toman.toLocaleString("en-US")} toman/USD (${item})`);
  for (const id of Object.keys(cfg.usd)) console.log(`  ${id}: ${plans[id].price}`);
  console.log(`  updated: ${fa.pricing.updated} (${isoDay})`);
  if (DRY) return console.log("DRY_RUN — nothing written");

  writeJson(FA_PATH, fa);
  writeJson(RATE_PATH, { toman, date: isoDay });

  // The home page also carries the same text as static HTML (shown before JS runs, and to crawlers).
  let html = fs.readFileSync(FA_HTML, "utf8");
  const setText = (key, text) => {
    const re = new RegExp(`(data-i18n="${key.replace(/\./g, "\\.")}"[^>]*>)[^<]*(</)`);
    if (!re.test(html)) fail(`could not find data-i18n="${key}" in ${FA_HTML}`);
    html = html.replace(re, `$1${text}$2`);
  };
  for (const id of Object.keys(cfg.usd)) setText(`pricing.plans.${id}.price`, plans[id].price);
  setText("pricing.updated", fa.pricing.updated);
  const dt = /(<time datetime=")[^"]*(" data-i18n="pricing\.updated")/;
  if (!dt.test(html)) fail("could not find the pricing <time> tag in " + FA_HTML);
  html = html.replace(dt, `$1${isoDay}$2`);
  fs.writeFileSync(FA_HTML, html);
}

main().catch((e) => fail(e.message || String(e)));
