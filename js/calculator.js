/* ==========================================================================
   Jolly Panda Profile — calculator.js
   All math happens on plain numbers (Toman, integers). Formatting for
   display (digit script, thousands separators, currency word) is applied
   only at render time, based on the active language — the underlying
   total is never derived from a formatted string.
   ========================================================================== */

(function () {
  "use strict";

  var PACKAGE_PRICES = {
    basic: 1500000,
    standard: 2500000,
    premium: 4000000
  };

  var ADDON_PRICES = {
    gallery: 350000,
    resume: 250000,
    animations: 400000,
    contactForm: 300000
  };

  var packageRadios, addonChecks, totalEl, form;

  function computeTotal() {
    var pkg = "basic";
    packageRadios.forEach(function (r) { if (r.checked) pkg = r.value; });

    var total = PACKAGE_PRICES[pkg] || 0;
    addonChecks.forEach(function (c) {
      if (c.checked) total += ADDON_PRICES[c.value] || 0;
    });
    return total;
  }

  function formatCurrency(amount) {
    var lang = (window.JollyPandaLang && window.JollyPandaLang.getLang()) || "fa";
    var suffix = (window.JollyPandaLang && window.JollyPandaLang.t("calculator.currencySuffix")) || "";
    var localized = amount.toLocaleString(lang === "fa" ? "fa-IR" : "en-US");
    return localized + " " + suffix;
  }

  function render() {
    if (!totalEl) return;
    totalEl.textContent = formatCurrency(computeTotal());
  }

  function init() {
    form = document.getElementById("calculatorForm");
    if (!form) return;

    packageRadios = Array.prototype.slice.call(form.querySelectorAll('input[name="calcPackage"]'));
    addonChecks = Array.prototype.slice.call(form.querySelectorAll('input[name="calcAddon"]'));
    totalEl = document.getElementById("calculatorTotal");

    packageRadios.forEach(function (r) { r.addEventListener("change", render); });
    addonChecks.forEach(function (c) { c.addEventListener("change", render); });
    document.addEventListener("jollypanda:languagechange", render);

    render();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
