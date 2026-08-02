"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
// KIT NOTE: path shortened from the original "../../utils/webgl" — this kit
// flattens app/utils/ to src/utils/, one level up from src/components/.
import { shouldUseStaticFallback } from "../utils/webgl";
import styles from "./CaptureComparison.module.css";

/*
  Capture comparison — data fidelity.

  Three scanned objects (mug, lion, bus), each shown as a casual-vs-deliberate
  pair rendered in true per-point RGB straight from the PLY (PLYLoader sets the
  geometry `color` attribute; PointsMaterial reads it via vertexColors). No
  recolouring, no decoded scalar — what you see is the captured colour.

  The pair illustrates a capture-coverage gap. The deliberate cloud is a slow,
  multi-view orbit: dense, complete, every side observed. The casual cloud is a
  SIMULATED degradation of the same scan (subsampled + noised + clipped on one
  side) to show what a quick single pass leaves behind: sparse, noisy geometry
  with a whole side never reconstructed. It is an illustrative demo asset, not
  two separate field captures — see the in-section note.
*/

type CloudSide = "casual" | "deliberate";
type ObjectKey = "mug" | "lion" | "bus";

interface CloudConfig {
  side: CloudSide;
  label: string;
  note: string;
  src: string;
  coverage: string;
  pointSize: number;
}

interface ObjectConfig {
  key: ObjectKey;
  /** Label shown in the selector tabs. */
  label: string;
  /** Full model name used in the CC-BY attribution line. */
  modelName: string;
  casualSrc: string;
  deliberateSrc: string;
  /**
   * Point sizes tuned per object so each reads clearly.
   * Lion and bus are geometrically denser than the mug, so they use smaller
   * sizes to avoid over-blooming.
   */
  casualPointSize: number;
  deliberatePointSize: number;
}

const OBJECTS: ObjectConfig[] = [
  {
    key: "mug",
    label: "Ceramic mug",
    modelName: "Cole Hardware Mug Classic Blue",
    casualSrc: "/assets/compare/mug_casual.ply",
    deliberateSrc: "/assets/compare/mug_deliberate.ply",
    casualPointSize: 0.016,
    deliberatePointSize: 0.012,
  },
  {
    key: "lion",
    label: "Toy lion",
    modelName: "Schleich Lion Action Figure",
    casualSrc: "/assets/compare/lion_casual.ply",
    deliberateSrc: "/assets/compare/lion_deliberate.ply",
    casualPointSize: 0.013,
    deliberatePointSize: 0.01,
  },
  {
    key: "bus",
    label: "Toy school bus",
    modelName: "Sonny School Bus",
    casualSrc: "/assets/compare/bus_casual.ply",
    deliberateSrc: "/assets/compare/bus_deliberate.ply",
    casualPointSize: 0.013,
    deliberatePointSize: 0.01,
  },
];

// Casual on the left (the problem), deliberate on the right (the result).
function getClouds(obj: ObjectConfig): CloudConfig[] {
  return [
    {
      side: "casual",
      label: "Casual pass",
      note: "quick single sweep",
      src: obj.casualSrc,
      coverage: "partial · one side missing",
      pointSize: obj.casualPointSize,
    },
    {
      side: "deliberate",
      label: "Deliberate pass",
      note: "slow multi-view orbit",
      src: obj.deliberateSrc,
      coverage: "complete · all sides",
      pointSize: obj.deliberatePointSize,
    },
  ];
}

// General reasons a quick pass leaves gaps — context for the reader, not
// verified per-region labels on this specific asset.
const WHY: { term: string; body: string }[] = [
  {
    term: "Low view overlap",
    body: "Surfaces seen in too few frames stay sparse and noisy.",
  },
  {
    term: "Unvisited angles",
    body: "A side you never walk around never gets reconstructed.",
  },
  {
    term: "Fast, shaky motion",
    body: "Motion blur and weak parallax thin out the cloud.",
  },
];

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

class PointCloudEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private gridHelper: THREE.GridHelper;
  private points: THREE.Points | null = null;
  private animationId: number | null = null;
  private disposed = false;
  private readonly onResizeBound = () => this.onResize();
  private readonly onControlStartBound = () => this.stopAutoRotate();
  private readonly onThemeChangeBound = () => this.updateThemeColors();

  constructor(
    private readonly container: HTMLElement,
    src: string,
    private readonly pointSize: number,
    autoRotate: boolean,
    private readonly onMeasured: (count: number) => void,
  ) {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);

    this.scene = new THREE.Scene();
    const paperBrightHex = getComputedStyle(document.documentElement)
      .getPropertyValue('--paper-bright')
      .trim();
    this.scene.background = new THREE.Color(paperBrightHex || '#f6f3e8');
    this.scene.fog = new THREE.Fog(paperBrightHex || '#f6f3e8', 5, 14);

    this.camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 100);
    this.camera.position.set(0, 0.9, 3.6);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 1.4;
    this.controls.maxDistance = 8;
    this.controls.autoRotate = autoRotate;
    this.controls.autoRotateSpeed = 0.45;
    this.controls.target.set(0, 0, 0);
    this.controls.addEventListener("start", this.onControlStartBound);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    this.gridHelper = new THREE.GridHelper(5, 10, 0x9c958a, 0xc7bfae);
    this.gridHelper.position.y = -1.05;
    this.scene.add(this.gridHelper);

    void this.loadPointCloud(src);
    window.addEventListener("resize", this.onResizeBound);
    window.addEventListener("or-themechange", this.onThemeChangeBound);
    this.animate();
  }

  private updateThemeColors(): void {
    const paperBrightHex = getComputedStyle(document.documentElement)
      .getPropertyValue('--paper-bright')
      .trim();
    const paperColor = new THREE.Color(paperBrightHex || '#f6f3e8');
    this.scene.background = paperColor;
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color = paperColor;
    }
  }

  private async loadPointCloud(src: string): Promise<void> {
    const loader = new PLYLoader();

    try {
      const geometry = await loader.loadAsync(src);

      if (this.disposed) {
        geometry.dispose();
        return;
      }

      this.normalizeGeometry(geometry);
      const posAttr = geometry.getAttribute("position");
      const count = posAttr ? posAttr.count : 0;

      // Render in TRUE colour: PLYLoader puts per-point RGB into the `color`
      // attribute; PointsMaterial reads it straight through with vertexColors.
      // Keep material.color white so the captured colour is not tinted.
      const hasColor = geometry.hasAttribute("color");
      const material = new THREE.PointsMaterial({
        size: this.pointSize,
        sizeAttenuation: true,
        vertexColors: hasColor,
        color: hasColor ? 0xffffff : 0x6f6a5e,
      });

      this.points = new THREE.Points(geometry, material);
      this.scene.add(this.points);

      this.frameCloud();
      this.onMeasured(count);
    } catch (error) {
      console.error("Error loading point cloud:", error);
    }
  }

  // The demo clouds are already centred and normalised to a unit sphere; this
  // re-centres on the visible points and scales to a consistent frame size, so
  // both viewers read the same regardless of the casual cloud's missing side.
  private normalizeGeometry(geometry: THREE.BufferGeometry): void {
    geometry.computeBoundingBox();
    const boundingBox = geometry.boundingBox;
    if (!boundingBox) {
      return;
    }

    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    boundingBox.getCenter(center);
    boundingBox.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z, 1);
    const scale = 1.7 / maxDim;

    geometry.translate(-center.x, -center.y, -center.z);
    geometry.scale(scale, scale, scale);
    geometry.computeBoundingBox();
  }

  private frameCloud(): void {
    const width = Math.max(this.container.clientWidth, 1);
    const isNarrow = width < 480;
    this.camera.position.set(0, isNarrow ? 1.0 : 0.9, isNarrow ? 4.2 : 3.6);
    this.camera.lookAt(0, 0, 0);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  private stopAutoRotate(): void {
    this.controls.autoRotate = false;
  }

  public startInteraction(): void {
    this.stopAutoRotate();
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  private onResize(): void {
    const width = Math.max(this.container.clientWidth, 1);
    const height = Math.max(this.container.clientHeight, 1);

    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.frameCloud();
  }

  public dispose(): void {
    this.disposed = true;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener("resize", this.onResizeBound);
    window.removeEventListener("or-themechange", this.onThemeChangeBound);
    this.controls.removeEventListener("start", this.onControlStartBound);
    this.controls.dispose();

    if (this.points) {
      this.scene.remove(this.points);
      this.points.geometry.dispose();
      (this.points.material as THREE.Material).dispose();
      this.points = null;
    }

    this.scene.remove(this.gridHelper);
    this.gridHelper.geometry.dispose();
    const gridMaterial = this.gridHelper.material;
    if (Array.isArray(gridMaterial)) {
      gridMaterial.forEach((material) => material.dispose());
    } else {
      gridMaterial.dispose();
    }

    this.renderer.dispose();
    this.container.replaceChildren();
  }
}

function PointCloudViewer({
  src,
  label,
  pointSize,
  onMeasured,
}: {
  src: string;
  label: string;
  pointSize: number;
  /** Receives the point count, or null when there is no 3D viewer to measure. */
  onMeasured: (count: number | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<PointCloudEngine | null>(null);
  const onMeasuredRef = useRef(onMeasured);
  onMeasuredRef.current = onMeasured;
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    if (shouldUseStaticFallback()) {
      setFallback(true);
      onMeasuredRef.current(null);
      return;
    }

    let engine: PointCloudEngine;
    try {
      engine = new PointCloudEngine(
        container,
        src,
        pointSize,
        !prefersReducedMotion(),
        (count) => onMeasuredRef.current(count),
      );
    } catch (error) {
      console.error(
        "CaptureComparison: WebGL unavailable, using static fallback:",
        error,
      );
      container.replaceChildren();
      setFallback(true);
      onMeasuredRef.current(null);
      return;
    }
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [src, pointSize]);

  const handleInteraction = () => {
    engineRef.current?.startInteraction();
  };

  return (
    <div
      ref={containerRef}
      className={
        fallback
          ? `${styles.viewerCanvas} ${styles.viewerFallback}`
          : styles.viewerCanvas
      }
      onPointerDownCapture={handleInteraction}
      onTouchStartCapture={handleInteraction}
      aria-label={
        fallback
          ? `${label} — 3D preview unavailable on this device`
          : `${label} — real-colour demo point cloud, drag to orbit`
      }
    >
      {fallback ? (
        <span className={styles.fallbackNote}>3D preview unavailable</span>
      ) : null}
    </div>
  );
}

// Point count per side: null = still loading, "unavailable" = no 3D viewer
// (WebGL missing or ?lite=1), number = measured from the loaded cloud.
type CountState = number | "unavailable" | null;

export default function CaptureComparison() {
  const [selectedObject, setSelectedObject] = useState<ObjectKey>("mug");
  const [counts, setCounts] = useState<Record<CloudSide, CountState>>({
    casual: null,
    deliberate: null,
  });

  // Reset point counts when the object switches — the old counts are stale.
  // "unavailable" is sticky: this effect runs after the child viewers' mount
  // effects, and WebGL support doesn't change between object switches.
  useEffect(() => {
    setCounts((s) => ({
      casual: s.casual === "unavailable" ? "unavailable" : null,
      deliberate: s.deliberate === "unavailable" ? "unavailable" : null,
    }));
  }, [selectedObject]);

  const handleCasual = useCallback(
    (n: number | null) =>
      setCounts((s) => ({ ...s, casual: n ?? "unavailable" })),
    [],
  );
  const handleDeliberate = useCallback(
    (n: number | null) =>
      setCounts((s) => ({ ...s, deliberate: n ?? "unavailable" })),
    [],
  );
  const handlers: Record<CloudSide, (n: number | null) => void> = {
    casual: handleCasual,
    deliberate: handleDeliberate,
  };

  const currentObj = OBJECTS.find((o) => o.key === selectedObject)!;
  const clouds = getClouds(currentObj);

  return (
    <section id="compare" className="landing-section compare-section">
      <div className="container">
        <p className="section-kicker">Data fidelity</p>
        <h2 className="section-title">
          Capture quality you can <em>see</em>
        </h2>
        <p className="section-lead">
          Reconstruction quality is decided at capture time. Move slowly around
          an object with plenty of overlap and you get dense, complete geometry.
          A quick casual pass leaves gaps — sparse points, noise, whole regions
          never seen. Here is the same {currentObj.label.toLowerCase()} captured
          both ways, in true colour. Drag to orbit; turn the casual capture to
          find the side it never saw.
        </p>

        <div className={styles.legend}>
          <span className={styles.legendTitle}>What to look for</span>
          <div className={styles.legendKey}>
            <span className={styles.legendItem}>
              <span
                className={`${styles.legendSwatch} ${styles.legendDense}`}
                aria-hidden="true"
              />
              Dense, complete — every side observed
            </span>
            <span className={styles.legendItem}>
              <span
                className={`${styles.legendSwatch} ${styles.legendSparse}`}
                aria-hidden="true"
              />
              Sparse, with gaps — a whole side missing
            </span>
          </div>
        </div>

        <p className={styles.disclaimer}>
          <span className={styles.disclaimerTag}>Illustrative demo</span>
          Both clouds are the same scanned object in real per-point colour. The
          casual capture is a simulated degradation — subsampled, noised, and
          clipped on one side — to show a coverage gap, not two separate field
          captures.
        </p>

        {/* Object selector — surveyor's-instrument style segmented control */}
        <div
          className={styles.selector}
          role="group"
          aria-label="Select object to compare"
        >
          {OBJECTS.map((obj) => (
            <button
              key={obj.key}
              type="button"
              className={`${styles.selectorTab} ${
                selectedObject === obj.key ? styles.selectorTabActive : ""
              }`}
              aria-pressed={selectedObject === obj.key}
              onClick={() => setSelectedObject(obj.key)}
            >
              {obj.label}
            </button>
          ))}
        </div>

        <div className={styles.grid}>
          {clouds.map((cloud) => {
            const count = counts[cloud.side];
            return (
              <figure className={styles.card} key={cloud.side}>
                <div className={styles.cardHeader}>
                  <span
                    className={`${styles.cardLabel} ${
                      cloud.side === "deliberate" ? styles.cardLabelAccent : ""
                    }`}
                  >
                    {cloud.label}
                  </span>
                  <span className={styles.cardNote}>{cloud.note}</span>
                </div>
                <div className={styles.cardMedia}>
                  <PointCloudViewer
                    src={cloud.src}
                    label={cloud.label}
                    pointSize={cloud.pointSize}
                    onMeasured={handlers[cloud.side]}
                  />
                </div>
                <dl className={styles.specs}>
                  <div className={styles.specRow}>
                    <dt className={styles.specTerm}>points</dt>
                    <dd className={styles.specVal}>
                      {count === null
                        ? "loading…"
                        : count === "unavailable"
                          ? "—"
                          : count.toLocaleString()}
                    </dd>
                  </div>
                  <div className={styles.specRow}>
                    <dt className={styles.specTerm}>coverage</dt>
                    <dd
                      className={`${styles.specVal} ${
                        cloud.side === "casual" ? styles.specValWarn : ""
                      }`}
                    >
                      {cloud.coverage}
                    </dd>
                  </div>
                </dl>
                <figcaption className={styles.cardCaption}>
                  {count === "unavailable"
                    ? "3D preview unavailable on this device"
                    : "Real-colour demo cloud · drag to orbit"}
                </figcaption>
              </figure>
            );
          })}
        </div>

        <div className={styles.why}>
          <span className={styles.whyHead}>
            Where a casual pass loses coverage
          </span>
          <dl className={styles.whyList}>
            {WHY.map((item) => (
              <div className={styles.whyItem} key={item.term}>
                <dt className={styles.whyTerm}>{item.term}</dt>
                <dd className={styles.whyBody}>{item.body}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className={styles.takeaway}>
          <span className={styles.takeawayMark} aria-hidden="true">
            ▸
          </span>
          Deliberate, multi-view capture returns dense, complete geometry you can
          train on. A casual pass returns sparse, holey clouds — the gaps a
          policy can&apos;t learn from, and the regions a refinement pass has to
          re-observe before data ships.
        </p>

        <p className={styles.attribution}>
          Demo object: &ldquo;{currentObj.modelName},&rdquo; Google Scanned
          Objects, © Google LLC, CC BY 4.0 (
          <a
            className={styles.attributionLink}
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noreferrer"
          >
            https://creativecommons.org/licenses/by/4.0/
          </a>
          ).
        </p>
      </div>
    </section>
  );
}
