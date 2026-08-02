# Placeholder assets

The real `/proof` page's figures are matplotlib-generated PNGs served from the
landing app's `public/proof/` (not fetched from a release store — they're
tracked in the source repo — but they are **charts of real benchmark
numbers**, which is exactly the kind of content this kit must not leak). Each
one below is replaced with a locally generated, textless placeholder PNG at
the **same pixel dimensions** as the original, so the page's grid/aspect-ratio
layout is byte-for-byte testable without shipping the real chart.

Placeholders were generated with a small offline Node script (no network, no
image libraries) that writes raw PNG chunks directly: warm-paper background,
hairline border, diagonal hatch, and a corner color chip whose width varies
per file (purely so the six images are visually distinguishable from one
another in a grid — it carries no meaning).

| File in `public/proof/` | Real content it stands in for | Dimensions |
|---|---|---|
| `paired-accuracy.png` | Paired per-episode position-error scatter (OpenReality vs. keypoint baseline) | 1389×745 |
| `cell-error-table.png` | Per-cell end-effector position error table/heatmap across arms | 1365×1128 |
| `degradation-sweep.png` | Position error vs. input-degradation level, per arm | 1248×702 |
| `occlusion-pickplace.png` | DROID pick-place occlusion-vs-error plot | 1001×701 |
| `occlusion-stacking.png` | RH20T stacking occlusion-vs-error plot | 1001×701 |
| `occlusion-insertion.png` | FMB insertion occlusion-vs-error plot | 1001×701 |

The QA task is structure/markup/accessibility (alt text, figure/figcaption
semantics, plate contrast in dark mode, responsive grid), not chart fidelity —
these placeholders are sufficient for that. Do not try to make them "look
real"; that's out of scope.

## Two inert logo references in `app/globals.css`

`globals.css` (copied whole, unedited — see README) still contains two
`url(...)` background-image references used by the real site's nav header:

- `.brand-mark::before` → `/open_reality_logo_teal.svg`
- `.modal-credit-tick` → `/modal-logo.svg`

Neither class is rendered anywhere in this kit (the kit's `app/layout.tsx` is
a bare `html`/`body`, with no nav/header markup), so these rules never match
an element and the images are never requested. No placeholder was added for
them — flagging here only so it's clear this isn't an oversight.
