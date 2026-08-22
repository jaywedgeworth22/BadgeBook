# Architecture

## Shape

```
┌─────────────────────────────────────────────────────────┐
│                    BadgeBookKit (Swift)                  │
│  Contact scanning · Name normalization · Source clients  │
│  Candidate ranking · Confidence tiers · Write/undo log   │
└───────┬──────────────────┬──────────────────┬───────────┘
        │                  │                  │
 BadgeBookMac         BadgeBookiOS        BadgeBook Web
 (SwiftUI, full       (SwiftUI, BG        (vCard upload →
  power features)      ProcessingTask)     server engine →
                                            updated vCard)
```

- **One engine, three shells.** All matching logic lives in `BadgeBookKit`,
  a Swift package with zero platform-specific imports except a thin
  `ContactsProvider` protocol. macOS/iOS implement it over `Contacts.framework`;
  the web backend implements it over parsed vCards.
- **Web engine parity**: the web service reimplements the same rules in
  TypeScript (rules are documented in MATCHING-ENGINE.md as the source of
  truth; both implementations must pass the same golden test corpus).

## BadgeBookKit modules

| Module | Responsibility |
| --- | --- |
| `Models` | `ContactIdentity`, `LogoCandidate`, `Confidence`, `MatchResult`, `ChangeSet` (undo) |
| `Contacts` | `ContactsProvider` protocol; classification (person / business / non-brand) |
| `Normalize` | name cleaning, alias table, generic blocklist, domain derivation |
| `Sources` | `LogoSource` protocol; Brandfetch, Wikimedia, Google CSE implementations; rate-limit + retry policy |
| `Rank` | aspect/icon scoring, padding, similarity gate, top-N candidate list |
| `Pipeline` | orchestration → `MatchResult` with confidence tier |
| `Store` | apply approved changes; persist undo log (previous images) |

## Data flow (native apps)

1. **Scan** (foreground, fast): read contacts, classify, normalize → work queue.
2. **Match** (network, slow): sources fetch candidates per queue item.
   iOS: `BGProcessingTaskRequest` (`requiresNetworkConnectivity`), continues
   overnight; local notification when the review queue is ready.
   macOS: immediate, with progress UI; optional scrape mode behind consent.
3. **Review**: three buckets (Auto / Review / Not-found). Multi-candidate
   picker, per-contact override (search/upload/paste URL), select-all/none.
4. **Apply**: batched `CNSaveRequest`; undo log written first.
5. **Undo**: restore prior images per batch.

## Web app (top-of-funnel)

- Upload `.vcf` → parse → same pipeline server-side (sources called
  server-side; user pastes own Brandfetch/Google key or uses quota-limited
  shared key) → review UI identical in spirit → download updated `.vcf`.
- Privacy: vCard held in memory only; deleted after download. No account
  needed for free tier.
- Stack proposal: Next.js + Vercel, Stripe for Pro, engine in TS.

## Rate-limit & key policy

- Users may plug in their own Brandfetch/Google CSE keys (Settings).
- Shared free-tier keys are server-side only (web app), quota-limited per IP.
- All sources honor 429 with exponential backoff; scraping mode is opt-in,
  macOS-only, with visible pacing.

## Testing strategy

- **Golden corpus**: the 189-name real-world set from the battle test,
  including the trap cases in MATCHING-ENGINE.md §4. CI asserts expected
  domains/candidates for each.
- Ranking unit tests for aspect/icon/padding rules.
- `ContactsProvider` mock for pipeline tests.
