# Search Motions Cheat-Sheet

Distilled from our internal search playbook. This is the *how*: where money leaves paper trails, and which trail yields which evidence tier. Read `evidence-tier-rubric.md` first if you haven't.

## The source ladder (work top-down)

| Trail | Typical tier | Where |
|---|---|---|
| Government procurement awards & open-checkbook payments | A | Federal/state/city/international portals |
| Public filings, court records, regulator dockets | A | EDGAR, court records, utility/PUC/FERC dockets |
| Press releases, earnings calls, named case studies | B | Vendor investor-relations pages, wire services, trade press |
| Job postings, list-price × usage inference | C | Careers pages, LinkedIn, vendor pricing pages |

Public-sector buyers are over-represented at Tier A — a university, transit authority, or utility that provably pays for scanning/inspection is a better dossier than a Fortune 500 company you can only infer about. Their unit prices are useful on their own too, if you're also working the incumbent-pricing bounty.

## The five motions — run breadth-first

Touch every motion shallowly across your whole vertical before drilling into any single hit. Spending your whole budget perfecting one dossier and reporting nothing else is a failed scan.

1. **Procurement sweep.** Keyword-search award databases and open checkbooks. An award record often gives you buyer + vendor + value + period of performance in one shot — a near-complete dossier. Once you find a good award, read its classification code (NAICS/PSC) off the record and re-search *by that code* to sweep the buyer's peers.
2. **Vendor-exhaust sweep.** List your vertical's incumbent vendors (seeds below), then mine what they publish: named-customer case studies, "X selects Y" press releases, earnings-call remarks about large deals or customer concentration. A case study rarely states a price outright — pair its scale indicators (sites, sq ft, claims/yr, projects/yr) with a sourced unit price to bound annual spend, and cite both.
3. **Buyer-side sweep.** For a promising named buyer: check their filings (vendor names, purchase obligations), their job postings (a "Reality Capture Program Manager" or "<vendor>-product administrator" req implies an active paid program), and their own procurement page if they're a public-sector entity.
4. **Corroboration drill.** A Tier-C finding needs 2+ independent sources (different origin, not two articles quoting the same release) before it's reportable at all. The cheapest upgrades: find the procurement record sitting behind a press release, or find the buyer named directly inside a vendor's own filing.
5. **Renewal recon.** Timing is a ranking lever. Federal/state awards carry a period-of-performance and completion date; a presolicitation or RFI on a procurement portal means a rebid window is open *now* — flag those. SaaS deals tend to renew on the anniversary of their announcement — note the announcement date.

## Where to look

**US federal:** FPDS ezsearch (fastest keyword → vendor/agency/amount/dates sweep; plain HTML, works with a simple fetch), USAspending.gov (richer detail once you have a vendor name or code to pivot on — it's a JS application, so use a browser tool rather than a simple fetch if the page comes back empty), SAM.gov Contract Opportunities (solicitations/presolicitations — this is where you catch a renewal window), GSA CALC+ (awarded hourly labor rates — useful for a pricing benchmark, not a dossier by itself).

**Code pivots:** NAICS 541370 (surveying & mapping, incl. laser scanning) and 541360 (geophysical) are reliable starting filters for the reality-capture and drone-survey verticals. Lead with keywords, then read the code off a good hit and re-search by that exact code — don't trust a code sweep alone to be exhaustive.

**Keyword set (rotate, don't dump in one query):** "laser scanning", "reality capture", "scan to BIM", "3D scanning services", "point cloud", "photogrammetry", "as-built survey", "drone inspection", "UAS inspection", "aerial survey", "digital twin".

**US state & local:** open-checkbook portals (actual payments, not just awards — search `"<state> checkbook" vendor payments`; searching an incumbent vendor's name in a checkbook surfaces their public-sector customer list *with amounts*), state eProcurement portals, utility regulator dockets (PUC/FERC — utilities justify inspection-program budgets to regulators in public rate-case filings; slow to search, high yield for the drone/utility vertical).

**School-board packets & GMP line items** — a proven, high-yield motion: school district board agendas (BoardDocs, eSchoolView-style file cabinets, state school-board portals) carry vendor agreements with not-to-exceed amounts, and GMP (guaranteed-maximum-price) construction amendments itemize documentation vendors as individual line items. Search `"in the amount of" <vendor>`, `"not to exceed" <vendor>`, `<vendor> GMP`. Individual line items run small ($20–80k/project) — aggregate across a district's or GC's project portfolio to get the program number.

**International:** TED (EU above-threshold tenders, award notices carry values), UK Contracts Finder + Find a Tender, CanadaBuys / open.canada.ca proactive disclosure (contracts over $10k as CSV), AusTender.

**Private sector:** SEC EDGAR full-text search (`sec.gov/edgar/search/`) — search an incumbent's name in customer filings, or look for a public incumbent's customer-concentration disclosure (>10% of revenue = a named buyer with a computable floor: disclosed % × segment revenue, Tier A on the floor value); CourtListener/RECAP for contract disputes that put values and SOWs into public exhibits; wire services and trade press for named deals.

**If a portal blocks or JS-shells your fetch:** don't keep retrying the same URL. Search on the exact record identifier instead (contract/award number, "in the amount of" + vendor name, attachment ID) so a search engine's index surfaces the primary content, or look for an indexed mirror. Mark anything sourced this way "snippet-verified — re-fetch before relying on it," and list the original URL as the outstanding verification step.

## Reading an award record into a dossier
1. **Value discipline:** distinguish ceiling vs. obligated-to-date on IDIQ/MSA-type vehicles. Report the obligated-to-date figure as the fact; the ceiling is context, not the transaction.
2. **Annualize:** divide a multi-year period-of-performance value into $/yr before comparing it against the ≥$1M/yr preference.
3. **Unit prices:** award attachments (fee schedules, pricing tables — usually PDF) carry the per-scan/per-sq-ft rates. Extract them; if you're also doing the incumbent-pricing bounty, they belong in that benchmark table.
4. **Timing:** completion date minus today = renewal runway. A presolicitation means the window is open now.
5. One good award almost always leads to more: sweep the buyer's other awards and the vendor's other buyers before you leave the portal.

## Per-vertical incumbent seeds (verify each one still operates/owns the product before citing)
- **Reality capture / scan-to-BIM:** GPRS/TruePoint, PrecisionPoint, Existing Conditions Surveys, US CAD/ARC, Langan; large AEC firms (AECOM, Jacobs) also sell it.
- **Construction progress documentation:** OpenSpace, DroneDeploy (absorbed StructionSite), Buildots, Reconstruct, Matterport.
- **Property inspection (insurance):** Mueller Services, EagleView, Verisk (public — filings!), Seek Now, HOVER, CoreLogic.
- **Real-estate capture:** Matterport's capture-services network, Zillow 3D Home ecosystem, regional photography/capture firms.
- **Facility/plant digital twin:** integrators (Accenture Industry X, Hexagon services arms, Bentley iTwin partners), regional scan-services firms.
- **Drone survey/photogrammetry:** Zeitview (ex-DroneBase), Cyberhawk, SkySpecs (wind), regional UAS service firms.
- **3D asset creation:** photogrammetry studios/asset houses (Clear Angle Studios, capture bureaus); marketplaces (TurboSquid, CGTrader) for price calibration only — expect this vertical to be Tier-C-only; say so and recommend corroboration targets rather than forcing a dossier.
- **Robotics/embodied-AI training data:** Scale AI, Surge AI, Encord, Applied Intuition, academic data-collection contractors.

For every seed above, note in your dossier *what the buyer's money currently buys* (crew-hours? scanner time? software seats?) — that's the undercut story a reader will look for.
