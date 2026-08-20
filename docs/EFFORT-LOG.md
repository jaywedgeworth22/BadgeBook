# BadgeBook (ContactLogo) Effort Log — cross-agent board
Protocol: /Users/jay/apps/EFFORT-LOG-PROTOCOL.md (canonical). Bootstrapped 2026-08-21 by KIMI
during the owner-requested fleet setup audit. BadgeBook is not yet in fleet-apps.json and has
no CI / coordination plumbing — see Planned rows below.

## In Progress
(none)

## Planned / Reserved
- **2026-08-21 — KIMI — PLANNED — [P0] PRIVACY INCIDENT: purge .badgebook/ from git history.**  Board item 3b9ca6cf (fleet-infra).  `.badgebook/scan.json` (195KB) holds ~375 ABPerson-keyed entries with real full names from the owner's address book; `match-results.json` (51KB) more IDs+names; 298 candidate PNGs (~9.3MB) keyed by Apple AddressBook person UUIDs — third-party PII of people who never consented, in a PUBLIC repo's permanent history.  Purge with git filter-repo + force-push, add `.badgebook/` to .gitignore, decide on notification per owner judgment.
- **2026-08-21 — KIMI — PLANNED — [P1] Onboard BadgeBook to the fleet + add CI.**  Board item 3b9ca6cf.  No .github/ at all (zero CI despite Tests/ and web/engine.test.ts), no AGENTS.md/CLAUDE.md/.claude, no dependabot, absent from fleet-apps.json and the digest.  Copy the DealDex coordination skeleton; add macOS runner job (swift test / xcodebuild test) + Node job for web/.  NOTE: vendor/crest is a subtree of the unarchived 'dead' crest repo — archive crest to stop drift/confusion.

## Changelog of this log
- 2026-08-21 — KIMI — file created during owner-requested fleet setup audit.
