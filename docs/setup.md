# Setup & deployment

## Deploying on Vercel

* Import the repo. `vercel.json` sets the build command (`node scripts/build-site.mjs _site`), the output directory (`_site`) and security headers; functions in `api/` are deployed automatically.
* Add the domain `me.jollypanda.ir` under Settings → Domains.
* To pick up new or changed profile repos, create a **Deploy Hook** (Settings → Git → Deploy Hooks) and save its URL as the `VERCEL_DEPLOY_HOOK` secret in this GitHub repo. `.github/workflows/redeploy.yml` calls it hourly; copy `templates/notify-site.yml` into a profile repo (with an org-level `VERCEL_DEPLOY_HOOK` secret) to redeploy right after a push there.

## Environment variables

Set these in Vercel → Project → Settings → **Environment Variables** (all optional):

| Variable | Meaning |
| --- | --- |
| `BIO_TOKEN` | GitHub token (read access to the organization); needed for private profile repos or to avoid GitHub API rate limits during builds |
| `BIO_ORG`, `BIO_EXCLUDE` | organization to scan (default `Jolly-Panda-Me`); repos to skip |

This site has no request form, prices or backend: the **Request a Profile** buttons open the studio's packages page (`packagesUrl` in `content/site.json`, which pre-selects the *portfolio* type and the *Special* plan), where visitors choose a package and send the request. Prices and the daily dollar-rate update live in the `web.jollypanda.ir` project.

## Local preview

Requires Node.js 18+ and git.

```bash
BIO_REPOS="mojtaba-mofidinejad" node scripts/build-site.mjs      # writes _site/
python3 -m http.server -d _site 8080                              # http://localhost:8080/en/
```

`BIO_REPOS` (space-separated repo names) skips the GitHub API — use it for a fast local build instead of listing the whole organization. Every edit to `content/*.json`, `lang/*.json` or `en|fa/index.html` needs a rebuild (`node scripts/build-site.mjs`) to show up in `_site/`.

See also: [content editing](content.md), [profiles](profiles.md), [architecture](architecture.md).
