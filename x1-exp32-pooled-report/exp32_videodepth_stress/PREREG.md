# EXP-32 pre-registration — video-depth stress test of the coherence claim (GemDepth)

**Status: LOCKED v1.0 — 2026-07-17, before any scored value was computed.**
Motivation (declared, results-informed at the *landscape* level only): EXP-21/22/26 proved the temporal-coherence win against **single-frame** mono-depth (DA-V2-Metric). Research sweep 2026-07-17 verified GemDepth (arXiv 2605.10525, MIT, released+maintained, weights on HF) cuts AbsRel ~60% vs DA-V2 on dynamic-content video-depth benchmarks (Sintel 0.390→0.157, Bonn 0.127→0.051). A temporally-consistent video-depth model is the strongest honest baseline of the same recipe class. This experiment stress-tests our headline claim against it — before a customer or reviewer does. Secondary payoff: GemDepth as a candidate mover-depth component (MIT, license-clean). Edits after first scored run: Deviations only.

## 0. Design (delta vs EXP-26 = Arm-B depth source only)

- **Episodes:** all 44 frozen EXP-26 metric-scored episodes (25 ET + 19 HE) + 4 dev (dev-first protocol).
- **Arm B-gem:** GemDepth video inference per episode → per-frame depth rasters written in EXP-26's `exp26_depthB` npz format (new subdir `exp32_depthgem/`). Everything downstream = EXP-26's frozen scorers verbatim with `DEPTHB_SUBDIR` swapped (the EXP-28 minimal-delta pattern; alignment stays EXP-26's per-window oracle Sim(3) — this experiment isolates the DEPTH variable, not stitching).
- **Metric semantics determination (pre-scored, on dev only):** GemDepth's output scale semantics (metric vs relative) are determined from its repo/paper + dev-episode sanity (surface-window median depth vs Arm A). If relative → the geometry-only per-episode rescale (EXP-26's Brs convention) is PRIMARY for B-gem and declared; if metric → raw is primary, Brs reported. This determination is logged before any scored episode runs.
- **Arm A and Arm B-dav2 numbers are frozen** (EXP-26 artifacts) — never recomputed.

## 1. Hypotheses, bars, gates

- **H1 — coherence claim survives video depth (gates).** A's fingertip jerk < B-gem's in ≥70% of the 44 episodes AND pooled Wilcoxon p<0.01 (EXP-26 H3 bar, unchanged; same D-int-a index-tip statistic, same window-broken runs).
- **H2 — absolute-geometry gap (diagnostic, HE D-reg-style contrast where defined + ET d(t₀) contrast).** B-gem's d(t₀) absolute error vs the frozen B-dav2 379 mm raw / 184 mm rescaled: does video depth close the 19× gap on A? Report the full A / B-dav2 / B-gem triple.
- **H3 — viability.** GemDepth produces usable rasters on ≥90% of attempted episodes.
- **Verdict:**
  - **CLAIM-SURVIVES** = H1 PASS → coherence pitch line upgrades to "…including against temporally-consistent video-depth baselines."
  - **CLAIM-BOUNDED** = H1 FAIL → immediate pitch guardrail (coherence claims must say "vs single-frame mono-depth"), and GemDepth graduates to component-candidate status for the mover-depth gap (E2 limitation) — a valuable outcome, not a failure of the experiment.

## 2. Registered predictions (accountability)

- H1 uncertain — genuinely open. Video-depth temporal consistency attacks exactly the statistic we win on. Prior: A retains an edge (its coherence comes from 3D geometry + camera motion, not just per-pixel smoothing) but the 3–37× magnitude will compress substantially.
- H2: expect B-gem ≪ 379 mm but still ≫ A's ~20 mm (video consistency ≠ absolute scale).
- H3 likely PASS.

## 3. Stats, budget, licenses

EXP-26 stats conventions verbatim. Budget: GemDepth inference 48 episodes on A10G/A100-40 ≈ $5–10; re-score CPU ≈ $1–2. **Cap $20.** GemDepth MIT (clean); HE imagery internal-only (CC BY-NC); ET (MIT) carries public figures.

## 4. Deviations

(none yet)
