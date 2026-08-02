# Shortlist — Public-Dataset Scale-Up Candidates

Fill in one row per candidate, **≥10 total**, spanning all three families (see
`requirements-brief.md`). Rank within the whole table (column 1), not just within a family.
Every license verdict must trace to the primary license text — link it.

| Rank | Dataset | Family (a/b/c) | License verdict (quote + link) | Size / download | GT available | Effective-N accounting | Integration friction guess |
|---|---|---|---|---|---|---|---|
| 1 |  |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |  |
| 3 |  |  |  |  |  |  |  |
| 4 |  |  |  |  |  |  |  |
| 5 |  |  |  |  |  |  |  |
| 6 |  |  |  |  |  |  |  |
| 7 |  |  |  |  |  |  |  |
| 8 |  |  |  |  |  |  |  |
| 9 |  |  |  |  |  |  |  |
| 10 |  |  |  |  |  |  |  |

## Column notes

- **Family**: which of (a) manipulation-with-encoder-GT, (b) egocentric-with-metric-reference,
  (c) indoor-trajectory-beyond-TUM/7Scenes this candidate targets. List more than one letter if
  it genuinely serves two families — don't force a fit.
- **License verdict**: quote the deciding clause, link the primary source (license file / ToS
  page, not a paper's summary), and state the class from the requirements brief's table
  (fully-open / conditional-commercial / no-derivatives-metrics-only / non-commercial-excluded).
- **Size / download**: raw advertised size (episodes, scans, hours, GB) and where/how it's
  obtained (direct download, form-gated, mirror).
- **GT available**: what ground truth ships and how it's sourced (encoder/FK, external mocap,
  laser scan, calibrated rig, SLAM-derived pseudo-GT) — note the GT tier honestly; SLAM-derived
  "ground truth" is weaker than encoder or mocap and should be labeled as such, not conflated.
- **Effective-N accounting**: show the subtraction from raw count to usable count, with the
  reasoning (see requirements brief). A bare number without the accounting will be sent back.
- **Integration friction guess**: does existing tooling in our stack already handle this format,
  or does someone need to write a new downloader/normalizer? Any awkward conversions needed
  (frame sequences to video, coordinate-convention changes, unusual calibration formats)?

## Top-3 recommendation (required)

Name the three candidates you'd pick up first, and justify the ranking — weigh license clarity,
effective-N, and integration friction together. Explicitly say why each of the top 3 beats the
candidates ranked below it, and note any candidate that's tempting on raw size but ranks lower
once effective-N and friction are accounted for.
