# Editing content

All visible text lives in JSON, not in the HTML.

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

Updating prices: the **USD price of each package** lives in `content/pricing.json` (and, as text, in `lang/en.json`). **Persian prices are generated, don't edit them by hand** — `scripts/update-prices.mjs` multiplies the USD prices by the day's dollar rate from the Navasan API, rounds (`roundToMillionRial`) and writes the Rial text into `lang/fa.json`, the `pricing.updated` date, and the static fallback text in `fa/index.html`. The GitHub Action `.github/workflows/update-prices.yml` runs it every day and commits the result; see [setup](setup.md#daily-persian-prices). To change a package price: edit `content/pricing.json` **and** `pricing.plans.*.price` in `lang/en.json`, then run the workflow (Actions → *Update Persian prices* → Run workflow) or `node scripts/update-prices.mjs` locally.

The header and footer come from `content/site.json` and are inserted into **every** page by the build (including the home pages, through the `<!--@header-->` / `<!--@footer-->` markers in `en/index.html` and `fa/index.html`), so they cannot drift apart.

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
