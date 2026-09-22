# Jolly Panda — Profile

**[me.jollypanda.ir](https://me.jollypanda.ir)** is a bilingual (English / Persian) site where people request a personal profile, resume or portfolio page built by [Jolly Panda](https://jollypanda.ir). Every profile gets its own address — `me.jollypanda.ir/bio/your-name` — and is browsable, searchable and filterable from the site's Profiles page.

Visitors can:

* browse example profiles and filter them by topic on the [Profiles page](https://me.jollypanda.ir/en/bio/);
* see plans and pricing and request one of their own through a request form;
* read how the process works and answers to common questions.

This repository holds the site's source: the request site itself, and the small build that publishes every profile from the **Jolly-Panda-Me** GitHub organization under `/bio/`.

## Documentation

Setup, content editing, the profiles pipeline, the request form and the project's architecture are documented in [`docs/`](docs/):

* [**Setup & deployment**](docs/setup.md) — Vercel, environment variables, local preview
* [**Editing content**](docs/content.md) — where every page's text lives, and the site's URL structure
* [**Profiles**](docs/profiles.md) — how `/bio/<repo-name>/` pages are published, and the sitemap
* [**The request form**](docs/form.md) — email delivery and anti-bot protection
* [**Architecture**](docs/architecture.md) — project structure and conventions

Also see [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).
