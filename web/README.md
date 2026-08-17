# BadgeBook Web

Zero-install top-of-funnel: upload a `.vcf` or Google CSV → review matches in
three buckets (Ready / Review / Not-found) → download an updated vCard with
logos embedded. Contacts stay in the browser.

## What moved here from Crest

- vCard parse/export and Google CSV import
- Offline company catalog and published-phone directory
- Simple Icons + curated marks + favicon fallbacks
- Backup-before-download
- People who work at a company stay people; a lone firm name becomes a company card

The review-first contract is BadgeBook's: high-confidence only is pre-checked;
guessed `{name}.com` domains and favicon-only hits never auto-apply.

## Run

```bash
npm install
npm test
npm run dev
```

Production build: `npm run build`.
