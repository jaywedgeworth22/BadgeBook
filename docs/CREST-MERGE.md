# What moved from Crest

Crest ([github.com/jaywedgeworth22/crest](https://github.com/jaywedgeworth22/crest))
was the working web app for company logos on contact cards. BadgeBook is the
surviving product: same job, review-first, native macOS / iOS plus web.

Crest's git history is preserved in this repository via `git subtree` at
`vendor/crest`. That tree is the historical source, not a second product.

## Jobs both products had

| Job | Crest | BadgeBook after this merge |
| --- | --- | --- |
| Find companies in an address book | Classification + catalog | Same, plus BadgeBook person / business / non-brand classes |
| Suggest a square iconic mark | Preferred marks, CompaniesLogo, Simple Icons, favicons | Ported into `BadgeBookKit` and the web engine |
| Match by website, work email, name, phone | Identity resolver | `IdentityResolver` + `CompanyCatalog` + `PhoneDirectory` |
| Import vCard / Google CSV / large iPhone exports | Streaming import | BadgeBook Web |
| Review before write | Approve / try another / upload / skip | Three buckets: Ready / Review / Not-found. High-confidence pre-checked. |
| Backup before write | In-memory + vCard backup | Undo log (native) + backup download (web) |
| People stay people | Employees not treated as the company | Unchanged. Lone firm-in-given-name is the one Crest exception. |

## What did **not** move as product surface

Crest's Grok PWA scaffolding, Better Auth / PGLite login, logo-cache database,
Clearbit/Wikidata live resolve, and multiplayer helpers stay in `vendor/crest`
only. BadgeBook Web processes a vCard in the browser and stores nothing.

## Review-first rules kept from BadgeBook

- Nothing writes without an explicit approve (checkbox / Apply).
- `{name}.com` guesses and favicon-only hits never land in Ready to apply.
- Generic names (`Hospital`, `Verification Code`, printers) stay in Not a brand.
- Homonyms without a contact-owned domain cap at medium.
- Existing person photos are photo-protected.

## File map

| Crest | BadgeBook |
| --- | --- |
| `src/lib/contacts.ts` catalog | `Sources/BadgeBookKit/Normalize/CompanyCatalog.swift`, `web/src/engine/catalog.ts` |
| `src/lib/phones.ts` | `PhoneDirectory.swift`, `web/src/engine/phones.ts` |
| `src/lib/identity.ts` | `IdentityResolver.swift`, `classify.ts` |
| `src/lib/companieslogo.ts` picker | `CompaniesLogoSource.swift` |
| `src/routes/api/logo.ts` Simple Icons / preferred | `SimpleIconsSource.swift`, `PreferredMarksSource.swift`, `web/src/engine/logos.ts` |
| `src/lib/image-flags.ts` | `ImageFlags.swift` |
| `src/lib/vcard.ts`, `vcard-import.ts`, `google-csv.ts` | `web/src/engine/vcard.ts`, `csv.ts` |
| Review actions | macOS / iOS / web three-bucket review |
