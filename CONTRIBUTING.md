# Contributing

Thanks for taking the time to look at this project. This repository powers a live product page (`me.jollypanda.ir`), so please read this before opening an issue or a pull request.

## Reporting a bug

Open an issue and include:

* What you expected to happen vs. what actually happened
* Steps to reproduce
* Browser/OS, and the language (fa/en) you were using
* Screenshots, if it's a visual issue

## Suggesting a change

Open an issue describing the change and why it's useful before writing code — this project is a commercial landing page, not a general-purpose library, so not every suggestion will fit its scope.

## Development setup

No build step is required. Serve the project root with any static file server and open it in a browser:

```bash
npx serve .
# or
python3 -m http.server 8080
```

See the [README](README.md) for the full project structure.

## Conventions to follow

* **No hardcoded user-facing text.** All copy goes in `lang/fa.json` and `lang/en.json`, wired up via `data-i18n` / `data-i18n-list`.
* **No hardcoded colors, spacing, or radii.** Use the CSS custom properties defined in `css/variables.css`.
* **RTL-safe CSS.** Use logical properties (`margin-inline-start`, `padding-inline-end`, etc.) instead of `left`/`right`, since Persian (RTL) is the default language.
* **Plain, dependency-free JavaScript.** The project intentionally has no bundler or framework; keep new scripts self-contained and attach any public API to `window` the way the existing modules do (e.g. `window.ProfileSlugService`).
* **Keep mock/interim code isolated and labeled.** `slug-service.js` and `email-service.js` are deliberately the only files that know the backend doesn't exist yet — if you touch either, keep that boundary intact so swapping in a real backend later stays a one-file change.

## Pull requests

1. Fork the repository and create a branch from `main`.
2. Keep changes focused — one topic per pull request.
3. Test both languages (fa/en) and both directions (RTL/LTR) for any UI change.
4. Describe what you changed and why in the PR description.

By submitting a contribution, you agree that Jolly Panda may use it as part of this project under the terms in [LICENSE](LICENSE).
