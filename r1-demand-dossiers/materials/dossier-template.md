# Transaction Dossier Template

Copy this block once per transaction. Every field is required; `domain_fit` and `capture_path` bounce a dossier at review if left blank or vague.

```yaml
dossier_id: <vertical-shorthand>-<buyer-shorthand>-<seq>     # e.g. property-inspection-acme-mutual-01
vertical: <your assigned vertical, verbatim>
buyer: <company or agency name — must be a real, named entity>
buyer_contact_surface: <the budget-owning role/title, if you can identify one — e.g. "VP Claims Operations">
vendor: <the incumbent currently being paid>
service: <what is actually purchased — concrete, not a category label. e.g. "per-claim exterior +
  interior inspection with photo report and measurements", not "inspection services">
annual_value_usd: <N, or a range if uncertain — state how you got the range>
evidence_tier: A | B | C          # see evidence-tier-rubric.md; only A/B count toward the bounty's 5
sources:
  - <url> — <one-line description of what this source actually shows>
  - <url> — <...>
contract_timing: <renewal/rebid window, with date, or "unknown">
domain_fit: |
  <one line per gate from research-instructions.md's domain-fit section — cite what the
  deliverable actually is. Example:
   "1. reduces to video-in/3D-out: yes, deliverable is inspection photos + measurements.
    2. tolerance: unstated in the source, likely tolerant — no survey-grade clause found.
    3. compliance: standard carrier data, no PHI/PCI flags.">
capture_path: <who would shoot the video — buyer's existing exhaust / buyer staff walkthrough /
  partner network / us — and flag explicitly if capture looks like the hard part>
caveats: <anything that weakens the finding — stale source, ceiling-vs-obligated ambiguity,
  single-source Tier C, etc.>
```

## Filling it in honestly
- If `annual_value_usd` is a bound rather than an exact figure, say so and show the arithmetic (e.g. `≥$251k/yr floor — 3-yr contract, value ÷ 3`) rather than dressing a bound up as a point estimate.
- If a field genuinely doesn't apply or you can't find it, write why (`contract_timing: unknown — award record has no period-of-performance field`) rather than leaving it blank.
- Don't backfill `domain_fit` / `capture_path` from memory after you've moved on from the source — fill them in while the source is open in front of you.
