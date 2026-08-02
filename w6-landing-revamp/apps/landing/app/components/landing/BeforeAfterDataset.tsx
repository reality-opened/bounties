import styles from "./BeforeAfterDataset.module.css";

/* The before/after proof: a raw demo a team already has, and the trainable
   episode OpenReality returns. Channels marked `added` are what the refinement
   pass recovers. No fabricated metrics — the policy-lift and salvage numbers
   are explicit "validation in progress" placeholders. */

type Channel = { name: string; tag: string; added?: boolean };

const BEFORE: Channel[] = [
  { name: "RGB frames", tag: "mp4 · rgb" },
  { name: "Action / state log", tag: "csv · raw" },
];

const AFTER: Channel[] = [
  { name: "RGB frames", tag: "mp4 · rgb" },
  { name: "Metric depth", tag: "depth · per-frame", added: true },
  { name: "Camera + gripper trajectory", tag: "SE(3) · per-frame", added: true },
  { name: "Grounded object labels", tag: "labels · 3D anchored", added: true },
  { name: "Per-frame quality flags", tag: "flags · drift · occlusion", added: true },
];

const LOADER = `from lerobot.common.datasets.lerobot_dataset import LeRobotDataset

ds = LeRobotDataset("openreality/your-demos-refined")
ep = ds[0]
ep["observation.images.cam"]   # rgb frames        (kept)
ep["observation.depth"]        # metric depth      (added)
ep["observation.state"]        # SE(3) trajectory  (added)
ep["annotations.objects"]      # grounded labels   (added)
ep["quality.flags"]            # failure flags     (added)`;

const VALIDATING: { label: string; detail: string }[] = [
  {
    label: "Policy lift",
    detail:
      "Same demos, same model, baseline vs refined. Metric = task success and data-efficiency.",
  },
  {
    label: "Dataset salvage",
    detail:
      "Demos flagged for drift, occlusion, missing contact, or bad calibration, then repaired or rejected.",
  },
];

function ChannelList({ channels }: { channels: Channel[] }) {
  return (
    <ul className={styles.channels}>
      {channels.map((channel) => (
        <li
          className={`${styles.channel} ${channel.added ? styles.added : ""}`}
          key={channel.name}
        >
          <span className={styles.channelName}>
            {channel.added ? <span className={styles.plus}>+</span> : null}
            {channel.name}
          </span>
          <span className={styles.channelTag}>{channel.tag}</span>
        </li>
      ))}
    </ul>
  );
}

export default function BeforeAfterDataset() {
  return (
    <section id="dataset" className="landing-section">
      <div className="container">
        <p className="section-kicker">Before / after</p>
        <h2 className="section-title">
          A raw demo in, a <em>trainable episode</em> out
        </h2>
        <p className="section-lead">
          Start from the demonstrations your team already has. OpenReality
          returns the same episode with metric geometry, trajectories, grounded
          labels, and quality flags, in LeRobot format your policies train on
          directly.
        </p>

        <div className={styles.split}>
          <div className={styles.col}>
            <p className={styles.colHead}>
              <span className={styles.colKind}>before</span>
              Raw teleop / human-hand demo
            </p>
            <ChannelList channels={BEFORE} />
          </div>

          <div className={styles.arrow} aria-hidden="true">
            <span>refine</span>
            <svg width="40" height="12" viewBox="0 0 40 12" fill="none">
              <path
                d="M0 6h36m0 0l-5-5m5 5l-5 5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className={`${styles.col} ${styles.colOut}`}>
            <p className={styles.colHead}>
              <span className={`${styles.colKind} ${styles.colKindOut}`}>
                after
              </span>
              Refined LeRobot episode
            </p>
            <ChannelList channels={AFTER} />
          </div>
        </div>

        <div className={styles.loaderBlock}>
          <p className={styles.loaderHead}>Load it like any LeRobot dataset</p>
          <pre className={styles.loader}>
            <code>{LOADER}</code>
          </pre>
        </div>

        <div className={styles.validating}>
          <p className={styles.validatingHead}>
            <span className={styles.badge}>Validation in progress</span>
            What we are measuring next
          </p>
          <ul className={styles.validatingList}>
            {VALIDATING.map((item) => (
              <li className={styles.validatingItem} key={item.label}>
                <span className={styles.validatingLabel}>{item.label}</span>
                <span className={styles.validatingDetail}>{item.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
