# PauseSure public claim matrix

Use this matrix before every App Store submission and every material website campaign. A present-tense public claim is allowed only when the release candidate, backend behavior, privacy disclosure, and support path agree.

| Public capability | Evidence required before public App Store availability | Website surfaces | Current gate |
| --- | --- | --- | --- |
| Message and email review | Device test covering supported inputs, limits, result explanation, and error states | Home, Product, How it works | App-owner verification required |
| Link review | Safe URL handling, redirect/lookup behavior, uncertainty language, and official-route guidance | Home, Product, Resources | App-owner verification required |
| Screenshot text recognition | Supported image formats, upload bounds, Google Cloud Vision path, language coverage, fallback behavior, shared-engine contract, failure handling, and retention | Home, Product, Privacy | Website implemented; app-owner device verification required |
| QR review | Supported QR formats, destination handling, safe navigation, and error states | Home, Product, Privacy | App-owner verification required |
| Audio or voicemail import | Supported file/import routes, transcription providers, limits, consent, and retention | Home, Product, Privacy | App-owner verification required |
| Trusted Circle | Consent, invite/revoke/leave behavior, notification privacy, encryption review, and deletion | Home, Product, Safety, Privacy | App-owner verification required |
| Recovery and export | Supported actions, official-source links, export protection, and clear non-guarantee | Home, Resources, Support, Terms | App-owner verification required |
| Account deletion | In-app initiation, fallback request, completion confirmation, backup/log exceptions, and end-to-end deletion test | Privacy, Support, Account deletion | App-owner verification required |
| Advertising and data sale | SDK inventory, network inspection, privacy manifest, App Store answers, and policy review | Home, Safety, Privacy | App-owner verification required |
| App Store availability | Verified public `apps.apple.com` URL and matching version, screenshots, privacy answers, support, and terms | `app/release.ts`, Home, Company, Support | Not listed |

## Release procedure

1. Link evidence from the private app pull request; never copy sensitive source or findings into this public repository.
2. Mark each affected row reviewed in the matching PauseSureWeb pull request.
3. Update policies, product copy, metadata, screenshots, support, and availability together.
4. Confirm the domain, `www` redirect, support mailboxes, SPF/DKIM/DMARC, security reporting, and account-deletion paths from outside the owner account.
5. Run the website release checks, publish, and verify the public routes before advertising.
