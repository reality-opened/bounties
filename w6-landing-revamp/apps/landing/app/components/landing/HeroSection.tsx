"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import HeroScene, {
  type HeroSceneHandle,
  type HeroTelemetry,
} from "../HeroScene";
import { contactMailtoHref } from "./contact";
import styles from "./HeroSection.module.css";

function formatCoordinate(value: number): string {
  return `${value < 0 ? "-" : "+"}${Math.abs(value).toFixed(2)}`;
}

interface HeroSectionProps {
  ctaDisabled: boolean;
  onStartScanning: () => void;
}

export default function HeroSection({
  ctaDisabled,
  onStartScanning,
}: HeroSectionProps) {
  const heroSceneRef = useRef<HeroSceneHandle | null>(null);
  const [interacted, setInteracted] = useState(false);
  const [telemetry, setTelemetry] = useState<HeroTelemetry | null>(null);

  const revealScene = useCallback(() => {
    setInteracted(true);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      heroSceneRef.current?.startInteraction();
      revealScene();
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [revealScene]);

  const scrollToDataset = () => {
    document.getElementById("dataset")?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToHowItWorks = () => {
    document
      .getElementById("how-it-works")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="open-reality-stage">
      <HeroScene
        ref={heroSceneRef}
        onFirstInteraction={revealScene}
        onTelemetry={setTelemetry}
      />

      <div className="frame-marks" aria-hidden="true" />
      {telemetry ? (
        <div className="hero-hud" aria-hidden="true">
          <span className="hero-hud-row">
            <span className="hero-hud-key">cam</span>
            <span>
              x {formatCoordinate(telemetry.x)}&ensp;y {formatCoordinate(telemetry.y)}
              &ensp;z {formatCoordinate(telemetry.z)}
            </span>
          </span>
          <span className="hero-hud-row">
            <span className="hero-hud-key">pts</span>
            <span>{telemetry.points.toLocaleString("en-US")}</span>
          </span>
        </div>
      ) : null}
      <p className="hero-stamp" aria-hidden="true">
        VGGT-SLAM 2.0 · SL(4)
      </p>

      <div className={`landing-overlay ${interacted ? "active" : ""}`}>
        <div className={`landing-content ${interacted ? "active" : ""}`}>
          <div className="landing-logo anim-enter anim-enter-d1" aria-hidden="true">
            <object
              className="landing-logo-svg"
              data="/open_reality_logo_animated_teal.svg"
              type="image/svg+xml"
              width="120"
              height="120"
              aria-label="Open Reality animated logo"
            />
          </div>
          <p className="landing-kicker anim-enter anim-enter-d2">
            Robot training-data refinement
          </p>
          <h1 className={`${styles.headline} anim-enter anim-enter-d3`}>
            Turn messy teleop and human-demo video into{" "}
            <em>trainable, policy-ready robot datasets</em>
          </h1>
          <p className={`${styles.subhead} anim-enter anim-enter-d3`}>
            OpenReality audits and repairs the demonstrations your team already
            has, aligned camera and gripper trajectories, metric depth, grounded
            labels, and failure flags, exported straight to LeRobot.
          </p>
          <p className={`${styles.formats} anim-enter anim-enter-d4`}>
            <span className={styles.format}>LeRobot</span>
            <span className={styles.format}>
              NVIDIA GR00T <span className={styles.formatExp}>experimental</span>
            </span>
            <span className={styles.format}>
              Isaac sim2real{" "}
              <span className={styles.formatExp}>experimental</span>
            </span>
          </p>
          <div className="hero-cta-row anim-enter anim-enter-d4">
            <button
              id="startScanningBtn"
              className="button-primary"
              type="button"
              disabled={ctaDisabled}
              onClick={onStartScanning}
            >
              Get a data audit
            </button>
            <button
              className="btn-secondary"
              type="button"
              onClick={scrollToDataset}
            >
              See a before/after dataset ↓
            </button>
            <a className="btn-secondary" href={contactMailtoHref}>
              Get in touch
            </a>
          </div>
          <p className="hero-hint anim-enter anim-enter-d5">
            Live VGGT-SLAM reconstruction, drag to inspect, scroll to zoom.
          </p>
        </div>
      </div>

      <button
        type="button"
        className={styles.learnMore}
        onClick={scrollToHowItWorks}
        aria-label="Scroll to how it works"
      >
        <span>How it works</span>
        <svg
          className={styles.learnMoreChevron}
          width="22"
          height="13"
          viewBox="0 0 22 13"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M2 2l9 9 9-9"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </section>
  );
}
