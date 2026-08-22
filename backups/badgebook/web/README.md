# BadgeBook Web

Zero-install top-of-funnel: upload a `.vcf` → match in the browser → download
the updated vCard with logos embedded (`PHOTO;ENCODING=b;TYPE=PNG:…`).

## Why vCard

Contacts APIs are platform-locked; every contacts app (iCloud, Google,
Outlook, Android) imports/exports vCard. The web app therefore serves users
the native apps can't reach — and doubles as the marketing surface.

## Proposed stack

- **Next.js + Vercel** — landing page, upload/review/download flow
- **TypeScript port of the matching rules** — `docs/MATCHING-ENGINE.md` is the
  source of truth; the TS and Swift implementations share the golden corpus
- **Stripe** — Pro tier (unlimited contacts; free tier capped at 25)
- **Privacy** — vCards processed in memory, never persisted (privacy page is a
  feature, not boilerplate)

## Milestones

See Phase 3 in `docs/ROADMAP.md`.
