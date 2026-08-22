# BadgeBook

**Brand icons for your address book.** BadgeBook scans your contacts, finds the
companies behind them, and puts a clean, recognizable logo on every business
card — so "Walgreens" shows the red W, not a grey monogram.

Three products, one engine:

| Product | What it is |
| --- | --- |
| **BadgeBook for macOS** | Native app. Full contact scan, review queue, one-click apply, undo. |
| **BadgeBook for iOS** | Native app. Same engine on-device, background processing with notification when your review queue is ready. |
| **BadgeBook Web** | Upload a `.vcf` export → review matches in the browser → download the updated vCard. No install, works for anyone. |

## Why it exists

- Your address book is full of businesses: pharmacies, banks, airlines, apps.
  They all render as identical grey initials.
- Automatic logo matching is easy to get *almost* right — and embarrassing when
  wrong (a tire brand became a different tire brand after a merger; a bank
  became a root beer). BadgeBook is built around a **review-first** flow with
  confidence tiers and per-contact overrides, not blind automation.

## Status

Early scaffold. The matching engine is distilled from a real-world battle test
against a 14,000-contact address book — see
[docs/MATCHING-ENGINE.md](docs/MATCHING-ENGINE.md) for the rule set and the
failure catalog it was built from.

## Repository layout

```
Sources/BadgeBookKit/     Shared matching engine (Swift, macOS + iOS)
Apps/BadgeBookMac/        macOS SwiftUI app
Apps/BadgeBookiOS/        iOS SwiftUI app
web/                      Web app (vCard flow)
docs/                     Vision, architecture, matching rules, roadmap
```

## License

Apache License 2.0 — see [LICENSE](LICENSE).
