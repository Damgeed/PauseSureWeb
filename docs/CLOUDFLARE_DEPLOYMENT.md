# GitHub to Cloudflare Workers deployment

This repository is configured to deploy directly from GitHub to Cloudflare
Workers. After the owner completes the one-time Cloudflare and DNS setup, it
does not require a hosted site builder or a separate application server.

## What Cloudflare creates

- Worker: `pausesure-web`
- D1 binding: `DB`
- D1 database: `pausesure-web-analytics`
- Static-assets binding: `ASSETS`
- Rate-limit binding: `ANALYTICS_RATE_LIMITER`
- Daily retention-cleanup cron
- Custom domains: `pausesure.com` and `www.pausesure.com`

The Worker permanently redirects HTTP and `www.pausesure.com` to the fixed
`https://pausesure.com` origin while preserving the path and query string.

## Before the first deployment

1. Add `pausesure.com` to the Cloudflare account and complete the nameserver
   change at the domain registrar. Wait until the zone status is **Active**.
2. In Cloudflare DNS, remove any existing A, AAAA, or CNAME records at
   `pausesure.com` or `www.pausesure.com` that point to the previous host.
   Cloudflare cannot attach a Worker Custom Domain to a hostname that already
   has a conflicting CNAME.
3. Confirm the production branch in GitHub contains `wrangler.jsonc` and that
   its Worker name is `pausesure-web`.
4. In **SSL/TLS → Edge Certificates**, enable **Always Use HTTPS**. The Worker
   also enforces HTTPS, but the zone rule provides an independent edge control.

No API token or other credential belongs in GitHub. Cloudflare account IDs and
D1 UUIDs are identifiers rather than secrets, but this repository intentionally
omits them until a real resource exists. The Cloudflare Git integration creates
and stores its own deployment token. Wrangler's automatic resource provisioning
can create the D1 database because the initial configuration omits
`database_id`.

## Connect the GitHub repository

1. Open **Cloudflare Dashboard → Workers & Pages → Create application**.
2. Choose **Import a repository**, authorize GitHub, and select
   `Damgeed/PauseSureWeb`.
3. Use these build settings:

   | Setting | Value |
   | --- | --- |
   | Worker name | `pausesure-web` |
   | Production branch | `main` |
   | Root directory | `/` (leave blank unless this app is moved into a monorepo) |
   | Build command | `npm run build` |
   | Deploy command | `npm run deploy:built` |
   | Non-production deploy command | Leave disabled for the production configuration |

4. Keep non-production branch builds disabled. `workers_dev` and preview URLs
   are intentionally off so a preview cannot write to the production D1
   binding or bypass custom-domain controls. A future preview environment must
   use separate bindings and Cloudflare Access.
5. Select **Save and Deploy**. The Worker name in Cloudflare must exactly match
   the `name` in `wrangler.jsonc`.

The first deployment provisions the D1 binding and attaches both Custom
Domains. Cloudflare creates the DNS records and TLS certificates for those
hostnames.

## Resolve D1 and apply the schema once

The Worker defensively initializes the final constrained aggregate table when a
newly provisioned binding is empty, so the public endpoint does not depend on a
dashboard race. Still apply the checked-in migrations to preserve Cloudflare's
migration history and make later schema changes explicit.

Use the repository-pinned Wrangler version from a trusted local clone. Wrangler
4.102.0 fixed remote D1 commands for databases created by automatic
provisioning; this repository pins a newer compatible release.

```bash
npm ci
npx wrangler login
npx wrangler d1 list
```

If `pausesure-web-analytics` is listed, it already exists. Do not create a
second database. Apply and verify the migration:

```bash
npm run db:migrate:remote
npx wrangler d1 migrations list pausesure-web-analytics --remote
```

If `pausesure-web-analytics` is not listed, create the real database and let
Wrangler update the existing `DB` binding before applying the migration:

```bash
npx wrangler d1 create pausesure-web-analytics --binding DB --update-config
npm run db:migrate:remote
npx wrangler d1 migrations list pausesure-web-analytics --remote
```

After `d1 create`, confirm `wrangler.jsonc` contains exactly one `DB` binding
with `database_name`, the returned `database_id`, and
`migrations_dir: "drizzle"`. Do not paste a made-up ID or leave duplicate D1
entries. If `--update-config` changed the file, commit the real configuration so
local and GitHub deployments use the same database.

Wrangler records applied migrations in D1, so the command is safe to run again.
Use the migration command rather than pasting SQL into the dashboard; that
keeps Cloudflare's `d1_migrations` history accurate.

Future schema changes should be backward compatible and applied before code
that requires them is promoted to production. Migrations are reviewed SQL files;
the production site does not ship an ORM or schema-generation runtime.

## Verify the cutover

```bash
curl -I https://pausesure.com/
curl -I http://pausesure.com/
curl -I 'https://www.pausesure.com/resources?from=www'
curl -I 'http://www.pausesure.com/resources?from=www'
curl -s https://pausesure.com/robots.txt
```

Expected results:

- `pausesure.com` returns `200` and PauseSure security headers.
- Both HTTP requests and `www.pausesure.com` return `308` with a `Location` on
  `https://pausesure.com` preserving the path and query. No response serves the
  application over HTTP.
- HTTPS HTML responses include the enforced Content Security Policy from the
  current source, and `/icon.png` matches the current rounded repository icon.
- The Cloudflare deployment page shows both Custom Domains as active.
- The Worker shows the `ANALYTICS_RATE_LIMITER` binding and the daily retention
  cron from `wrangler.jsonc`.
- The active production deployment identifies the reviewed `main` commit and
  its CI run completed successfully. Do not treat a preview or uploaded version
  as production promotion.

To verify the content-free analytics endpoint without sending user content,
opt in on `/check`, complete a synthetic test, and confirm one aggregate row in
the D1 table `privacy_event_daily`. The table must not contain IP addresses,
device identifiers, account identifiers, checked URLs, phone numbers, messages,
or free-form text.

## Local checks

```bash
npm ci
npm run audit:signatures
npm run verify
npm run db:migrate:local
```

`npm run dev` uses the local Workers runtime. `npm run preview` builds and runs
the production Worker locally. `npm run deploy` is the authenticated manual
equivalent of the Git-connected build and deploy sequence. Every deploy command
runs dependency audits, lint, type checking, the test suite, and a Wrangler dry
run before it can publish.

## Rollback

Cloudflare keeps immutable Worker versions. From **Workers & Pages →
pausesure-web → Deployments**, promote the last known-good version. A code
rollback does not roll back D1; database migrations must remain compatible with
both the previous and next Worker versions.

## Primary references

- [Cloudflare Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/)
- [Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Worker Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- [D1 Wrangler commands](https://developers.cloudflare.com/d1/wrangler-commands/)
- [Automatic resource provisioning](https://developers.cloudflare.com/changelog/post/2025-10-24-automatic-resource-provisioning/)
- [Cloudflare Vite plugin](https://developers.cloudflare.com/workers/vite-plugin/)
- [vinext](https://github.com/cloudflare/vinext)
