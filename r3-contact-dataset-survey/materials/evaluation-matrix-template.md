# Evaluation Matrix — Contact-Dataset Candidates

Fill in one row per candidate. Minimum 6 rows, including OpenTouch and a HOT3D-derived
candidate. Every cell should be traceable to a primary source — link it. See
`requirements-brief.md` for what each column means and the bar each has to clear.

| Dataset | License (verbatim quote + link) | Contact GT type | Hand-pose frame | Modality | Size (episodes/hours/subjects) | Effective usable N (scoreable contact events) | Blockers | Verdict (go / conditional / no-go) |
|---|---|---|---|---|---|---|---|---|
| OpenTouch |  |  |  |  |  |  |  |  |
| HOT3D (or HOT3D-derived proximity labels) |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |

## Column notes

- **License**: quote the exact clause that determines the verdict, not just the license name.
  Link to the live page/file, not a paper citation.
- **Contact GT type**: name the actual signal (e.g. "capacitive pressure sensor, per-frame
  reading" vs. "grasp-aperture threshold, kinematic proxy"). Be explicit if it's a proxy — that
  alone caps the verdict at "conditional" at best per the brief.
- **Hand-pose frame**: state whether poses ship in world coordinates already, or require a
  calibration step — and if the latter, whether that calibration is actually usable (released,
  documented, tested) or a dead end (unreleased matrices, passthrough converters).
- **Effective usable N**: not the raw episode or frame count — how many contact events actually
  have a clean, timestamped GT signal AND a recoverable world-frame hand pose AND usable video.
  Show your subtraction (e.g. "120 episodes total → 45 have world-frame poses → 31 have a
  timestamped press event, not just an aperture threshold").
- **Blockers**: anything short of a hard no-go that a re-run would need to solve (calibration
  work, missing subset, license re-confirmation, small scale).
- **Verdict**: go / conditional / no-go, driven by the four hard requirements — a dataset that
  fails even one requirement outright cannot be "go."

## Reasoning (required, one paragraph per row)

For each dataset above, write 2-4 sentences justifying the verdict — reference which
requirement(s) it clears or fails, and why. Put these under per-dataset headers below.

### OpenTouch

### HOT3D / HOT3D-derived

### [candidate 3]

### [candidate 4]

### [candidate 5]

### [candidate 6]

## Summary (3 paragraphs, required)

Answer directly: can the contact-detection research line reopen on any of these candidates?
If yes — which one(s), and what's the concrete next step? If no — what specifically is still
missing (which requirement, at what scale) that would need a new dataset release to close?
