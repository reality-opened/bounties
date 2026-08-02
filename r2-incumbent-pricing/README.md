# Bounty R2 — Incumbent Pricing Benchmark Build-Out
**Track:** Research & GTM · **Access ring:** Ring 0 · **Size:** S (~1.5 days)

## Context
Open Reality's pitch to a new vertical rests on a specific claim: our reconstruction pipeline serves the same outcome at a fraction of the incumbent's price. That claim is only as credible as the incumbent price it's measured against, and most of our current incumbent-price assumptions are unsourced placeholders. This bounty replaces placeholders with a sourced, reproducible pricing table so every future dossier and memo can cite a real number instead of a guess.

## The task
Build out a sourced incumbent-pricing benchmark table for **2-3 verticals assigned to you at claim time**: what incumbents currently charge for scanning / mapping / inspection / digital-twin outcomes, per unit (per scan, per sq ft, per inspection, per listing, per flight-hour, etc.).

### Candidate verticals (2-3 assigned at claim)
1. Reality-capture / scan-to-BIM services
2. Construction progress documentation subscriptions
3. Property inspection services (insurance)
4. Real-estate capture at portfolio scale
5. Facility / plant digital-twin creation
6. Drone survey / photogrammetry contracts
7. Robotics / embodied-AI training data

## What's in this repo
```
r2-incumbent-pricing/
├── README.md                                      — this bounty spec
└── materials/
    ├── benchmark-row-format-and-sourcing-rules.md  — row format, confidence tags, append-only rules
    ├── starter-benchmarks.md                       — the table: header row + [example] rows to build on
    └── sourcing-cheatsheet.md                      — where sourced unit prices actually live
```

## Acceptance criteria
- [ ] ≥15 verified rows total across your assigned verticals, using `materials/starter-benchmarks.md`'s format exactly
- [ ] Every row has: service, unit, price, buyer context, source URL, access date, confidence tag — **zero unsourced numbers**
- [ ] Every row is reproducible: someone else must be able to open your URL and find the same number on it
- [ ] Ranges are captured as ranges (don't collapse them to a point estimate); note that spend-bounding elsewhere uses the low end
- [ ] The starter `[example]` rows stay in the file, untouched, so future contributors keep a format reference
- [ ] New rows are appended, never inserted over or edited into an old row

## Getting started
1. Read `materials/benchmark-row-format-and-sourcing-rules.md` in full.
2. Read `materials/sourcing-cheatsheet.md`.
3. Confirm your 2-3 assigned verticals with the bounty owner if they weren't stated at claim time.
4. Work the sourcing motions in yield order (procurement attachments first, vendor pricing pages next, and so on).
5. Append rows to `materials/starter-benchmarks.md` as you verify them — don't batch it all to the end; append-only, and never edit an old row.

## Ground rules
- These materials are private; don't redistribute them.
- The contributor IP agreement must be signed before your first PR.
- Honest numbers only: measured results or an explicit "validation in progress" — never an invented metric.
- If you find a client name or credential anywhere in this repo, stop and report it — that's a bug on our side, and worth credit.
