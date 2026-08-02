# Seeded corruption classes

These are the 5 corruption classes the inspector's validator must catch. They
are described here, not shipped as pre-built files — build a small seeded
corruption generator (start from one of the clean files in `samples/`, or
your own minimal valid splat, and apply exactly one mutation) as part of your
test suite, so every class has a reproducible, minimal repro file.

Each entry names the mutation and the check that should catch it. Tolerances
reference `docs/splat-ply-spec.md`.

## 1. Wrong field order

**Mutation:** re-order the 17 `property float <name>` lines in the header
(e.g. move `rot_0..3` before `scale_0..2`, or move `opacity` to the very
end) while leaving the body's bytes untouched and `N` correct. The file is
still syntactically valid binary PLY with the right 17 names present — just
not in the canonical order.

**Why it's dangerous:** most 3DGS viewers decode records **positionally**
(byte offset, not by looking up property names), so a header with the right
names in the wrong order silently produces a file that "parses" but renders
garbage — swapped colors, wrong scales, tumbling orientations.

**Detection:** parse the header's `property` lines in order and compare the
resulting 17-name sequence against the canonical list verbatim. This is a
pure string/order comparison — it doesn't require decoding any body bytes,
and it must be a hard failure, not a warning, since a naive positional reader
downstream will misinterpret every field from the swap point onward.

## 2. Truncated body

**Mutation:** cut the file short partway through the data section — either
mid-record (not even a whole multiple of 68 bytes past the header) or after
some whole number of records but short of the header's declared `N`.

**Why it happens in practice:** an interrupted write (crash, disk-full, killed
process) or a body copied/streamed without its final bytes.

**Detection:** after locating `end_header\n`, compute
`remaining = filesize - header_length`. A valid file requires
`remaining == N * 68` exactly. Report:
- the expected byte count (`N * 68`) vs. the actual `remaining`,
- whether the shortfall is a whole number of records (data loss only) or
  leaves a partial record dangling (mid-record truncation — flag this
  distinctly, since it means the last "readable" record may itself be
  garbage bytes rather than real data).

## 3. Non-finite values

**Mutation:** overwrite one or more of the `17 * N` floats in the body with
`NaN` or `+Inf`/`-Inf`.

**Why it happens in practice:** upstream numerical issues (log of a
zero/negative scale, division by zero in a spacing estimate, an
un-initialized buffer) landing directly in the export without a finite-value
guard.

**Detection:** after decoding each record's 17 floats, check every one with
a finite-value test. Report the offending vertex index and field name for
every hit (not just the first) — a validator that stops at the first
`NaN` hides how widespread the problem is.

## 4. Opacity out of encoding range

**Mutation:** write a **raw, untransformed alpha** (a value already in
`[0, 1]`, e.g. `0.9`) directly into `opacity` instead of its logit
(`ln(0.9/0.1) ≈ 2.197`) — i.e. skip the encoding step entirely. A second,
more extreme variant: write a logit magnitude so large that its sigmoid
saturates to exactly `0.0` or `1.0` at float32 precision (e.g. `opacity =
1e6`), which is a degenerate, unrecoverable alpha even though the stored
float itself is perfectly finite.

**Detection:**
- Hard failure: recover `a = sigmoid(opacity)` for every vertex and flag any
  vertex where `a` rounds to exactly `0.0` or `1.0` (e.g. `a < 1e-6` or
  `a > 1 - 1e-6`) — this is an unambiguous, checkable defect regardless of
  what the "correct" alpha was supposed to be.
- Heuristic (worth surfacing, not necessarily a hard failure by itself): a
  baseline exporter writes one constant alpha for the whole file, so its
  `opacity` values should cluster tightly around a single logit-scale number
  (typically in roughly `[-6, 6]` for any reasonable alpha). A file whose
  `opacity` values instead cluster inside `[0, 1]` — i.e. look like alphas,
  not logits — is the signature of this mutation's mild variant, and should
  be called out in the summary stats even when no single value is
  individually out-of-range.

## 5. Bad quaternion norm

**Mutation:** perturb one or more `rot_0..3` components independently (e.g.
add noise to just `rot_1`) so the group no longer has unit norm, or leave a
raw un-normalized rotation-matrix-to-quaternion conversion result in place
without renormalizing.

**Why it happens in practice:** any code path that derives an orientation
(even a baseline exporter that's been modified to attempt oriented
gaussians) and forgets a final normalization step.

**Detection:** for every vertex, compute
`norm = sqrt(rot_0^2 + rot_1^2 + rot_2^2 + rot_3^2)` and flag any vertex
where `abs(norm - 1.0) > 1e-3`. This tolerance is deliberately looser than a
pose-file quaternion check (see the platform's TUM-format tooling, which
uses `1e-6`) because these values round-trip through `log`/`exp`/logit math
in float32 and accumulate more error than a value that's just copied
through. A clean baseline export — every gaussian at the identity rotation
`(1, 0, 0, 0)` — has `norm == 1.0` exactly for every vertex, so this check
should never fire a false positive on an unmodified baseline file.
