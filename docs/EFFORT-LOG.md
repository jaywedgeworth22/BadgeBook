# ContactLogo Effort Log — cross-agent board
Protocol: /Users/jay/apps/EFFORT-LOG-PROTOCOL.md (canonical). Live board:
`/Users/jay/apps/CONTACTLOGO-EFFORT-LOG.md` (mirror: this file). Bootstrapped
2026-08-21 by KIMI during the fleet setup audit; folder + GitHub name aligned
by CURSOR the same day. ContactLogo is not yet in fleet-apps.json and has no
CI — see Planned rows below.

## Deployed
- (none — web is a Grok Publish at https://contact-logo.grok.me, not this repo's Actions)

## Completed
- **2026-08-21 — CURSOR — COMPLETED — Local folder `~/Code/ContactLogo` + GitHub `jaywedgeworth22/ContactLogo` + Cursor project name ContactLogo.**  `mv` of `/Users/jay/Code/BadgeBook` (git history, uncommitted merge, `backups/`, `vendor/crest/` intact).  GitHub already renamed (0 forks, old BadgeBook slug redirects).  Origin set to `https://github.com/jaywedgeworth22/ContactLogo.git`.  Cursor project list name/path updated; `~/.cursor/projects/Users-jay-Code-ContactLogo` created.  Frozen snapshots stay `backups/badgebook/` (`18fcf25`) and `backups/crest/` (`8b4ca72`).  Product docs/homepages use `contact-logo.grok.me` (live 200; unhyphenated host 404s).
- **2026-08-21 — CURSOR — COMPLETED — Preserve Crest+BadgeBook merge into the live app.**  Uncommitted kit/web/PWA/Google-import/iOS review work committed with backups.  `vendor/crest/` subtree kept.  Best ideas stay in ContactLogoKit + `web/`.
- **2026-08-21 — KIMI — COMPLETED — [P0] PRIVACY INCIDENT: purged `.badgebook/` from git history.**  Board item 3b9ca6cf.  Removed scan dumps, match results, review HTML, and UUID-keyed candidate PNGs from all commits via `git filter-repo` + force-push.  `.gitignore` now covers `.badgebook/`, `.contactlogo/`, scan artifacts, and AddressBook exports.  Issue #4 closed.  Residual: GitHub may cache old blobs/PR diffs until GC; issue/PR text is path-only; no forks; clones and agent transcripts are out of band.

## In Progress
- **2026-08-21 — AG — IN PROGRESS — Web, iOS, macOS, Android PWA enhancements & power features.**  Two-way Google Contacts write sync, in-browser safe-ring canvas studio & contrast auto-badging, instant search & smart category filters, iOS swipe triage & live simulator preview, macOS keyboard navigation, expanded offline company catalog.  Branch `ag/app-enhancements-power-features`.

## Planned / Reserved
- **2026-08-21 — KIMI — PLANNED — [P1] Onboard ContactLogo to the fleet + add CI.**  Board item 3b9ca6cf.  No CI despite Tests/ and web/engine.test.ts, no AGENTS.md/CLAUDE.md/.claude, no dependabot, absent from fleet-apps.json and the digest.  Copy the DealDex coordination skeleton; add macOS runner job (`swift test`) + Node job for `web/`.  `jaywedgeworth22/crest` is archived (2026-08-21); `vendor/crest` remains a subtree path, not a second product.

## Changelog of this log
- 2026-08-21 — KIMI — file created during owner-requested fleet setup audit.
- 2026-08-21 — P0 history rewrite completed (filter-repo + force-push); no contact names in this log.
- 2026-08-21 — CURSOR — renamed local folder and GitHub product to ContactLogo; moved P0 to Completed; recorded merge+backup preservation; live site URL hyphenated.
