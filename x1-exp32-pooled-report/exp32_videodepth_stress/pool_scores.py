"""EXP-32 pooled H1/H2/H3 analysis (PREREG.md v1.0 section 1) over per-episode score
JSONs -- the 44 scored episodes (25 ET + 19 HE), dev excluded.

Reads:
  - results/scores_et/*.json, results/scores_he/*.json     (THIS experiment's own
    modal_exp32_score_{et,he}.py output -- Arm A recomputed [frozen-identical],
    Arm B/Brs = GemDepth)
  - results/exp26_ref_et/*.json, results/exp26_ref_he/*.json  (FROZEN EXP-26 output
    for the SAME 44 episode ids -- Arm B/Brs = DA-V2-Metric, "B-dav2")
  - results/exp32_depthgem_batch_summary.json               (H3 viability source)

Writes results/exp32_pooled.json, prints the H1/H2/H3 tables + verdict.

Run:  .venv26/bin/python pool_scores.py   (from experiments/exp32_videodepth_stress/,
      reuses EXP-26's venv -- numpy/scipy only, no new deps)
"""
from __future__ import annotations

import glob
import json
import os
import sys

import numpy as np

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(_HERE, "..", "exp21_recon_vs_baselines"))
from metrics.stats import paired_analysis, wilcoxon_signed_rank  # noqa: E402

DEV = {
    "Home__boil_water_with_kettle__20260321_192814_390",
    "Workbench__pick_up_hammer__20260321_085301_950",
    "HE__serve_bread__010",
    "HE__water_flowers__010",
}


def _load_dir(dirpath: str) -> "dict[str, dict]":
    out = {}
    for p in sorted(glob.glob(os.path.join(dirpath, "*.json"))):
        with open(p) as f:
            d = json.load(f)
        eid = d.get("episode_id")
        if eid in DEV:
            continue  # dev firewall -- never pooled into the 44-episode verdict
        out[eid] = d
    return out


def _cell(ep: "dict | None", arm: str, det: str) -> "dict | None":
    if ep is None:
        return None
    return (ep.get("scores") or {}).get(arm, {}).get(det)


def _task_of(ep_id: str) -> str:
    parts = ep_id.split("__")
    return "__".join(parts[:2]) if not ep_id.startswith("HE__") else "HE__" + parts[1]


def main():
    et = _load_dir(os.path.join(_HERE, "results", "scores_et"))
    he = _load_dir(os.path.join(_HERE, "results", "scores_he"))
    et_ref = _load_dir(os.path.join(_HERE, "results", "exp26_ref_et"))
    he_ref = _load_dir(os.path.join(_HERE, "results", "exp26_ref_he"))
    all_eps = list(et.values()) + list(he.values())
    print(f"loaded exp32 scored episodes: ET={len(et)} HE={len(he)} (dev excluded); "
          f"exp26 reference: ET={len(et_ref)} HE={len(he_ref)}")

    pooled: dict = {
        "n_et": len(et), "n_he": len(he), "flags": {}, "notes": [],
        "exp32_arm_b": "gemdepth",
    }

    for ep in all_eps:
        for fl in ep.get("flags", []):
            pooled["flags"][fl] = pooled["flags"].get(fl, 0) + 1

    # =============================================================================== #
    # H1 -- coherence claim (GATES). PREREG.md section 1: "A's fingertip jerk < B-gem's #
    # in >=70% of the 44 episodes AND pooled Wilcoxon p<0.01 (EXP-26 H3 bar, unchanged; #
    # same D-int-a index-tip statistic, same window-broken runs)." Replicates EXP-26's  #
    # own pool_scores.py H3 block EXACTLY (no alignment/t0/contrast eligibility filter  #
    # -- jerk is computed on the whole surface-window run history regardless of         #
    # contact-detection eligibility).                                                   #
    # =============================================================================== #
    ja, jb, h1_rows = [], [], []
    for ep in all_eps:
        ca, cb = _cell(ep, "A", "a"), _cell(ep, "B", "a")
        if not ca or not cb:
            continue
        va, vb = ca.get("jerk_primary_mm"), cb.get("jerk_primary_mm")
        if va is None or vb is None:
            continue
        ja.append(float(va)); jb.append(float(vb))
        h1_rows.append({"ep": ep["episode_id"], "task": _task_of(ep["episode_id"]),
                        "jerk_A": va, "jerk_B_gem": vb,
                        "ratio_BgemA": (vb / va if va > 0 else None)})
    ja_np, jb_np = np.array(ja), np.array(jb)
    frac_a = float(np.mean(ja_np < jb_np)) if len(ja_np) else 0.0
    wil1 = wilcoxon_signed_rank(ja_np, jb_np) if len(ja_np) >= 6 else {"pvalue": 1.0}
    ratios = [r["ratio_BgemA"] for r in h1_rows if r["ratio_BgemA"]]
    tasks = {}
    for r in h1_rows:
        t = tasks.setdefault(r["task"], [0, 0])
        t[0] += 1
        if r["jerk_A"] < r["jerk_B_gem"]:
            t[1] += 1
    pooled["h1"] = {
        "n": len(h1_rows), "frac_A_smoother": frac_a, "wilcoxon": wil1,
        "median_ratio_BgemA": float(np.median(ratios)) if ratios else None,
        "per_task_A_wins": {k: f"{v[1]}/{v[0]}" for k, v in sorted(tasks.items())},
        "rows": h1_rows,
        "gate_frac": bool(frac_a >= 0.70), "gate_p": bool(wil1.get("pvalue", 1.0) < 0.01),
    }
    pooled["h1"]["PASS"] = bool(pooled["h1"]["gate_frac"] and pooled["h1"]["gate_p"])

    # -- Coordinator sanity check (2026-07-18): B jerk vs Brs jerk near-identity, ET     #
    # detector "b" only (the only cell where a Brs jerk exists at all -- see             #
    # modal_exp32_score_et.py's "COORDINATOR JUDGMENT CALL" comment; HE's Brs is         #
    # detector "reg", MPS-native, whose track is IDENTICAL between B and Brs by          #
    # construction -- trivial, not computed). NOT part of the H1 gate.                   #
    brs_rows = []
    for ep in et.values():
        cb_b, cbrs_b = _cell(ep, "B", "b"), _cell(ep, "Brs", "b")
        if not cb_b or not cbrs_b:
            continue
        vb, vbrs = cb_b.get("jerk_index_mm"), cbrs_b.get("jerk_index_mm")
        if vb is None or vbrs is None:
            continue
        rescale = (ep.get("b_rescale") or {}).get("rescale_factor")
        brs_rows.append({"ep": ep["episode_id"], "jerk_B_b": vb, "jerk_Brs_b": vbrs,
                         "rescale_factor": rescale,
                         "ratio_Brs_over_B": (vbrs / vb if vb else None),
                         "ratio_vs_rescale_factor": ((vbrs / vb) / rescale
                                                     if vb and rescale else None)})
    close = [r for r in brs_rows if r["ratio_vs_rescale_factor"] is not None
            and 0.8 <= r["ratio_vs_rescale_factor"] <= 1.25]
    pooled["h1_brs_sanity"] = {
        "n": len(brs_rows), "n_within_25pct_of_rescale_factor": len(close),
        "note": ("checks jerk_Brs_b / jerk_B_b ~= brs_rescale_factor (jerk should scale "
                "linearly with the SAME constant per-episode depth rescale applied to Brs "
                "-- ET detector 'b' only, the one cell where both exist; NOT part of the "
                "H1 gate, which is detector 'a' A-vs-B per PREREG.md's literal text)."),
        "rows": brs_rows,
    }

    # =============================================================================== #
    # H2 -- absolute-geometry gap (DIAGNOSTIC, not gating). PREREG.md section 1: "HE    #
    # D-reg-style contrast where defined + ET d(t0) contrast. B-gem's d(t0) absolute    #
    # error vs the frozen B-dav2 379mm raw/184mm rescaled: does video depth close the   #
    # 19x gap on A? Report the full A/B-dav2/B-gem triple." Eligibility filter matches  #
    # EXP-26's own pool_scores.py H1 block exactly (alignment not degenerate, t0        #
    # eligible, primary-cell contrast eligible, d_at_onset/d_approach present) --        #
    # applied on THIS (exp32) episode's primary cell; B-dav2/B/Brs values are read       #
    # off the SAME episode's cell regardless of that cell's own eligibility (matches    #
    # EXP-26's own d_onset_B/d_onset_Brs capture, which does the same).                  #
    # =============================================================================== #
    def h2_triple(eps: "dict[str, dict]", refs: "dict[str, dict]", arm_det: str) -> dict:
        rows = []
        for eid, ep in eps.items():
            c = _cell(ep, "A", arm_det)
            if c is None or ep["alignment"]["alignment_degenerate"]:
                continue
            if not ep["reference"].get("t0_eligible"):
                continue
            con = c.get("contrast") or {}
            if not con.get("eligible"):
                continue
            if con.get("d_at_onset_mm") is None or con.get("d_approach_mm") is None:
                continue
            ref = refs.get(eid)
            b_gem = _cell(ep, "B", arm_det)
            brs_gem = _cell(ep, "Brs", arm_det)
            b_dav2 = _cell(ref, "B", arm_det)
            brs_dav2 = _cell(ref, "Brs", arm_det)
            rows.append({
                "ep": eid,
                "d_onset_A": con["d_at_onset_mm"],
                "d_onset_B_gem_raw": (b_gem or {}).get("contrast", {}).get("d_at_onset_mm"),
                "d_onset_B_gem_Brs": (brs_gem or {}).get("contrast", {}).get("d_at_onset_mm"),
                "d_onset_B_dav2_raw": (b_dav2 or {}).get("contrast", {}).get("d_at_onset_mm"),
                "d_onset_B_dav2_Brs": (brs_dav2 or {}).get("contrast", {}).get("d_at_onset_mm"),
                "has_exp26_ref": ref is not None,
            })
        def med(key):
            vals = [r[key] for r in rows if r[key] is not None and np.isfinite(r[key])]
            return float(np.median(vals)) if vals else None
        return {
            "n_eligible": len(rows),
            "median_d_onset_A_mm": med("d_onset_A"),
            "median_d_onset_B_gem_raw_mm": med("d_onset_B_gem_raw"),
            "median_d_onset_B_gem_Brs_mm": med("d_onset_B_gem_Brs"),
            "median_d_onset_B_dav2_raw_mm": med("d_onset_B_dav2_raw"),
            "median_d_onset_B_dav2_Brs_mm": med("d_onset_B_dav2_Brs"),
            "rows": rows,
        }

    h2_he = h2_triple(he, he_ref, "reg")
    h2_et = h2_triple(et, et_ref, "b")
    pooled["h2"] = {"HE_A_reg": h2_he, "ET_A_b": h2_et}

    def _gap_closed(h2):
        a, bgem, bdav2 = (h2["median_d_onset_A_mm"], h2["median_d_onset_B_gem_Brs_mm"],
                          h2["median_d_onset_B_dav2_Brs_mm"])
        if a is None or bgem is None or bdav2 is None or a <= 0:
            return None
        gap_before = bdav2 / a
        gap_after = bgem / a
        return {"gap_before_x": gap_before, "gap_after_x": gap_after,
               "closed_fraction": 1.0 - (gap_after - 1.0) / (gap_before - 1.0)
               if gap_before != 1.0 else None}
    pooled["h2"]["HE_gap_analysis"] = _gap_closed(h2_he)
    pooled["h2"]["ET_gap_analysis"] = _gap_closed(h2_et)
    pooled["h2"]["frozen_prereg_reference"] = {
        "note": "PREREG.md section 1 motivation text (EXP-26 REPORT.md headline, HE D-reg, "
                "n=19 eligible): Arm A median d(t0) 20.3mm; B-dav2 379mm raw / 184mm rescaled.",
        "A_mm": 20.3, "B_dav2_raw_mm": 379.0, "B_dav2_rescaled_mm": 184.0,
    }

    # =============================================================================== #
    # H3 -- viability. PREREG.md section 1: "GemDepth produces usable rasters on >=90%  #
    # of attempted episodes." Source: modal_exp32_depthgem.py's own batch summary       #
    # (depth-generation success), cross-checked against scoring-stage success (a        #
    # depth npz can succeed while a DIFFERENT per-episode issue fails the scorer --      #
    # e.g. missing oracle data -- so both rates are reported; H3 itself is scoped to     #
    # depth-raster viability, not scoring).                                             #
    # =============================================================================== #
    depthgem_summary_path = os.path.join(_HERE, "results", "exp32_depthgem_batch_summary.json")
    h3 = {"n_attempted": 44, "depth_ok": None, "depth_frac": None, "score_ok": None,
          "score_frac": None, "PASS": None}
    if os.path.exists(depthgem_summary_path):
        with open(depthgem_summary_path) as f:
            dsum = json.load(f)
        ep_ids = dsum.get("episodes", [])
        results = dsum.get("results", [])
        n_ok = sum(1 for r in results if isinstance(r, dict) and not r.get("error"))
        h3["n_attempted"] = len(ep_ids)
        h3["depth_ok"] = n_ok
        h3["depth_frac"] = round(n_ok / len(ep_ids), 4) if ep_ids else None
        h3["depth_failures"] = [
            {"ep": eid, "error": r.get("error")}
            for eid, r in zip(ep_ids, results)
            if isinstance(r, dict) and r.get("error")
        ]
    n_scored = sum(1 for ep in all_eps if ep.get("status") == "OK")
    h3["score_ok"] = n_scored
    h3["score_frac"] = round(n_scored / 44, 4)
    if h3["depth_frac"] is not None:
        h3["PASS"] = bool(h3["depth_frac"] >= 0.90)
    pooled["h3"] = h3

    # ---------------- verdict (PREREG.md section 1) ----------------
    pooled["verdict"] = {
        "H1_PASS": pooled["h1"]["PASS"],
        "verdict": "CLAIM-SURVIVES" if pooled["h1"]["PASS"] else "CLAIM-BOUNDED",
        "rule": "CLAIM-SURVIVES iff H1 PASS (>=70% of 44 + pooled Wilcoxon p<0.01); "
                "else CLAIM-BOUNDED (coherence claims must say 'vs single-frame mono-depth').",
    }

    out_path = os.path.join(_HERE, "results", "exp32_pooled.json")
    with open(out_path, "w") as f:
        json.dump(pooled, f, indent=2, default=str)

    # ---------------- print ----------------
    h1 = pooled["h1"]
    print(f"\nH1 (D-int-a index-tip jerk, A vs B-gem, n={h1['n']}): "
          f"frac_A_smoother={h1['frac_A_smoother']:.3f} p={h1['wilcoxon'].get('pvalue')} "
          f"median_ratio(Bgem/A)={h1['median_ratio_BgemA']} "
          f"gate_frac(>=0.70)={h1['gate_frac']} gate_p(<0.01)={h1['gate_p']} PASS={h1['PASS']}")
    print(f"  per-task A-wins: {h1['per_task_A_wins']}")
    bs = pooled["h1_brs_sanity"]
    print(f"H1 Brs-sanity (ET det-b only, n={bs['n']}): "
          f"{bs['n_within_25pct_of_rescale_factor']}/{bs['n']} within 25% of the "
          f"predicted jerk_Brs/jerk_B ~= rescale_factor relationship")

    for name, h2c in (("HE (D-reg)", h2_he), ("ET (D-int-b)", h2_et)):
        print(f"\nH2 {name}: n_eligible={h2c['n_eligible']} "
              f"A={h2c['median_d_onset_A_mm']}mm "
              f"B-gem raw={h2c['median_d_onset_B_gem_raw_mm']}mm "
              f"B-gem Brs={h2c['median_d_onset_B_gem_Brs_mm']}mm "
              f"B-dav2 raw={h2c['median_d_onset_B_dav2_raw_mm']}mm "
              f"B-dav2 Brs={h2c['median_d_onset_B_dav2_Brs_mm']}mm")
    print(f"HE gap analysis: {pooled['h2']['HE_gap_analysis']}")
    print(f"ET gap analysis: {pooled['h2']['ET_gap_analysis']}")

    h3p = pooled["h3"]
    print(f"\nH3 viability: depth {h3p['depth_ok']}/{h3p['n_attempted']} "
          f"({h3p['depth_frac']}) score {h3p['score_ok']}/44 ({h3p['score_frac']}) "
          f"PASS(>=0.90)={h3p['PASS']}")
    if h3p.get("depth_failures"):
        print(f"  depth failures: {h3p['depth_failures']}")

    print(f"\nVERDICT: {pooled['verdict']['verdict']} (H1_PASS={pooled['verdict']['H1_PASS']})")
    print(f"wrote {out_path}")


if __name__ == "__main__":
    main()
