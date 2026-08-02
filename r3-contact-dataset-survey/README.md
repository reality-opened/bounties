# Bounty R3 — Contact-Dataset Landscape Survey

**Track: Research & GTM · Access ring: 0 · Size: S (~2 days)**

## Context

Our contact-detection research line has run two pre-registered rounds on the public
datasets available to us, and both closed as honest negatives on the *detector*: touch-gating
built from reconstructed geometry plus grasp kinematics tops out at roughly a static-threshold
floor, and no learned variant tried so far clears the bar we set in advance. The write-up that
closed the line was specific about why: it isn't the modeling approach that's missing, it's the
data. Every dataset we've had access to ships one of two ways — either the hands aren't
registered into a coordinate frame we can use (so there's no way to compute an absolute
fingertip-to-surface distance), or "contact" in the labels is actually a kinematic/grasp-aperture
proxy rather than a measured touch event. The line only reopens if a dataset exists with **real
contact or pressure ground truth registered to a timestamp** *and* **hand poses recoverable to a
world frame**.

This bounty is a landscape survey, not new code. Go find out what's out there, verify licenses
from the primary source (the dataset's own license file or page — not a summary in someone
else's paper), and hand back a per-candidate go / conditional / no-go call with reasoning we can
act on without re-deriving it ourselves.

## The task

Produce a landscape survey of contact-rich hand/manipulation datasets that could reopen our
contact-detection line. For each candidate, verify directly from the dataset's own materials:

1. **Contact GT type** — is there real contact or pressure ground truth registered to a
   timestamp (not just a kinematic/grasp-aperture proxy standing in for "touch")?
2. **Hand-pose frame** — are hand or end-effector poses available in a frame that is (or can be)
   registered to world coordinates? "Camera-frame only, alignment flag false, calibration never
   released" is a disqualifying answer we've hit before — call it out explicitly if you find it.
3. **Modality** — is there egocentric or fixed RGB video alongside the ground truth?
4. **License** — verbatim text + link, classified per the table in
   `materials/requirements-brief.md`.
5. **Scale** — roughly how many usable contact events does the dataset offer? See the brief for
   the decision-grade bar.

You must evaluate two named candidates as part of your ≥6:
- **OpenTouch** — re-check its current license (it was noted as CC-BY 4.0; confirm that's still
  accurate on the live page).
- **A HOT3D-derived proximity-label dataset** — HOT3D itself and/or downstream work that derives
  contact/proximity labels from it.

Beyond those two, find at least **4 more** candidates (6 total minimum). Anything published
since is fair game, including datasets you find that we haven't heard of.

## What's in this repo

- `materials/requirements-brief.md` — the four hard requirements spelled out, the license-class
  table, and the scale bar, so "qualifying" has one definition everyone uses.
- `materials/evaluation-matrix-template.md` — the exact columns your filled-in matrix must use.

## Acceptance criteria

- `evaluation-matrix-template.md` filled in for **≥6 candidates**, including OpenTouch and a
  HOT3D-derived candidate.
- Every row carries a verdict — **go / conditional / no-go** — with 2-4 sentences of reasoning,
  not just a table cell.
- A **3-paragraph summary** answering directly: can the contact-detection line reopen on any of
  these, and if so which candidate(s) and why; if not, what's still missing that would need to
  exist.
- Every license claim links to the primary source (dataset page, `LICENSE` file, or ToS) — not a
  secondary citation.

## Getting started

1. Read `materials/requirements-brief.md` in full before starting — "qualifying" is stricter
   than "the dataset mentions touch."
2. Start with OpenTouch and HOT3D: read their actual license pages/files, not the arXiv abstract.
3. Fill in `materials/evaluation-matrix-template.md` as you go, not at the end.
4. When a license is ambiguous, quote the exact clause in your reasoning and mark it
   "conditional" rather than guessing — a reviewer can downgrade further if needed, but can't
   recover a claim you asserted without the quote.

## Ground rules
- These materials are private; don't redistribute them.
- The contributor IP agreement must be signed before your first PR.
- Honest numbers only: measured results or an explicit "validation in progress" — never an invented metric.
- If you find a client name or credential anywhere in this repo, stop and report it — that's a bug on our side, and worth credit.
