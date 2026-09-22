/* ==========================================================================
   Jolly Panda Studio — app.js
   Core interactive behavior shared by EVERY page: sticky-nav scroll state,
   responsive mobile menu, and the language links (real <a href> links to the
   same page in the other language, so /en/faq/ <-> /fa/faq/).
   ========================================================================== */

(function () {
  "use strict";

  function initStickyHeader() {
    var header = document.getElementById("siteHeader");
    if (!header) return;

    function updateHeaderState() {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    }

    updateHeaderState();
    window.addEventListener("scroll", updateHeaderState, { passive: true });
  }

  function initMobileMenu() {
    var toggle = document.getElementById("navToggle");
    var links = document.getElementById("navLinks");
    if (!toggle || !links) return;

    function closeMenu() {
      toggle.setAttribute("aria-expanded", "false");
      links.classList.remove("is-open");
      document.body.style.overflow = "";
    }

    function openMenu() {
      toggle.setAttribute("aria-expanded", "true");
      links.classList.add("is-open");
      document.body.style.overflow = "hidden";
    }

    toggle.addEventListener("click", function () {
      var isOpen = toggle.getAttribute("aria-expanded") === "true";
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    // Close the menu whenever a nav link is chosen.
    links.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });

    // Close on Escape for keyboard users.
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeMenu();
    });

    // If the viewport grows past the mobile breakpoint, reset state.
    window.addEventListener("resize", function () {
      if (window.innerWidth >= 768) closeMenu();
    });
  }

  var LANG_KEY = "jollypanda:me:lang";

  function initLanguageLinks() {
    // Remember the language of the page being read, so the root redirector
    // can send a returning visitor to the language they used last.
    var m = window.location.pathname.match(/^\/(en|fa)(\/|$)/);
    if (m) {
      try { localStorage.setItem(LANG_KEY, m[1]); } catch (e) { /* ignore */ }
    }

    document.querySelectorAll("a.lang-switch__btn").forEach(function (link) {
      var base = link.getAttribute("href");
      link.addEventListener("click", function () {
        try { localStorage.setItem(LANG_KEY, link.getAttribute("data-lang")); } catch (e) { /* ignore */ }
        // Keep the visitor's place: the search/filter query and #anchor
        link.setAttribute("href", base + window.location.search + window.location.hash);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initStickyHeader();
    initMobileMenu();
    initLanguageLinks();
  });
})();
