# Setup & deployment

## Deploying on Vercel

* Import the repo. `vercel.json` sets the build command (`node scripts/build-site.mjs _site`), the output directory (`_site`) and security headers; functions in `api/` are deployed automatically.
* Add the domain `me.jollypanda.ir` under Settings → Domains.
* To pick up new or changed profile repos, create a **Deploy Hook** (Settings → Git → Deploy Hooks) and save its URL as the `VERCEL_DEPLOY_HOOK` secret in this GitHub repo. `.github/workflows/redeploy.yml` calls it hourly; copy `templates/notify-site.yml` into a profile repo (with an org-level `VERCEL_DEPLOY_HOOK` secret) to redeploy right after a push there.

## Daily Persian prices

`.github/workflows/update-prices.yml` runs every day at 06:00 Tehran time (and on demand), fetches the dollar rate from [Navasan](https://www.navasan.tech/en/api) and rewrites the Persian prices (USD price × rate, shown in Rial).

1. Get an API key (free plan: 120 calls/month, enough for one call per day) from the Telegram bot [@navasan_contact_bot](https://t.me/navasan_contact_bot).
2. In this GitHub repo: Settings → Secrets and variables → Actions → add **`NAVASAN_API_KEY`**. (`VERCEL_DEPLOY_HOOK` is reused if present, to deploy right after the commit.)
3. Settings → Actions → General → Workflow permissions → **Read and write**.
4. Run the workflow once by hand (Actions → *Update Persian prices* → Run workflow) and check the commit.

Defaults live in `content/pricing.json`: `navasan.item` (`usd_sell`, Tehran market sell rate — see the item list in the Navasan guide for others) and `navasan.unit` (`toman`, the unit of the API's value; set `rial` if the API ever returns Rial). If the API fails, the key is missing, or the rate moved more than 30% since the last run (`content/last-rate.json`), the job fails and **nothing is changed**. Local test: `NAVASAN_API_KEY=… DRY_RUN=1 node scripts/update-prices.mjs`.

## Environment variables

Set these in Vercel → Project → Settings → **Environment Variables**:

| Variable | Required | Meaning |
| --- | --- | --- |
| `RESEND_API_KEY` | yes | API key from resend.com |
| `MAIL_FROM` | recommended | e.g. `Jolly Panda Profile <noreply@jollypanda.ir>` — the domain must be verified in Resend (add the DNS records it shows) |
| `MAIL_TO` | no | where requests go (default `hello@jollypanda.ir`) |
| `FORM_SECRET` | recommended | long random string used to sign anti-bot tokens |
| `TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` | no | switches on Cloudflare Turnstile as an extra "are you human" check |
| `BIO_TOKEN` | no | GitHub token (read access to the organization); needed for private profile repos or to avoid GitHub API rate limits during builds |
| `BIO_ORG`, `BIO_EXCLUDE` | no | organization to scan (default `Jolly-Panda-Me`); repos to skip |

If `RESEND_API_KEY` is missing the form shows the "email us directly" message instead of pretending to send.

## Local preview

Requires Node.js 18+ and git.

```bash
BIO_REPOS="mojtaba-mofidinejad" node scripts/build-site.mjs      # writes _site/
python3 -m http.server -d _site 8080                              # http://localhost:8080/en/
```

`BIO_REPOS` (space-separated repo names) skips the GitHub API — use it for a fast local build instead of listing the whole organization. Every edit to `content/*.json`, `lang/*.json` or `en|fa/index.html` needs a rebuild (`node scripts/build-site.mjs`) to show up in `_site/`.

The `/api/*` endpoints (the request form) only exist on Vercel; `npx vercel dev` runs them locally if you need to test the form end to end.

See also: [content editing](content.md), [profiles](profiles.md), [the request form](form.md), [architecture](architecture.md).
