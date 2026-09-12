# Jolly Panda — Profile

**me.jollypanda.ir** — a marketing and self-service landing page where people request a personal profile / resume / portfolio page built by [Jolly Panda](https://jollypanda.ir), reachable at their own `me.jollypanda.ir/your-name` address.

This repository is the static site itself, plus the `bio/` directory that hosts each delivered profile as a Git submodule.

---

## What this site does

* Presents the **Jolly Panda Profile** product: pricing plans, a live price calculator, and an explanation of what's included.
* Lets a visitor **request a profile** through a validated form (name, contact info, chosen plan, and a desired `me.jollypanda.ir/<slug>` address).
* Checks the desired slug against a reserved-word list and a mock "taken" list on the client, then relays the submission by email — no custom backend exists yet (see [Form submissions & email delivery](#form-submissions--email-delivery)).
* Is fully bilingual (Persian/English) with RTL/LTR layout switching, and ships as a plain static site — no build step, no framework, no bundler.

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
├── index.html              # The single page: hero, pricing, request form
├── css/
│   ├── variables.css        # Design tokens (colors sampled from the mascot artwork)
│   ├── base.css              # Shared/reset styles and base components
│   └── page.css               # Page-specific styles
├── js/
│   ├── app.js                # Sticky header + mobile nav behavior
│   ├── language.js            # i18n engine: loads lang/*.json, applies data-i18n
│   ├── list-i18n.js            # i18n for array/list content (pricing feature lists)
│   ├── calculator.js            # Live price calculator (package + add-ons)
│   ├── plan-select.js            # Pre-fills the request form from a pricing card
│   ├── slug-input.js              # Debounced slug availability UI
│   ├── slug-service.js             # Mock slug validation/reservation service (client-side only, for now)
│   ├── form.js                      # Form validation + submission flow
│   └── email-service.js              # Relays form submissions via FormSubmit
├── lang/
│   ├── fa.json                # Persian strings (default language)
│   └── en.json                  # English strings
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

Then open `http://localhost:8080` in a browser. Opening `index.html` directly via `file://` also works for quick checks, but a local server is recommended so relative fetches (e.g. `lang/*.json`) behave the same as in production.

---

## Internationalization (i18n)

* Persian (`fa`, RTL) is the default language; English (`en`, LTR) is available via the language switch in the header.
* All user-facing copy lives in `lang/fa.json` and `lang/en.json` — never hardcoded in `index.html` or the JS files.
* Scalar strings are wired via `data-i18n="path.to.key"` (handled by `js/language.js`); list content (e.g. pricing feature bullets) uses `data-i18n-list="path.to.key"` (handled by `js/list-i18n.js`).
* The active language is persisted under its own `localStorage` key (`jollypanda:me:lang`), separate from the main Jolly Panda studio site.

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
