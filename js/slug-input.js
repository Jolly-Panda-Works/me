/* ==========================================================================
   Jolly Panda Profile — slug-input.js
   Wires the "profile URL" field to ProfileSlugService with debouncing and
   a live preview + availability state. Pure UI glue — all business rules
   (format, reserved list, availability) live in slug-service.js.
   ========================================================================== */

(function () {
  "use strict";

  var DEBOUNCE_MS = 500;

  var input, previewEl, statusEl;
  var latestRequestId = 0; // guards against out-of-order async responses
  // Publicly readable so form.js can gate submission on it.
  window.ProfileSlugState = { status: "empty", slug: "" };

  function debounce(fn, wait) {
    var t;
    return function () {
      var args = arguments;
      var ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }

  function softNormalize(raw) {
    // Light, predictable normalization only — never silently rewrite the
    // user's intent beyond lowercasing and trimming stray spaces.
    return String(raw || "").trim().toLowerCase().replace(/\s+/g, "-");
  }

  function t(key) {
    return (window.JollyPandaLang && window.JollyPandaLang.t(key)) || "";
  }

  function setStatus(status, reasonKey) {
    window.ProfileSlugState = { status: status, slug: input ? softNormalize(input.value) : "" };
    if (!statusEl) return;

    statusEl.classList.remove("is-checking", "is-available", "is-taken", "is-invalid");

    var messageKey = null;
    switch (status) {
      case "checking": messageKey = "slug.checking"; statusEl.classList.add("is-checking"); break;
      case "available": messageKey = "slug.available"; statusEl.classList.add("is-available"); break;
      case "taken": messageKey = "slug.taken"; statusEl.classList.add("is-taken"); break;
      case "reserved": messageKey = "slug.reserved"; statusEl.classList.add("is-taken"); break;
      case "invalid": messageKey = "slug." + (reasonKey || "invalid"); statusEl.classList.add("is-invalid"); break;
      default: messageKey = null;
    }

    statusEl.textContent = messageKey ? t(messageKey) : "";
    statusEl.setAttribute("data-i18n", messageKey || "");
  }

  function updatePreview() {
    if (!previewEl) return;
    var val = softNormalize(input.value);
    previewEl.textContent = val || t("form.placeholders.url");
  }

  function runCheck() {
    var raw = input.value;
    var slug = softNormalize(raw);
    updatePreview();

    if (!slug) {
      setStatus("empty");
      return;
    }

    setStatus("checking");
    var requestId = ++latestRequestId;

    window.ProfileSlugService.checkSlugAvailability(slug).then(function (result) {
      if (requestId !== latestRequestId) return; // a newer keystroke superseded this check
      if (result.status === "invalid") {
        setStatus("invalid", result.reason);
      } else {
        setStatus(result.status);
      }
    });
  }

  var debouncedCheck = debounce(runCheck, DEBOUNCE_MS);

  function init() {
    input = document.getElementById("profileSlugInput");
    previewEl = document.getElementById("profileSlugPreview");
    statusEl = document.getElementById("profileSlugStatus");
    if (!input) return;

    updatePreview();

    input.addEventListener("input", function () {
      updatePreview();
      setStatus("pending"); // clears old state immediately while debounce is pending
      debouncedCheck();
    });

    input.addEventListener("blur", function () {
      // Normalize the displayed value once the user leaves the field,
      // without doing it disruptively while they're mid-typing.
      input.value = softNormalize(input.value);
      updatePreview();
    });

    document.addEventListener("jollypanda:languagechange", function () {
      // Re-render whatever status is currently showing in the new language.
      setStatus(window.ProfileSlugState.status);
      updatePreview();
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
