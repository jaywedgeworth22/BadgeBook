# ContactLogo

ContactLogo is the one product: brand icons for the address book, review-first,
on macOS, iOS, and the web. Live site: [contactlogo.grok.me](https://contactlogo.grok.me).

This repository previously used two names for the same job. Those names are
retired. The combine work stays: catalog, phones, and iconic marks from the
imported tree at `vendor/crest` sit inside ContactLogo's review-first engine.

## What this product does

| Job | How ContactLogo does it |
| --- | --- |
| Find companies in an address book | Person / business / non-brand classes plus catalog |
| Suggest a square iconic mark | Preferred marks, CompaniesLogo picker, Simple Icons, favicons |
| Match by website, work email, name, phone | `IdentityResolver` + `CompanyCatalog` + `PhoneDirectory` |
| Import vCard / Google CSV | ContactLogo Web |
| Review before write | Ready / Review / Not-found. High-confidence pre-checked. |
| Backup before write | Undo log (native) + backup download (web) |
| People stay people | Employees are not the company. Lone firm-in-given-name is the exception. |

## What is not product surface

Grok PWA scaffolding, Better Auth / PGLite login, logo-cache database,
Clearbit/Wikidata live resolve, and multiplayer helpers stay in `vendor/crest`
only. The web app processes a vCard in the browser and stores nothing.

## Review-first

- Nothing writes without an explicit approve (checkbox / Apply).
- `{name}.com` guesses and favicon-only hits never land in Ready to apply.
- Generic names (`Hospital`, `Verification Code`, printers) stay in Not a brand.
- Homonyms without a contact-owned domain cap at medium.
- Existing person photos are photo-protected.

## File map (imported tree → ContactLogo)

| `vendor/crest` | ContactLogo |
| --- | --- |
| `src/lib/contacts.ts` catalog | `Sources/ContactLogoKit/Normalize/CompanyCatalog.swift`, `web/src/engine/catalog.ts` |
| `src/lib/phones.ts` | `PhoneDirectory.swift`, `web/src/engine/phones.ts` |
| `src/lib/identity.ts` | `IdentityResolver.swift`, `classify.ts` |
| `src/lib/companieslogo.ts` picker | `CompaniesLogoSource.swift` |
| `src/routes/api/logo.ts` Simple Icons / preferred | `SimpleIconsSource.swift`, `PreferredMarksSource.swift`, `web/src/engine/logos.ts` |
| `src/lib/image-flags.ts` | `ImageFlags.swift` |
| `src/lib/vcard.ts`, `vcard-import.ts`, `google-csv.ts` | `web/src/engine/vcard.ts`, `csv.ts` |
| Review actions | macOS / iOS / web three-bucket review |

## Why `vendor/crest` still exists

Renaming that directory would break the `git subtree` history. The path is
the imported tree name, not a second product. Do not run it as an app.
