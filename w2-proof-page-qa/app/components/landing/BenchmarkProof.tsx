import Link from "next/link";
import styles from "./BenchmarkProof.module.css";
import {
  ACCURACY,
  ACCURACY_POOLED,
  ARM_C,
  BASELINES,
  DATASETS,
  SMOOTHNESS,
  SMOOTHNESS_POOLED,
  VERDICTS,
  type Verdict,
} from "./proofData";

/* Proof / benchmark section (EXP-21). Leads with the true-everywhere win —
 * temporal smoothness — as a native themed bar chart, then reports position
 * accuracy honestly (wins, ties AND losses). Every number lives in proofData.ts
 * with its results/*_summary.md source. No PNGs here so it stays crisp in both
 * themes; the full figure plates live on /proof. */

const TONE: Record<Verdict, string> = {
  win: styles.win,
  tie: styles.tie,
  loss: styles.loss,
  neutral: styles.neutral,
};

// Shared linear scale so the bars are comparable across tasks — the baseline's
// worst cell (FMB, 269.6) is full width and Arm A reads as a sliver on purpose.
const MAX_JERK = Math.max(...SMOOTHNESS.map((r) => r.bJerk));
const pct = (v: number) => `${Math.max((v / MAX_JERK) * 100, 0.6)}%`;

export default function BenchmarkProof() {
  return (
    <section id="proof" className="landing-section proof-section">
      <div className="container">
        <p className="section-kicker">Proof · benchmark</p>
        <h2 className="section-title">
          The trajectories come out <em>8–37× smoother</em>
        </h2>
        <p className="section-lead">
          On DROID, FMB and RH20T — public robot datasets with encoder-grade
          ground truth — motion reconstructed from ordinary monocular video
          carries far less jerk than {BASELINES.keypointLong} and than{" "}
          {BASELINES.splat}, on every task tested, at p&nbsp;&lt;&nbsp;1e-6.
          Smoothness is the property that decides how well a policy trains.
        </p>

        {/* ── Verdict strip: one chip per hypothesis, at a glance ── */}
        <ul className={styles.strip} aria-label="Benchmark verdicts">
          {VERDICTS.map((v) => (
            <li className={`${styles.chip} ${TONE[v.tone]}`} key={v.tag}>
              <span className={styles.chipTag}>{v.tag}</span>
              <span className={styles.chipVerdict}>
                <span className={styles.chipDot} aria-hidden="true" />
                {v.verdict}
              </span>
              <span className={styles.chipNote}>{v.note}</span>
            </li>
          ))}
        </ul>

        {/* ── Headline chart: action jerk (lower = smoother) ── */}
        <figure className={styles.chart}>
          <figcaption className={styles.chartHead}>
            <span className={styles.chartTitle}>
              Median action jerk — lower is smoother
            </span>
            <span className={styles.legend}>
              <span className={styles.legendItem}>
                <span
                  className={`${styles.legendSwatch} ${styles.swatchOurs}`}
                  aria-hidden="true"
                />
                OpenReality
              </span>
              <span className={styles.legendItem}>
                <span
                  className={`${styles.legendSwatch} ${styles.swatchBase}`}
                  aria-hidden="true"
                />
                {BASELINES.keypoint}
              </span>
            </span>
          </figcaption>

          <div className={styles.bars}>
            {SMOOTHNESS.map((row) => (
              <div
                className={styles.barRow}
                key={row.task}
                aria-label={`${row.task} on ${row.dataset}: OpenReality ${row.aJerk}, baseline ${row.bJerk} metres per second cubed — ${row.factor} smoother`}
              >
                <div className={styles.barMeta}>
                  <span className={styles.barTask}>{row.task}</span>
                  <span className={styles.barDataset}>
                    {row.dataset} · {row.camera}
                  </span>
                </div>
                <div className={styles.barTrack}>
                  <div className={styles.barLane}>
                    <span
                      className={`${styles.barFill} ${styles.barFillBase}`}
                      style={{ width: pct(row.bJerk) }}
                    />
                    <span className={styles.barVal}>{row.bJerk}</span>
                  </div>
                  <div className={styles.barLane}>
                    <span
                      className={`${styles.barFill} ${styles.barFillOurs}`}
                      style={{ width: pct(row.aJerk) }}
                    />
                    <span className={`${styles.barVal} ${styles.barValOurs}`}>
                      {row.aJerk}
                    </span>
                  </div>
                </div>
                <div className={styles.barFactor}>
                  <strong>{row.factor}</strong>
                  <span>smoother</span>
                </div>
              </div>
            ))}
          </div>
          <p className={styles.chartUnit}>m/s³ · median over episodes</p>
        </figure>

        {/* ── Pooled callout ── */}
        <div className={`${styles.callout} ${styles.win}`}>
          <span className={styles.calloutLabel}>Pooled paired test · 69 episodes</span>
          <p className={styles.calloutText}>
            Action jerk <span className={styles.stat}>{SMOOTHNESS_POOLED.jerkDiff}</span>{" "}
            (95% CI {SMOOTHNESS_POOLED.jerkCI}), velocity noise{" "}
            <span className={styles.stat}>{SMOOTHNESS_POOLED.velDiff}</span>, both{" "}
            <span className={styles.stat}>{SMOOTHNESS_POOLED.p}</span>. And every arm
            stays <em>above</em> the encoder-truth smoothness floor —{" "}
            <span className={styles.stat}>{SMOOTHNESS_POOLED.floor}</span> cells
            over-smoothed — so it recovers real motion, it doesn&rsquo;t blur it away.
          </p>
        </div>

        {/* ── Accuracy, reported honestly ── */}
        <div className={styles.accuracy}>
          <h3 className={styles.accuracyHead}>
            Position accuracy is cell-dependent — we report the losses too
          </h3>
          <p className={styles.accuracyLead}>
            End-effector error on moving-camera capture. We win where it counts for
            monocular capture, tie on insertion, and lose close-range contact-rich
            stacking. Pooled across every moving-camera cell it&rsquo;s a statistical
            tie ({ACCURACY_POOLED.diff}, {ACCURACY_POOLED.p}). The baselines were tuned
            as hard as our own pipeline.
          </p>
          <ul className={styles.cells}>
            {ACCURACY.map((c) => (
              <li className={`${styles.cell} ${TONE[c.verdict]}`} key={c.cell}>
                <span className={styles.cellVerdict}>
                  <span className={styles.chipDot} aria-hidden="true" />
                  {c.verdict}
                </span>
                <span className={styles.cellName}>{c.cell}</span>
                <span className={styles.cellDetail}>{c.detail}</span>
                <span className={styles.cellNums}>
                  <span className={styles.cellNumsOurs}>{c.a}</span>
                  <span className={styles.cellNumsVs}>vs</span>
                  <span>{c.b}</span>
                </span>
                <span className={styles.cellNote}>{c.note}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Method integrity + full report link ── */}
        <div className={styles.foot}>
          <p className={styles.footNote}>
            {BASELINES.splat} costs {ARM_C.costFactor} more per clip ({ARM_C.costC} vs{" "}
            {ARM_C.costA}), produces no trajectory at all, and ghosts the moving
            object — visualization-grade, not training-grade. Ground truth:{" "}
            {DATASETS} (public robot datasets). No absolute-metric claim — OpenReality
            ships scale-normalized metres.
          </p>
          <Link className={styles.footLink} href="/proof">
            Read the full benchmark →
          </Link>
        </div>
      </div>
    </section>
  );
}
