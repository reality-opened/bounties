"use client";

// KIT NOTE: original imports `next/image`. Rewired to a minimal local stub
// (test-stubs/next-image) so this kit doesn't need the `next` package —
// see test-stubs/next-image.tsx and the README.
import Image from "../../test-stubs/next-image";
import { useState } from "react";
import styles from "./MotionTracking.module.css";

type ModeId = "depth" | "tracks" | "masks";

interface LegendRow {
  glyph: "ramp" | "track" | "frame" | "dynamic" | "static";
  label: string;
}

interface ModeConfig {
  id: ModeId;
  label: string;
  /* On-canvas caption sub-line: what this specific overlay is. */
  reading: string;
  /* Why this signal gates a labeled episode (QA purpose). */
  purpose: string;
  /* The QA metric that will eventually quantify it (kept honest below). */
  metric: string;
  /* Maps the marks on the canvas to their meaning, like the sibling legend. */
  legend: LegendRow[];
}

const MODES: ModeConfig[] = [
  {
    id: "depth",
    label: "Depth",
    reading: "per-pixel depth · near → far",
    purpose: "Validates metric scale — depth that drifts off scale poisons the policy.",
    metric: "depth RMSE",
    legend: [
      { glyph: "ramp", label: "Near surfaces (bright)" },
      { glyph: "ramp", label: "Far surfaces (dim)" },
    ],
  },
  {
    id: "tracks",
    label: "Point tracks",
    reading: "same surface points · followed across frames",
    purpose: "Validates trajectory reliability — only stable tracks can supervise actions.",
    metric: "track reprojection error",
    legend: [
      { glyph: "track", label: "Surface point + its path" },
      { glyph: "frame", label: "Earlier frame (ghost)" },
    ],
  },
  {
    id: "masks",
    label: "Motion masks",
    reading: "what moves vs. what stays still",
    purpose: "Validates action boundaries — the moving region is where the action lives.",
    metric: "dynamic / static IoU",
    legend: [
      { glyph: "dynamic", label: "Moving region (dynamic)" },
      { glyph: "static", label: "Held scene (static)" },
    ],
  },
];

const FEATURES = [
  {
    title: "Depth → metric geometry",
    body:
      "Per-pixel depth becomes a metric, gravity-aligned point cloud — the same " +
      "scaffold geometry QA scores. Depth that drifts off metric scale is caught " +
      "here, not in the policy.",
    spec: "depth · metric scale",
  },
  {
    title: "Point tracks → trajectory consistency",
    body:
      "Following the same surface points across frames recovers each object's " +
      "trajectory. Reprojection error tells us which tracks are reliable enough " +
      "to supervise a policy.",
    spec: "tracks · reprojection error",
  },
  {
    title: "Motion masks → action labels",
    body:
      "Separating what moves from what stays still segments actions over time, so " +
      "a sequence carries temporal labels — not a single frozen instant.",
    spec: "masks · temporal coverage",
  },
];

/* Schematic surface points used by the tracks overlay. Each is the SAME point
   followed across three frame positions (f0 ghost → f1 ghost → f2 current), so
   the trail reads as one point moving, not three separate dots. Coordinates are
   in the 160×90 viewBox. Illustrative — placed by hand, not model output. */
const TRACKS = [
  { id: "p0", f0: [70, 70], f1: [86, 62], f2: [104, 53] },
  { id: "p1", f0: [54, 40], f1: [70, 38], f2: [88, 36] },
  { id: "p2", f0: [98, 30], f1: [112, 34], f2: [128, 39] },
  { id: "p3", f0: [40, 60], f1: [52, 56], f2: [66, 51] },
] as const;

function LegendGlyph({ glyph }: { glyph: LegendRow["glyph"] }) {
  return <span className={`${styles.glyph} ${styles[`glyph_${glyph}`]}`} />;
}

export default function MotionTracking() {
  const [mode, setMode] = useState<ModeId>("depth");
  const active = MODES.find((m) => m.id === mode) ?? MODES[0];

  return (
    <section id="motion" className="landing-section">
      <div className="container">
        <p className="section-kicker">Motion QA</p>
        <h2 className="section-title">
          Is the <em>motion</em> trainable?
        </h2>
        <p className="section-lead">
          Geometry QA covers a single instant. Robot policies learn from motion,
          so the same sequence has to hold consistent depth, trajectories, and
          action boundaries across every frame. These are the signals we
          validate before motion data is labeled.
        </p>

        <div className={styles.demo}>
          <figure className={styles.frame}>
            <div
              className={styles.toggleRow}
              role="group"
              aria-label="Demo overlay mode"
            >
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={styles.toggle}
                  data-active={mode === m.id}
                  aria-pressed={mode === m.id}
                  onClick={() => setMode(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className={styles.stage}>
              <Image
                className={styles.backdrop}
                src="/assets/scenes/hackathon.jpg"
                alt="Sample scene still used as an illustrative backdrop"
                fill
                sizes="(max-width: 820px) 100vw, 70vw"
              />
              <div className={styles.scrim} aria-hidden="true" />

              {/* TODO: replace illustration with our own D4RT-on-OpenReality 4D capture */}

              {/* ── Depth overlay — banded near→far ramp anchored to the floor's
                  receding perspective, so depth reads as metric geometry. ── */}
              {mode === "depth" && (
                <svg
                  className={styles.overlay}
                  viewBox="0 0 160 90"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="mtDepth" x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0" className={styles.depthNear} />
                      <stop offset="0.55" className={styles.depthMid} />
                      <stop offset="1" className={styles.depthFar} />
                    </linearGradient>
                  </defs>
                  <rect
                    className={styles.depthFill}
                    x="0"
                    y="0"
                    width="160"
                    height="90"
                  />
                  {/* Iso-depth contour lines — equal-distance bands receding
                      into the scene; spacing widens with distance like real
                      perspective depth. */}
                  {[78, 64, 52, 42, 34, 28].map((y) => (
                    <line
                      key={y}
                      className={styles.depthBand}
                      x1="0"
                      y1={y}
                      x2="160"
                      y2={y}
                    />
                  ))}
                </svg>
              )}

              {/* ── Point tracks overlay — the SAME surface points followed
                  across three frames (ghosts → current), with motion vectors. ── */}
              {mode === "tracks" && (
                <svg
                  className={styles.overlay}
                  viewBox="0 0 160 90"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  {TRACKS.map((t) => (
                    <g key={t.id}>
                      {/* trail through the three frame positions */}
                      <polyline
                        className={styles.trackPath}
                        points={`${t.f0[0]},${t.f0[1]} ${t.f1[0]},${t.f1[1]} ${t.f2[0]},${t.f2[1]}`}
                      />
                      {/* earlier-frame ghosts */}
                      <circle
                        className={styles.trackGhost}
                        cx={t.f0[0]}
                        cy={t.f0[1]}
                        r="1.3"
                      />
                      <circle
                        className={styles.trackGhost}
                        cx={t.f1[0]}
                        cy={t.f1[1]}
                        r="1.3"
                      />
                      {/* current-frame point, labeled so it reads as a tracked id */}
                      <circle
                        className={styles.trackDot}
                        cx={t.f2[0]}
                        cy={t.f2[1]}
                        r="2"
                      />
                      <text
                        className={styles.trackLabel}
                        x={t.f2[0] + 3.5}
                        y={t.f2[1] - 2.5}
                      >
                        {t.id}
                      </text>
                    </g>
                  ))}
                </svg>
              )}

              {/* ── Motion masks overlay — moving subject highlighted, the held
                  scene desaturated/ghosted, so dynamic vs static is obvious. ── */}
              {mode === "masks" && (
                <div className={styles.maskOverlay} aria-hidden="true">
                  {/* dim the whole frame: everything is "static" by default */}
                  <div className={styles.maskStatic} />
                  {/* the one region that moves, cut back through to full color */}
                  <svg
                    className={styles.overlay}
                    viewBox="0 0 160 90"
                    preserveAspectRatio="none"
                  >
                    <path
                      className={styles.maskDynamic}
                      d="M58 84 L70 50 L84 46 L92 64 L88 86 Z"
                    />
                    <text className={styles.maskTag} x="62" y="44">
                      moving subject
                    </text>
                  </svg>
                </div>
              )}

              {/* ── On-canvas caption (what this is), mirrors SpatialAgentDemo ── */}
              <div className={styles.caption}>
                <span className={styles.captionTitle}>
                  Motion QA · {active.label.toLowerCase()}
                </span>
                <span className={styles.captionSub}>{active.reading}</span>
              </div>

              {/* ── On-canvas legend (what the marks mean), per mode ── */}
              <div className={styles.legend} aria-hidden="true">
                <span className={styles.legendTitle}>Legend</span>
                {active.legend.map((row) => (
                  <span className={styles.legendRow} key={row.label}>
                    <LegendGlyph glyph={row.glyph} />
                    {row.label}
                  </span>
                ))}
              </div>

              {/* ── Honest metric placeholder — no fabricated numbers ── */}
              <div className={styles.metricPill}>
                <span className={styles.metricLabel}>{active.metric}</span>
                <span className={styles.metricStatus}>validation in progress</span>
              </div>

              <span className={styles.illustrativeTag}>Illustrative</span>
            </div>

            {/* Per-mode "why it matters" — ties the overlay to its QA purpose. */}
            <p className={styles.purpose}>
              <span className={styles.purposeKey}>Why it gates labeling</span>
              {active.purpose}
            </p>

            <figcaption className={styles.caption_note_row}>
              <span className={styles.captionNote}>
                Illustrative — schematic diagram, not model output. Metrics shown
                as validation in progress.
              </span>
              <a
                className={styles.captionLink}
                href="https://deepmind.google/blog/d4rt-teaching-ai-to-see-the-world-in-four-dimensions/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Reference: Google DeepMind D4RT (CVPR 2026) ↗
              </a>
            </figcaption>
          </figure>

          <div className={styles.features}>
            {FEATURES.map((f) => (
              <div className={styles.feature} key={f.title}>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureBody}>{f.body}</p>
                <p className={styles.featureSpec}>{f.spec}</p>
              </div>
            ))}
          </div>
        </div>

        <p className={styles.specLine}>
          4D reconstruction + tracking · depth · point tracks · motion masks ·
          metrics: validation in progress
        </p>
      </div>
    </section>
  );
}
