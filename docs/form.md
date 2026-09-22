# The request form (email + anti-bot)

The form posts to `POST /api/request` (`api/request.js`, a Vercel serverless function), which validates it and emails it to the team through [Resend](https://resend.com). Required/optional environment variables are listed in [setup.md](setup.md#environment-variables).

Anti-bot layers, all enforced on the server: a signed, time-limited, single-use token fetched from `/api/token` when the form loads (a submission younger than 3 seconds is rejected); an invisible honeypot field; optional Cloudflare Turnstile; a per-IP rate limit; strict validation and length limits. If the environment variables are missing, the form shows the "email us directly" message instead of pretending to send.

The desired address is checked against the reserved-word list and against the profiles that are already published (`/bio/projects.json`).
