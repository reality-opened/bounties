# Benchmark Row Format & Sourcing Rules

**This file is the source of truth for the row format and the confidence tags.** If any other
document in this kit (including the Chinese onboarding guide) appears to contradict it, this file
wins — and tell the bounty owner, because that's a bug we want to fix.

## The row format
One line per price point in `starter-benchmarks.md`:

| vertical | company | service | unit | price | buyer context | source (URL) | access date | confidence | notes |
|---|---|---|---|---|---|---|---|---|---|

- **vertical** — which of your assigned verticals this row belongs to. One table holds all of them,
  and this column is how they stay separable — so use the **exact** label, not a paraphrase, or the
  table can't be grouped later. For the current physical-AI assignment the three labels are:
  `Sim-ready 3D assets` · `Reality capture` · `Robot training data`
  (The `[example]` rows carry labels from other verticals — that's deliberate, so you can never
  mistake a format example for real data in your own set.)
- **company** — the vendor or platform charging the price. Keep it consistent across rows for the
  same company, so the table can be pivoted on it later.
- **service** — concrete, not a category ("terrestrial laser scanning of a commercial building
  interior", not "scanning services")
- **unit** — what the price buys: per sq ft / per scan / per inspection / per listing / per
  flight-hour / per seat per year / per asset / per day, etc. If the vendor sells by subscription
  tier, the unit is the tier ("per pilot per year"), not "monthly".
- **price** — the number (or a range) as stated at the source; note the currency if not USD
- **buyer context** — who pays this (residential vs. commercial, carrier underwriting vs. claims,
  ENR-class GC vs. regional GC, indie game studio vs. robotics lab, etc.) — the same nominal service
  can carry very different prices by buyer segment
- **source (URL)** — the page you actually opened, not a search snippet or a secondhand mention
- **access date** — the date you verified it, not the date the source itself was published
- **confidence** — see the tag ladder below
- **notes** — your archive.org snapshot link (required, see below), plus anything a reader needs in
  order to use the number correctly: "starting price, real price may be higher", the arithmetic
  behind an `[inferred]` row, the effective date if the source states one, the observed spread for
  comparable items, "vendor does not publish, this is a reseller listing", and so on.

## Confidence tags

Four tiers. **Only `[verified]` rows may be carried into spend-bounding arithmetic** anywhere else
(dossiers, memos, pitch numbers). The lower tiers are real intelligence and belong in the table —
they just can't carry a claim on their own.

- **[verified]** — you opened the primary source yourself and the number is stated in it explicitly,
  within the last 180 days. Qualifying sources: a vendor's own pricing page; a procurement award
  attachment / fee schedule / rate card; a GSA CALC+ labor-category result; a named edition of a
  trade-association fee survey; a marketplace item listing with a posted price.
- **[reported]** — a buyer or practitioner states what they actually paid, but you cannot see the
  primary document: a forum or Reddit post, a G2/Capterra review, a LinkedIn comment, a trade-press
  article quoting a rate. Admissible, and often the *only* signal available in verbal-quote-only
  categories — but notes must say who reported it and where, and the row can't bound spend by
  itself. Treat every `[reported]` row as a lead: try to promote it to `[verified]` at the source.
- **[inferred]** — you computed it from other figures (annual revenue ÷ customer count, total
  contract value ÷ number of sites, etc.). Admissible **only if notes show the full arithmetic and
  where each input came from**, so a reader can redo it. Never bounds spend by itself.
- **[example]** — a demo row left in the starter file to show the format; never cite an `[example]`
  row as evidence, only as a formatting reference.

A price you can't place in one of those four tiers doesn't go in the table. A half-sourced number is
worse than no number, because it looks citable when it isn't.

## Snapshot every source page
Pricing pages change without a changelog, and procurement PDFs get rotated off portals. The moment
you use a page:

1. Open <https://web.archive.org>, paste the URL into **Save Page Now**, save it.
2. Put the resulting snapshot link in the row's **notes** column.

A row whose source URL has gone dead and has no snapshot is a row someone will eventually have to
delete. (The three `[example]` rows predate this rule and have no snapshots — that's why; don't copy
that part of them.)

## "Starting at" is not a price
When a page says "from $99/mo" or "starting at $2,500/project", the price column gets `$99/mo` and
the notes column gets **"starting price — actual price may be higher"**. Never record a floor as if
it were the price. Same for "up to" ceilings, in the other direction.

## Ranges, and the conservative-end rule
Capture ranges as ranges — don't collapse them to a point estimate. When a range is later carried
into spend-bounding, downstream uses the **low** end: that understates the buyer's spend, which
understates our undercut multiple, which is the safe direction to be wrong in. Note it explicitly if
you carry a row's price into any bounding arithmetic elsewhere (e.g. in a demand dossier).

## Never edit an old row
This file's companion table is append-only. If a price changes or you find a better source for the
same service, append a new row below the old one — don't overwrite it. The history of superseded
rows is itself useful: it explains what an earlier memo assumed at the time. If a new row supersedes
an old one, say so in the new row's notes ("supersedes the 2026-07-28 row for this SKU").

## Finding incumbent prices, in yield order
See `sourcing-cheatsheet.md` for where each of these actually lives and how to work it.

1. **Procurement award attachments** — fee schedules and unit-price tables inside public procurement
   awards are literal invoices: per-scan, per-sq-ft, per-flight-hour rates with buyer context
   attached. This is the gold standard.
2. **GSA CALC+ / schedule rate cards** — awarded government hourly rates for surveying/scanning
   labor categories.
3. **Vendor published pricing** — SaaS tiers, per-space/per-listing/per-project capture fees,
   published directly on a vendor's own pricing page.
4. **Marketplace / reseller listings** — posted per-item prices where the vendor itself doesn't
   publish, and the primary source for asset-marketplace verticals.
5. **Trade / association fee surveys** — AEC and surveying-association fee benchmarks; cite the
   specific edition/year.
6. **Customer case studies, press releases, board packets** — occasionally state a contract value;
   pair with a unit count to get a rate.
7. **Quote-request journalism** — trade-press "what does X actually cost" articles; `[verified]`
   only if the article quotes a named vendor's actual rate, ideally cross-checked on the vendor's
   own page; otherwise `[reported]`.
8. **Review sites and practitioner forums** (G2, Capterra, contractor subreddits, LinkedIn) —
   `[reported]` at best. Their real value is telling you *which number to go verify*.
9. **Public-company filings** — for `[inferred]` averages. Hardest, lowest yield; last resort.

## "No published price" is a finding
If a vendor publishes nothing and no procurement record exists, record that explicitly in your
summary rather than guessing or skipping it silently. It means no dossier elsewhere can bound spend
off that vendor until someone gets a quote or finds a procurement packet — which is exactly the kind
of thing the next person needs to know before they waste a day on it.

## Append protocol
The moment you verify a price, append the row — don't wait until you've finished your whole assigned
list. The next contributor (or your own future self) shouldn't have to re-derive a number you
already found.
