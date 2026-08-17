# BadgeBook

**Brand icons for your address book.** BadgeBook scans your contacts, finds the
companies behind them, and puts a clean, recognizable logo on every business
card — so "Walgreens" shows the red W, not a grey monogram.

Three products, one engine:

| Product | What it is |
| --- | --- |
| **BadgeBook for macOS** | Native app. Full contact scan, review queue, one-click apply, undo. |
| **BadgeBook for iOS** | Native app. Same engine on-device, background processing with notification when your review queue is ready. |
| **BadgeBook Web** | Upload a `.vcf` or Google CSV → review matches in the browser → download the updated vCard. No install. |

Crest (the earlier web app for this job) is merged in: its company catalog,
phone directory, and iconic-mark sources now live in `BadgeBookKit` and the
web engine. Crest's git history is kept at `vendor/crest`. See
[docs/CREST-MERGE.md](docs/CREST-MERGE.md).

## Why it exists

- Your address book is full of businesses: pharmacies, banks, airlines, apps.
  They all render as identical grey initials.
- Automatic logo matching is easy to get *almost* right — and embarrassing when
  wrong (a tire brand became a different tire brand after a merger; a bank
  became a root beer). BadgeBook is built around a **review-first** flow with
  confidence tiers and per-contact overrides, not blind automation.

## Status

Matching engine plus working web review app. The rule set was distilled from a
real-world battle test against a 14,000-contact address book — see
[docs/MATCHING-ENGINE.md](docs/MATCHING-ENGINE.md).

## Repository layout

```
Sources/BadgeBookKit/     Shared matching engine (Swift, macOS + iOS)
Sources/badgebook/        CLI dogfood driver
Apps/BadgeBookMac/        macOS SwiftUI app
Apps/BadgeBookiOS/        iOS SwiftUI app
web/                      Web app (vCard / CSV → review → download)
vendor/crest/             Crest source + git history (not a second product)
docs/                     Vision, architecture, matching rules, Crest merge
```

## License

Apache License 2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE).
