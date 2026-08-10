/* ==========================================================================
   Jolly Panda Profile — list-i18n.js
   language.js handles scalar strings via data-i18n. This companion script
   handles the one place we need arrays from the translation file: the
   bullet-point feature lists on each pricing card (data-i18n-list="...").
   ========================================================================== */

(function () {
  "use strict";

  function getPath(obj, path) {
    return path.split(".").reduce(function (acc, key) {
      return acc && typeof acc === "object" ? acc[key] : undefined;
    }, obj);
  }

  function renderLists() {
    var dict = window.JollyPandaLang && window.JollyPandaLang.getDict();
    if (!dict) return;

    document.querySelectorAll("[data-i18n-list]").forEach(function (el) {
      var items = getPath(dict, el.getAttribute("data-i18n-list"));
      if (!Array.isArray(items)) return;
      el.innerHTML = "";
      items.forEach(function (text) {
        var li = document.createElement("li");
        li.textContent = text;
        el.appendChild(li);
      });
    });
  }

  document.addEventListener("jollypanda:languagechange", renderLists);
  document.addEventListener("DOMContentLoaded", renderLists);
})();
