# Bounty R4 — Public-Dataset Scale-Up Scouting

**Track: Research & GTM · Access ring: 0 · Size: M (~3 days)**

## Context

Our completed reconstruction-benchmark studies run on public research datasets, but the episode
counts are small — our studies to date have scored anywhere from 5 to 44 episodes per round. That's
enough to reach a pre-registered verdict, but not enough to know how well a result generalizes
across scenes, tasks, and capture conditions. We want to know what's out there — cleanly
licensed, real, and big enough to matter — to extend three specific study families we already
run. This is a scouting exercise: no new code, no new experiments, just a rigorously
license-verified shortlist we can hand to a researcher who picks it up next.

The three families:

**(a) Manipulation episodes with encoder/pose ground truth.** Robot-arm (or similar) capture
where the "true" end-effector or object trajectory comes from something vision-independent —
joint encoders + forward kinematics, or a calibrated external tracking rig — not from the
reconstruction method being tested. We use these to score position accuracy and trajectory
smoothness against a method-independent truth.

**(b) Egocentric reconstruction with any metric reference.** Head/chest/hand-worn camera video
where *some* real-world scale anchor exists — mocap, a calibrated capture rig, a metric depth
sensor, laser-scan registration, anything that lets us convert reconstructed geometry into real
metres and check it against something. Doesn't need to be about contact or manipulation
specifically — general egocentric-with-metric-reference datasets count.

**(c) Indoor trajectory benchmarks beyond TUM RGB-D and Microsoft 7-Scenes.** We already use
both of these. TUM RGB-D is clean (CC-BY 4.0) and stays in active use. **7-Scenes is off the
table for anything scored or published** — its license (Microsoft Research license, non-commercial
only, terminates on commercial use) excludes it from any for-profit product decision, scored
result, or public claim; treat it as internal-diagnostic-at-most, if that. We want datasets that
give genuinely different real trajectories through the same space (a reconstruction-input pass
plus a separate held-out evaluation pass), with a derivable metric reference, under a license we
can actually build a product claim on.

## The task

Build a ranked shortlist of **≥10 candidate datasets** spanning all three families (roughly a
handful in each — a single dataset can count toward more than one family if it genuinely fits,
but don't force it). For each candidate:

1. Verify the license from the **actual license text** — the dataset's own `LICENSE` file, ToS
   page, or license statement on the dataset's official page. A paper's one-line mention of
   "released under an open license" is not a citation; the underlying document is.
2. Classify it against the license-class table in `materials/requirements-brief.md`.
3. Work out an **effective-N** — not the advertised episode/scan/frame count, but how many of
   those actually clear the requirements for the study family you're proposing it for, once you
   subtract things like: missing calibration/extrinsics, license-gray subsets, degenerate/short
   sequences, modality gaps (no matching metric reference), and known data-quality issues called
   out in the dataset's own documentation.
4. Estimate integration friction: is there existing tooling for this dataset in our stack, or
   would someone have to write a new downloader/normalizer from scratch? Is the raw download
   size manageable? Are format conversions (frames → video, coordinate conventions) needed?

## What's in this repo

- `materials/requirements-brief.md` — the three study families in more detail, plus a generic
  license-class table (rewritten from our internal dataset-sourcing notes, with the specifics
  stripped out — the classes themselves are what to reuse here).
- `materials/shortlist-template.md` — the exact ranked-table columns your shortlist must use.

## Acceptance criteria

- **≥10 candidates total**, spanning all three families (families can overlap for a single
  dataset, but each family needs meaningful coverage — not 9 candidates in one family and 1 each
  in the other two).
- Each candidate's license is **verified from the actual license text**, linked.
- **Effective-N is argued, not asserted** — show the subtraction from raw count to usable count,
  with the reasoning for each exclusion.
- A **top-3 recommendation** at the end: which three candidates should get picked up first, and
  why (weigh license clarity, effective-N, and integration friction together — the "biggest"
  dataset is not automatically the best recommendation).

## Getting started

1. Read `materials/requirements-brief.md` fully — it defines what each study family actually
   needs, which shapes what "qualifies" for effective-N.
2. Work family by family; it's easier to compare candidates within a family than to jump around.
3. Fill in `materials/shortlist-template.md` incrementally.
4. When a license is ambiguous (e.g., silent on whether published benchmark results count as
   "redistribution"), say so explicitly and mark it conditional rather than assuming the
   generous reading.

## Ground rules
- These materials are private; don't redistribute them.
- The contributor IP agreement must be signed before your first PR.
- Honest numbers only: measured results or an explicit "validation in progress" — never an invented metric.
- If you find a client name or credential anywhere in this repo, stop and report it — that's a bug on our side, and worth credit.
