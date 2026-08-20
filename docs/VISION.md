# ContactLogo — Product Vision

## One-liner

ContactLogo gives every business in your address book its real logo — reviewed
by you, applied in one click, undoable always.

## Who it's for

Anyone whose contacts mix people and businesses, and who is tired of grey
initial circles in Messages, Phone, and Mail. Early adopters: productivity
nerds, sales/field roles with hundreds of vendor contacts, anyone who keeps
"CVS (Main St)" style entries.

## The insight

Fully automatic logo matching is a trap. Our battle test (14,379 real
contacts, 1,300+ businesses) proved:

1. **~80% of matches are trivially automatable** (clear brand, square icon
   exists, unambiguous name).
2. **~15% need a human glance** (homonyms like "Mercury" bank/car/planet,
   merged brands, generic-ish names).
3. **~5% should never be auto-matched** ("Hospital", "Gift Card", "Manager",
   printers, "Verification Code" — not brands at all).

So the product is not "an API that fetches logos". It is a **review
experience** wrapped around a confidence-scored matching engine:

- High confidence → pre-checked, apply all.
- Medium → shown with 3–5 candidate options, one tap to pick, or "unsure".
- Unsure queue → user can search/upload/paste their own image.
- Low/none → collapsible "not found" list, never blocking.

## Design principles

1. **Review-first.** Nothing writes to Contacts without explicit approval.
2. **Undo always.** Every applied batch stores prior images; one-tap restore.
3. **Pictographic beats wordmark.** At 40×40pt (iMessage thread size), an icon
   reads; a spelled-out word doesn't. The engine prefers `icon` assets and
   square aspect ratios; wide wordmarks are padded onto a square canvas as a
   last resort.
4. **Never guess on generic names.** A wrong logo is worse than none.
5. **Local-first.** Contacts never leave the device on macOS/iOS. The web app
   processes vCards in memory, stores nothing by default.

## Monetization sketch

- Free: 25 contacts processed, watermark-free, full review UI.
- Pro (one-time or cheap annual): unlimited contacts, background re-scan on a
  schedule, undo history, custom upload per contact, multi-candidate picker.
- Web: free tier same cap; Stripe checkout; cross-sell the native apps.

## Why three apps

- **macOS**: power users, biggest address books, easiest review UX.
- **iOS**: where the contacts actually live for most people; background
  `BGProcessingTask` does the fetch work overnight, notification → review.
- **Web (vCard / Google CSV)**: zero-install top-of-funnel; works for
  Android/Google Contacts users too (export → process → import). Catalog,
  phone match, and iconic marks run in the browser. Marketing surface + SEO.
