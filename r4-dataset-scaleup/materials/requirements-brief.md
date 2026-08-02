# Requirements Brief — Scaling Up Our Study Families

## Why this matters

Our reconstruction-benchmark work reaches pre-registered verdicts on small, carefully-chosen
episode sets (single-digit to low-double-digit counts per round). That's the right way to get a
first honest answer cheaply, but it leaves open how well a result holds up across more scenes,
tasks, capture rigs, and degradation conditions. Before anyone commits research time to a bigger
round, we want a vetted list of *actually usable* datasets — meaning license-clear enough to
build a product claim on, and big enough (after realistic exclusions) to be worth the compute.

## The three study families

### (a) Manipulation episodes with encoder/pose ground truth

What we need: robot-arm (or comparable) manipulation capture where the "true" trajectory is
**vision-independent** — derived from joint encoders + forward kinematics, or a separately
calibrated external tracker — not from any vision-based reconstruction method. We use this
ground truth to score position accuracy and trajectory smoothness of a reconstruction method
against something that isn't circular.

What tends to reduce effective N: cameras that ship without extrinsics (self-calibration adds a
verification step and a weaker-GT caveat, but isn't disqualifying — flag it, don't exclude it
outright); episodes where the ground-truth-bearing frame is occluded past usability; a
proxy-effector confound (e.g., the true end-effector is out of frame and only a held object is
trackable) — usable, but must be flagged, since it changes what a "position error" number means.
Fixed third-person camera cells and moving-camera cells behave very differently for
reconstruction methods — note which each candidate offers.

### (b) Egocentric reconstruction with any metric reference

What we need: head-, chest-, or hand-worn camera video with *some* independently-sourced scale
anchor — external mocap, a calibrated capture rig, a metric depth stream, laser-scan-registered
poses, anything that lets a real-metres number be checked against ground truth. This family is
broader than manipulation/contact specifically — general egocentric-with-metric-reference
datasets qualify, since the reconstruction-accuracy question ("does monocular egocentric SLAM hit
real-world scale") is useful on its own.

What tends to reduce effective N: hand or camera streams that are *not* actually registered into
the metric reference's frame (a dataset can ship a metric mocap track and an unregistered RGB
stream side by side — check the alignment flag/documentation, don't assume "the dataset has
mocap" means "this stream is registered to it"); short clips with too little real motion to
score trajectory accuracy meaningfully; single-scene/single-task capture (fine for a first pass,
but reduces how much a positive result generalizes — note diversity, don't just count episodes).

### (c) Indoor trajectory benchmarks beyond TUM RGB-D and 7-Scenes

What we need: datasets giving **two separate real traversals of the same indoor scene** — one
usable as a reconstruction-input sweep, a second, genuinely different real trajectory through the
same space usable as a held-out evaluation pass — with a metric reference (metric GT trajectory,
or metric depth + intrinsics good enough to derive a point-pair distance), and enough visual
clutter/object richness to be a meaningful test (not an empty hallway).

TUM RGB-D (CC-BY 4.0) already clears this and stays in active use — it's the calibration point
for "what a good license and a good same-scene-multi-pass structure looks like," not a candidate
to re-propose. **7-Scenes is excluded from anything scored or published** (Microsoft Research
license: non-commercial only, terminates on commercial use) — it can be noted as
internal-diagnostic-only if it comes up, but do not shortlist it as a scoring candidate.

What tends to reduce effective N: scene content that changes between the two passes (furniture
moved, objects added/removed) — for a held-out eval pass we want a *different trajectory*, not a
*different scene*, so a same-day, minimal-change pairing beats a pairing recorded months apart
even if both are nominally "the same room"; low-texture/low-clutter spaces that fail an
object-richness floor regardless of license; per-frame capture height mismatches between the
two passes if the study cares about capture-rig realism (note it, doesn't have to disqualify).

## License-class table (generic)

| Class | What it looks like | Verdict | What it allows |
|---|---|---|---|
| **Fully open** | CC-BY (any version), Apache-2.0, MIT, BSD | Go | Commercial use, public benchmark claims, redistribution of derived results/figures with attribution |
| **Conditional-commercial** | Custom license granting commercial use up to a scale threshold (e.g., a monthly-active-user cap), or silent on whether publishing derived benchmark results counts as "distribution" | Conditional — usually workable, confirm the specific clause | Internal use generally fine; public claims need the specific clause checked (and ideally a second read before anything ships) |
| **No-derivatives / metrics-only** | License permits any use including commercial, but explicitly bars redistributing derivative datasets (extracted frames, derived assets, embeds) | Conditional | Publishing *metrics/numbers* computed on the data is fine; publishing or shipping any *asset derived from the raw data* is not |
| **Non-commercial only** | "Research and educational purposes only," terminates on commercial use, or similar | No-go | Excluded from anything scored or product-facing; internal-diagnostic-at-most, and even that is gray for a for-profit evaluating toward a product decision |
| **Employer-binding / no-derivatives ToS** | Non-commercial use terms that explicitly bind the researcher's employer, or bar derivative works entirely | No-go | Hard exclude — don't spend evaluation time beyond confirming the exclusion |

Always link the primary source (the dataset's own license file/page) and quote the deciding
clause verbatim in your shortlist — don't rely on a paper's characterization of its own license,
since license text is sometimes updated after publication.

## What "effective N" means here

Never report a dataset's advertised size (total scans, total hours, total episodes) as its
usable size. For each candidate, show the actual subtraction: start from the raw count, then
subtract for each disqualifying or degrading factor relevant to the family it's proposed for
(missing calibration, license-gray subsets, short/degenerate sequences, scene-state drift between
passes, modality gaps). The remaining number — with the reasoning that got you there — is the
effective N. A dataset with a huge raw count and a small, hard-won effective N is a legitimate,
useful shortlist entry; the point is that the number in the table has to be defensible, not
impressive.
