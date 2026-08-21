# BadgeBook (ContactLogo) Effort Log — cross-agent board
Protocol: /Users/jay/apps/EFFORT-LOG-PROTOCOL.md (canonical). Bootstrapped 2026-08-21 by KIMI
during the owner-requested fleet setup audit. BadgeBook is not yet in fleet-apps.json and has
no CI / coordination plumbing — see Planned rows below.

## In Progress
(none)

## Planned / Reserved
- **2026-08-21 — DONE — [P0] PRIVACY INCIDENT: purged `.badgebook/` from git history.**  Board item 3b9ca6cf.  Removed scan dumps, match results, review HTML, and UUID-keyed candidate PNGs from all commits via `git filter-repo` + force-push.  `.gitignore` now covers `.badgebook/`, `.contactlogo/`, scan artifacts, and AddressBook exports.  Issue #4 closed.  Residual: GitHub may cache old blobs/PR diffs until GC; issue/PR text is path-only; no forks; clones and agent transcripts are out of band.
- **2026-08-21 — KIMI — PLANNED — [P1] Onboard BadgeBook to the fleet + add CI.**  Board item 3b9ca6cf.  No .github/ at all (zero CI despite Tests/ and web/engine.test.ts), no AGENTS.md/CLAUDE.md/.claude, no dependabot, absent from fleet-apps.json and the digest.  Copy the DealDex coordination skeleton; add macOS runner job (swift test / xcodebuild test) + Node job for web/.  NOTE: vendor/crest is a subtree of the unarchived 'dead' crest repo — archive crest to stop drift/confusion.

## Changelog of this log
- 2026-08-21 — KIMI — file created during owner-requested fleet setup audit.
- 2026-08-21 — P0 history rewrite completed (filter-repo + force-push); no contact names in this log.
