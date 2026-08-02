# Demand Research Instructions

## What you're doing, and why
Open Reality's product turns monocular RGB video into a structured 3D scene (metric-scale geometry, segmentation, object detection, grounded Q&A). We only expand into a new vertical when we can point to real transactions: named companies that already pay a real vendor a real amount of money for an outcome our pipeline could serve. Your job for this bounty is to find those transactions, for the one vertical assigned to you, and write them up as Transaction Dossiers using `dossier-template.md`.

You are **not** assessing whether Open Reality could technically serve the vertical, and you are **not** estimating a market size (TAM). You are finding money that already moves — a specific company, a specific vendor, a specific dollar figure, a working source link.

## Domain fit — check this BEFORE you spend time on a lead
Before you go deep on any transaction, run it through these three checks. If it fails any one of them, it doesn't belong in a dossier — log it as a one-line counter-example (which gate failed) and move to the next lead:

1. **Reduces to video-in, 3D-out?** Does the spend plausibly reduce to: someone captures RGB video of a physical scene → the buyer receives structured 3D output (geometry, measurements-with-tolerance, semantic labels, a visual twin, a scene report)?
2. **Tolerant of scale-normalized, per-scan geometry?** Can the buyer live with reconstruction that isn't survey-grade absolute accuracy, and isn't fused across multiple scans into one campus-scale model? (Contracts with an explicit survey-grade accuracy clause, or deliverables that are necessarily one fused multi-scan model, fail this.)
3. **Ordinary compliance?** Is this within normal SaaS-plus-SOC-2 territory — i.e. **not** FedRAMP, PHI, PCI, or other regulated-data territory?

**Do not build a dossier for:** general data storage/management/ETL spend, survey-grade contracts with contractual absolute-accuracy clauses, LiDAR-primary workflows that don't accept RGB video, campus-scale fused-model deliverables, or regulated medical/government data. If you hit a big, tempting number that fails one of these checks, write down which gate it failed — that's still useful signal — and move on. A big number that's out of domain doesn't get a dossier; it gets a one-line archive note.

## Your assigned vertical
One of the following is assigned to you when you claim this bounty (see the README):

1. Reality-capture / scan-to-BIM services (bought by construction GCs, owners, engineering firms — currently laser-scanning vendors billing per scan/sq ft/project)
2. Construction progress documentation subscriptions (recurring photo/video-documentation SaaS bought by general contractors and owners' reps)
3. Property inspection services bought by insurance carriers (per-claim or per-underwriting inspection programs)
4. Real-estate capture at portfolio scale (brokerages/property managers paying per-listing or per-building capture fees)
5. Facility/plant digital-twin creation (owners paying integrators for as-built visual twins — not simulation-grade)
6. Drone survey/photogrammetry contracts (utilities, rail, mining, infrastructure inspection)
7. 3D asset creation for media/games/AR-VR (studios paying scanning/asset houses per asset or per environment)
8. Robotics/embodied-AI training data (real-world scene/demonstration data bought by robotics labs, AV programs, defense)

Stay inside your assigned vertical. A cross-vertical lead you stumble on is a welcome footnote, but it doesn't count toward your five.

## What to prefer (rank higher, all else equal)
- Recurring spend **≥ $1M/yr** — per-scan or per-project contracts add up; find the annual program number, not just one line item.
- A renewal or rebid window inside 18 months.
- Spend whose cost driver is human labor or specialized hardware (laser scanners, survey crews, manual inspection) — that's the structural gap a low-cost, GPU-based reconstruction pipeline can undercut sharply.
- Buyers who already produce the video as exhaust — site walkthroughs, drone footage, inspection recordings shot for another reason anyway — because for them capture cost is already close to zero.

## Two fully worked examples (illustrative only — not real leads to reuse)

**In-domain:** A national insurance carrier pays inspection vendors for property inspections; most of that spend is the visual-documentation slice, and the carrier's adjusters already shoot walkthrough video as part of the job (capture ≈ free). A pipeline that reconstructs, measures, and reports from that video serves the same outcome far more cheaply than the incumbent's crew-based model. This is what a strong dossier looks like: named buyer, video that already exists, an incumbent whose cost driver is people.

**Out-of-domain (cautionary):** IBM pays roughly $50M/yr for data storage and management services. This fails domain-fit check 1 — the workload is not video-in/3D-out, full stop. However large the number, it gets archived at the domain gate before an hour is spent on it. Big dollar figures don't survive contact with the domain gate, and that's the gate working as intended, not a shortcoming of the number.

## Evidence tiers
See `evidence-tier-rubric.md`. Only Tier A and Tier B evidence count toward your five required dossiers. Tier C is a lead to corroborate up, never a finished dossier on its own.

## Output format
See `dossier-template.md`. One filled template per transaction. Use `search-motions-cheatsheet.md` to find them.

## Rules
- Every number in a dossier traces to a source you actually opened — cite the page you fetched, never a search-result snippet.
- No TAM figures, no "companies like X typically spend...", no unnamed buyers. No name, no transaction, no dossier.
- `domain_fit` and `capture_path` are mandatory fields. Fill them in while the evidence is in front of you — reconstructing them from memory later is how dossiers get rejected.
- Five dossiers is the floor this bounty needs, not a target to pad past uselessly. A sixth weak one doesn't help; a fifth strong one does.
- If, after working all five search motions in the cheat-sheet, your assigned vertical genuinely yields nothing at Tier A/B, that is a valid (if unwelcome) finding — write it up as a negative result with the scope you searched, and flag it to the bounty owner rather than stretching a Tier-C lead into a dossier it can't support.
