/* ==========================================================================
   Jolly Panda Profile — bio.js
   Search / filter / sort for the profiles table on /en/bio/ and /fa/bio/.

   The page is generated at build time in the visitor's language (rows are
   already in the HTML, so search engines see them). This script loads
   /bio/projects.json and re-renders the table so it can be searched,
   filtered by topic and sorted. All text comes from the page itself
   (<script id="bioUi"> is generated from content/bio.json).
   ========================================================================== */
(function () {
  "use strict";

  var DATA_URL = "/bio/projects.json";

  var ui = {};
  try {
    ui = JSON.parse(document.getElementById("bioUi").textContent);
  } catch (e) { /* the page still works without dynamic strings */ }

  var lang = ui.lang || document.documentElement.lang || "en";

  var $ = function (id) { return document.getElementById(id); };
  var els = {
    search: $("bioSearch"), sort: $("bioSort"), chips: $("bioChips"),
    count: $("bioCount"), table: $("bioTable"), rows: $("bioRows"), state: $("bioState")
  };
  if (!els.rows) return;

  var projects = [];
  var loaded = false;
  var query = "";
  var topic = "";
  var sortKey = "name";

  function fmt(str, vars) {
    return String(str || "").replace(/\{(\w+)\}/g, function (m, k) { return k in vars ? vars[k] : m; });
  }

  function num(n) {
    try { return new Intl.NumberFormat(lang === "fa" ? "fa-IR" : "en-US").format(n); } catch (e) { return String(n); }
  }

  /* ---------- text normalisation (Persian-friendly search) ---------- */
  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[\u200c\u200f\u200e]/g, " ")      // ZWNJ / direction marks
      .replace(/[\u064b-\u065f\u0670]/g, "")       // Arabic diacritics
      .replace(/\u064a/g, "\u06cc").replace(/\u0643/g, "\u06a9") // Arabic -> Persian letters
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
    var arrow = h("a", { class: "bio-open", href: p.url, "aria-label": (ui.open || "") + ": " + p.name });
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
      return a.name.localeCompare(b.name, lang, { sensitivity: "base" });
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
      var btn = h("button", { type: "button", class: "bio-chip", "data-topic": tp, text: tp || ui.all });
      btn.setAttribute("aria-pressed", tp === topic ? "true" : "false");
      els.chips.appendChild(btn);
    });
  }

  function setState(msg, withClear) {
    if (!msg) { els.state.hidden = true; els.state.textContent = ""; return; }
    els.state.hidden = false;
    els.state.textContent = msg;
    if (withClear) {
      els.state.appendChild(document.createElement("br"));
      els.state.appendChild(h("button", { type: "button", class: "btn btn-secondary", id: "bioClear", text: ui.clear }));
    }
  }

  function countText(n) {
    if (n === projects.length) return fmt(n === 1 ? ui.countOne : ui.countMany, { n: num(n) });
    return fmt(ui.countPartial, { n: num(n), total: num(projects.length) });
  }

  function render() {
    if (!loaded) return; // until the data arrives, keep the pre-rendered rows
    renderChips();
    var list = visible();
    els.rows.innerHTML = "";
    list.forEach(function (p) { els.rows.appendChild(row(p)); });
    els.table.hidden = list.length === 0;
    els.count.textContent = countText(list.length);
    setState(list.length ? "" : ui.empty, list.length === 0 && (query || topic));
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
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
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

  /* ---------- boot ---------- */
  readUrl();

  fetch(DATA_URL, { cache: "no-cache" })
    .then(function (res) { if (!res.ok) throw new Error("HTTP " + res.status); return res.json(); })
    .then(function (data) {
      projects = Array.isArray(data) ? data : [];
      if (topic && allTopics().indexOf(topic) === -1) topic = "";
      loaded = true;
      render();
    })
    .catch(function () {
      if (!els.rows.children.length) setState(ui.error);
    });
})();
