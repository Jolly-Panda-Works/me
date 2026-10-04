# Project structure

```text
.
├── content/                  # EDITABLE page data (en + fa): site, how-it-works, faq, privacy, bio, not-found
├── lang/                     # EDITABLE home-page strings: en.json, fa.json (hero, why-a-profile questions, closing call-to-action)
├── en/index.html, fa/index.html   # Home page sources: hero, why-a-profile questions, CTA buttons to the studio packages page and to /bio/ (header/footer inserted at build)
├── index.html                # Root redirector to /en/ or /fa/
├── css/                      # variables.css (tokens), base.css (header, footer, buttons), page.css (home), content.css (generated pages), bio.css (list table)
├── js/                       # app.js (header/menu/language links), language.js (home i18n), bio.js (search/filter),
├── assets/                   # favicon, mascot artwork, 404 image
├── scripts/
│   ├── build-site.mjs        # the build (see profiles.md)
│   └── lib/                  # layout (header/footer/head), pages, sitemap/404/redirect helpers
├── templates/notify-site.yml # optional: redeploy right after a profile repo is pushed
├── .github/workflows/redeploy.yml        # hourly redeploy through the Vercel deploy hook
└── vercel.json
```

## Conventions

* Design tokens live in `css/variables.css`; components use `var(--token)` instead of hard-coded values.
* Content is data: never hard-code visible text in the generated pages, put it in `content/*.json` (or `lang/*.json` for the home page).
* Keep both languages in sync when editing.

See also [CONTRIBUTING.md](../CONTRIBUTING.md) and [SECURITY.md](../SECURITY.md).
