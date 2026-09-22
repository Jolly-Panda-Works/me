// Shared page shell: <head>, header and footer. The SAME header/footer markup
// is used on every page (home, sub-pages, bio list, 404) so they never drift.
import { esc, fill } from "./html.mjs";
import { ICONS } from "./icons.mjs";

export const LANGS = ["en", "fa"];
export const DIR = { en: "ltr", fa: "rtl" };
const LOCALE = { en: "en_US", fa: "fa_IR" };
const LANG_LABEL = { en: "EN", fa: "فا" };

export function vars(site, lang) {
  return { lang, email: site.email, year: site.year, domain: site.domain };
}

/** Absolute URL of a page: pageUrl(site, "fa", "faq/") -> https://…/fa/faq/ */
export function pageUrl(site, lang, path = "") {
  return `${site.domain}/${lang}/${path}`;
}

function langSwitch(site, lang, path, extraClass = "") {
  const t = site[lang];
  const links = LANGS.map((l) => {
    const active = l === lang;
    return `<a class="lang-switch__btn${active ? " is-active" : ""}" href="/${l}/${path}" hreflang="${l}" lang="${l}" data-lang="${l}"${active ? ' aria-current="true"' : ""}>${LANG_LABEL[l]}</a>`;
  }).join("\n            ");
  return `<div class="lang-switch${extraClass}" role="group" aria-label="${esc(t.langLabel)}">
            ${links}
          </div>`;
}

export function header(site, lang, activeKey, path) {
  const t = site[lang];
  const v = vars(site, lang);
  const links = t.header.links
    .map((l) => `<a class="nav__link${l.key === activeKey ? " is-active" : ""}" href="${esc(fill(l.href, v))}"${l.key === activeKey ? ' aria-current="page"' : ""}>${esc(l.label)}</a>`)
    .join("\n        ");
  const pricing = t.header.pricing;
  const request = t.header.request;

  return `<a class="skip-link" href="#main">${esc(t.skip)}</a>

  <header class="site-header" id="siteHeader">
    <div class="container nav">
      <a href="/${lang}/" class="brand" aria-label="${esc(t.homeLabel)}">
        <img src="/assets/favicon.svg" alt="" class="brand__mark" width="42" height="42" />
        <span>
          <span>${esc(t.brand)}</span>
          <span class="brand__sub">${esc(t.brandSub)}</span>
        </span>
      </a>

      <button class="nav-toggle" id="navToggle" type="button" aria-controls="navLinks" aria-expanded="false" aria-label="${esc(t.menuLabel)}">
        <span></span><span></span><span></span>
      </button>

      <nav class="nav__links" id="navLinks">
        ${links}
        <a class="btn btn-secondary nav__mobile-cta" href="${esc(fill(pricing.href, v))}">${esc(pricing.label)}</a>
        <a class="btn btn-primary nav__mobile-cta" href="${esc(fill(request.href, v))}">${esc(request.label)}</a>
        ${langSwitch(site, lang, path, " nav__mobile-lang")}
      </nav>

      <div class="nav__actions">
        ${langSwitch(site, lang, path)}
        <a class="btn btn-secondary" href="${esc(fill(pricing.href, v))}">${esc(pricing.label)}</a>
        <a class="btn btn-primary" href="${esc(fill(request.href, v))}">${esc(request.label)}</a>
      </div>
    </div>
  </header>`;
}

export function footer(site, lang) {
  const t = site[lang];
  const v = vars(site, lang);
  const social = site.social
    .map((s) => `<a class="site-footer__social-link" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(t.socialLabels[s.id] || s.id)}">${ICONS[s.id] || ""}</a>`)
    .join("\n          ");
  const groups = t.footer.groups
    .map((g) => {
      const items = g.links
        .map((l) => {
          const ext = l.external ? ' target="_blank" rel="noopener noreferrer"' : "";
          return `<li><a class="site-footer__link" href="${esc(fill(l.href, v))}"${ext}>${esc(fill(l.label, v))}</a></li>`;
        })
        .join("\n              ");
      return `<div class="site-footer__group">
          <h3 class="site-footer__heading">${esc(g.title)}</h3>
          <ul class="site-footer__list site-footer__list--stack">
              ${items}
          </ul>
        </div>`;
    })
    .join("\n        ");

  return `<footer class="site-footer">
    <div class="container site-footer__top">
      <div class="site-footer__brand">
        <a href="/${lang}/" class="site-footer__logo" aria-label="${esc(t.homeLabel)}">
          <img src="/assets/favicon.svg" alt="" class="site-footer__mark" width="34" height="34" />
          <span>${esc(t.brand)}</span>
        </a>
        <p class="site-footer__tagline">${esc(t.footer.tagline)}</p>
        <div class="site-footer__social">
          ${social}
        </div>
      </div>

      <nav class="site-footer__nav" aria-label="${esc(t.footerNavLabel)}">
        ${groups}
      </nav>
    </div>

    <div class="site-footer__bottom">
      <div class="container">
        <p class="site-footer__copyright">${esc(fill(t.footer.copyright, v))}</p>
      </div>
    </div>
  </footer>`;
}

/** <head> for generated pages. */
export function head(site, { lang, path, meta, robots = "index, follow, max-image-preview:large", css = [], jsonLd = [] }) {
  const other = lang === "en" ? "fa" : "en";
  const url = pageUrl(site, lang, path);
  const alternates = LANGS.map((l) => `  <link rel="alternate" hreflang="${l}" href="${pageUrl(site, l, path)}" />`).join("\n");
  const ld = jsonLd.map((o) => `  <script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`).join("\n");
  return `<meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(meta.title)}</title>
  <meta name="description" content="${esc(meta.description)}" />
  <meta name="theme-color" content="#fffbf3" />
  <meta name="robots" content="${robots}" />
  <meta name="author" content="Jolly Panda" />

  <meta property="og:title" content="${esc(meta.title)}" />
  <meta property="og:description" content="${esc(meta.description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${url}" />
  <meta property="og:site_name" content="Jolly Panda" />
  <meta property="og:locale" content="${LOCALE[lang]}" />
  <meta property="og:locale:alternate" content="${LOCALE[other]}" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${esc(meta.title)}" />
  <meta name="twitter:description" content="${esc(meta.description)}" />

  <link rel="canonical" href="${url}" />
${alternates}
  <link rel="alternate" hreflang="x-default" href="${pageUrl(site, "en", path)}" />

  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Vazirmatn:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
${css.map((h) => `  <link rel="stylesheet" href="${h}" />`).join("\n")}
${ld}`;
}

/** Full HTML document for a generated page. */
export function document_(site, { lang, key, path, meta, body, css = ["/css/variables.css", "/css/base.css", "/css/content.css"], scripts = ["/js/app.js"], jsonLd = [], robots }) {
  return `<!DOCTYPE html>
<html lang="${lang}" dir="${DIR[lang]}">
<head>
  ${head(site, { lang, path, meta, css, jsonLd, robots })}
</head>
<body class="page-${key}" dir="${DIR[lang]}">
  ${header(site, lang, key, path)}

  <main id="main">
${body}
  </main>

  ${footer(site, lang)}

${scripts.map((s) => `  <script src="${s}" defer></script>`).join("\n")}
</body>
</html>
`;
}
