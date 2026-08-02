# Requirements Brief — What a Qualifying Contact Dataset Must Have

## Why this bar, and why now

Our contact-detection research has gone through two rounds of pre-registered testing on the
datasets we could get our hands on. Both rounds closed honestly: the detector isn't the
bottleneck, the *ground truth* is. Specifically, every dataset used so far had one of two gaps —
hands that aren't registered into any frame we can turn into an absolute distance, or a "contact"
label that's actually derived from grasp kinematics (aperture closing, a calibrated pinch
threshold) rather than a measured touch/pressure event. A dataset is only worth building on if it
closes both gaps at once. This brief defines the bar precisely so the survey produces a
consistent, defensible answer per candidate.

## The four hard requirements

1. **Real contact/pressure ground truth, registered to time.** A pressure sensor, a force
   sensor, or an equivalent physical touch signal, with a timestamp we can line up against video
   frames. A kinematic proxy (e.g., "contact = grasp aperture below threshold X") does **not**
   satisfy this — it's a useful secondary signal, not ground truth, and conflating the two is
   exactly the mistake we're trying not to repeat.
2. **Hand or end-effector poses recoverable to a world frame.** Camera-frame-only tracks are not
   enough by themselves — we need either poses already in world coordinates, or a documented,
   working calibration path from camera-frame to world (not a converter that's a pure passthrough,
   not a per-session calibration matrix that was never released). If a dataset flags something
   like "aligned_to_world: false" with no way to recover the transform, treat that as a hard
   blocker and say so.
3. **Egocentric or fixed RGB video** alongside the ground truth above — the reconstruction input.
4. **An acceptable license** — see the table below.

## License-class table

| Class | Examples | Verdict | What it allows |
|---|---|---|---|
| **Acceptable** | CC-BY (any version), Apache-2.0, MIT | **Go** on licensing | Commercial use, public benchmark claims, redistribution of derived numbers/figures with attribution |
| **Conditional** | CC-BY-NC | **Conditional** | Internal evaluation and internal decision-making only — no public numbers, no product use, no redistribution of the data or derived assets |
| **Unacceptable** | Research-only / academic-only ToS, no-derivatives clauses, employer-binding agreements ("if researcher is employed by a for-profit entity, that employer is also bound") | **No-go** | Excluded entirely — don't spend evaluation budget beyond confirming the exclusion |

Always quote the license clause verbatim in the matrix, with a link to the primary source (the
dataset's own license page/file, not a paper's one-line mention). Licenses get updated; re-check
the live page even for datasets you've seen referenced before.

## Scale bar

**≥50 usable contact events** across a candidate's episodes to count as decision-grade for a
re-run. Our last two rounds on this line scored on 19-44 episodes total (single contact event
per episode in most cases) — a candidate needs to clear roughly 50 clean, scoreable contact
events (not just 50 episodes; exclude anything with an unusable or missing timestamp alignment)
to be worth the cost of re-opening the line. Datasets with fewer are still worth recording (mark
them "conditional" or "no-go: scale" with your count), just flag clearly that scale is the
blocker.

## Mandatory candidates

- **OpenTouch** — previously noted as CC-BY 4.0. Re-verify against the live license page/repo;
  license terms can change between when we last looked and now.
- **A HOT3D-derived proximity-label dataset** — check both HOT3D itself (does it ship any
  pressure/contact signal natively, or is it pose/gaze-only?) and any downstream work that
  derives proximity or contact labels from HOT3D's hand-pose tracks.

Beyond these two, add at least 4 more candidates. Newer is better — the field moves fast, and a
dataset released in the last few months that we haven't looked at yet is exactly the kind of find
this survey exists to catch.
