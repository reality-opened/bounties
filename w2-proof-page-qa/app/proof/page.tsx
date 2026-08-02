import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "./proof.module.css";
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
} from "../components/landing/proofData";

/* /proof — the full EXP-21 benchmark, re-skinned from results/REPORT.html into the
 * landing design system. Static server component. Every number traces to
 * proofData.ts → results/*_summary.md. Figures are public-dataset charts served
 * from /public/proof, placed on fixed-light plates (the matplotlib PNGs render
 * light) so they read the same in either theme. */

export const metadata: Metadata = {
  title: "Benchmark — Open Reality",
  description:
    "EXP-21: reconstructed robot-training data is 8–37× smoother than 2D-keypoint annotation and off-the-shelf 3D Gaussian splatting, on public robot datasets.",
};

const TONE: Record<Verdict, string> = {
  win: styles.win,
  tie: styles.tie,
  loss: styles.loss,
  neutral: styles.neutral,
};

const META = [
  { label: "Ground truth", value: "Robot encoder / mocap" },
  { label: "Datasets", value: DATASETS },
  { label: "Baselines", value: "Tuned (frozen grid)" },
  { label: "Method", value: "Monocular RGB → 3D" },
];

const FIGURES_OCCLUSION = [
  { src: "/proof/occlusion-pickplace.png", cap: "DROID pick-place — the accuracy gap widens with occlusion." },
  { src: "/proof/occlusion-stacking.png", cap: "RH20T stacking — flat. We show the null results too." },
  { src: "/proof/occlusion-insertion.png", cap: "FMB insertion — flat. No occlusion effect." },
];

export default function ProofPage() {
  return (
    <article className={styles.page}>
      <div className="container">
        {/* ── Masthead ── */}
        <header className={styles.mast}>
          <p className={styles.eyebrow}>
            OpenReality · Experiment 21
            <span className={styles.pill}>Complete · 2026-07-09</span>
          </p>
          <h1 className={styles.title}>
            Better training data, <em>measured</em>
          </h1>
          <p className={styles.thesis}>
            From ordinary monocular video, OpenReality reconstructs robot-training
            trajectories that are 8–37× smoother than the incumbent methods — the
            property that decides how well a policy learns — on every task tested, at
            p&nbsp;&lt;&nbsp;1e-6.
          </p>
          <dl className={styles.metarow}>
            {META.map((m) => (
              <div className={styles.metacell} key={m.label}>
                <dt className={styles.metaLabel}>{m.label}</dt>
                <dd className={styles.metaVal}>{m.value}</dd>
              </div>
            ))}
          </dl>
        </header>

        {/* ── Verdict strip ── */}
        <ul className={styles.strip} aria-label="Benchmark verdicts">
          {VERDICTS.map((v) => (
            <li className={`${styles.chip} ${TONE[v.tone]}`} key={v.tag}>
              <span className={styles.chipTag}>{v.tag}</span>
              <span className={styles.chipVerdict}>
                <span className={styles.dot} aria-hidden="true" />
                {v.verdict}
              </span>
              <span className={styles.chipNote}>{v.note}</span>
            </li>
          ))}
        </ul>

        {/* ── H3 · smoothness ── */}
        <section className={styles.sec}>
          <p className={styles.secTag}>H3 · data quality</p>
          <h2 className={styles.secTitle}>Temporal coherence — the win that holds everywhere</h2>
          <p className={styles.lede}>
            Action jerk (the third derivative of motion; lower is smoother) is what
            separates training-grade trajectories from noisy ones. On every task, the
            reconstructed trajectory is far smoother than {BASELINES.keypointLong}.
          </p>
          <div className={styles.tblWrap}>
            <table className={styles.tbl}>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Dataset</th>
                  <th className={styles.num}>OpenReality</th>
                  <th className={styles.num}>{BASELINES.keypoint}</th>
                  <th className={styles.num}>Result</th>
                </tr>
              </thead>
              <tbody>
                {SMOOTHNESS.map((r) => (
                  <tr key={r.task}>
                    <td>{r.task}</td>
                    <td className={styles.muted}>{r.dataset} · {r.camera}</td>
                    <td className={`${styles.num} ${styles.best}`}>{r.aJerk}</td>
                    <td className={styles.num}>{r.bJerk}</td>
                    <td className={styles.num}>
                      <span className={`${styles.tagCell} ${styles.win}`}>
                        {r.factor} smoother
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className={styles.unit}>median action jerk, m/s³ · wrist / in-hand cameras · clean input</p>
          </div>
          <div className={`${styles.callout} ${styles.win}`}>
            <span className={styles.calloutLabel}>Pooled paired test · 69 episodes</span>
            <p className={styles.calloutText}>
              Action jerk <b>{SMOOTHNESS_POOLED.jerkDiff}</b> (95% CI{" "}
              {SMOOTHNESS_POOLED.jerkCI}), velocity noise <b>{SMOOTHNESS_POOLED.velDiff}</b>,
              both <b>{SMOOTHNESS_POOLED.p}</b>. Every arm stays above the encoder-truth
              smoothness floor — <b>{SMOOTHNESS_POOLED.floor}</b> cells over-smoothed — so
              it recovers real motion rather than blurring it away.
            </p>
          </div>
        </section>

        {/* ── H1 · accuracy ── */}
        <section className={styles.sec}>
          <p className={styles.secTag}>H1 · accuracy</p>
          <h2 className={styles.secTitle}>Position error is cell-dependent — losses included</h2>
          <p className={styles.lede}>
            End-effector position error on moving-camera capture. We report every cell
            with equal weight; the losses are the point, not a footnote. Pooled across
            all moving-camera cells it is a statistical tie ({ACCURACY_POOLED.diff}, 95%
            CI {ACCURACY_POOLED.ci}, {ACCURACY_POOLED.p}).
          </p>
          <div className={styles.tblWrap}>
            <table className={styles.tbl}>
              <thead>
                <tr>
                  <th>Cell</th>
                  <th className={styles.num}>OpenReality</th>
                  <th className={styles.num}>Best baseline</th>
                  <th>Verdict</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {ACCURACY.map((c) => (
                  <tr key={c.cell}>
                    <td>
                      {c.cell}
                      <span className={styles.cellDetail}>{c.detail}</span>
                    </td>
                    <td className={`${styles.num} ${c.verdict === "win" ? styles.best : ""}`}>{c.a}</td>
                    <td className={`${styles.num} ${c.verdict === "loss" ? styles.best : ""}`}>{c.b}</td>
                    <td>
                      <span className={`${styles.tagCell} ${TONE[c.verdict]}`}>{c.verdict}</span>
                    </td>
                    <td className={styles.muted}>{c.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.figRow}>
            <figure className={styles.plate}>
              <Image
                className={styles.plateImg}
                src="/proof/paired-accuracy.png"
                alt="Paired per-episode position error, OpenReality versus the 2D-keypoint baseline; points below the diagonal are OpenReality wins."
                width={1389}
                height={745}
                sizes="(max-width: 900px) 100vw, 560px"
              />
              <figcaption className={styles.plateCap}>
                Paired per-episode error vs {BASELINES.keypoint} — points below the
                diagonal are OpenReality wins.
              </figcaption>
            </figure>
            <figure className={styles.plate}>
              <Image
                className={styles.plateImg}
                src="/proof/cell-error-table.png"
                alt="Per-cell end-effector position error across all arms and capture cells."
                width={1365}
                height={1128}
                sizes="(max-width: 900px) 100vw, 560px"
              />
              <figcaption className={styles.plateCap}>
                Per-cell position error across every arm and capture configuration.
              </figcaption>
            </figure>
          </div>
        </section>

        {/* ── Robustness ── */}
        <section className={styles.sec}>
          <p className={styles.secTag}>H4 · robustness</p>
          <h2 className={styles.secTitle}>Degradation &amp; occlusion</h2>
          <p className={styles.lede}>
            How error moves under blur, low light, and frame-rate drops — and under
            occlusion, per cell. Where occlusion has no effect, we say so.
          </p>
          <figure className={styles.plate}>
            <Image
              className={styles.plateImg}
              src="/proof/degradation-sweep.png"
              alt="Position error versus input-degradation level for each arm."
              width={1248}
              height={702}
              sizes="(max-width: 900px) 100vw, 900px"
            />
            <figcaption className={styles.plateCap}>
              Error vs input-degradation level, per arm.
            </figcaption>
          </figure>
          <div className={styles.figThree}>
            {FIGURES_OCCLUSION.map((f) => (
              <figure className={styles.plate} key={f.src}>
                <Image
                  className={styles.plateImg}
                  src={f.src}
                  alt={f.cap}
                  width={1001}
                  height={701}
                  sizes="(max-width: 720px) 100vw, 300px"
                />
                <figcaption className={styles.plateCap}>{f.cap}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* ── Arm C ── */}
        <section className={styles.sec}>
          <p className={styles.secTag}>Arm C · {BASELINES.splat}</p>
          <h2 className={styles.secTitle}>
            {BASELINES.splatShort}-style off-the-shelf splatting is visualization-grade
          </h2>
          <p className={styles.lede}>
            Run at its best case (100% registration on every episode), vanilla COLMAP +
            gsplat still produces <b>no trajectory at all</b>, <b>ghosts the moving
            object</b> while the static scene stays crisp, and costs{" "}
            <b>{ARM_C.costFactor}</b> more per clip ({ARM_C.costC} vs {ARM_C.costA}). It
            is a scene-visualization tool, not a manipulation-data tool.
          </p>
        </section>

        {/* ── H2 · absolute scale (honest negative) ── */}
        <section className={styles.sec}>
          <p className={styles.secTag}>H2 · absolute scale</p>
          <h2 className={styles.secTitle}>What this does not claim</h2>
          <p className={styles.lede}>
            On this data, <b>no method delivers usable absolute metres</b> — every arm&rsquo;s
            scale error exceeds 85%. The &ldquo;native-metric&rdquo; mono-depth baselines are
            actually worse than uncalibrated units (256% and 170% median scale error).
            OpenReality ships <b>scale-normalized metres</b>; one disclosed reference
            measurement is what turns them into true metres. We do not claim absolute
            metric accuracy here.
          </p>
          <ul className={styles.honesty}>
            <li className={styles.honestyItem}>
              <b>Baselines were tuned as hard as our own pipeline</b> — frozen grid,
              disjoint split, per-cell locked configs. That is what makes the result
              credible.
            </li>
            <li className={styles.honestyItem}>
              <b>Accuracy is scoped to moving-camera capture</b> — the losses (close-range
              stacking) and ties (insertion) are shown, not hidden.
            </li>
            <li className={styles.honestyItem}>
              <b>Public ground truth only</b> — DROID, RH20T, FMB robot-encoder / mocap
              data. No customer or pilot data appears anywhere in this benchmark.
            </li>
          </ul>
        </section>

        {/* ── Foot ── */}
        <footer className={styles.foot}>
          <p className={styles.reproduce}>
            Reproduce → <code>experiments/exp21_recon_vs_baselines/</code> · every number
            traces to <code>results/*_summary.md</code>
          </p>
          <Link className={styles.backLink} href="/#proof">
            ← Back to overview
          </Link>
        </footer>
      </div>
    </article>
  );
}
