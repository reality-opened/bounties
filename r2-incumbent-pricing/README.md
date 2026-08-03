# Bounty R2 — Incumbent Pricing Benchmark Build-Out
**Track:** Research & GTM · **Access ring:** Ring 0 · **Size:** S (~1.5–2 days)

## Context
Open Reality's pitch to a new vertical rests on a specific claim: our reconstruction pipeline serves the same outcome at a fraction of the incumbent's price. That claim is only as credible as the incumbent price it's measured against, and most of our current incumbent-price assumptions are unsourced placeholders. This bounty replaces placeholders with a sourced, reproducible pricing table so every future dossier and memo can cite a real number instead of a guess.

## The task
Build out a sourced incumbent-pricing benchmark table for **2-3 verticals assigned to you at claim time**: what incumbents currently charge for scanning / mapping / inspection / digital-twin / 3D-content / training-data outcomes, per unit (per scan, per sq ft, per inspection, per listing, per flight-hour, per asset, per hour of demonstration data, etc.).

### Your assigned verticals — physical AI

The three routes a physical-AI team can take today to get a usable 3D environment or robot training data. Together they answer one question: **what does it currently cost to put a robot in a realistic environment?** Each is a different answer to that question, so price them as alternatives to each other, not as three unrelated markets.

1. **Sim-ready 3D scene & asset supply** — *buy a pre-made environment.* Marketplace listings for whole scenes/environments (not single props; watch for `SimReady` / `USD` tagging), plus what it costs to commission a studio or freelancer to build one to spec.
2. **Reality-capture / laser-scanning services** — *capture a real environment.* Terrestrial laser scanning, reality capture, scan-to-BIM. This is the incumbent method our phone-video pipeline directly replaces, so it's the cost baseline our undercut claim is measured against.
3. **Robotics / embodied-AI training data** — *skip the environment and buy the demonstrations.* Teleoperation demonstration data (usually per hour), data annotation/labeling, synthetic data platforms.

Expect these three to behave very differently: #1 is publicly listed and easy, #2 lives in procurement records, #3 is mostly "contact sales" — so a thin row count on #3 with a well-documented explanation is a better result than padded rows. Say so in your summary rather than forcing it.

Optional stretch if a vertical runs dry: **defense / training-simulation procurement** — contract values for synthetic training environments are fully public (see the cheat-sheet), and it's the same buyer question at government scale.

<details>
<summary>Full candidate list this bounty draws from (context only — don't work these unless reassigned)</summary>

Construction progress documentation subscriptions · Property inspection services (insurance) · Real-estate capture at portfolio scale · Facility / plant digital-twin creation · Drone survey / photogrammetry contracts

</details>

## What's in this repo
```
r2-incumbent-pricing/
├── README.md                                      — this bounty spec
├── r2-intern-onboarding-zh.md                     — 中文上手指南 (same task, more context + a learning path)
└── materials/
    ├── benchmark-row-format-and-sourcing-rules.md  — SOURCE OF TRUTH: row format, confidence tags, append-only rules
    ├── starter-benchmarks.md                       — the table: header row + [example] rows to build on
    ├── sourcing-cheatsheet.md                      — where sourced unit prices actually live
    └── findings-summary-template.md                — template for the write-up that ships with your final PR
```

The Chinese onboarding guide covers the same task with more background and a suggested working
rhythm. Read whichever you prefer — but `benchmark-row-format-and-sourcing-rules.md` is the source
of truth for the row format and confidence tags. If the two ever disagree, that file wins, and
please flag it to the bounty owner.

## Acceptance criteria
- [ ] ≥15 rows total across your assigned verticals, using `materials/starter-benchmarks.md`'s column order exactly
- [ ] Every row has: vertical, company, service, unit, price, buyer context, source URL, access date, confidence tag, notes — **zero unsourced numbers**
- [ ] Every row carries an archive.org snapshot link in its notes column
- [ ] Every row is reproducible: someone else must be able to open your URL (or snapshot) and find the same number on it
- [ ] Every `[inferred]` row shows its full arithmetic and input sources in notes; every `[reported]` row says who reported it and where
- [ ] "Starting at" prices are flagged as floors in notes, never recorded as the price
- [ ] Ranges are captured as ranges (don't collapse them to a point estimate); note that spend-bounding elsewhere uses the low end
- [ ] The starter `[example]` rows stay in the file, untouched, so future contributors keep a format reference
- [ ] New rows are appended, never inserted over or edited into an old row
- [ ] A filled-in `materials/findings-summary.md` (from the template) ships in the final PR, including the vendors you could **not** price and what would unblock them

## Getting started
1. Read `materials/benchmark-row-format-and-sourcing-rules.md` in full. It defines the ten columns and the four confidence tags (`[verified]` / `[reported]` / `[inferred]` / `[example]`) — everything else depends on getting these right.
2. Read `materials/sourcing-cheatsheet.md`, and skim the section for the source types your verticals actually live in.
3. **Calibration checkpoint:** source your first **5 rows**, then send them to the bounty owner before going further. This catches a misread of the format or the confidence tags after half a day instead of after two days.
4. Work the sourcing motions in yield order for your verticals — marketplace listings first for vertical 1, procurement attachments first for vertical 2, buyer self-reports for vertical 3.
5. Append rows to `materials/starter-benchmarks.md` as you verify them — don't batch it all to the end; append-only, and never edit an old row. Snapshot each source page to archive.org as you go.
6. Fill in `materials/findings-summary.md` from the template and open your PR.

**If you're stuck on the same thing for more than 30 minutes, ask.** A daily one-line progress note is all the reporting we want; no formal status reports.

## Ground rules
- These materials are private; don't redistribute them.
- The contributor IP agreement must be signed before your first PR.
- Honest numbers only: measured results or an explicit "validation in progress" — never an invented metric. If you're unsure about a number, tag it honestly and say why in notes — honest beats tidy.
- If you find a client name or credential anywhere in this repo, stop and report it — that's a bug on our side, and worth credit.
