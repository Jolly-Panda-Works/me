# Profiles (`/bio/<repo-name>/`)

Every repository of the **Jolly-Panda-Me** organization that has an `index.html` in its root is published automatically at `https://me.jollypanda.ir/bio/<repo-name>/`, listed on `/en/bio/` and `/fa/bio/`, and added to `sitemap.xml`.

At build time `scripts/build-site.mjs`:

1. lists the organization's repos (GitHub API, archived ones skipped) and clones each into `_site/bio/<repo-name>/`;
2. reads each profile's `og:title` / `<title>`, description and preview image, plus the repo's **GitHub Topics** (filter chips) and last push date, and writes `_site/bio/projects.json`;
3. adds `<base href="/bio/<repo-name>/">` and points `<link rel="canonical">` / `og:url` to `https://me.jollypanda.ir/bio/<repo-name>/`, so Google indexes the real address;
4. renders the list pages with those rows already in the HTML, and writes `sitemap.xml` + `robots.txt`.

Requirements for a profile repo: `index.html` in the root and relative asset paths (`css/style.css`, not `/css/style.css`). Preview image: `og:image` (if the file exists in the repo), else `preview.jpg`, `og-image.jpg`, `screenshot.jpg`, `assets/images/og/og-image.jpg` (png / webp also work), else a coloured placeholder. To hide a repo temporarily, list it in the `BIO_EXCLUDE` environment variable or archive it.

A profile whose `index.html` contains `noindex` is still published, but the build logs a warning because Google will not list it.

## Sitemap and SEO

* `sitemap.xml` is generated on every build: the home page, list page, How it works, FAQ and Privacy in both languages (with `hreflang` alternates) **plus every published profile** (with its last push date). `robots.txt` points to it.
* After the first deploy, add `https://me.jollypanda.ir/sitemap.xml` in Google Search Console (Sitemaps). New profiles appear in the sitemap automatically on the next build.
* Every generated page has a `title`, description, canonical URL, `hreflang` links, Open Graph tags and breadcrumb structured data; the FAQ also has `FAQPage` structured data.
