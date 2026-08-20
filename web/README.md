# ContactLogo Web

Zero-install top-of-funnel: upload a `.vcf` or Google CSV → review matches in
three buckets (Ready / Review / Not-found) → download an updated vCard with
logos embedded. Contacts stay in the browser.

Site: [contactlogo.grok.me](https://contactlogo.grok.me)

The review-first contract: high-confidence only is pre-checked; guessed
`{name}.com` domains and favicon-only hits never auto-apply.

## Run

```bash
npm install
npm test
npm run dev
```

Production build: `npm run build`.
