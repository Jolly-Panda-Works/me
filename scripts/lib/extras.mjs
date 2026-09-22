// 404 page, /bio/ language redirector, sitemap.xml and robots.txt.
import { esc, fill, escXml } from "./html.mjs";
import { header, footer, vars, DIR, LANGS, pageUrl } from "./layout.mjs";

// ---------------------------------------------------------------- 404 page
function notFoundBody(site, data, lang) {
  const c = data[lang];
  const v = vars(site, lang);
  return `${header(site, lang, null, "")}

  <main id="main">
    <section class="notfound">
      <div class="container notfound__inner">
        <picture>
          <source srcset="/assets/images/404-panda.webp" type="image/webp" />
          <img class="notfound__img" src="/assets/images/404-panda.png" width="500" height="500" alt="${esc(c.imageAlt)}" />
        </picture>
        <h1 class="notfound__title">${esc(c.title)}</h1>
        <p class="notfound__text">${esc(c.text)}</p>
        <div class="notfound__actions">
          <a class="btn btn-primary" href="${esc(fill(c.primary.href, v))}">${esc(c.primary.label)}</a>
          <a class="btn btn-secondary" href="${esc(fill(c.secondary.href, v))}">${esc(c.secondary.label)}</a>
        </div>
      </div>
    </section>
  </main>

  ${footer(site, lang)}`;
}

export function notFoundPage(site, data) {
  const en = data.en, fa = data.fa;
  const texts = JSON.stringify({
    en: { title: en.meta.title, desc: en.meta.description },
    fa: { title: fa.meta.title, desc: fa.meta.description },
  }).replace(/</g, "\\u003c");
  // English is the static default. Persian is swapped in by the script below
  // before first paint, based on the URL prefix, saved preference or browser.
  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(en.meta.title)}</title>
  <meta name="description" content="${esc(en.meta.description)}" />
  <meta name="theme-color" content="#fffbf3" />
  <meta name="robots" content="noindex, follow" />
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Vazirmatn:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/css/variables.css" />
  <link rel="stylesheet" href="/css/base.css" />
  <link rel="stylesheet" href="/css/content.css" />
</head>
<body class="page-404" dir="ltr">
  <div id="app">
  ${notFoundBody(site, data, "en")}
  </div>

  <template id="tpl-fa">
  ${notFoundBody(site, data, "fa")}
  </template>

  <script>
    (function () {
      var KEY = "jollypanda:me:lang";
      var T = ${texts};
      function pick() {
        var m = location.pathname.match(/^\\/(en|fa)(\\/|$)/);
        if (m) return m[1];
        try {
          var s = localStorage.getItem(KEY);
          if (s === "en" || s === "fa") return s;
        } catch (e) {}
        return (navigator.language || "").slice(0, 2) === "fa" ? "fa" : "en";
      }
      var lang = pick();
      if (lang === "fa") {
        document.getElementById("app").innerHTML = document.getElementById("tpl-fa").innerHTML;
        document.documentElement.lang = "fa";
        document.documentElement.dir = "rtl";
        document.body.dir = "rtl";
        document.title = T.fa.title;
        var d = document.querySelector('meta[name="description"]');
        if (d) d.setAttribute("content", T.fa.desc);
      }
      // The header's language links point at the home pages; on a 404 we
      // switch language in place instead.
      document.addEventListener("click", function (e) {
        var a = e.target.closest && e.target.closest(".lang-switch__btn");
        if (!a) return;
        e.preventDefault();
        var l = a.getAttribute("data-lang");
        try { localStorage.setItem(KEY, l); } catch (x) {}
        var m = location.pathname.match(/^\\/(en|fa)(\\/.*)?$/);
        if (m) location.href = "/" + l + (m[2] || "/") + location.search;
        else location.reload();
      });
    })();
  </script>
  <script src="/js/app.js" defer></script>
</body>
</html>
`;
}

// ------------------------------------------- /bio/ -> /en/bio/ or /fa/bio/
export function bioRedirectPage(site) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Profiles | Jolly Panda Profile</title>
  <meta name="robots" content="noindex, follow" />
  <link rel="canonical" href="${pageUrl(site, "en", "bio/")}" />
  <noscript><meta http-equiv="refresh" content="0; url=/en/bio/" /></noscript>
  <script>
    (function () {
      var target = "/en/bio/";
      try {
        var s = localStorage.getItem("jollypanda:me:lang");
        if (s === "fa") target = "/fa/bio/";
        else if (s !== "en" && (navigator.language || "").slice(0, 2) === "fa") target = "/fa/bio/";
      } catch (e) {}
      window.location.replace(target + location.search);
    })();
  </script>
</head>
<body>
  <p><a href="/en/bio/">Profiles</a> / <a href="/fa/bio/">پروفایل‌ها</a></p>
</body>
</html>
`;
}

// ---------------------------------------------------------------- sitemap
function alternates(site, path) {
  return (
    LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${escXml(pageUrl(site, l, path))}" />`).join("\n") +
    `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${escXml(pageUrl(site, "en", path))}" />`
  );
}

export function sitemap(site, pagePaths, profiles) {
  const urls = [];
  for (const path of pagePaths) {
    for (const lang of LANGS) {
      urls.push(`  <url>
    <loc>${escXml(pageUrl(site, lang, path))}</loc>
${alternates(site, path)}
    <changefreq>${path === "" || path === "bio/" ? "weekly" : "monthly"}</changefreq>
    <priority>${path === "" ? "1.0" : path === "bio/" ? "0.9" : "0.6"}</priority>
  </url>`);
    }
  }
  for (const p of profiles) {
    const lastmod = p.updated ? `\n    <lastmod>${escXml(p.updated.slice(0, 10))}</lastmod>` : "";
    urls.push(`  <url>
    <loc>${escXml(site.domain + "/bio/" + encodeURIComponent(p.slug) + "/")}</loc>${lastmod}
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join("\n")}
</urlset>
`;
}

export function robotsTxt(site) {
  return `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${site.domain}/sitemap.xml
`;
}
