# Bounty R1 — Vertical Demand-Research Dossiers
**Track:** Research & GTM · **Access ring:** Ring 0 · **Size:** M (~5 days)

## Context
Open Reality's product turns monocular RGB video into a structured 3D scene. We only open a new vertical when we can point at a real transaction — a named company that already pays a real vendor real money for an outcome our pipeline could serve — never a market-size guess. This bounty produces that ground-truth evidence for one vertical at a time, feeding the internal gate that decides which vertical gets pitched next.

## The task
For **one vertical assigned to you at claim time** (list below), find named buyers with invoice-level evidence that they already pay for an outcome a 3D scanning/reconstruction pipeline could serve, and write up **at least 5 Transaction Dossiers**.

### Candidate verticals (one assigned at claim)
1. Reality-capture / scan-to-BIM services (construction GCs, owners, engineering firms)
2. Construction progress documentation subscriptions
3. Property inspection services bought by insurance carriers
4. Real-estate capture at portfolio scale (brokerages, property managers)
5. Facility / plant digital-twin creation
6. Drone survey / photogrammetry contracts (utilities, rail, mining, infrastructure)
7. 3D asset creation for media / games / AR-VR
8. Robotics / embodied-AI training data

## What's in this repo
```
r1-demand-dossiers/
├── README.md                          — this bounty spec
└── materials/
    ├── research-instructions.md       — the research method: domain-fit gate, evidence rules, worked examples
    ├── evidence-tier-rubric.md        — Tier A/B/C definitions; only A/B count toward your 5
    ├── dossier-template.md            — the exact fields every dossier must have
    └── search-motions-cheatsheet.md   — where the money leaves paper trails: portals, motions, per-vertical seeds
```

## Acceptance criteria
- [ ] ≥5 Transaction Dossiers for your assigned vertical, each filled out per `materials/dossier-template.md`
- [ ] Every dossier's `evidence_tier` is **A or B** (Tier-C findings don't count toward the 5 — report them separately as leads)
- [ ] Every dossier names a real buyer (a specific company or agency — never "companies like X")
- [ ] Every dossier states a price: a cited `annual_value_usd` figure, or a clearly bounded range with the bounding arithmetic shown in `sources`
- [ ] Every source is a working link to the page you actually opened (never a search snippet), with a one-line description of what it shows
- [ ] `domain_fit` and `capture_path` are filled in for every dossier — these are mandatory and a dossier without them bounces
- [ ] A 1-page synthesis memo ranking your ≥5 transactions by fit (recurring $ size, renewal timing, capture-exhaust strength, undercut-story clarity), with a one-line rationale per rank

## Getting started
1. Read `materials/research-instructions.md` in full before you start searching.
2. Confirm your assigned vertical with the bounty owner if it wasn't stated at claim time.
3. Read `materials/evidence-tier-rubric.md` and `materials/search-motions-cheatsheet.md`.
4. Run the five search motions breadth-first across your whole vertical before drilling into any one promising hit.
5. Fill `materials/dossier-template.md` per finding as you go — don't let one lead eat your whole budget.
6. Write the 1-page synthesis last, once you have ≥5 qualifying dossiers.

## Ground rules
- These materials are private; don't redistribute them.
- The contributor IP agreement must be signed before your first PR.
- Honest numbers only: measured results or an explicit "validation in progress" — never an invented metric.
- If you find a client name or credential anywhere in this repo, stop and report it — that's a bug on our side, and worth credit.
