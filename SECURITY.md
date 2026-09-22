# Security Policy

This repository is the marketing/request site for Jolly Panda Profile. It has no database or authenticated user data of its own — the request form is validated by a serverless function (`api/request.js`) that emails it to the team through Resend (see the README's "The request form" section).

## Reporting a Vulnerability

If you discover a security issue affecting this site (for example, an XSS vector, a way to bypass form validation to inject arbitrary content into the relayed email, or an issue with a dependency), please report it privately rather than opening a public issue:

* Email: **hello@jollypanda.ir**
* Include a description of the issue, steps to reproduce, and its potential impact.

Please allow a reasonable amount of time for a response and a fix before disclosing the issue publicly.

## Scope

This site does not store passwords, payment details, or any authenticated session data. Reports about third-party services we rely on (Vercel, Resend, Cloudflare) should go to that service's own security contact rather than to Jolly Panda.
