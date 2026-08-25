# Dependency security exceptions

No dependency security exceptions are currently approved.

`npm run audit:full` fails closed when the installed dependency graph contains
any npm advisory at any severity. If a temporary exception ever becomes
unavoidable, it must document the exact package, version, advisory, exposure,
compensating controls, owner, expiry, and removal condition before the audit
gate is changed.
