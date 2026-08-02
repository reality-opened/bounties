# Benchmark Row Format & Sourcing Rules

## The row format
One line per price point in `starter-benchmarks.md`:

| service | unit | price | buyer context | source (URL) | access date | confidence |
|---|---|---|---|---|---|---|

- **service** — concrete, not a category ("terrestrial laser scanning of a commercial building interior", not "scanning services")
- **unit** — per sq ft / per scan / per inspection / per listing / per flight-hour / per day, etc.
- **price** — the number (or a range) as stated at the source; note the currency if not USD
- **buyer context** — who pays this (residential vs. commercial, carrier underwriting vs. claims, ENR-class GC vs. regional GC, etc.) — the same nominal service can carry very different prices by buyer segment
- **source (URL)** — the page you actually opened, not a search snippet or a secondhand mention
- **access date** — the date you verified it, not the date the source itself was published
- **confidence** — see tags below

## Confidence tags
- **[verified]** — you fetched the primary source yourself and the number is in it explicitly, verified within the last 180 days
- **[example]** — a demo row left in the starter file to show the format; never cite an `[example]` row as evidence in a dossier or memo, only as a formatting reference
- Anything you can't verify to `[verified]` standard doesn't go in the table — a half-sourced number is worse than no number, because it looks citable when it isn't

## Never edit an old row
This file is append-only. If a price changes or you find a better source for the same service, append a new row below the old one — don't overwrite it. The history of superseded rows is itself useful: it explains what an earlier memo assumed at the time.

## Conservative-end rule
When a price is presented as a range, downstream spend-bounding uses the **low** end — that understates the buyer's spend, which understates our undercut multiple, which is the safe direction to be wrong in. Note this explicitly if you carry a row's price into any bounding arithmetic elsewhere (e.g. in a demand dossier).

## Finding incumbent prices, in yield order
1. **Procurement award attachments** — fee schedules and unit-price tables inside public procurement awards are literal invoices: per-scan, per-sq-ft, per-flight-hour rates with buyer context attached. This is the gold standard; see `sourcing-cheatsheet.md` for where to look.
2. **GSA CALC+ / schedule rate cards** — awarded government hourly rates for surveying/scanning labor categories.
3. **Vendor published pricing** — SaaS tiers, per-space/per-listing/per-project capture fees, published directly on a vendor's own pricing page. Fetch it and note the date — pricing pages change without a changelog.
4. **Trade / association fee surveys** — AEC and surveying-association fee benchmarks; cite the specific edition/year.
5. **Quote-request journalism** — trade-press "what does X actually cost" articles; treat as `[verified]`-eligible only if the article itself quotes a named vendor's actual rate, and independently confirm on the vendor's own page if you can.
6. **Practitioner forums** (contractor subreddits, LinkedIn posts) — leads only, never citable directly; use them to know which number to go verify at the source.

## Append protocol
The moment you verify a price, append the row — don't wait until you've finished your whole assigned list. The next contributor (or your own future self) shouldn't have to re-derive a number you already found.
