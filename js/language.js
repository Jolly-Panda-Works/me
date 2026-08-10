/* ==========================================================================
   Jolly Panda Profile — language.js
   Same data-i18n architecture as the main studio site, but this product is
   Persian-first: DEFAULT_LANG is "fa" and language state is stored under
   its own key so it never collides with the studio site's preference.
   ========================================================================== */

(function () {
  "use strict";

  var SUPPORTED_LANGS = ["fa", "en"];
  var DEFAULT_LANG = "fa";
  var STORAGE_KEY = "jollypanda:me:lang";
  var cache = {};
  var currentDict = null;
  var currentLang = null;

  function getPath(obj, path) {
    return path.split(".").reduce(function (acc, key) {
      return acc && typeof acc === "object" ? acc[key] : undefined;
    }, obj);
  }

  function detectInitialLang() {
    var stored = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      /* localStorage unavailable — fall through */
    }
    if (stored && SUPPORTED_LANGS.indexOf(stored) !== -1) return stored;

    var browserLang = (navigator.language || "").slice(0, 2);
    if (SUPPORTED_LANGS.indexOf(browserLang) !== -1) return browserLang;

    return DEFAULT_LANG;
  }

  function fetchDictionary(lang) {
    if (cache[lang]) return Promise.resolve(cache[lang]);
    return fetch("lang/" + lang + ".json")
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load language file: " + lang);
        return res.json();
      })
      .then(function (data) {
        cache[lang] = data;
        return data;
      });
  }

  function applyTranslations(dict) {
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      var value = getPath(dict, key);
      if (typeof value === "string") {
        el.textContent = value;
      }
    });

    document.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      var pairs = el.getAttribute("data-i18n-attr").split("|");
      pairs.forEach(function (pair) {
        var parts = pair.split(":");
        var attr = parts[0];
        var key = parts[1];
        var value = getPath(dict, key);
        if (attr && typeof value === "string") {
          el.setAttribute(attr, value);
        }
      });
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var value = getPath(dict, el.getAttribute("data-i18n-placeholder"));
      if (typeof value === "string") el.setAttribute("placeholder", value);
    });

    // <title> and meta description
    var titleVal = getPath(dict, "meta.title");
    if (typeof titleVal === "string") document.title = titleVal;
    var descVal = getPath(dict, "meta.description");
    var descEl = document.querySelector('meta[name="description"]');
    if (descEl && typeof descVal === "string") descEl.setAttribute("content", descVal);
    var ogTitleEl = document.querySelector('meta[property="og:title"]');
    if (ogTitleEl && typeof titleVal === "string") ogTitleEl.setAttribute("content", titleVal);
    var ogDescEl = document.querySelector('meta[property="og:description"]');
    if (ogDescEl && typeof descVal === "string") ogDescEl.setAttribute("content", descVal);
  }

  function updateLangSwitchButtons(lang) {
    document.querySelectorAll(".lang-switch__btn").forEach(function (btn) {
      var isActive = btn.getAttribute("data-lang") === lang;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function setLanguage(lang) {
    if (SUPPORTED_LANGS.indexOf(lang) === -1) lang = DEFAULT_LANG;

    return fetchDictionary(lang).then(function (dict) {
      var dir = (dict.meta && dict.meta.dir) || (lang === "fa" ? "rtl" : "ltr");

      document.documentElement.setAttribute("lang", lang);
      document.documentElement.setAttribute("dir", dir);
      document.body.setAttribute("dir", dir);

      applyTranslations(dict);
      updateLangSwitchButtons(lang);

      currentDict = dict;
      currentLang = lang;

      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch (e) {
        /* ignore persistence failures */
      }

      document.dispatchEvent(
        new CustomEvent("jollypanda:languagechange", {
          detail: { lang: lang, dir: dir, dict: dict }
        })
      );
    });
  }

  function initLanguageSwitchers() {
    document.querySelectorAll(".lang-switch__btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setLanguage(btn.getAttribute("data-lang"));
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initLanguageSwitchers();
    setLanguage(detectInitialLang());
  });

  window.JollyPandaLang = {
    setLanguage: setLanguage,
    getDict: function () { return currentDict; },
    getLang: function () { return currentLang; },
    t: function (path) { return currentDict ? getPath(currentDict, path) : undefined; }
  };
})();
