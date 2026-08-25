# PauseSureWeb

Canonical source for the public PauseSure website at [pausesure.com](https://pausesure.com).

PauseSure helps people slow down, inspect suspicious requests, verify them independently, and involve someone they trust before money or information leaves their hands.

## Repository boundaries

- `Damgeed/PauseSureWeb` contains the public website, public policies, website tests, and go-to-market documentation.
- `Damgeed/PauseSure` contains the private iOS app and app services only. Do not copy app source, credentials, private architecture, signing files, or security-sensitive implementation details into this repository.
- Product changes must complete the cross-repository review in [`docs/APP_WEB_SYNC.md`](docs/APP_WEB_SYNC.md).

## Website routes

- `/` — company homepage
- `/check` — local-first public safety checker
- `/product` — product overview
- `/how-it-works` — decision-support workflow
- `/safety` — safety and privacy design
- `/resources` — official reporting and recovery resources
- `/company` — mission, product status, and contact
- `/privacy`, `/security`, `/terms`, `/support`, `/account-deletion` — public trust and support pages

## Local development

Requires Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

Quality checks:

```bash
npm run audit:signatures
npm run verify
```

`npm run verify` audits dependencies, lints, type-checks, builds and tests the
deployable Worker, and validates the Wrangler deployment bundle without
publishing it. Local development binds only to `127.0.0.1`; production requests
are restricted to the canonical HTTPS origin by the Worker.

## Deployment

The repository is configured to publish [pausesure.com](https://pausesure.com)
as a Cloudflare Worker connected directly to GitHub. The checked-in deployment
contains the Worker, static assets, D1 migration, custom-domain configuration,
and deploy scripts. It contains no deployment credential or fake resource
identifier. Until the owner completes the Cloudflare dashboard and DNS cutover,
the current public host may still be serving the previous deployment.

Follow the owner runbook in
[`docs/CLOUDFLARE_DEPLOYMENT.md`](docs/CLOUDFLARE_DEPLOYMENT.md) to connect the
repository, provision D1, attach `pausesure.com`, and verify the canonical `www`
redirect.

Do not add analytics, advertising pixels, form collection, authentication, or third-party scripts without first updating the privacy review, security review, App Store disclosures where relevant, and public policy pages.

## Release state

`app/release.ts` is the single source of truth for public iPhone availability, download actions, the Company status, homepage FAQ, and footer language. Do not hard-code availability elsewhere. Switch the state to `app-store` only after a verified `https://apps.apple.com/` listing resolves and the release, privacy, security, support, and account-deletion reviews are complete.

## Operating documents

- [App ↔ web synchronization](docs/APP_WEB_SYNC.md)
- [Public claim matrix](docs/PUBLIC_CLAIM_MATRIX.md)
- [Roadmap to one million users](docs/GROWTH_TO_ONE_MILLION.md)
- [Security reporting](SECURITY.md)

## Brand

- Primary action color: `#13aec3`
- Primary navy: `#031b49`
- Use the supplied PauseSure brand artwork. Do not regenerate or stylize the logo without approval.

Public product claims must describe verified behavior, distinguish examples from live features, and never guarantee that a request is safe.
