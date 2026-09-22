/* ==========================================================================
   Jolly Panda Profile — email-service.js

   HOW FORM SUBMISSIONS REACH THE TEAM:

   The request form is posted to our own endpoint, /api/request (a Vercel
   serverless function, see api/request.js), which emails it to
   hello@jollypanda.ir through Resend. The endpoint needs the environment
   variables listed at the top of api/request.js.

   Anti-bot protection (all verified on the server):
     - a signed, time-limited, single-use token fetched from /api/token as
       soon as the page loads (bots that never run this script have none);
     - a hidden honeypot field named "website";
     - optional Cloudflare Turnstile, switched on by the TURNSTILE_* env vars
       (the site key reaches the browser through /api/token).

   form.js only calls `window.ProfileEmailService.sendRequest(payload)`.
   ========================================================================== */

window.ProfileEmailService = (function () {
  "use strict";

  var TOKEN_URL = "/api/token";
  var SEND_URL = "/api/request";
  var MIN_WAIT_MS = 3500; // server rejects submissions younger than 3 s
  var MAX_FRESH_MS = 60 * 60 * 1000;

  var session = null; // { token, siteKey, at }
  var widgetId = null;

  function fetchSession() {
    return fetch(TOKEN_URL, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("token " + res.status);
        return res.json();
      })
      .then(function (data) {
        session = { token: data.token, siteKey: data.turnstileSiteKey || null, at: Date.now() };
        return session;
      });
  }

  function ensureSession() {
    if (session && Date.now() - session.at < MAX_FRESH_MS) return Promise.resolve(session);
    return fetchSession();
  }

  /* ---------- optional Cloudflare Turnstile ---------- */
  function renderTurnstile(siteKey) {
    var box = document.getElementById("turnstileBox");
    if (!box || widgetId !== null || !siteKey) return;

    function draw() {
      if (!window.turnstile || widgetId !== null) return;
      widgetId = window.turnstile.render(box, {
        sitekey: siteKey,
        language: document.documentElement.lang === "fa" ? "fa" : "en",
        theme: "light"
      });
    }

    if (window.turnstile) return draw();
    var s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.onload = draw;
    document.head.appendChild(s);
  }

  function turnstileValue(sess) {
    if (!sess.siteKey) return "";
    return window.turnstile && widgetId !== null ? window.turnstile.getResponse(widgetId) || "" : "";
  }

  /** Call once when the form is on the page: fetches a token early. */
  function init() {
    ensureSession()
      .then(function (s) { renderTurnstile(s.siteKey); })
      .catch(function () { /* sendRequest will retry and report the error */ });
  }

  /**
   * sendRequest(payload) -> Promise<{ ok, code? }>
   * code: captcha | token | too_fast | expired | rate | invalid |
   *       not_configured | delivery | network | http_<status>
   */
  function sendRequest(payload) {
    return ensureSession()
      .then(function (s) {
        if (s.siteKey && !turnstileValue(s)) {
          var err = new Error("captcha");
          err.code = "captcha";
          throw err;
        }
        var wait = Math.max(0, MIN_WAIT_MS - (Date.now() - s.at));
        return new Promise(function (resolve) { setTimeout(function () { resolve(s); }, wait); });
      })
      .then(function (s) {
        var honeypot = document.getElementById("website");
        var body = Object.assign({}, payload, {
          token: s.token,
          website: honeypot ? honeypot.value : "",
          turnstileToken: turnstileValue(s),
          lang: document.documentElement.lang === "fa" ? "fa" : "en"
        });
        return fetch(SEND_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
      })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          // a token is single-use: get a fresh one for the next attempt
          session = null;
          if (widgetId !== null && window.turnstile) window.turnstile.reset(widgetId);
          init();
          if (res.ok && data.ok) return { ok: true };
          return { ok: false, code: data.error || "http_" + res.status };
        });
      })
      .catch(function (err) {
        return { ok: false, code: (err && err.code) || "network", error: err };
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (document.getElementById("profileRequestForm")) init();
  });

  return { sendRequest: sendRequest, init: init };
})();
