# Sourcing Cheat-Sheet

Where sourced incumbent unit prices actually live, following the yield order in
`benchmark-row-format-and-sourcing-rules.md`. Search in **English** — most of these vendors and
every one of these portals is US-based, and Chinese-language queries will miss them entirely.

Which sources matter depends on your vertical. Services verticals (scanning, inspection, survey,
construction documentation) live in procurement records. Asset and data verticals (3D scene
marketplaces, robotics training data) live in marketplace listings and buyer self-reports, because
those vendors mostly don't publish. Don't grind a portal that structurally won't have your vertical.

## 1. Procurement award attachments (highest yield)
Award listings themselves usually show only a total contract value — the *unit* price lives in the
attachments: fee schedules, pricing tables, rate cards, usually a PDF linked from the award record.
Download and read the PDF rather than settling for the listing page's summary number.

- **FPDS ezsearch** (`fpds.gov/ezsearch/search.do?...`) — fastest federal award keyword sweep; plain HTML.
- **USAspending.gov** — richer award detail once you have a vendor name or NAICS code to pivot on;
  it's a JS application, so use a browser tool rather than a plain fetch if the page comes back empty.
- **State/local open-checkbook portals** — actual per-vendor payments, not just awards; search
  `"<state> checkbook" vendor payments`.
- **School-board packets / GMP amendments** — district board agendas and construction
  guaranteed-maximum-price amendments itemize documentation/scanning vendors as individual dollar
  line items. Search `"in the amount of" <vendor>`, `<vendor> board approved`, or `<vendor> GMP`.
  Individual amounts run small, but the per-unit rate inside them is exactly what this bounty wants.
- **International:** TED (EU), UK Contracts Finder, CanadaBuys, AusTender — award notices with
  values; the attachment (not the notice) usually carries the unit price.
- **Defense / training-simulation procurement** — contract values for synthetic training
  environments are fully public. Search `synthetic training environment contract award`, or work the
  SBIR/STTR award database (`sbir.gov`) by keyword for reality-capture and simulation-content awards.

A number from a procurement attachment is `[verified]` and is the strongest row you can produce —
it's a real transacted price with the buyer attached, not a list price.

## 2. GSA CALC+ / rate cards
`buy.gsa.gov` hosts the CALC+ tool — awarded hourly rates for surveying/scanning labor categories
across thousands of GSA schedule contracts. It's a JS application; use a browser tool, search by
labor category (e.g. "surveyor", "photogrammetrist", "GIS analyst"), and cite the specific
labor-category result page, not the tool's homepage.

## 3. Vendor published pricing
Many SaaS-model vendors (inspection apps, capture-services platforms, drone-mapping software)
publish tiered pricing directly on their own site — find the "Pricing" nav item, fetch the page,
quote the numbers exactly as shown, snapshot it, and record your access date.

Watch for the two traps: **"Contact sales"** means there is no number on this page, so stop and
switch methods rather than inferring one; and **"from $X"** is a floor, not a price (see the rules
doc). If a vendor doesn't publish pricing at all — common for enterprise-only categories, and near
universal in robotics training data — say so explicitly in your summary rather than guessing. That's
itself a useful finding.

## 4. Marketplace / reseller listings
For asset-supply verticals this is the *primary* source, not a fallback: 3D marketplaces post
per-item prices publicly. Work the item listings themselves, filter for whole-scene/environment
products rather than single props, and note tags like **SimReady** or **USD** — those mark assets
built for simulation use, which is the comparison we actually care about. Record the observed spread
for comparable items in notes; a single $249 kitchen means much less than "$50–$800 across 40
comparable kitchen scenes."

For custom work (commissioning a studio or freelancer to build a scene to spec), the equivalent
sources are studio rate pages, freelance-platform posted rates, and going-rate discussions in
practitioner forums — the last of which is `[reported]`, not `[verified]`.

Some services also sell through third-party resellers who post prices the vendor itself doesn't.

## 5. Trade / association fee surveys
AEC and land-surveying associations periodically publish fee-benchmark surveys — cite the specific
edition and year; these move slowly but do move.

## 6. Case studies and press releases
Vendor-published customer case studies and funding/contract press releases sometimes state a
contract value or a per-site cost. Usable as `[verified]` when the vendor states the number about
its own pricing; pair it with a unit count from the same document to derive a rate — and if you do
the dividing yourself, that's `[inferred]`, with the arithmetic in notes.

## 7. Quote-request journalism
Trade-press "what does X actually cost" articles are a fallback, not a first stop — `[verified]`
only if the article quotes a named vendor's actual rate, ideally cross-checked against that vendor's
own page. Otherwise `[reported]`.

## 8. Review sites and practitioner forums
G2, Capterra, contractor and robotics subreddits, LinkedIn comments. Buyers do disclose what they
pay here, and in verbal-quote-only categories this may be the only signal that exists — so these
rows belong in the table, tagged `[reported]`, with who said it and where in the notes. Their
highest value, though, is telling you *which number to go verify at the source*. Always try the
promotion to `[verified]` before settling.

## 9. Public-company filings
Annual reports and investor decks occasionally give revenue and customer counts, from which an
average price per customer can be derived → `[inferred]`, arithmetic in notes. This is the hardest
and lowest-yield method on the list. Skip it unless a vertical has given you nothing else.

## Tool craft
- Prefer fetching the actual page over trusting a search-result snippet — snippets truncate and
  sometimes misquote numbers.
- If a portal renders an empty shell to a simple fetch, it's a JavaScript application; use a
  browser-driven tool instead of retrying the same fetch.
- PDF attachments are frequently where the real unit price sits (the listing page usually only shows
  a lump-sum total) — open and read them.
- Snapshot to archive.org as you go, and put the snapshot link in the row's notes column. Doing it
  at the end means doing it for pages that have already changed.
- Date every source the moment you use it. A price without an access date can't be judged against
  the 180-day `[verified]` staleness window.
