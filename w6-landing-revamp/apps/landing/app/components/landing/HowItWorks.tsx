import type { ReactNode } from "react";
import styles from "./HowItWorks.module.css";

type Stage = {
  role: string;
  title: string;
  body: string;
  artifact: string;
  glyph: ReactNode;
};

/* Schematic, hairline glyphs in the surveyor's-instrument register. */
const svgProps = {
  viewBox: "0 0 32 32",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const DemoGlyph = (
  <svg {...svgProps}>
    <rect x="4" y="7" width="24" height="18" rx="2" />
    <path d="M4 12h24" />
    <path d="M13.5 14l6 3-6 3z" fill="currentColor" stroke="none" />
  </svg>
);

const SlamGlyph = (
  <svg {...svgProps}>
    <rect x="4" y="13" width="5" height="6" rx="1" />
    <path d="M9 14.5l7-2.5M9 17.5l7 2.5" />
    <circle cx="19" cy="10" r="1" fill="currentColor" stroke="none" />
    <circle cx="24" cy="13" r="1" fill="currentColor" stroke="none" />
    <circle cx="20" cy="16" r="1" fill="currentColor" stroke="none" />
    <circle cx="25" cy="18" r="1" fill="currentColor" stroke="none" />
    <circle cx="21" cy="21" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const GroundGlyph = (
  <svg {...svgProps}>
    <rect x="5" y="12" width="11" height="9" rx="1" />
    <path d="M5 25c7-1 13 1 22-7" />
    <path d="M23 6v8" />
    <path d="M23 6h5l-1.6 2 1.6 2h-5" fill="currentColor" stroke="none" />
  </svg>
);

const DatasetGlyph = (
  <svg {...svgProps}>
    <rect x="6" y="8" width="20" height="4.5" rx="1" />
    <rect x="6" y="14" width="20" height="4.5" rx="1" />
    <rect x="6" y="20" width="20" height="4.5" rx="1" />
    <circle cx="9.5" cy="10.25" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="9.5" cy="16.25" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="9.5" cy="22.25" r="0.8" fill="currentColor" stroke="none" />
  </svg>
);

const SimGlyph = (
  <svg {...svgProps}>
    <path d="M7 11l9-5 9 5v10l-9 5-9-5z" />
    <path d="M7 11l9 5 9-5" />
    <path d="M16 16v10" />
  </svg>
);

const TRUNK: Stage[] = [
  {
    role: "input · capture",
    title: "Demo video",
    body:
      "Your teleop or human-hand demo. Ordinary RGB video, no rig or depth sensor.",
    artifact: "mp4 · rgb frames",
    glyph: DemoGlyph,
  },
  {
    role: "reconstruct · slam",
    title: "3D reconstruction",
    body:
      "VGGT-SLAM recovers metric, gravity-aligned geometry and per-frame camera pose.",
    artifact: "point cloud · SE(3) pose",
    glyph: SlamGlyph,
  },
  {
    role: "ground + qa · repair",
    title: "Grounding + QA",
    body:
      "Objects get labeled and anchored in 3D. Trajectories are extracted, checked, and flagged where a take fails.",
    artifact: "trajectories · labels · flags",
    glyph: GroundGlyph,
  },
  {
    role: "export · dataset",
    title: "LeRobot dataset",
    body:
      "Clean, scale-consistent episodes in LeRobot format, ready to train a policy.",
    artifact: "lerobot · episodes",
    glyph: DatasetGlyph,
  },
];

const ISAAC: Stage = {
  role: "preview · experimental",
  title: "Isaac sim preview",
  body:
    "Optional preview of episodes replayed in Isaac. Unvalidated, with no sim-to-real claims yet.",
  artifact: "usd · sim preview",
  glyph: SimGlyph,
};

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="landing-section">
      <div className="container">
        <p className="section-kicker">How it works</p>
        <h2 className="section-title">
          Raw demo video in, <em>policy-ready episodes</em> out
        </h2>
        <p className="section-lead">
          OpenReality runs every demo through one pipeline: reconstruct it in
          metric 3D, ground and QA the trajectories, then export clean LeRobot
          episodes your policies can train on.
        </p>

        <div className={styles.pipeline}>
          <ol className={styles.trunk} aria-label="Refinement pipeline, four stages">
            {TRUNK.map((stage, index) => (
              <li className={styles.node} key={stage.title}>
                <div className={styles.head}>
                  <span className={styles.glyph} aria-hidden="true">
                    {stage.glyph}
                  </span>
                  <span className={styles.role}>{stage.role}</span>
                </div>
                <h3 className={styles.title}>{stage.title}</h3>
                <p className={styles.body}>{stage.body}</p>
                <span className={styles.artifact}>{stage.artifact}</span>
                {index < TRUNK.length - 1 && (
                  <span className={styles.rail} aria-hidden="true">
                    <span className={styles.railDot} />
                  </span>
                )}
              </li>
            ))}
          </ol>

          <div className={styles.branch} aria-label="Experimental downstream stage">
            <div className={styles.branchInner}>
              <span className={styles.branchConnector} aria-hidden="true" />
              <div className={`${styles.node} ${styles.nodeExperimental}`}>
                <div className={styles.head}>
                  <span className={styles.glyph} aria-hidden="true">
                    {ISAAC.glyph}
                  </span>
                  <span className={`${styles.role} ${styles.roleWarn}`}>
                    {ISAAC.role}
                  </span>
                </div>
                <span className={styles.badge}>Experimental / preview</span>
                <h3 className={styles.title}>{ISAAC.title}</h3>
                <p className={styles.body}>{ISAAC.body}</p>
                <span className={styles.artifact}>{ISAAC.artifact}</span>
              </div>
            </div>
          </div>
        </div>

        <p className={styles.spec}>
          pipeline · monocular video → metric 3D → grounded + QA trajectories →
          lerobot episodes · isaac preview (experimental)
        </p>
      </div>
    </section>
  );
}
