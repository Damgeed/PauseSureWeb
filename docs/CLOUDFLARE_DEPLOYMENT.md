# PauseSureWeb production deployment

PauseSureWeb is deployed to the Cloudflare Worker `pausesure-web` from GitHub Actions. Cloudflare's repository-build connection is optional and is not the production authority. Automatic releases require a successful `Web CI` run on `main`; a main-only manual dispatch repeats the same security and source verification gates. `Deploy Cloudflare` then applies D1 migrations, builds, publishes, and runs the production smoke suite.

## Production resources

- Worker: `pausesure-web`
- Canonical origin: `https://pausesure.com`
- Redirected origin: `https://www.pausesure.com`
- D1 binding: `DB`
- D1 database: `pausesure-web-analytics`
- Static-assets binding: `ASSETS`
- Product-analytics rate limit: `ANALYTICS_RATE_LIMITER`
- Low-volume release-smoke rate limit: `DEPLOYMENT_RATE_LIMITER`
- Daily aggregate-retention cleanup cron

The Worker redirects HTTP and `www.pausesure.com` to the canonical HTTPS origin while preserving the path and query string.

## One-time Cloudflare token

Create a custom Cloudflare API token for GitHub Actions and restrict it to the single account and zone used by PauseSure.

Required permissions:

| Scope | Permission | Access |
| --- | --- | --- |
| Account | Account Settings | Read |
| Account | Workers Scripts | Edit |
| Account | D1 | Edit |
| Zone | Workers Routes | Edit |

Resource restrictions:

- Account resources: **Include → the account containing PauseSure**
- Zone resources: **Include → Specific zone → pausesure.com**

Do not grant billing, account-member administration, broad DNS editing, all-account, or all-zone access. Do not add an IP restriction because GitHub-hosted runners do not use one stable outbound address.

Store the values only in:

**GitHub → Damgeed/PauseSureWeb → Settings → Secrets and variables → Actions → Repository secrets**

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

The token value is secret. The Account ID is an identifier, but it is still kept in repository configuration rather than committed into source. Remove copies of these values from unrelated repositories.

## Release flow

1. Merge a reviewed pull request into `main`.
2. `Web CI` runs dependency-signature checks and `npm run verify`.
3. Only a successful `Web CI` run on `main` triggers `Deploy Cloudflare`.
4. The deployment workflow checks out `workflow_run.head_sha`, not a moving branch tip.
5. The workflow runs:

```bash
npm ci
npm run db:migrate:remote
npm run build
npm run deploy:built
npm run smoke:production
```

`deploy:built` publishes already-built output and does not repeat the complete audit, lint, typecheck, test, and dry-run suite. A manual GitHub Actions dispatch is accepted only from `main`; it repeats the dependency-signature audit and `npm run verify` before migration or publishing. Local manual deployments remain guarded through `npm run deploy`, which runs `npm run verify` before publishing.

## D1 migrations

Migrations live in `drizzle/` and are applied before the Worker is published. They must be additive or remain compatible with the previous Worker version so Cloudflare rollback remains safe.

Checked-in migrations are the only schema authority. The deployment applies them before publishing the Worker; request and scheduled handlers never issue DDL. A missing or out-of-date schema therefore fails closed instead of creating an unreviewed runtime schema.

The production smoke writes only one fixed operational row to `deployment_smoke`:

```text
id = 1
web_version = pausesure-web-6.3.1
checked_at = Unix timestamp
```

It contains no check content, URL, phone number, image, user, account, session, device, or IP field. The route accepts only a body-free, canonical-origin POST carrying the current release version and returns an empty `204` without database details. A dedicated global edge binding limits this operational route to five attempts per minute before any D1 work, independently of the per-client product-analytics limiter.

## Production verification

`npm run smoke:production` waits for Cloudflare propagation and then verifies:

- HTTP and `www` redirect to the canonical HTTPS origin;
- HTTPS, CSP, nonces, HSTS, clickjacking, MIME, and cache protections;
- the active `X-PauseSure-Web-Version` header;
- the deployed browser bundle uses both shared Railway analysis endpoints;
- a real, rate-limited, content-free D1 write returns `204`;
- Railway live and ready health checks pass;
- the screenshot endpoint accepts a bounded benign PNG and returns engine `pausesure-rules-6.3.0`;
- the separate Google Web Risk lookup returns valid evidence.

A successful Cloudflare upload without a successful smoke run is not a completed release.

## Cloudflare dashboard settings

Keep these bindings on `pausesure-web`:

- `DB → pausesure-web-analytics`
- `ANALYTICS_RATE_LIMITER`
- `DEPLOYMENT_RATE_LIMITER`
- `ASSETS`

Keep `workers_dev` and preview URLs disabled for production. A future preview environment must use separate bindings and access controls so it cannot write to production D1.

In **SSL/TLS → Edge Certificates**, keep **Always Use HTTPS** enabled as an independent edge control. The Worker also enforces the canonical HTTPS origin.

The Cloudflare GitHub build connection may remain disconnected or be disabled. It is not required once GitHub Actions deployment is healthy, and it must not be treated as an additional production publisher.

## Manual recovery

To rerun a failed deployment after fixing credentials or a transient provider problem:

1. Open **GitHub → PauseSureWeb → Actions → Deploy Cloudflare**.
2. Open the failed run.
3. Select **Re-run failed jobs**.

To perform a reviewed manual deployment from a trusted clone:

```bash
npm ci
npm run deploy
npm run smoke:production
```

Wrangler must receive `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` through the environment. Never paste tokens into source, shell history, issues, or logs.

## Rollback

Cloudflare keeps immutable Worker versions. From **Workers & Pages → pausesure-web → Deployments**, promote the last known-good version. A code rollback does not roll back D1, so migrations must remain compatible with both the previous and next Worker versions.

After rollback, run the production smoke against the version that is actually active. Do not infer success from the upload record alone.
