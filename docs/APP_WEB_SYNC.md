# App ↔ website synchronization

This is the standing rule that prevents the app and public website from drifting apart.

## Source ownership

- App source: private repository `Damgeed/PauseSure`
- Website source: public repository `Damgeed/PauseSureWeb`
- Public website: `https://pausesure.com`

Website source must not be committed to the app repository. App source, secrets, signing material, private APIs, threat-model details, and internal security findings must not be committed to this public repository.

## Every app change gets a website-impact decision

For each app pull request, select exactly one:

1. `No website impact` — internal refactor, test-only change, or invisible bug fix.
2. `Website update included` — link the matching `PauseSureWeb` pull request.
3. `Website follow-up required` — link a dated `PauseSureWeb` issue and do not release until its owner accepts the timing.

## What must be synchronized

| App change | Website review |
| --- | --- |
| New, renamed, removed, or materially changed feature | `/product`, `/how-it-works`, home page, support |
| Changed safety result, wording, limitation, or recovery guidance | `/safety`, `/resources`, support, terms |
| Changed data collection, retention, sharing, AI/vendor use, account behavior, or permissions | `/privacy`, `/safety`, `/account-deletion`, App Store privacy answers |
| Authentication, subscription, pricing, eligibility, or availability change | Product, support, terms, home page calls to action |
| New target audience, partnership, market, or localization | Home, company, product, metadata, sitemap |
| New support channel or incident procedure | Support, company, security policy |
| App Store launch or version status change | Company status language and site calls to action |
| Brand, app icon, screenshots, color, font, or product copy change | Website brand assets, metadata, social cards, App Store assets |

## Release gate

Before an App Store release:

- Complete the affected rows in [`PUBLIC_CLAIM_MATRIX.md`](PUBLIC_CLAIM_MATRIX.md) using evidence from the private release candidate.
- Confirm public feature claims match the release candidate.
- Confirm the privacy policy and App Store privacy answers match actual data flows, including third-party SDKs.
- Confirm support, security, account deletion, and recovery links work without sign-in.
- Confirm apex and `www` HTTPS behavior, operational domain email, SPF/DKIM/DMARC, and external mailbox delivery.
- Confirm app and website use the same current logo, primary action color (`#13aec3`), terminology, and product status.
- Run website lint, build, rendered-route tests, and broken-link/image checks.
- Publish the approved website update before or at the same time as the app release.

## Monthly trust review

On the first release of each month, review all public claims, official resource links, legal dates, and security contact routing. Record the reviewer and date in the relevant pull request.
