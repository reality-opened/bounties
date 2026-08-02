# Sourcing Cheat-Sheet

Where sourced incumbent unit prices actually live, per `benchmark-row-format-and-sourcing-rules.md`'s yield order.

## Procurement award attachments (highest yield)
Award listings themselves usually show only a total contract value — the *unit* price lives in the attachments: fee schedules, pricing tables, rate cards, usually a PDF linked from the award record. Download and read the PDF rather than settling for the listing page's summary number.

- **FPDS ezsearch** (`fpds.gov/ezsearch/search.do?...`) — fastest federal award keyword sweep; plain HTML.
- **USAspending.gov** — richer award detail once you have a vendor name or NAICS code to pivot on; it's a JS application, so use a browser tool rather than a plain fetch if the page comes back empty.
- **State/local open-checkbook portals** — actual per-vendor payments, not just awards; search `"<state> checkbook" vendor payments`.
- **School-board packets / GMP amendments** — district board agendas and construction guaranteed-maximum-price amendments itemize documentation/scanning vendors as individual dollar line items. Search `"in the amount of" <vendor>` or `<vendor> GMP`. Individual amounts run small, but the per-unit rate inside them is exactly what this bounty wants.
- **International:** TED (EU), UK Contracts Finder, CanadaBuys, AusTender — award notices with values; the attachment (not the notice) usually carries the unit price.

## GSA CALC+ / rate cards
`buy.gsa.gov` hosts the CALC+ tool — awarded hourly rates for surveying/scanning labor categories across thousands of GSA schedule contracts. It's a JS application; use a browser tool, search by labor category (e.g. "surveyor", "photogrammetrist"), and cite the specific labor-category result page, not the tool's homepage.

## Vendor published pricing
Many SaaS-model vendors (inspection apps, capture-services platforms, drone-mapping software) publish tiered pricing directly on their own site — fetch the page, quote the numbers exactly as shown, and record your access date, since these pages change without notice. If a vendor doesn't publish pricing at all (common for enterprise-only categories), say so explicitly rather than guessing — that's itself a useful finding: it means no dossier elsewhere can be Tier-C bounded off that vendor until someone gets a quote or finds a procurement packet.

## Trade / association fee surveys
AEC and land-surveying associations periodically publish fee-benchmark surveys — cite the specific edition and year; these move slowly but do move.

## Quote-request journalism
Trade-press "what does X actually cost" articles are a fallback, not a first stop — only worth a `[verified]` row if the article itself quotes a named vendor's actual rate, ideally cross-checked against that vendor's own page.

## Tool craft
- Prefer fetching the actual page over trusting a search-result snippet — snippets truncate and sometimes misquote numbers.
- If a portal renders an empty shell to a simple fetch, it's a JavaScript application; use a browser-driven tool instead of retrying the same fetch.
- PDF attachments are frequently where the real unit price sits (the listing page usually only shows a lump-sum total) — open and read them.
- Date every source the moment you use it. A price without an access date can't be judged against the 180-day `[verified]` staleness window.
