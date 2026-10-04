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
| Home page (hero, "why a profile" questions, closing call-to-action) | `lang/en.json`, `lang/fa.json` |

Each file has an `en` and a `fa` block. In text you can use `**bold**`, `[link text](/{lang}/faq/)` and the placeholders `{lang}`, `{email}`, `{year}`. **Change the JSON, commit, push, and Vercel rebuilds.**

The home-page questions are `why.items.*` (each has a `q` and an `a`) in the same two files; the closing button is `cta.*`. The structure of the hand-written home page lives in `en|fa/index.html`, which also holds the static fallback text shown before JavaScript runs — keep it in sync when you edit the JSON.

Requests and prices: this site has none. Every **Request a Profile** / **See packages** button points to the studio's packages page, set once as `packagesUrl` (`en` / `fa`) in `content/site.json` (it uses `?type=portfolio&plan=special` so the Portfolio type and Special plan are pre-selected there). In the hand-written home HTML use `{{packages}}` as the link target; in the JSON content files use `{packages}`.

The header and footer come from `content/site.json` and are inserted into **every** page by the build (including the home pages, through the `<!--@header-->` / `<!--@footer-->` markers in `en/index.html` and `fa/index.html`), so they cannot drift apart.

## URLs

Every page exists in both languages under a language prefix, so the URL always tells which language you are reading:

| Page | English | Persian |
| --- | --- | --- |
| Home (hero, "why a profile" questions, buttons to the packages page and the samples) | `/en/` | `/fa/` |
| Profiles list (search + filter) | `/en/bio/` | `/fa/bio/` |
| How it works | `/en/how-it-works/` | `/fa/how-it-works/` |
| FAQ | `/en/faq/` | `/fa/faq/` |
| Privacy Policy | `/en/privacy/` | `/fa/privacy/` |
| 404 | `404.html` (language detected) | |
| A published profile | `/bio/<repo-name>/` (its own site, not language-prefixed) | |

The language switch in the header is a normal link to the *same page* in the other language (`/en/faq/` ⇄ `/fa/faq/`), keeping the query string and `#anchor`. `/` and `/bio/` are small redirectors that send visitors to the language they used last (or their browser's language, default English).
