# GitHub to Cloudflare Workers deployment

This repository is configured to deploy directly from GitHub to Cloudflare
Workers. After the owner completes the one-time Cloudflare and DNS setup, it
does not require a hosted site builder or a separate application server.

## What Cloudflare creates

- Worker: `pausesure-web`
- D1 binding: `DB`
- D1 database: `pausesure-web-analytics`
- Static-assets binding: `ASSETS`
- Cloudflare Images binding: `IMAGES`
- Custom domains: `pausesure.com` and `www.pausesure.com`

The Worker permanently redirects `www.pausesure.com` to the apex domain while
preserving the path and query string.

## Before the first deployment

1. Add `pausesure.com` to the Cloudflare account and complete the nameserver
   change at the domain registrar. Wait until the zone status is **Active**.
2. In Cloudflare DNS, remove any existing A, AAAA, or CNAME records at
   `pausesure.com` or `www.pausesure.com` that point to the previous host.
   Cloudflare cannot attach a Worker Custom Domain to a hostname that already
   has a conflicting CNAME.
3. Confirm the production branch in GitHub contains `wrangler.jsonc` and that
   its Worker name is `pausesure-web`.

No API token, account ID, D1 UUID, or other credential belongs in GitHub. The
Cloudflare Git integration creates and stores its deployment token. Wrangler's
automatic resource provisioning creates the D1 database because the checked-in
configuration intentionally omits `database_id`.

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
   | Non-production deploy command | `npm run upload:built` |

4. Enable non-production branch builds if pull-request preview versions are
   desired.
5. Select **Save and Deploy**. The Worker name in Cloudflare must exactly match
   the `name` in `wrangler.jsonc`.

The first deployment provisions the D1 binding and attaches both Custom
Domains. Cloudflare creates the DNS records and TLS certificates for those
hostnames.

## Apply the D1 schema once

After the first deployment has created `pausesure-web-analytics`, apply the
checked-in migration from a trusted local clone:

```bash
npm ci
npx wrangler login
npm run db:migrate:remote
```

Wrangler records applied migrations in D1, so the command is safe to run again.
Use the migration command rather than pasting SQL into the dashboard; that
keeps Cloudflare's `d1_migrations` history accurate.

Future schema changes should be backward compatible and applied before code
that requires them is promoted to production.

## Verify the cutover

```bash
curl -I https://pausesure.com/
curl -I 'https://www.pausesure.com/resources?from=www'
curl -s https://pausesure.com/robots.txt
```

Expected results:

- `pausesure.com` returns `200` and PauseSure security headers.
- `www.pausesure.com` returns `308` with a `Location` on
  `https://pausesure.com` preserving the path and query.
- The Cloudflare deployment page shows both Custom Domains as active.

To verify the content-free analytics endpoint without sending user content,
opt in on `/check`, complete a synthetic test, and confirm one aggregate row in
the D1 table `privacy_event_daily`. The table must not contain IP addresses,
device identifiers, account identifiers, checked URLs, phone numbers, messages,
or free-form text.

## Local checks

```bash
npm ci
npm run lint
npm test
npm run deploy:dry-run
npm run db:migrate:local
```

`npm run dev` uses the local Workers runtime. `npm run preview` builds and runs
the production Worker locally. `npm run deploy` is the authenticated manual
equivalent of the Git-connected build and deploy sequence.

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
- [Cloudflare Vite plugin](https://developers.cloudflare.com/workers/vite-plugin/)
- [vinext](https://github.com/cloudflare/vinext)
