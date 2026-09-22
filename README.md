# Jolly Panda — Profile

**me.jollypanda.ir** — a bilingual (English / Persian) site where people request a personal profile / resume / portfolio page built by [Jolly Panda](https://jollypanda.ir). Every profile lives at its own address: `me.jollypanda.ir/bio/your-name`.

The repository holds the site's source. A small Node build (`scripts/build-site.mjs`, run by Vercel) turns it into the deployable site: it renders the generated pages from JSON, pulls in every profile repository of the **Jolly-Panda-Me** GitHub organization and writes `sitemap.xml`.

---

## URLs

Every page exists in both languages under a language prefix, so the URL always tells which language you are reading:

| Page | English | Persian |
| --- | --- | --- |
| Home (hero, pricing, request form) | `/en/` | `/fa/` |
| Profiles list (search + filter) | `/en/bio/` | `/fa/bio/` |
| How it works | `/en/how-it-works/` | `/fa/how-it-works/` |
| FAQ | `/en/faq/` | `/fa/faq/` |
| Privacy Policy | `/en/privacy/` | `/fa/privacy/` |
| 404 | `404.html` (language detected) | |
| A published profile | `/bio/<repo-name>/` (its own site, not language-prefixed) | |

The language switch in the header is a normal link to the *same page* in the other language (`/en/faq/` ⇄ `/fa/faq/`), keeping the query string and `#anchor`. `/` and `/bio/` are small redirectors that send visitors to the language they used last (or their browser's language, default English).

---

## Editing content (all in JSON)

| What | File |
| --- | --- |
| Header, footer, social links, brand, e-mail | `content/site.json` |
| How it works page | `content/how-it-works.json` |
| FAQ page (also generates the FAQ structured data for Google) | `content/faq.json` |
| Privacy Policy | `content/privacy.json` |
| Profiles list page texts | `content/bio.json` |
| 404 page | `content/not-found.json` |
| Home page (hero, **pricing and prices**, request form, error messages) | `lang/en.json`, `lang/fa.json` |

Each file has an `en` and a `fa` block. In text you can use `**bold**`, `[link text](/{lang}/faq/)` and the placeholders `{lang}`, `{email}`, `{year}`. **Change the JSON, commit, push, and Vercel rebuilds.**

Updating prices: edit `pricing.plans.*.price / usd / hint`, `pricing.updated` (the date shown) and `pricing.note` in `lang/en.json` and `lang/fa.json`.

The header and footer come from `content/site.json` and are inserted into **every** page by the build (including the home pages, through the `<!--@header-->` / `<!--@footer-->` markers in `en/index.html` and `fa/index.html`), so they cannot drift apart.

---

## Profiles (`/bio/<repo-name>/`)

Every repository of the **Jolly-Panda-Me** organization that has an `index.html` in its root is published automatically at `https://me.jollypanda.ir/bio/<repo-name>/`, listed on `/en/bio/` and `/fa/bio/`, and added to `sitemap.xml`.

At build time `scripts/build-site.mjs`:

1. lists the organization's repos (GitHub API, archived ones skipped) and clones each into `_site/bio/<repo-name>/`;
2. reads each profile's `og:title` / `<title>`, description and preview image, plus the repo's **GitHub Topics** (filter chips) and last push date, and writes `_site/bio/projects.json`;
3. adds `<base href="/bio/<repo-name>/">` and points `<link rel="canonical">` / `og:url` to `https://me.jollypanda.ir/bio/<repo-name>/`, so Google indexes the real address;
4. renders the list pages with those rows already in the HTML, and writes `sitemap.xml` + `robots.txt`.

Requirements for a profile repo: `index.html` in the root and relative asset paths (`css/style.css`, not `/css/style.css`). Preview image: `og:image` (if the file exists in the repo), else `preview.jpg`, `og-image.jpg`, `screenshot.jpg`, `assets/images/og/og-image.jpg` (png / webp also work), else a coloured placeholder. To hide a repo temporarily, list it in the `BIO_EXCLUDE` environment variable or archive it.

A profile whose `index.html` contains `noindex` is still published, but the build logs a warning because Google will not list it.

---

## Sitemap and SEO

* `sitemap.xml` is generated on every build: the home page, list page, How it works, FAQ and Privacy in both languages (with `hreflang` alternates) **plus every published profile** (with its last push date). `robots.txt` points to it.
* After the first deploy, add `https://me.jollypanda.ir/sitemap.xml` in Google Search Console (Sitemaps). New profiles appear in the sitemap automatically on the next build.
* Every generated page has a `title`, description, canonical URL, `hreflang` links, Open Graph tags and breadcrumb structured data; the FAQ also has `FAQPage` structured data.

---

## The request form (email + anti-bot)

The form posts to `POST /api/request` (`api/request.js`, a Vercel serverless function), which validates it and emails it to the team through [Resend](https://resend.com). Set these in Vercel → Project → Settings → **Environment Variables**:

| Variable | Required | Meaning |
| --- | --- | --- |
| `RESEND_API_KEY` | yes | API key from resend.com |
| `MAIL_FROM` | recommended | e.g. `Jolly Panda Profile <noreply@jollypanda.ir>` — the domain must be verified in Resend (add the DNS records it shows) |
| `MAIL_TO` | no | where requests go (default `hello@jollypanda.ir`) |
| `FORM_SECRET` | recommended | long random string used to sign anti-bot tokens |
| `TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` | no | switches on Cloudflare Turnstile as an extra "are you human" check |
| `BIO_TOKEN` | no | GitHub token (read access to the organization); needed for private profile repos or to avoid GitHub API rate limits during builds |
| `BIO_ORG`, `BIO_EXCLUDE` | no | organization to scan (default `Jolly-Panda-Me`); repos to skip |

Anti-bot layers, all enforced on the server: a signed, time-limited, single-use token fetched from `/api/token` when the form loads (a submission younger than 3 seconds is rejected); an invisible honeypot field; optional Turnstile; a per-IP rate limit; strict validation and length limits. If the variables are missing the form shows the "email us directly" message instead of pretending to send.

The desired address is checked against the reserved-word list and against the profiles that are already published (`/bio/projects.json`).

---

## Deploying on Vercel

* Import the repo. `vercel.json` sets the build command (`node scripts/build-site.mjs _site`), the output directory (`_site`) and security headers; functions in `api/` are deployed automatically.
* Add the domain `me.jollypanda.ir` under Settings → Domains.
* To pick up new or changed profile repos, create a **Deploy Hook** (Settings → Git → Deploy Hooks) and save its URL as the `VERCEL_DEPLOY_HOOK` secret in this GitHub repo. `.github/workflows/redeploy.yml` calls it hourly; copy `templates/notify-site.yml` into a profile repo (with an org-level `VERCEL_DEPLOY_HOOK` secret) to redeploy right after a push there.

---

## Local preview

```bash
BIO_REPOS="mojtaba-mofidinejad" node scripts/build-site.mjs      # writes _site/
python3 -m http.server -d _site 8080                              # http://localhost:8080/en/
```

`BIO_REPOS` (space-separated repo names) skips the GitHub API. The `/api/*` endpoints only exist on Vercel (`npx vercel dev` runs them locally).

---

## Project structure

```text
.
├── content/                  # EDITABLE page data (en + fa): site, how-it-works, faq, privacy, bio, not-found
├── lang/                     # EDITABLE home-page strings: en.json, fa.json (hero, pricing, form, errors)
├── en/index.html, fa/index.html   # Home page sources (header/footer inserted at build)
├── index.html                # Root redirector to /en/ or /fa/
├── css/                      # variables.css (tokens), base.css (header, footer, buttons), page.css (home), content.css (generated pages), bio.css (list table)
├── js/                       # app.js (header/menu/language links), language.js (home i18n), bio.js (search/filter),
│                             # form.js, email-service.js, slug-*.js, plan-select.js, list-i18n.js
├── assets/                   # favicon, mascot artwork, 404 image
├── scripts/
│   ├── build-site.mjs        # the build (see above)
│   └── lib/                  # layout (header/footer/head), pages, sitemap/404/redirect helpers
├── api/                      # Vercel functions: request.js (send form), token.js (anti-bot token)
├── server/form-security.js   # validation, tokens, rate limit, Turnstile check, e-mail body
├── templates/notify-site.yml # optional: redeploy right after a profile repo is pushed
├── .github/workflows/redeploy.yml  # hourly redeploy through the Vercel deploy hook
└── vercel.json
```

---

## Conventions

* Design tokens live in `css/variables.css`; components use `var(--token)` instead of hard-coded values.
* Content is data: never hard-code visible text in the generated pages, put it in `content/*.json` (or `lang/*.json` for the home page).
* Keep both languages in sync when editing.

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).
