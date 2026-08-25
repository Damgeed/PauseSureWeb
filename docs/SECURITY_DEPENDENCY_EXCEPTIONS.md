# Dependency security exceptions

This file records temporary, narrowly scoped exceptions to the full dependency audit. It is not an assertion that an affected package is safe.

## Vinext 0.0.50 and image-size 2.0.2

- Recorded: 2026-08-25
- Scope: development/build dependency chain `vinext@0.0.50` → `image-size@2.0.2`
- Advisories: `GHSA-w3rx-r6r6-pgpr` and `GHSA-5p2g-fcmc-qvqq`
- Impact: malformed ICNS, JXL, or HEIF data can make the synchronous image parser loop indefinitely and deny service to the Node.js process.
- PauseSure exposure: Vinext calls `image-size` while building repository-local static image imports and metadata-route images. The package is not included in the deployed Worker bundle, and website screenshot or QR inputs remain in browser APIs and are not passed to this package. A crafted image committed to a pull request could still hang its CI build.
- Existing controls: pull requests are reviewed; GitHub Actions has read-only repository permissions and a 20-minute job timeout; production deploys use reviewed `main`; the website does not accept server-side image uploads.
- Upstream status: the reviewed advisories list no patched `image-size` release. Depending on the npm version, the audit report either offers no automatic remediation or identifies the same manually evaluated path through pre-release `vinext@1.0.0-beta.8`; that migration would also change its React Server Components plugin requirement. PauseSure will not silently move the production build to that beta.

The exception must be reviewed and either removed or renewed when any of these occurs:

- `image-size` publishes a patched stable release;
- Vinext publishes a stable release that removes or patches the dependency;
- the advisory set, severity, installed versions, or npm remediation changes;
- PauseSure begins processing server-side or otherwise untrusted images; or
- the Vinext migration is otherwise scheduled.

`npm run audit:full` enforces the exact reviewed package versions, advisory set,
severity, remediation result, and aggregate counts. For compatibility with
npm's version-dependent output, it accepts only `false` or the exact
`vinext@1.0.0-beta.8` semver-major remediation object. It fails closed for any
new finding at any severity, changed exception, or other remediation so that a
maintainer must reassess this record.
