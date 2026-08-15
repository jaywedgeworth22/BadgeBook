# The Matching Engine — rules & failure catalog

Every rule here was earned against a real 14,379-contact address book
(1,361 logos applied, then hand-reviewed with corrections). This document is
the product's moat — keep it current.

## 1. Contact classification

| Class | Definition | Policy |
| --- | --- | --- |
| Person | has given or family name | Never auto-touch if a photo exists. Logo allowed only when no photo AND organization present. |
| Business card | no given/family name; display name is a company ("FedEx", "H-E-B Pharmacy (Bridgeland)") | Primary target set. Logo allowed even if a photo exists, but only via review. |
| Non-brand | name is generic ("Hospital", "Gift Card", "Manager", "Verification Code", "Printer at Farm") | Hard skip by default (blocklist). Show in "not a brand" bucket, never in "not found". |

Notes:
- Display `name` is **not** a person-name signal — on org-only contacts it
  equals the organization. Always check given/family name fields.
- `organization` often contains role junk: "Hsa PTO - Asst Treasurer",
  "TRICO - General Mgr". Clean before matching.

## 2. Name normalization (before any lookup)

1. Strip parentheticals: "Walgreens (Mason Rd / Cypress)" → "Walgreens".
2. Strip role/location suffixes after ` - ` / ` — ` when the tail looks like a
   role or place ("Byron Goode Jr - Root Insurance" is a trap: the *brand* is
   the tail here — see §5 rule 8).
3. Collapse whitespace, trim ` -–—,`.
4. Keep an alias map: "TxT" → "Texas by Texas", "GCX" → "Raise", "NTB" ≠
   "Mavis" (see §4).

## 3. Sources, in priority order

1. **Brandfetch Brand API** (search by name → domain) + **Logo Link CDN**
   (domain → asset, free client ID). Prefer `type: icon` over `type: logo`
   (wordmark). Prefer `theme: light`. PNG only for Contacts.
   - Gotchas: free Brand API rate-limits fast (429 within ~250 calls); Logo
     Link CDN needs a real `Referer` header and a non-`example.com` value, and
     returns a *letter-tile fallback* for unknown brands — detect and treat as
     "not found", not success.
2. **Wikimedia Commons API** — excellent for major corporate wordmarks
   ("File:Exxon logo.svg"). Rasterize SVG server-side; `upload.wikimedia.org`
   thumbnailing rejects bot-y UAs, send a descriptive one.
3. **Google Custom Search API** (`searchType=image`, user-provided key,
   100 free/day) — the only ToS-safe Google path on iOS/web.
4. **Google Images scraping** (macOS power-user mode only): real browser,
   ≤1 query / ~12s, exponential backoff. IP gets reCAPTCHA-flagged after
   ~60 rapid queries; recovery needs a human checkbox. Aspect ratio of the
   served gstatic thumbnails is preserved → deterministic square detection
   without downloading originals.

## 4. Disambiguation traps (the failure catalog)

| Trap | Example | Rule |
| --- | --- | --- |
| Domain redirect after merger | `ntb.com` → Mavis Tire, but the contact means NTB | Domain-derived logos can be the *successor* brand. Prefer name-search over raw domain when name ≠ domain string. |
| Brand vs parent | "Exxon" (fuel brand wordmark) vs `exxon.com` (ExxonMobil corporate) vs the 4-in-1 collage image | Keep a brand/entity alias table; prefer the consumer-facing brand asset. |
| Homonyms across categories | "IBC" = International Bank of Commerce ≠ IBC Root Beer; "Mercury", "Delta", "Apple - Australia" (flag decal!) | Use contact context (email domain, notes, address country) as a category signal. If no context: medium confidence, never auto-apply. |
| Decorated queries | "Apple - Australia" matched an Australia-flag Apple decal | Normalize away decorations before searching; fall back to the parent brand. |
| Generic nouns | "Hospital" matched a red-cross clip-art; "Gift Card", "Candy", "Manager", "Medico", "Jerry" | Blocklist generic terms; require an organization/domain signal to override. |
| Devices & services, not brands | "Printer at Farm (WF-2950)", "Verification Code (Twilio Powered)" | Pattern-detect (model numbers, "Verification", "Printer") → non-brand bucket. |
| Fallback tiles | Brandfetch returns a colored letter tile for unknown domains | Detect (single-letter center crop / API `fallback` flag) → treat as not found. |
| Junk domains in contacts | `ms-outlook://people/…` URLs, `doug@texasdescon.com` as URL, `gnail.com` typos | Only http(s) URLs; strip userinfo; blocklist freemail + typo-squats; strip social/profile domains (linkedin.com/…) as logo sources. |

## 5. Ranking rules (deterministic)

1. **Square first**: aspect 0.8–1.25 required for auto-accept; scan results in
   order, take the first square one; else fall back to first result at medium
   confidence. ("Walgreens" first hit is a 731×208 banner — skip it.)
2. **Icon over wordmark**: Brandfetch `type=icon` beats `type=logo`. At 40pt,
   the Walgreens W reads; "WALGREENS" doesn't.
3. **Pad, never crop**: wide wordmarks get padded onto a white square canvas
   (1.25× margin) instead of being cropped.
4. **Official-domain bonus**: asset hosted on the brand's own domain or
   brandfetch/wikimedia > logodix/seeklogo aggregators > random blog.
5. **Similarity gate**: normalized brand name must share a token with the
   query, else reject (kills "Cash App" → breadzine.com).
6. **Multi-candidate**: always keep the top 3–5 scored candidates, not just
   the winner — the review UI offers them when the user taps "unsure".
7. **Employee contacts** (person name + corporate email domain): lowest
   priority; only logo when user opts into that class explicitly.
8. **Person-in-name businesses** ("Byron Goode Jr - Root Insurance",
   "Chris At NTB"): if the display name contains a known-brand tail, match the
   brand tail, not the person.

## 6. Confidence tiers

- **HIGH** (pre-checked): source = Brandfetch/Wikimedia, square, icon type,
  name similarity pass, no trap flags.
- **MEDIUM** (review): non-square fallback, aggregator source, homonym risk,
  name-search-only match.
- **LOW/SKIP**: generic blocklist, fallback tile, no candidates.

## 7. Write policy

- Never write without explicit user approval of the batch.
- Store every overwritten image (and "had none" markers) for one-tap undo.
- Apply via platform Contacts API only (`CNContactStore` / AppleScript bridge
  on macOS); iCloud sync propagates.
