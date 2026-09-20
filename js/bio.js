/* ==========================================================================
   Jolly Panda Profile — bio.js
   Renders /bio/projects.json (generated at build time by
   scripts/build-site.mjs) as a searchable, filterable table.
   Vanilla ES5-style, no dependencies.
   ========================================================================== */
(function () {
  "use strict";

  var STORAGE_KEY = "jollypanda:me:lang";
  var DATA_URL = "/bio/projects.json";

  var STRINGS = {
    en: {
      skip: "Skip to content",
      brandSub: "Profile",
      request: "Request a Profile",
      eyebrow: "Profiles",
      title: "Profiles built by Jolly Panda",
      lead: "Browse personal profile and portfolio pages. Search by name or filter by topic.",
      searchLabel: "Search profiles",
      searchPlaceholder: "Search by name, role or topic…",
      sortLabel: "Sort by",
      sortName: "Name (A–Z)",
      sortUpdated: "Recently updated",
      colPreview: "Preview",
      colName: "Name",
      colTopics: "Topics",
      colUpdated: "Updated",
      colOpen: "Open",
      all: "All",
      count: function (n, total) { return n === total ? n + (n === 1 ? " profile" : " profiles") : n + " of " + total + " profiles"; },
      empty: "No profiles match your search.",
      clear: "Clear filters",
      loading: "Loading profiles…",
      error: "Couldn't load the profiles. Please try again later.",
      open: "Open profile",
      copyright: "© 2026 Jolly Panda. All rights reserved.",
      docTitle: "Profiles | Jolly Panda",
      metaDesc: "Browse the personal profile and portfolio websites built by Jolly Panda.",
      homeLabel: "Jolly Panda Profile home",
      langLabel: "Language switch",
      filterLabel: "Filter by topic"
    },
    fa: {
      skip: "رفتن به محتوا",
      brandSub: "پروفایل",
      request: "درخواست پروفایل",
      eyebrow: "پروفایل‌ها",
      title: "پروفایل‌های ساخته‌شده توسط جالی پاندا",
      lead: "صفحه‌های شخصی و نمونه‌کار را ببینید. بر اساس نام جست‌وجو کنید یا با موضوع فیلتر کنید.",
      searchLabel: "جست‌وجوی پروفایل‌ها",
      searchPlaceholder: "جست‌وجو بر اساس نام، عنوان شغلی یا موضوع…",
      sortLabel: "مرتب‌سازی",
      sortName: "نام (الف تا ی)",
      sortUpdated: "آخرین به‌روزرسانی",
      colPreview: "پیش‌نمایش",
      colName: "نام",
      colTopics: "موضوع‌ها",
      colUpdated: "به‌روزرسانی",
      colOpen: "باز کردن",
      all: "همه",
      count: function (n, total) { return n === total ? n.toLocaleString("fa-IR") + " پروفایل" : n.toLocaleString("fa-IR") + " از " + total.toLocaleString("fa-IR") + " پروفایل"; },
      empty: "پروفایلی با این جست‌وجو پیدا نشد.",
      clear: "پاک کردن فیلترها",
      loading: "در حال بارگذاری…",
      error: "بارگذاری پروفایل‌ها ممکن نشد. لطفاً بعداً دوباره تلاش کنید.",
      open: "باز کردن پروفایل",
      copyright: "© ۲۰۲۶ جالی پاندا. تمامی حقوق محفوظ است.",
      docTitle: "پروفایل‌ها | جالی پاندا",
      metaDesc: "صفحه‌های شخصی و نمونه‌کارهای ساخته‌شده توسط جالی پاندا را ببینید.",
      homeLabel: "صفحهٔ اصلی پروفایل جالی پاندا",
      langLabel: "تغییر زبان",
      filterLabel: "فیلتر بر اساس موضوع"
    }
  };

  var $ = function (id) { return document.getElementById(id); };
  var els = {
    search: $("bioSearch"), sort: $("bioSort"), chips: $("bioChips"),
    count: $("bioCount"), table: $("bioTable"), rows: $("bioRows"),
    state: $("bioState"), request: $("requestLink")
  };

  var lang = "en";
  var projects = [];
  var loaded = false;
  var failed = false;
  var query = "";
  var topic = "";
  var sortKey = "name";

  /* ---------- language ---------- */
  function pickLang() {
    var fromUrl = new URLSearchParams(location.search).get("lang");
    if (fromUrl === "fa" || fromUrl === "en") return fromUrl;
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "fa" || stored === "en") return stored;
    } catch (e) {}
    return (navigator.language || "").slice(0, 2) === "fa" ? "fa" : "en";
  }

  function t(key) { return STRINGS[lang][key]; }

  function applyLang(next) {
    lang = next;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    var dir = lang === "fa" ? "rtl" : "ltr";
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", dir);
    document.body.setAttribute("dir", dir);
    document.title = t("docTitle");

    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n]"), function (el) {
      var v = t(el.getAttribute("data-i18n"));
      if (typeof v === "string") el.textContent = v;
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n-attr]"), function (el) {
      el.getAttribute("data-i18n-attr").split("|").forEach(function (pair) {
        var parts = pair.split(":");
        var v = t(parts[1]);
        if (parts[0] && typeof v === "string") el.setAttribute(parts[0], v);
      });
    });
    var descEl = document.querySelector('meta[name="description"]');
    if (descEl) descEl.setAttribute("content", t("metaDesc"));
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n-placeholder]"), function (el) {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
    });
    Array.prototype.forEach.call(document.querySelectorAll(".lang-switch__btn"), function (btn) {
      var on = btn.getAttribute("data-lang") === lang;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    els.request.setAttribute("href", "/" + lang + "/#request");
    render();
  }

  /* ---------- text normalisation (Persian-friendly search) ---------- */
  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[\u200c\u200f\u200e]/g, " ")      // ZWNJ / direction marks
      .replace(/[\u064b-\u065f\u0670]/g, "")       // Arabic diacritics
      .replace(/ي/g, "ی").replace(/ك/g, "ک")       // Arabic -> Persian letters
      .replace(/[\u06f0-\u06f9]/g, function (d) { return String(d.charCodeAt(0) - 0x06f0); })
      .replace(/[\u0660-\u0669]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); })
      .replace(/\s+/g, " ")
      .trim();
  }

  function haystack(p) {
    return norm([p.name, p.subtitle, p.description, p.slug, (p.topics || []).join(" ")].join(" "));
  }

  /* ---------- DOM helper ---------- */
  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") el.textContent = attrs[k];
      else if (k === "class") el.className = attrs[k];
      else el.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (kid) { if (kid) el.appendChild(kid); });
    return el;
  }

  function formatDate(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    try {
      return new Intl.DateTimeFormat(lang === "fa" ? "fa-IR" : "en-GB", { year: "numeric", month: "short", day: "numeric" }).format(d);
    } catch (e) { return d.toISOString().slice(0, 10); }
  }

  function thumb(p) {
    var box = h("a", { class: "bio-thumb", href: p.url, tabindex: "-1", "aria-hidden": "true" });
    var initial = (p.name || p.slug || "?").trim().charAt(0).toUpperCase();
    function placeholder() {
      box.innerHTML = "";
      box.appendChild(h("div", { class: "bio-thumb__ph", text: initial }));
    }
    if (p.image) {
      var img = h("img", { src: p.image, alt: "", loading: "lazy", decoding: "async", width: "256", height: "160" });
      img.addEventListener("error", placeholder);
      box.appendChild(img);
    } else {
      placeholder();
    }
    return box;
  }

  function row(p) {
    var name = h("div", {}, [
      h("a", { class: "bio-name", href: p.url, text: p.name }),
      p.subtitle ? h("div", { class: "bio-sub", text: p.subtitle }) : null,
      p.description ? h("p", { class: "bio-desc", text: p.description }) : null
    ]);

    var tags = h("div", { class: "bio-tags" }, (p.topics || []).map(function (tp) {
      return h("span", { class: "bio-tag", text: tp });
    }));

    var arrow = h("a", { class: "bio-open", href: p.url, "aria-label": t("open") + ": " + p.name });
    arrow.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

    return h("tr", {}, [
      h("td", { class: "col-preview" }, [thumb(p)]),
      h("td", { class: "col-name" }, [name]),
      h("td", { class: "col-topics" }, [tags]),
      h("td", { class: "col-updated" }, [h("span", { class: "bio-date", text: formatDate(p.updated) })]),
      h("td", { class: "col-action" }, [arrow])
    ]);
  }

  /* ---------- filtering / sorting ---------- */
  function visible() {
    var q = norm(query);
    var list = projects.filter(function (p) {
      if (topic && (p.topics || []).indexOf(topic) === -1) return false;
      if (!q) return true;
      var hay = haystack(p);
      return q.split(" ").every(function (word) { return hay.indexOf(word) !== -1; });
    });
    list.sort(function (a, b) {
      if (sortKey === "updated") return String(b.updated || "").localeCompare(String(a.updated || ""));
      return a.name.localeCompare(b.name, lang === "fa" ? "fa" : "en", { sensitivity: "base" });
    });
    return list;
  }

  function allTopics() {
    var seen = {};
    projects.forEach(function (p) { (p.topics || []).forEach(function (tp) { seen[tp] = true; }); });
    return Object.keys(seen).sort();
  }

  function renderChips() {
    var topics = allTopics();
    els.chips.innerHTML = "";
    if (!topics.length) { els.chips.hidden = true; return; }
    els.chips.hidden = false;
    [""].concat(topics).forEach(function (tp) {
      var btn = h("button", { type: "button", class: "bio-chip", "data-topic": tp, text: tp || t("all") });
      btn.setAttribute("aria-pressed", tp === topic ? "true" : "false");
      els.chips.appendChild(btn);
    });
  }

  function setState(msg, withClear) {
    if (!msg) { els.state.hidden = true; els.state.textContent = ""; return; }
    els.state.hidden = false;
    els.state.textContent = msg;
    if (withClear) {
      var btn = h("button", { type: "button", class: "btn btn-secondary", id: "bioClear", text: t("clear") });
      els.state.appendChild(document.createElement("br"));
      els.state.appendChild(btn);
    }
  }

  function render() {
    if (!loaded) {
      els.table.hidden = true;
      els.count.textContent = "";
      setState(failed ? t("error") : t("loading"));
      return;
    }
    renderChips();
    var list = visible();
    els.rows.innerHTML = "";
    list.forEach(function (p) { els.rows.appendChild(row(p)); });
    els.table.hidden = list.length === 0;
    els.count.textContent = t("count")(list.length, projects.length);
    setState(list.length ? "" : t("empty"), list.length === 0 && (query || topic));
  }

  /* ---------- URL <-> state ---------- */
  function readUrl() {
    var params = new URLSearchParams(location.search);
    query = params.get("q") || "";
    topic = params.get("topic") || "";
    sortKey = params.get("sort") === "updated" ? "updated" : "name";
    els.search.value = query;
    els.sort.value = sortKey;
  }

  function writeUrl() {
    var params = new URLSearchParams();
    if (query) params.set("q", query);
    if (topic) params.set("topic", topic);
    if (sortKey !== "name") params.set("sort", sortKey);
    var qs = params.toString();
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
  }

  /* ---------- events ---------- */
  els.search.addEventListener("input", function () { query = els.search.value; writeUrl(); render(); });
  els.sort.addEventListener("change", function () { sortKey = els.sort.value; writeUrl(); render(); });

  els.chips.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest(".bio-chip") : null;
    if (!btn) return;
    topic = btn.getAttribute("data-topic") || "";
    writeUrl(); render();
  });

  els.state.addEventListener("click", function (e) {
    if (e.target && e.target.id === "bioClear") {
      query = ""; topic = ""; els.search.value = "";
      writeUrl(); render(); els.search.focus();
    }
  });

  Array.prototype.forEach.call(document.querySelectorAll(".lang-switch__btn"), function (btn) {
    btn.addEventListener("click", function () { applyLang(btn.getAttribute("data-lang")); });
  });

  /* ---------- boot ---------- */
  readUrl();
  applyLang(pickLang());
  writeUrl(); // also drops the one-time ?lang= parameter from the address bar

  fetch(DATA_URL, { cache: "no-cache" })
    .then(function (res) { if (!res.ok) throw new Error("HTTP " + res.status); return res.json(); })
    .then(function (data) {
      projects = Array.isArray(data) ? data : [];
      if (topic && allTopics().indexOf(topic) === -1) topic = "";
      loaded = true;
      render();
    })
    .catch(function () { failed = true; render(); });
})();
