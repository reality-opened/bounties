# Method note — how the single-pair metric anchor works, and what we measured

This note distills the relevant background from an internal experiment report
(referred to here as "the characterization study") so you can start the bounty
without access to that report. The frozen data you need — `data/exp30_results.json`
— is a standalone artifact; you do not need anything else.

## 1. How the current estimator works

Our SLAM pipeline reconstructs a scene as a chain of **submaps** (chunks of the
trajectory stitched together). Submap poses come out of the reconstruction in
an arbitrary, unitless scale — "model units," not metres. To turn model units
into real-world metres, the product has one mechanism: a **single-pair metric
anchor**.

The operator (or an automated stand-in, for evaluation) clicks two pixels in
one image — conventionally in the *first* submap — that correspond to two 3D
points whose real-world separation is known (a doorway width, a marker of
known size, etc.). The pipeline:

1. **Unprojects** each clicked pixel to a camera-frame 3D point using the
   depth map and camera intrinsics at that pixel (`unproject`: depth ×
   `[fx, fy, cx, cy]` → `(X, Y, Z)`).
2. Computes the **model-space distance** between the two unprojected points.
3. Divides the operator's **known real-world distance** by that model-space
   distance to get **one scalar scale factor** (metres per model-unit).
4. Applies that **single global scale factor** to every submap in the entire
   map — the anchor submap and every submap downstream of it, however far
   away in the trajectory.

This is the whole mechanism. It is cheap, requires exactly one operator
interaction, and (per its own internal validation) the *click + depth-lift
math itself* is very precise — the "click noise floor," i.e. how much the
recovered scale wobbles if you jitter the clicked pixel by ±1px, is
consistently small (0.29–1.39% across every scene tested; see `click_noise_floor_pct`
in the data).

## 2. What the characterization study measured

The open question was: does a scale factor computed from *one pixel pair in
one submap* stay accurate when applied to the *whole* multi-submap map — and
does its error grow specifically because of (a) operator click noise, (b)
scale drift accumulating across submap-to-submap junctions, or (c) something
else?

The study ran the identical anchor-and-apply procedure (synthesized clicks,
±1px jitter, n≥1000 draws per scene) against 8 scenes spanning 5 capture
classes, each with independent ground truth (mocap, VIO, or laser), and
measured, per scene:

- **`E_anchor`** — realized scale error at the anchor submap itself.
- **`E_far`** — realized scale error at the submaps farthest (by junction-hop
  count) from the anchor.
- **`drift`** = `E_far − E_anchor` (are far submaps worse than the anchor?).
- **`click_noise_floor_pct`** — the jitter-only error floor (isolates operator
  precision from everything else).
- **`local_depth_bias_pct`** ≈ `E_anchor − click_noise_floor_pct` (isolates
  whatever *isn't* explained by click noise).

### The finding

The click-noise floor is real and small everywhere (0.29–1.39%) — that part of
the original "sub-1%" claim replicates exactly. But **realized anchor-submap
accuracy is scene-class-conditional, not a universal sub-1% or sub-2% number**:

| scene class | scenes | E_anchor range | mechanism |
|---|---|---|---|
| TUM-eval (clean single-pass, mocap GT) | 3 scenes | 0.77–1.91% | at the click-noise floor |
| OpenLORIS-robot (short robot pass, mocap GT) | 1 scene | 1.41% | at the click-noise floor |
| EXP-25-product-config (same TUM sequence, product recipe) | 1 scene | 5.15% | local depth-model bias |
| ARKit-sparse (handheld, VIO GT) | 2 scenes | 16.4–21.7% | local depth-model bias dominates |
| OpenLORIS-home-tour (multi-room tour, laser GT) | 1 scene | 18.97% | local depth-model bias dominates |

Full per-scene numbers, including `E_far`, `drift_pct`, and both error
components, are in `data/exp30_results.json` (`per_scene[]`).

**The dominant failure mode is *not* cross-submap drift.** The study also
tested whether error grows the farther a submap is from the anchor (more
submap-to-submap junctions accumulating error). In 3 of the 4 scenes with
enough submaps to test this, the far submaps had *lower* error than the
anchor submap itself (negative drift) — the opposite of what a
drift-accumulation story predicts. The one scene with positive drift still
fell short of a "drift dominates" bar.

Instead, the gap between the clean classes (~1%) and the bad classes
(16–22%) tracks almost entirely with `local_depth_bias_pct` — a bias in the
depth model's output that is **local to the specific pixels the operator
happened to click**, not a property of distance-from-anchor or of the whole
trajectory. Two scenes of the *same* underlying sequence (`s1_tum_fr1`, a TUM
scene reconstructed with a different product config than `fr1_room`/`fr2_desk`/
`fr3_long_office_household`) land in different accuracy bands — config and
capture conditions are the real covariate, not "TUM vs. not-TUM."

## 3. The named remedy: multi-pair averaging across different depths/views

Because the error is a **local depth-model bias at one clicked location**,
re-clicking more carefully (reducing operator jitter) does not fix it — the
click-noise floor is already tiny. The mechanism that *would* fix it is
averaging over **multiple pairs that sample different depths and different
views/submaps**, so that any one pair's local depth bias is diluted by
others that have *different* local biases (not correlated with each other).
A single very-precise click at one bad location is still one bad location;
several clicks at different locations should regress toward the true scale
if the biases aren't all pulling the same direction.

This is exactly the estimator this bounty asks you to design and evaluate:
given the frozen per-scene statistics in `data/exp30_results.json` (click
floor, local-depth-bias magnitude, submap counts, scene class), simulate what
a multi-pair averaging estimator would have measured instead of the current
single-pair one, and report whether/how much it helps, per class, with error
bars — plus a concrete recommendation for how many pairs to require and how
to pick them (e.g., forced spread across submaps vs. free choice).
