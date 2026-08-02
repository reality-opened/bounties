# EXP-32 DRAFT REPORT — video-depth stress test of the coherence claim (GemDepth)

**Status: DRAFT — pooled results from the 44-episode scored batch, PREREG.md v1.0 locked
2026-07-17 (unedited). This file is the analysis output; PREREG.md remains the
pre-registration of record.**

## 0. What this is

PREREG.md §0: stress-tests OpenReality's temporal-coherence claim (EXP-21/22/26: A's
fingertip jerk beats single-frame mono-depth, 3–37×) against GemDepth
(arXiv:2605.10525, MIT), a temporally-consistent VIDEO-depth model — the strongest
honest baseline of the same recipe class. Design: minimal-delta vs EXP-26 (Arm B
swapped for GemDepth; alignment/detectors/reference byte-identical; Arm A frozen).

Output-semantics determination (locked before any scored episode ran, per
`modal_exp32_depthgem.py`'s module docstring): GemDepth's raw output is
**RELATIVE/AFFINE-INVARIANT inverse depth**, not metric — confirmed from the repo's
own source (`compute_scale_and_shift` per-window disparity stitching,
`frame_to_world_points`'s explicit `depth=1/inverse_depth` inversion). Per PREREG §0,
the geometry-only Brs rescale is therefore **PRIMARY** for any B-gem absolute-distance
(d-based) number; the standard (raw) B arm remains PRIMARY for the H1 jerk gate (a
shape/temporal-smoothness statistic, not an absolute-distance statistic).

## 1. H1 — coherence claim (GATES)

**Bar (PREREG §1, EXP-26 H3 bar unchanged):** A's fingertip jerk < B-gem's jerk in
≥70% of 44 episodes AND pooled Wilcoxon p<0.01. Statistic: D-int-a index-tip
(`jerk_index_mm`, detector "a"), same window-broken runs, Arm A vs the STANDARD
(unscaled) B-gem arm — matching PREREG's literal text and EXP-26's own H3 precedent
(jerk is a shape statistic; Brs has no detector-"a" cell in either EXP-26's or
EXP-28's frozen schema — see `modal_exp32_score_et.py`'s "COORDINATOR JUDGMENT CALL"
comment).

| n | frac A-smoother | Wilcoxon p | median ratio (B-gem/A) | gate ≥70% | gate p<0.01 | **H1 PASS** |
|---|---|---|---|---|---|---|
| {{H1_N}} | {{H1_FRAC}} | {{H1_P}} | {{H1_RATIO}} | {{H1_GATE_FRAC}} | {{H1_GATE_P}} | **{{H1_PASS}}** |

Per-task A-win breakdown: {{H1_PER_TASK}}

**Brs sanity check (coordinator-requested, NOT gating):** ET detector "b" is the only
cell where both a B-gem and a Brs-gem jerk exist (HE's Brs is detector "reg",
MPS-native — trivially identical to B's own jerk since the D-reg track doesn't depend
on Arm B's depth at all, so it isn't computed). Checks whether
`jerk_Brs_b / jerk_B_b ≈ brs_rescale_factor` (jerk should scale linearly with the same
constant per-episode depth rescale applied to Brs).

{{H1_BRS_SANITY}}

## 2. H2 — absolute-geometry gap (DIAGNOSTIC, not gating)

**PREREG §1:** "B-gem's d(t₀) absolute error vs the frozen B-dav2 379mm raw/184mm
rescaled: does video depth close the 19× gap on A? Report the full A/B-dav2/B-gem
triple." Eligibility filter matches EXP-26's own H1 block (alignment not degenerate,
t0 eligible, primary-cell contrast eligible). HE uses D-reg (MPS-native, HE's primary
geometric detector); ET uses D-int-b (ET's primary geometric detector).

### HE (D-reg)

| n eligible | A (mm) | B-gem raw (mm) | B-gem Brs (mm) | B-dav2 raw (mm, frozen) | B-dav2 Brs (mm, frozen) |
|---|---|---|---|---|---|
| {{H2_HE_N}} | {{H2_HE_A}} | {{H2_HE_BGEM_RAW}} | {{H2_HE_BGEM_BRS}} | {{H2_HE_BDAV2_RAW}} | {{H2_HE_BDAV2_BRS}} |

Gap analysis: {{H2_HE_GAP}}

### ET (D-int-b)

| n eligible | A (mm) | B-gem raw (mm) | B-gem Brs (mm) | B-dav2 raw (mm, frozen) | B-dav2 Brs (mm, frozen) |
|---|---|---|---|---|---|
| {{H2_ET_N}} | {{H2_ET_A}} | {{H2_ET_BGEM_RAW}} | {{H2_ET_BGEM_BRS}} | {{H2_ET_BDAV2_RAW}} | {{H2_ET_BDAV2_BRS}} |

Gap analysis: {{H2_ET_GAP}}

Frozen PREREG-motivation reference (EXP-26 REPORT.md headline, HE D-reg, n=19): A =
20.3mm, B-dav2 raw = 379mm, B-dav2 rescaled = 184mm.

## 3. H3 — viability

**Bar (PREREG §1):** GemDepth produces usable rasters on ≥90% of attempted episodes.

| attempted | depth OK | depth frac | score OK | score frac | **H3 PASS** |
|---|---|---|---|---|---|
| {{H3_N}} | {{H3_DEPTH_OK}} | {{H3_DEPTH_FRAC}} | {{H3_SCORE_OK}} | {{H3_SCORE_FRAC}} | **{{H3_PASS}}** |

Depth-generation failures (if any): {{H3_FAILURES}}

## 4. Verdict

Per PREREG §1: **CLAIM-SURVIVES** = H1 PASS → coherence pitch line upgrades to
"…including against temporally-consistent video-depth baselines." **CLAIM-BOUNDED** =
H1 FAIL → immediate pitch guardrail (coherence claims must say "vs single-frame
mono-depth"), and GemDepth graduates to component-candidate status for the mover-depth
gap.

### **VERDICT: {{VERDICT}}**

## 5. Cost / budget

Depth batch (44 episodes, parallel, max_containers=8, A100-40GB): {{DEPTH_COST}}
Dev determination (4 episodes, prior step): ~$1.65
Scoring (CPU-only, both cells): {{SCORE_COST_NOTE}}
Total against PREREG §3's $20 cap (dev+recon+scoring, this task's $18-remaining
authorization from the $4 dev cap): {{TOTAL_COST}}

## 6. Judgment calls / deviations (per coordinator instruction, logged here + results/exp32_pooled.json)

1. Depth stage parallelized (coordinator-directed, 2026-07-18): `modal_exp32_depthgem.py`'s
   `depthgem_episode` now carries `max_containers=8`; `batch()` defaults to
   `.starmap()` (`_run_parallel`) instead of the sequential `_run_many` (still used by
   `dev()`). Purely an execution-strategy change — no effect on per-episode outputs.
2. `modal_exp32_score_et.py`'s Brs "b" cell extended to also emit
   `jerk_index_mm`/`jerk_thumb_mm` (additive only, reuses the existing `_jerk_mm`
   closure pattern already used for A/B's own "b" cell) — for the coordinator's
   B-vs-Brs jerk sanity check. Does not touch alignment/detector/reference logic;
   PREREG §0's "byte-identical" mandate is about the core pipeline, not which cells
   emit which reported statistics.
3. H1's jerk comparison uses the STANDARD (unscaled) B arm, not Brs, per PREREG's
   literal text ("same D-int-a index-tip statistic") and because detector "a" has no
   Brs cell in either EXP-26's or EXP-28's frozen schema (Brs pairs only with each
   experiment's primary geometric detector, never "a", which is "geometry degenerate
   by construction").
4. `pick_up_pen` (5 `Office__pick_up_pen__*` variants) and `HE__water_flowers__000`
   were never present in `exp26_scores_{et,he}/` at all (confirmed on the volume) —
   they were excluded upstream by EXP-26's own pipeline before scoring ever ran, so
   no additional skip logic was needed; the 44-episode set is derived directly from
   `exp26_scores_et/` ∪ `exp26_scores_he/` minus the 4 dev ids.
