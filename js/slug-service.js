/* ==========================================================================
   Jolly Panda Profile — slug-service.js

   STATIC-PHASE MOCK SERVICE LAYER.

   This file is the ONLY place that knows the site is currently static.
   Every other script talks to `window.ProfileSlugService` and has no idea
   whether the data underneath is a hardcoded array or a real database.

   When a backend exists, replace the two functions below with real fetch()
   calls to something like:

     GET  /api/profile/check-slug?slug=useffarahmand
          -> { status: "available" | "taken" | "reserved" | "invalid" }

     POST /api/profile/reserve-slug   { slug: "useffarahmand", ...formData }
          -> { ok: true,  code: "RESERVED",           slug }
          -> { ok: false, code: "SLUG_ALREADY_TAKEN",  slug }
          -> { ok: false, code: "SLUG_INVALID",        slug }

   IMPORTANT (business requirement, not just UI polish):
   The frontend check below is NEVER authoritative. A slug can only be
   permanently assigned once the backend has attempted to write it under a
   database-level UNIQUE constraint on `profiles.slug`. Two people can pass
   the frontend "available" check for the same slug at nearly the same
   moment — only the database can arbitrate that race safely:

     attempt to INSERT/reserve slug
     database enforces UNIQUE(slug)
     on conflict -> return SLUG_ALREADY_TAKEN

   `attemptReserveSlug()` below is written to mirror that contract now, so
   swapping the mock body for a real POST later requires no changes to any
   caller (slug-input.js, form.js).
   ========================================================================== */

window.ProfileSlugService = (function () {
  "use strict";

  // Slugs that must never be assignable to a normal user.
  // Keep this list in one place so it can be extended later without
  // touching validation logic anywhere else.
  var RESERVED_SLUGS = [
    "admin", "api", "www", "mail", "support", "contact", "about",
    "pricing", "login", "signup", "register", "dashboard", "profile",
    "profiles", "settings", "privacy", "terms", "help", "blog",
    "assets", "static", "cdn", "favicon", "robots", "sitemap",
    "en", "fa", "bio"
  ];

  // Mock "already taken" slugs for the static/demo phase only.
  // In production this array disappears entirely — the database is
  // the single source of truth.
  var mockTakenSlugs = ["useffarahmand", "john-doe", "sara-ahmadi", "ali1378"];

  var SLUG_MIN = 3;
  var SLUG_MAX = 30;
  // lowercase english letters, numbers, hyphens; no leading/trailing hyphen
  var SLUG_PATTERN = /^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])?$/;

  function normalizeSlug(raw) {
    return String(raw == null ? "" : raw)
      .trim()
      .toLowerCase();
  }

  function validateFormat(slug) {
    if (!slug) return { valid: false, reason: "tooShort" };
    if (slug.length < SLUG_MIN) return { valid: false, reason: "tooShort" };
    if (slug.length > SLUG_MAX) return { valid: false, reason: "tooLong" };
    if (!SLUG_PATTERN.test(slug)) return { valid: false, reason: "invalidChars" };
    return { valid: true };
  }

  function isReserved(slug) {
    return RESERVED_SLUGS.indexOf(slug) !== -1;
  }

  function delay(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  /**
   * checkSlugAvailability(rawSlug) -> Promise<{ status, slug, reason? }>
   * status: "available" | "taken" | "reserved" | "invalid"
   *
   * Simulates a network round trip. Replace the body with:
   *   const res = await fetch("/api/profile/check-slug?slug=" + encodeURIComponent(slug));
   *   return res.json();
   */
  function checkSlugAvailability(rawSlug) {
    var slug = normalizeSlug(rawSlug);
    var format = validateFormat(slug);

    return delay(450).then(function () {
      if (!format.valid) {
        return { status: "invalid", slug: slug, reason: format.reason };
      }
      if (isReserved(slug)) {
        return { status: "reserved", slug: slug };
      }
      if (mockTakenSlugs.indexOf(slug) !== -1) {
        return { status: "taken", slug: slug };
      }
      return { status: "available", slug: slug };
    });
  }

  /**
   * attemptReserveSlug(rawSlug) -> Promise<{ ok, code, slug }>
   *
   * This represents the AUTHORITATIVE, final reservation attempt made at
   * submit time — never trust an earlier "available" result on its own.
   * codes: "RESERVED" | "SLUG_ALREADY_TAKEN" | "SLUG_INVALID"
   *
   * Replace the body with a POST to /api/profile/reserve-slug once a real
   * backend + UNIQUE(slug) constraint exists. The mock below still re-runs
   * the availability check and records the slug as taken, so a second
   * attempt in the same session is caught too.
   */
  function attemptReserveSlug(rawSlug) {
    return checkSlugAvailability(rawSlug).then(function (check) {
      if (check.status === "invalid") {
        return { ok: false, code: "SLUG_INVALID", slug: check.slug };
      }
      if (check.status === "taken" || check.status === "reserved") {
        return { ok: false, code: "SLUG_ALREADY_TAKEN", slug: check.slug };
      }
      // "available" -> reserve it now (mock of the DB INSERT succeeding)
      mockTakenSlugs.push(check.slug);
      return { ok: true, code: "RESERVED", slug: check.slug };
    });
  }

  return {
    SLUG_MIN: SLUG_MIN,
    SLUG_MAX: SLUG_MAX,
    RESERVED_SLUGS: RESERVED_SLUGS,
    normalizeSlug: normalizeSlug,
    validateFormat: validateFormat,
    isReserved: isReserved,
    checkSlugAvailability: checkSlugAvailability,
    attemptReserveSlug: attemptReserveSlug
  };
})();
