# Bounty kit staging area — OPERATOR INDEX (do not share with interns)

Each subdirectory is a self-contained, scrubbed bounty kit.
The intern-facing board is the "Intern Bounty Board" artifact; this file is your publishing run-book.

**Where this repo lives:** `reality-opened/bounties`, **private**. That's the operator-side staging
repo — it holds this index, all kits, and internal-only material, and is *not* what an intern ever
sees. Intern-facing repos are per-kit, built by `publish-kit.sh` and pushed to a **separate** org
(see the run-book). Keep those two things separate: this repo is not, and must never become, a
submodule of the `platform` super-repo, which exists to be cloned recursively. If `reality-opened`
ever gains members beyond the founders, re-check who can read this repo before adding anyone.

⚠️ **The kits are no longer individually git-initialized.** Commit `e3bf97d` ("Flatten sub-repos
into super repo") collapsed them into this one repo, whose history is authored by a real name +
personal email. Never `gh repo create --source <kit-dir>` from here — that would leak this operator
index, all 27 kits (including internal-only X1), and the founder's identity. **Use
`./publish-kit.sh <kit-dir>`**, which rebuilds the standalone one-commit repo with the neutral
identity `OpenReality Bounty Program <bounty-kits@openreality.example>`, runs both scrub sweeps, and
refuses to commit if either trips. Output lands in the gitignored `.publish/`.

Sweep status (2026-07-28, R2 re-swept 2026-08-01): all kits pass
`/usr/bin/grep -riE 'finc|efficura|chorus|labrador|neural[ _-]?motion|aurora|davzhang|galois|@gmail'`
(content **and** `.git`, using /usr/bin/grep because the shell's grep alias skips `.git`),
plus a secret-shaped-string scan. `publish-kit.sh` runs both automatically and additionally matches
bare `david`, which the original pattern missed (it only had `davzhang`) — R2's onboarding doc
tripped that and has been de-named to "任务负责人 / bounty owner". Re-run on any kit you edit.

## Kits

| ID | Dir | Ring | Status | Notes |
|----|-----|------|--------|-------|
| R1 | r1-demand-dossiers | 0 | READY | agent prompt rewritten for humans; proprietary leads excluded; assign a vertical at claim |
| R2 | r2-incumbent-pricing | 0 | READY* | reconciled 2026-08-01: zh onboarding doc + EN materials had diverged (different schema, tags, verticals, deliverable) — now one 10-col format + 4-tag ladder [verified]/[reported]/[inferred]/[example]; added findings-summary template; 3 [example] rows (2026-07-28), unverified seeds excluded. verticals ASSIGNED 2026-08-01 = physical-AI trio (Sim-ready 3D assets / Reality capture / Robot training data), framed as three routes to the same outcome. ⚠ BLOCKED ON US: IP agreement template still pending |
| R3 | r3-contact-dataset-survey | 0 | READY | requirements brief distilled; review before invite |
| R4 | r4-dataset-scaleup | 0 | READY | requirements brief distilled; review before invite |
| X1 | x1-exp32-pooled-report | 1 | READY* | ⚠ HE arm only 10/19 scored (ET 25/25) — verdict will be honestly partial; pool_scores.py needs a documented input reshape (in kit README); NOTICE.md: internal-only (CC-BY-NC upstream) |
| X2 | x2-multipair-anchor | 1 | READY | aggregate per-scene stats only (per-pair raws never persisted — by design, task is simulation) |
| X3 | x3-submap-qc-signal | 1 | READY | rich bundle: 29 exp36 cells + 5 exp37 cells w/ trajectories + ATE/RPE |
| X4 | x4-sl4-singular-fix | 1 | READY* | ⚠ PENDING on us: real crash matrices need a pipeline replay (only Modal run IDs were logged); synthetic degenerates included; 20 regression tests run green here; note: normalize_to_sl4 call sites are currently commented out in graph.py pending the det(H) re-enable decision |
| T1 | t1-tum-pose-tools | 1 | READY | fixture script executed, deterministic |
| T2 | t2-splat-inspector | 1 | READY | 2 synthetic sample splats generated + size/header verified; 5 corruption classes described |
| T3 | t3-eval-trend-reports | 1 | READY | synthetic logs (marked as such) incl. missing-sequence + regression cases; sample TUM pose pair |
| T4 | t4-sevenscenes-runner | 1 | READY | stub SLAM binary runs, emits valid TUM; real CLI flag names verified against main.py |
| T5 | t5-fixture-generator | 1 | READY | checkers executed here: 12/12 correct verdicts |
| D1 | d1-export-validator | 1 | READY | real fixture tree generated (19/19 on reference inspector). Optional hardening: `rm -rf vendor/ scripts/` before invite if you'd rather not share producer code — fixtures are pre-generated |
| D2 | d2-isaac-validator | 1 | READY | real Isaac tree generated (17/17). Same optional vendor/ strip as D1 |
| D3 | d3-qc-drift-signal | 2 | READY | suite runs 18/18 here (1 pipeline-coupled test removed, documented) |
| D4 | d4-llm-client-tests | 2 | READY | module imports standalone; fake-transport example runs |
| D5 | d5-agent-runtime-tests | 2 | READY | ObjectDetector + StreamingSLAM stubbed as documented protocols; smoke-verified |
| W1 | w1-mask-overlay | 2 | READY | RLE fixtures generated + round-trip PASS; npm not run here |
| W2 | w2-proof-page-qa | 2 | READY | zero stubs needed; placeholder PNGs at real dimensions; npm not run here |
| W3 | w3-landing-tests | 2 | READY | it.todo skeletons; next/image+link stubbed; npm not run here |
| W4 | w4-spa-tokenization | 2 | READY | scoped to workflow **Refine stage** (summary page too socket-coupled); raw-color lint works (fails pre-work, as intended) |
| W5 | w5-protocol-simulator | 2 | READY | full protocol pkg w/ client literals → acme/rooftop; npm not run here |
| W6 | w6-landing-revamp | 2 | READY | contact email stubbed; .env.example Modal-subdomain handle removed; unmerged-branch notes are prose-only |

## Publishing run-book (per kit)

1. Sign the contributor IP agreement with the intern first (template pending — legal check).
2. Optional hardening for D1/D2 (see table), then build the standalone repo:
   `./publish-kit.sh <kit-dir>` — scrubs, git-inits with the neutral identity, one commit.
3. Create the private repo under a **separate org** (not reality-opened), sourcing the *staged*
   tree, never the kit dir in this repo:
   `gh repo create openreality-bounties/<kit-dir> --private --source .publish/<kit-dir> --push`
4. Invite the intern as a collaborator on that one repo only (write access to the bounty repo is fine):
   `gh api orgs/openreality-bounties/... ` or repo Settings → Collaborators.
5. Post the bounty ID + repo link to the intern; point them at README acceptance criteria.
6. Review PRs against acceptance criteria; port accepted work into product repos yourself with
   `Co-authored-by: <intern> <email>`; never grant product-repo access as part of a bounty.

## Standing cautions

- Kits R1–R4 deliverables are documents — no repo strictly needed; a repo still gives you PR-style review.
- **The IP agreement template still doesn't exist** (run-book step 1), and both R2's README and its
  onboarding doc tell the intern it must be signed before their first PR. Any kit handed out before
  that template lands has a blocked deliverable. This gates R2 specifically, which is claimed.
- R1/R3/R4 have the same two-document risk R2 had if you ever write a translated onboarding guide
  for them: the translation drifts into being a *second spec*. Keep the format/tag definitions in
  exactly one file and have every other doc point at it.
- X1 is internal-only (NOTICE.md) — never let its numbers or media leave the company.
- The `feat/efficura-chorus-pilot` branch NAME leaks client names in the org repos — irrelevant for kits,
  but rename it before ever mirroring those repos anywhere less private.
- Nothing in any kit requires or mentions Modal/Clerk/HF credentials. Keep it that way in review.
