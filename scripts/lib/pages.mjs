// Renderers for the generated pages. Every text comes from content/*.json.
import { esc, fill, inline, paragraphs, plain } from "./html.mjs";
import { vars, pageUrl } from "./layout.mjs";

function heroHtml(hero) {
  return `    <section class="page-hero">
      <div class="container">
        <span class="eyebrow">${esc(hero.eyebrow)}</span>
        <h1 class="page-hero__title">${esc(hero.title)}</h1>
        <p class="page-hero__lead">${esc(hero.lead)}</p>
      </div>
    </section>`;
}

function ctaBand(cta, v) {
  const primary = cta.primary ? `<a class="btn btn-primary" href="${esc(fill(cta.primary.href, v))}">${esc(cta.primary.label)}</a>` : "";
  const secondary = cta.secondary ? `<a class="btn btn-secondary" href="${esc(fill(cta.secondary.href, v))}">${esc(cta.secondary.label)}</a>` : "";
  return `    <section class="section section--tight">
      <div class="container">
        <div class="cta-band">
          <h2>${esc(cta.title)}</h2>
          <p>${esc(cta.text)}</p>
          <div class="cta-band__actions">${primary}${secondary}</div>
        </div>
      </div>
    </section>`;
}

function breadcrumb(site, lang, path, name) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: site[lang].brand, item: pageUrl(site, lang, "") },
      { "@type": "ListItem", position: 2, name, item: pageUrl(site, lang, path) },
    ],
  };
}

// ------------------------------------------------------------ how it works
export function howItWorks(site, data, lang) {
  const c = data[lang];
  const v = vars(site, lang);
  const steps = c.steps
    .map(
      (s, i) => `          <li class="step">
            <span class="step__num" aria-hidden="true">${i + 1}</span>
            <div class="step__body">
              <p class="step__label">${esc(c.stepsLabel)} ${i + 1}</p>
              <h3>${esc(s.title)}</h3>
              <p>${inline(s.text, v)}</p>
            </div>
          </li>`
    )
    .join("\n");
  const needs = c.needs.items.map((i) => `            <li>${inline(i, v)}</li>`).join("\n");
  const payment = c.payment
    ? `    <section class="section section--tight">
      <div class="container">
        <div class="payment-note">
          <span class="payment-note__badge">${esc(c.payment.badge)}</span>
          <h2>${esc(c.payment.title)}</h2>
          <p>${inline(c.payment.text, v)}</p>
        </div>
      </div>
    </section>

`
    : "";
  const body = `${heroHtml(c.hero)}

    <section class="section section--tight">
      <div class="container">
        <ol class="steps">
${steps}
        </ol>
      </div>
    </section>

    <section class="section section--tight">
      <div class="container">
        <div class="needs-card">
          <h2>${esc(c.needs.title)}</h2>
          <ul class="check-list">
${needs}
          </ul>
        </div>
      </div>
    </section>

${payment}${ctaBand(c.cta, v)}`;
  return { key: "howItWorks", path: "how-it-works/", meta: c.meta, body, jsonLd: [breadcrumb(site, lang, "how-it-works/", c.hero.eyebrow)] };
}

// -------------------------------------------------------------------- FAQ
export function faq(site, data, lang) {
  const c = data[lang];
  const v = vars(site, lang);
  const groups = c.groups
    .map(
      (g) => `        <section class="faq-group">
          <h2 class="faq-group__title">${esc(g.title)}</h2>
${g.items
  .map(
    (it) => `          <details class="faq-item">
            <summary>${esc(it.q)}</summary>
            <div class="faq-item__a">
${paragraphs(it.a, v)
  .split("\n")
  .map((l) => "              " + l)
  .join("\n")}
            </div>
          </details>`
  )
  .join("\n")}
        </section>`
    )
    .join("\n");
  const body = `${heroHtml(c.hero)}

    <section class="section section--tight">
      <div class="container container--narrow">
${groups}
      </div>
    </section>

${ctaBand(c.cta, v)}`;
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: c.groups.flatMap((g) =>
      g.items.map((it) => ({
        "@type": "Question",
        name: it.q,
        acceptedAnswer: { "@type": "Answer", text: plain(it.a, v).replace(/\n\s*\n/g, "\n") },
      }))
    ),
  };
  return { key: "faq", path: "faq/", meta: c.meta, body, jsonLd: [breadcrumb(site, lang, "faq/", c.hero.eyebrow), faqLd] };
}

// ----------------------------------------------------------------- privacy
export function privacy(site, data, lang) {
  const c = data[lang];
  const v = vars(site, lang);
  const sections = c.sections
    .map((s, i) => {
      const ps = (s.p || []).map((p) => `          <p>${inline(p, v)}</p>`).join("\n");
      const list = s.list ? `          <ul>\n${s.list.map((li) => `            <li>${inline(li, v)}</li>`).join("\n")}\n          </ul>` : "";
      return `        <section class="prose__section" id="s${i + 1}">
          <h2>${esc(s.title)}</h2>
${[ps, list].filter(Boolean).join("\n")}
        </section>`;
    })
    .join("\n");
  const body = `${heroHtml(c.hero)}

    <section class="section section--tight">
      <div class="container container--narrow">
        <p class="prose__updated">${esc(c.updatedLabel)}: <time>${esc(c.updated)}</time></p>
        <article class="prose">
${sections}
        </article>
      </div>
    </section>`;
  return { key: "privacy", path: "privacy/", meta: c.meta, body, jsonLd: [breadcrumb(site, lang, "privacy/", c.hero.eyebrow)] };
}

// --------------------------------------------------------------------- bio
function initialOf(p) {
  return (p.name || p.slug || "?").trim().charAt(0).toUpperCase();
}

function bioRow(p, lang, ui) {
  const thumb = p.image
    ? `<img src="${esc(p.image)}" alt="" loading="lazy" decoding="async" width="256" height="160" />`
    : `<div class="bio-thumb__ph">${esc(initialOf(p))}</div>`;
  const date = p.updated
    ? new Intl.DateTimeFormat(lang === "fa" ? "fa-IR" : "en-GB", { year: "numeric", month: "short", day: "numeric" }).format(new Date(p.updated))
    : "";
  const tags = (p.topics || []).map((t) => `<span class="bio-tag">${esc(t)}</span>`).join("");
  return `<tr>
            <td class="col-preview"><a class="bio-thumb" href="${esc(p.url)}" tabindex="-1" aria-hidden="true">${thumb}</a></td>
            <td class="col-name"><div><a class="bio-name" href="${esc(p.url)}">${esc(p.name)}</a>${p.subtitle ? `<div class="bio-sub">${esc(p.subtitle)}</div>` : ""}${p.description ? `<p class="bio-desc">${esc(p.description)}</p>` : ""}</div></td>
            <td class="col-topics"><div class="bio-tags">${tags}</div></td>
            <td class="col-updated"><span class="bio-date">${esc(date)}</span></td>
            <td class="col-action"><a class="bio-open" href="${esc(p.url)}" aria-label="${esc(ui.open)}: ${esc(p.name)}"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a></td>
          </tr>`;
}

export function bio(site, data, lang, projects) {
  const c = data[lang];
  const ui = c.ui;
  const v = vars(site, lang);
  const sorted = [...projects].sort((a, b) => a.name.localeCompare(b.name, lang, { sensitivity: "base" }));
  const rows = sorted.map((p) => "          " + bioRow(p, lang, ui)).join("\n");
  const count = sorted.length === 1 ? ui.countOne : ui.countMany;
  const nFmt = new Intl.NumberFormat(lang === "fa" ? "fa-IR" : "en-US").format(sorted.length);
  const uiJson = JSON.stringify({ ...ui, lang }).replace(/</g, "\\u003c");

  const body = `${heroHtml(c.hero)}

    <section class="section section--tight bio-page">
      <div class="container">
        <div class="bio-toolbar" role="search">
          <label class="bio-search">
            <span class="sr-only">${esc(ui.searchLabel)}</span>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input type="search" id="bioSearch" autocomplete="off" placeholder="${esc(ui.searchPlaceholder)}" />
          </label>

          <label class="bio-sort">
            <span class="sr-only">${esc(ui.sortLabel)}</span>
            <select id="bioSort">
              <option value="name">${esc(ui.sortName)}</option>
              <option value="updated">${esc(ui.sortUpdated)}</option>
            </select>
          </label>
        </div>

        <div class="bio-chips" id="bioChips" role="group" aria-label="${esc(ui.filterLabel)}" hidden></div>

        <p class="bio-count" id="bioCount" role="status" aria-live="polite">${esc(fill(count, { n: nFmt }))}</p>

        <div class="bio-table-wrap">
          <table class="bio-table" id="bioTable"${sorted.length ? "" : " hidden"}>
            <thead>
              <tr>
                <th scope="col" class="col-preview"><span class="sr-only">${esc(ui.colPreview)}</span></th>
                <th scope="col">${esc(ui.colName)}</th>
                <th scope="col" class="col-topics">${esc(ui.colTopics)}</th>
                <th scope="col" class="col-updated">${esc(ui.colUpdated)}</th>
                <th scope="col" class="col-action"><span class="sr-only">${esc(ui.colOpen)}</span></th>
              </tr>
            </thead>
            <tbody id="bioRows">
${rows}
            </tbody>
          </table>
        </div>

        <p class="bio-state" id="bioState"${sorted.length ? " hidden" : ""}>${sorted.length ? "" : esc(ui.empty)}</p>
      </div>
    </section>

${ctaBand(c.cta, v)}

    <script type="application/json" id="bioUi">${uiJson}</script>`;
  return {
    key: "bio", path: "bio/", meta: c.meta, body,
    css: ["/css/variables.css", "/css/base.css", "/css/content.css", "/css/bio.css"],
    scripts: ["/js/app.js", "/js/bio.js"],
    jsonLd: [breadcrumb(site, lang, "bio/", c.hero.eyebrow)],
  };
}
