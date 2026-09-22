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

Updating prices: edit `pricing.plans.*.price / usd / hint`, `pricing.updated` (the date shown) and `pricing.note` in `lang/en.json` and `lang/fa.json`.

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
