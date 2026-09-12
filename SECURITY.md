# Security Policy

This repository is the static marketing/request site for Jolly Panda Profile. It has no backend, database, or authenticated user data of its own — form submissions are relayed by email via a third-party service (see the README's "Form submissions & email delivery" section).

## Reporting a Vulnerability

If you discover a security issue affecting this site (for example, an XSS vector, a way to bypass form validation to inject arbitrary content into the relayed email, or an issue with a dependency), please report it privately rather than opening a public issue:

* Email: **hello@jollypanda.ir**
* Include a description of the issue, steps to reproduce, and its potential impact.

Please allow a reasonable amount of time for a response and a fix before disclosing the issue publicly.

## Scope

This site does not store passwords, payment details, or any authenticated session data. Reports about the third-party FormSubmit service itself should go to that service's own security contact rather than to Jolly Panda.
