# Evidence Tier Rubric

Every dossier's `evidence_tier` field must be A, B, or C — and only A/B dossiers count toward the ≥5 required by this bounty. Use this rubric to grade your own find honestly before you write it up.

## Tier A — Documentary
Public filings with vendor-spend line items; government procurement records (federal/state/city/international portals) — award notices, obligated-to-date amounts, disclosed contract values; court filings and dockets that put a contract value into the public record.

**Test:** could someone else open your source link and read the buyer, vendor, and dollar figure directly off the primary document, with no inference step? If yes, it's Tier A.

## Tier B — Reported
Press releases naming buyer + vendor + a stated or tightly bounded value; earnings-call remarks; vendor case studies that name the customer **and** state or tightly bound the spend (not just "we work with Acme Corp" — the case study has to give you a number, or a range you can defend).

**Test:** is there a number in the reporting itself (not one you constructed), attributed to a named buyer and vendor? If yes, Tier B.

## Tier C — Inferred
Job postings implying an active paid program; list price × a sourced usage figure; analyst estimates of one specific named company's spend (not an industry-wide estimate).

**Rule:** Tier C requires 2+ *independent* sources to report at all — independent means different origin, not two articles quoting the same press release. A single job posting, alone, is never citable as a dossier's primary evidence — it's corroboration fuel for a Tier A/B finding, or a lead to go upgrade.

**Tier-C inference hygiene:** `list price × known usage` is legitimate only when **both** factors are independently sourced — the price from a page you fetched (a vendor pricing page, a benchmark row with its own citation), and the usage figure from a case study, filing, or press release. Show the arithmetic and both citations in the dossier's `sources` field so it can be audited. Two Tier-C constructions built on the same underlying source do not corroborate each other into Tier B.

## Upgrading a Tier C
The cheapest upgrade paths: find the procurement record that sits behind a press release (C/B → A), or find the buyer named directly inside a vendor's own filing (a 10-K customer-concentration disclosure, for example). See `search-motions-cheatsheet.md`, "corroboration drill."

## What never counts, at any tier
- TAM / market-size figures.
- "Companies like X typically spend..." — generic-buyer statements.
- Unnamed buyers ("a major GC", "a top-10 carrier") — no name, no transaction.
