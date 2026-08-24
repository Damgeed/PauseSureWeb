# PauseSureWeb

Canonical source for the public PauseSure website at [pausesure.com](https://pausesure.com).

PauseSure helps people slow down, inspect suspicious requests, verify them independently, and involve someone they trust before money or information leaves their hands.

## Repository boundaries

- `Damgeed/PauseSureWeb` contains the public website, public policies, website tests, and go-to-market documentation.
- `Damgeed/PauseSure` contains the private iOS app and app services only. Do not copy app source, credentials, private architecture, signing files, or security-sensitive implementation details into this repository.
- Product changes must complete the cross-repository review in [`docs/APP_WEB_SYNC.md`](docs/APP_WEB_SYNC.md).

## Website routes

- `/` — company homepage
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
npm run lint
npm test
```

`npm test` builds the deployable worker and checks that the public routes render successfully.

## Deployment

The site is deployed with ChatGPT Sites. `.openai/hosting.json` identifies the existing PauseSure Sites project; it contains no deployment credential. Production deployment remains a deliberate owner-approved action.

Do not add analytics, advertising pixels, form collection, authentication, or third-party scripts without first updating the privacy review, security review, App Store disclosures where relevant, and public policy pages.

## Operating documents

- [App ↔ web synchronization](docs/APP_WEB_SYNC.md)
- [Roadmap to one million users](docs/GROWTH_TO_ONE_MILLION.md)
- [Security reporting](SECURITY.md)

## Brand

- Primary action color: `#13aec3`
- Primary navy: `#031b49`
- Use the supplied PauseSure brand artwork. Do not regenerate or stylize the logo without approval.

PauseSure is in active development. Public product claims must describe shipped, verified behavior and must never guarantee that a request is safe.
