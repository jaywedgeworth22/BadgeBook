# ContactLogo

**Brand icons for your address book.** ContactLogo scans your contacts, finds
the companies behind them, and puts a clean, recognizable logo on every
business card — so "Walgreens" shows the red W, not a grey monogram.

**Site:** [contactlogo.grok.me](https://contactlogo.grok.me)
**Repo:** [jaywedgeworth22/ContactLogo](https://github.com/jaywedgeworth22/ContactLogo)

Three shells, one engine:

| Product | What it is |
| --- | --- |
| **ContactLogo for macOS** | Native app. Full contact scan, review queue, one-click apply, undo. |
| **ContactLogo for iOS** | Native app. Same engine on-device, background processing with notification when your review queue is ready. |
| **ContactLogo Web** | Upload a `.vcf` or Google CSV → review matches in the browser → download the updated vCard. No install. |

ContactLogo is the only product. **BadgeBook** and **Crest** were working
names and are retired. `jaywedgeworth22/BadgeBook` redirects here.
`jaywedgeworth22/crest` is a legacy archive. The Grok previews at
contactlogo.grok.me and bizlogo.grok.me are this same web product.

Catalog, phone, and iconic-mark matching from the imported tree at
`vendor/crest` live in `ContactLogoKit` and the web engine. Product history
is in [docs/CONTACTLOGO.md](docs/CONTACTLOGO.md).

## Why it exists

- Your address book is full of businesses: pharmacies, banks, airlines, apps.
  They all render as identical grey initials.
- Automatic logo matching is easy to get *almost* right — and embarrassing when
  wrong. ContactLogo is built around a **review-first** flow with confidence
  tiers and per-contact overrides, not blind automation.

## Status

Matching engine plus working web review app. The rule set was distilled from a
real-world battle test against a 14,000-contact address book — see
[docs/MATCHING-ENGINE.md](docs/MATCHING-ENGINE.md).

## Repository layout

```
Sources/ContactLogoKit/   Shared matching engine (Swift, macOS + iOS)
Sources/contactlogo/      CLI dogfood driver
Apps/ContactLogoMac/      macOS SwiftUI app
Apps/ContactLogoiOS/      iOS SwiftUI app
web/                      Web app (vCard / CSV → review → download)
vendor/crest/             Historical imported git tree (not a second product)
docs/                     Vision, architecture, matching rules, product history
```

CLI scan dumps (`.contactlogo/`, `.badgebook/`, `scan.json`, `match-results.json`,
`review.html`) are gitignored. They can contain AddressBook identifiers and
must never be committed.

## License

Apache License 2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE).
