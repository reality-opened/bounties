# Eval log format — spec

This documents, in standalone form, the on-disk format our TUM-benchmark
evaluation harness produces, so a report generator can be built against it
without needing the harness's own source. Two distinct artifacts are in
play: an **aggregated results log** (what the report generator primarily
consumes) and, optionally, a per-sequence **evo results archive** (a richer,
optional companion). There is also a related but separate **TUM pose file**
format, used for the trajectory-vs-ground-truth plot feature.

## 1. Aggregated results log (primary format)

A plain-text, comma-separated log accumulated by the harness across one or
more full evaluation runs against a fixed set of sequences. One file
typically corresponds to one harness configuration (e.g. one submap-size
setting); a "results directory" for the report generator is simply a folder
containing one or more of these files.

```
Run,Dataset,RMSE
1,seq_alpha,0.0182
1,seq_bravo,0.0241
...
1,Average,0.0213
2,seq_alpha,0.0179
...
```

- **Header row:** exactly `Run,Dataset,RMSE` (case-sensitive), once per file.
- **Comment lines:** a conforming reader must skip any line whose first
  non-whitespace character is `#`, before reaching the header. This mirrors
  the comment convention already used for TUM pose files in this ecosystem
  (see §3) and lets sample/synthetic logs carry a provenance marker without
  needing a special-cased parser.
- **Data rows:** `<run>,<dataset>,<rmse>` —
  - `run`: a positive integer, the 1-indexed harness run number. A results
    directory normally contains several runs of the *same* sequence set, to
    average out non-determinism.
  - `dataset`: the sequence identifier (a string; no fixed character set
    beyond "no embedded commas"). The same identifier should recur across
    every run that scored it.
  - `rmse`: a non-negative float — the sequence's Absolute Trajectory Error
    (ATE) RMSE, in whatever length unit the underlying poses use (typically
    meters).
- **`Average` rows:** after all per-dataset rows for a given run, the
  harness appends one extra row with `Dataset` literally equal to the string
  `Average` and `RMSE` equal to that run's mean RMSE across the sequences it
  scored. A report generator must not treat `Average` as a real sequence
  name — filter these rows out before doing any per-sequence analysis, and
  optionally cross-check them (recomputed mean vs. the stored value) as a
  sanity check, but don't require them to be present (see the missing-run
  case below).
- **Row order:** rows for one run are contiguous and datasets appear in a
  stable order within a run, but nothing should be inferred from *row order*
  across the file as a whole — always group by the `Run` column, don't
  assume fixed-width blocks.

### Missing-sequence runs

A row for a given `(run, dataset)` pair can be **absent** rather than present
with some placeholder value — this happens for real when the underlying SLAM
invocation for that sequence fails or crashes before the harness gets a
scoreable result, so nothing is ever appended for it. A report generator
must handle a run that has fewer dataset rows than its peers **without
crashing or silently mis-averaging**: it should render that run's missing
sequence(s) as an explicit gap (e.g. "no data"), not as a zero, and its
per-run summary should be computed only over the sequences that run actually
has.

### Regression runs

There is no schema marker for "this run regressed" — a run with much higher
RMSE across most/all of its sequences than earlier runs is just a normal row
set with larger numbers. A report generator's job is to make that visible
(e.g. in a run-over-run trend chart), not to detect or label it explicitly.

## 2. Optional richer per-sequence detail: `evo`'s results archive

Our harness computes each row's RMSE by invoking the public
[`evo`](https://github.com/MichaelGrupp/evo) toolkit's `evo_ape` command
(Sim(3)-aligned APE) and parsing its printed RMSE line. `evo` can optionally
be asked to also persist a much richer per-sequence result via its
`--save_results <archive>.zip` flag, if a harness run is configured to pass
it (our aggregated log above does not require this — it's an optional,
richer companion artifact a report generator may support for a nicer
trajectory/error breakdown when present).

The general shape of that archive (from `evo`'s public documentation), which
a report generator can treat as a black box and inspect opportunistically:

- a JSON block of summary statistics for the run (RMSE, mean, median, std,
  min, max, and similar order-of-magnitude quantities) — effectively a
  superset of the single RMSE number that ends up in the aggregated log's
  `RMSE` column;
- a JSON block of run metadata (which metric, which alignment options, which
  input files);
- one or more raw numeric arrays holding the per-frame (per-pose) error
  values underlying the summary statistics, useful for plotting an error-vs-
  time curve rather than just a single scalar.

A report generator should treat the **aggregated results log** (§1) as the
format it must support, and this archive as an optional nice-to-have: if a
results directory contains one of these zips alongside the log (naming
convention is the harness/run's own choice — document whatever you pick),
render the extra detail; if not, fall back to the single RMSE per row and
don't fail.

## 3. TUM pose file (for the trajectory-vs-GT plot)

The trajectory-plot feature consumes a pair of TUM-format pose files — one
ground truth, one estimated — for a single sequence:

```
# optional comment line, ignored by readers
<timestamp> <tx> <ty> <tz> <qx> <qy> <qz> <qw>
```

- 8 whitespace-separated float fields per pose line: timestamp, translation
  `(tx, ty, tz)`, then a **scalar-last** unit quaternion `(qx, qy, qz, qw)`.
- Lines starting with `#`, and blank lines, are skipped.
- `timestamp` should be non-decreasing across the file.
- All fields must be finite; the quaternion should have unit norm within a
  small tolerance (this format is shared with, and described in more detail
  by, this program's other pose-file tooling).
- A ground-truth file and its matching estimate file need not share the
  exact same timestamps — that's what alignment/association (e.g. `evo`'s
  own timestamp matching) is for — but for a **sample** pair meant to be
  plotted directly without an association step, matching frame counts and
  timestamps are the simplest valid construction.

## Report generator input contract, summarized

Given a directory:
1. Find every aggregated results log file in it (§1), skip `#` comment
   lines, parse the `Run,Dataset,RMSE` rows, drop `Average` rows.
2. Group by `Dataset` for a per-sequence table, and by `Run` for a
   run-over-run trend (using whichever `Run`s and `Dataset`s are actually
   present — never assume a fixed matrix shape).
3. Optionally, if a paired TUM pose file (ground truth + estimate) is
   present for a sequence, render a trajectory-vs-GT plot for it.
4. Optionally, if an `evo` results archive is present for a run, use its
   richer per-frame detail instead of the single RMSE scalar for that run's
   entries.
5. Render one report from all of the above, for either exactly one run or
   many runs — a directory with a single run is not a degenerate/error case,
   it's just a trend chart with one point per sequence.
