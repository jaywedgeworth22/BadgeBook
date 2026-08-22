# Roadmap

## Phase 0 — Foundation (this scaffold)
- [x] Product vision, architecture, matching-engine rulebook
- [x] `BadgeBookKit` package skeleton (models, normalize, rank, sources)
- [ ] Golden test corpus from the 189-name battle-test set
- [ ] GitHub repo wiring, CI

## Phase 1 — macOS MVP
- [ ] Contacts read via `Contacts.framework` + classification
- [ ] Brandfetch source (Brand API search + Logo Link CDN, icon preference)
- [ ] Review UI: Auto / Review / Not-found buckets, multi-candidate picker,
      select all/none, per-contact override
- [ ] Apply + undo log
- [ ] Dogfood against the 14k-contact address book; log every correction
      back into MATCHING-ENGINE.md

## Phase 2 — iOS
- [ ] Shared kit integration, Contacts permission flow
- [ ] `BGProcessingTask` matching + completion notification
- [ ] Review UI adapted to small screen (swipe approve/reject?)
- [ ] TestFlight via existing App Store Connect account

## Phase 3 — Web
- [ ] vCard parse → match → review → download
- [ ] Free quota + Stripe Pro
- [ ] Landing page, SEO ("add logos to contacts")

## Phase 4 — Polish & monetization
- [ ] Paywall (25 free contacts), Settings (own API keys)
- [ ] Scheduled re-scan ("new business contacts since last run")
- [ ] Alias/trap table updates shipped as remote config

## Open questions
- Google CSE cost beyond free tier vs. guiding users to bring their own key.
- App Store review stance on Contacts write access (needs clear value prop +
  privacy nutrition label; local-first helps).
- Logo licensing: assets are third-party trademarks — review Brandfetch
  Logo Link terms for in-app redistribution; Wikimedia licenses vary per file.
