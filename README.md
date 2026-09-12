# Jolly Panda — Profile

**me.jollypanda.ir** — a marketing and self-service landing page where people request a personal profile / resume / portfolio page built by [Jolly Panda](https://jollypanda.ir), reachable at their own `me.jollypanda.ir/your-name` address.

This repository is the static site itself, plus the `bio/` directory that hosts each delivered profile as a Git submodule.

---

## What this site does

* Presents the **Jolly Panda Profile** product: three plans (Basic / Professional / Custom) and an explanation of what's included in each. Pricing is intentionally not displayed yet.
* Lets a visitor **request a profile** through a validated form (name, contact info, chosen plan, and a desired `me.jollypanda.ir/<slug>` address).
* Checks the desired slug against a reserved-word list and a mock "taken" list on the client, then relays the submission by email — no custom backend exists yet (see [Form submissions & email delivery](#form-submissions--email-delivery)).
* Is fully bilingual (English/Persian) with RTL/LTR layout switching and routed URLs (`/en/`, `/fa/`), and ships as a plain static site — no build step, no framework, no bundler.

---

## Tech stack

* Plain **HTML5 / CSS3 / vanilla JavaScript** (ES5-style, no transpiler, no bundler)
* CSS custom properties (design tokens) for all colors, spacing, radii, and shadows — no hardcoded values in component styles
* [FormSubmit](https://formsubmit.co) as an interim, backend-free way to deliver form submissions by email
* `data-i18n` attribute-driven internationalization, loading JSON dictionaries at runtime

No `package.json`, no `node_modules`, no build tooling is required — the site can be opened directly or served by any static file server.

---

## Project structure

```text
.
├── index.html              # Root redirector: sends visitors to /en/ (default) or /fa/
├── en/
│   └── index.html            # English site (primary language) — hero, pricing, request form
├── fa/
│   └── index.html            # Persian (RTL) site — same page, same shared css/js/lang
├── css/
│   ├── variables.css        # Design tokens (colors sampled from the mascot artwork)
│   ├── base.css              # Shared/reset styles and base components
│   └── page.css               # Page-specific styles
├── js/
│   ├── app.js                # Sticky header + mobile nav behavior
│   ├── language.js            # i18n engine: path-based (/en/, /fa/) + loads lang/*.json
│   ├── list-i18n.js            # i18n for array/list content (pricing feature lists)
│   ├── plan-select.js            # Pre-fills the request form from a pricing card
│   ├── slug-input.js              # Debounced slug availability UI
│   ├── slug-service.js             # Mock slug validation/reservation service (client-side only, for now)
│   ├── form.js                      # Form validation + submission flow
│   └── email-service.js              # Relays form submissions via FormSubmit
├── lang/
│   ├── en.json                # English strings (default language)
│   └── fa.json                  # Persian strings
├── assets/                # Favicon and static assets
├── bio/                    # Delivered client profiles, added as Git submodules
├── scripts/
│   ├── add-bio.ps1          # Interactive script: adds a client profile repo as a submodule under bio/
│   └── add-bio.cmd          # Double-click launcher for add-bio.ps1 on Windows
└── README.md
```

---

## Running locally

No installation is required. From the project root, serve the directory with any static file server, for example:

```bash
# Python
python3 -m http.server 8080

# Node (npx, no install)
npx serve .
```

Then open `http://localhost:8080/en/` (or `/fa/`) in a browser. Visiting `http://localhost:8080/` redirects to whichever language the visitor last used, defaulting to `/en/`. A local server is required (not `file://`) — every page loads shared CSS/JS/lang files from absolute paths (e.g. `/lang/en.json`), which only resolve correctly when served from the site root.

---

## Internationalization (i18n) & URL structure

* The site is routed by language: **`/en/`** (English, the site's primary/default language) and **`/fa/`** (Persian, RTL). Visiting `/` redirects to the visitor's last-used language (stored in `localStorage`) or their browser language, falling back to `/en/`.
* `/en/index.html` and `/fa/index.html` are two independent HTML documents (same layout, pre-rendered in their own language for SEO/no-JS) that both load the same shared `css/`, `js/`, and `lang/*.json` files from the site root.
* All user-facing copy lives in `lang/en.json` and `lang/fa.json` — never hardcoded in the JS files. The pre-rendered text in each `index.html` is a fallback that matches its own language JSON 1:1.
* Scalar strings are wired via `data-i18n="path.to.key"` (handled by `js/language.js`); list content (e.g. pricing feature bullets) uses `data-i18n-list="path.to.key"` (handled by `js/list-i18n.js`).
* `js/language.js` treats the URL path as authoritative for which language to render — it only falls back to the stored preference or browser language when neither `/en/` nor `/fa/` is present in the path (e.g. for the root redirector). The language switcher in the header navigates between `/en/` and `/fa/` (preserving any `#section` anchor) rather than swapping content in place, so each language has a real, shareable, indexable URL.
* `en` and `fa` are reserved in `js/slug-service.js` so a client profile can never be assigned a slug that collides with these site routes.

---

## Form submissions & email delivery

This is currently a **static site with no custom backend**. Submissions from the request form (`#profileRequestForm`) are relayed to the team's inbox using [FormSubmit](https://formsubmit.co) — see `js/email-service.js` for the exact implementation and setup notes.

**One-time setup:** the first submission FormSubmit receives for the configured address triggers a confirmation email that must be approved once before deliveries start flowing.

When a real backend exists, only `js/email-service.js`'s `sendRequest()` needs to change (e.g. to call a `POST /api/profile/request` endpoint) — no other file depends on how the email is actually sent.

---

## Slug availability (client-side, mock)

`js/slug-service.js` is a self-contained, clearly-labeled mock: it checks a requested `me.jollypanda.ir/<slug>` against a reserved-word list and a hardcoded "taken" list, purely for the demo/static phase. The module is written to mirror the eventual real contract (`GET /api/profile/check-slug`, `POST /api/profile/reserve-slug`) so that swapping in real backend calls later requires no changes in the calling code (`slug-input.js`, `form.js`).

**Important:** the client-side check is never authoritative — a real backend must still enforce slug uniqueness at the database level before a slug is considered reserved.

---

## Adding a delivered client profile

Each finished client profile lives in its own separate Git repository and is attached here as a submodule under `bio/<username>`.

On Windows, run `scripts/add-bio.cmd` (or `scripts/add-bio.ps1` directly in PowerShell) from the project root. It will prompt for a username and a repository URL, then run the equivalent of:

```bash
git submodule add <repository-url> bio/<username>
```

and create a commit — nothing is pushed automatically.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to propose changes, coding conventions, and the pull request process.

## Security

If you discover a security issue, please see [SECURITY.md](SECURITY.md) for how to report it responsibly.

## License

This project is proprietary — see [LICENSE](LICENSE) for details. The source is published for transparency; it is not licensed for reuse, redistribution, or derivative works without permission.
