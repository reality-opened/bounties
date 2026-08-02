"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { shouldUseStaticFallback } from "../../utils/webgl";
import styles from "./SpatialAgentDemo.module.css";

// TODO: swap in our own robot/sim walkthrough capture (this is a real Open
// Reality capture; the agent sweep, anchors, and labels below are illustrative).
const SCENE_URL = "/assets/compare/deliberate.ply";

type AnchorKind = "object" | "flag";

interface AnchorSpec {
  label: string;
  detail: string;
  kind: AnchorKind;
  position: readonly [number, number, number];
  size: readonly [number, number, number];
}

// Illustrative object anchors placed within the normalized capture. The agent
// "grounds" each one as its sweep reaches it (see EVENTS). Teal = grounded
// object; amber = a region flagged as a failing take.
const ANCHORS: readonly AnchorSpec[] = [
  {
    label: "chair",
    detail: "1.2 m",
    kind: "object",
    position: [-0.5, -0.32, 0.28],
    size: [0.42, 0.6, 0.42],
  },
  {
    label: "table",
    detail: "2.1 m",
    kind: "object",
    position: [0.42, -0.42, -0.05],
    size: [0.78, 0.34, 0.5],
  },
  {
    label: "doorway",
    detail: "3.0 m",
    kind: "object",
    position: [-0.06, -0.05, -0.62],
    size: [0.5, 0.95, 0.18],
  },
  {
    label: "window region",
    detail: "low coverage",
    kind: "flag",
    position: [0.52, 0.26, -0.4],
    size: [0.5, 0.55, 0.16],
  },
];

type LogKind = "info" | "ground" | "flag";

interface LogEvent {
  at: number; // sweep progress [0,1] at which this fires
  anchorIndex: number | null;
  kind: LogKind;
  text: string;
}

// One timeline drives the agent marker, the anchor reveals, AND this log — so
// every line corresponds to what is visibly happening in the viewer.
const EVENTS: readonly LogEvent[] = [
  { at: 0.0, anchorIndex: null, kind: "info", text: "00:00  sweep started · entering capture" },
  { at: 0.18, anchorIndex: 0, kind: "ground", text: "00:03  grounded · chair · 1.2 m" },
  { at: 0.42, anchorIndex: 1, kind: "ground", text: "00:07  grounded · table · 2.1 m" },
  { at: 0.66, anchorIndex: 2, kind: "ground", text: "00:11  grounded · doorway · 3.0 m" },
  { at: 0.86, anchorIndex: 3, kind: "flag", text: "00:14  flag · window region · low coverage" },
  { at: 0.99, anchorIndex: null, kind: "info", text: "00:16  3 objects anchored · 1 take flagged" },
];

interface LogLine {
  text: string;
  kind: LogKind;
}

const SWEEP_SECONDS = 16; // one full agent sweep of the scene
const HOLD_SECONDS = 2.6; // pause on the finished frame before looping
const REVEAL_SECONDS = 0.45; // anchor box fade/scale-in
const RESUME_AFTER_MS = 3200; // resume the sweep after the user lets go

const GRID_Y = -1.05;
const COLOR_OBJECT = 0x0aa5b5; // teal — grounded object
const COLOR_FLAG = 0xd99a44; // amber — flagged take
const COLOR_PATH = 0x0e7c8a; // teal — sweep path
const UP = new THREE.Vector3(0, 1, 0);

// Path the agent viewpoint travels — a closed loop through the capture.
const PATH_POINTS: readonly THREE.Vector3[] = [
  new THREE.Vector3(-0.6, -0.12, 0.62),
  new THREE.Vector3(0.55, -0.08, 0.6),
  new THREE.Vector3(0.74, -0.14, -0.3),
  new THREE.Vector3(-0.08, -0.2, -0.66),
  new THREE.Vector3(-0.74, -0.12, -0.04),
];

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

interface AnchorObject {
  group: THREE.Group;
  edgeMat: THREE.LineBasicMaterial;
  fillMat: THREE.MeshBasicMaterial;
  geometry: THREE.BoxGeometry;
  edges: THREE.EdgesGeometry;
  labelPoint: THREE.Vector3;
  revealed: boolean;
  revealT: number;
}

interface ViewerCallbacks {
  onEvent: (eventIndex: number) => void;
  onReset: () => void;
}

class SpatialAgentViewer {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly controls: OrbitControls;
  private readonly timer = new THREE.Timer();
  private readonly reduced: boolean;

  private cloud: THREE.Points | null = null;
  private animationId: number | null = null;
  private disposed = false;

  private readonly gridHelper: THREE.GridHelper;
  private readonly curve: THREE.CatmullRomCurve3;
  private readonly pathLine: THREE.Line;
  private readonly agent: THREE.Group;
  private readonly cone: THREE.Mesh;
  private readonly stemGeo: THREE.BufferGeometry;
  private readonly stemLine: THREE.Line;
  private readonly anchors: AnchorObject[] = [];

  private width: number;
  private height: number;
  private pathTime = 0;
  private progress = 0;
  private eventCursor = 0;
  private lastCycleIndex = -1;
  private autoPath: boolean;
  private resumeTimer: ReturnType<typeof setTimeout> | null = null;

  // Scratch objects reused each frame (no per-frame allocation).
  private readonly _pos = new THREE.Vector3();
  private readonly _tan = new THREE.Vector3();
  private readonly _quat = new THREE.Quaternion();
  private readonly _proj = new THREE.Vector3();

  private readonly onResizeBound = () => this.onResize();
  private readonly onControlStartBound = () => this.onUserGrab();

  constructor(
    private readonly container: HTMLElement,
    private readonly labelEls: readonly (HTMLElement | null)[],
    private readonly progressEl: HTMLElement | null,
    private readonly agentEl: HTMLElement | null,
    private readonly callbacks: ViewerCallbacks,
  ) {
    this.reduced = prefersReducedMotion();
    this.autoPath = !this.reduced;

    this.width = Math.max(container.clientWidth, 1);
    this.height = Math.max(container.clientHeight, 1);

    this.scene = new THREE.Scene();
    // Dark ink field inside the card (the surrounding section stays on paper).
    this.scene.background = new THREE.Color(0x16150f);
    this.scene.fog = new THREE.Fog(0x16150f, 6.5, 16);

    const narrow = this.width < 520;
    this.camera = new THREE.PerspectiveCamera(
      48,
      this.width / this.height,
      0.1,
      100,
    );
    this.camera.position.set(narrow ? 2.7 : 2.3, narrow ? 1.7 : 1.45, narrow ? 4.5 : 3.7);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 2.4;
    this.controls.maxDistance = 9;
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    this.controls.addEventListener("start", this.onControlStartBound);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.8));

    this.gridHelper = new THREE.GridHelper(6, 12, COLOR_PATH, 0x3a382e);
    this.gridHelper.position.y = GRID_Y;
    (this.gridHelper.material as THREE.Material).opacity = 0.34;
    (this.gridHelper.material as THREE.Material).transparent = true;
    this.scene.add(this.gridHelper);

    // Sweep path (the visible route the agent viewpoint travels).
    this.curve = new THREE.CatmullRomCurve3(
      PATH_POINTS.map((p) => p.clone()),
      true,
      "catmullrom",
      0.5,
    );
    this.pathLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(this.curve.getPoints(180)),
      new THREE.LineBasicMaterial({
        color: COLOR_PATH,
        transparent: true,
        opacity: 0.5,
      }),
    );
    this.scene.add(this.pathLine);

    // Agent viewpoint marker: a teal cone pointing along travel, with a base
    // node and a stem dropped to the ground so its position reads clearly.
    this.agent = new THREE.Group();
    this.cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.24, 18),
      new THREE.MeshBasicMaterial({ color: COLOR_OBJECT }),
    );
    const baseNode = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 16, 16),
      new THREE.MeshBasicMaterial({ color: COLOR_OBJECT }),
    );
    this.agent.add(this.cone, baseNode);
    this.scene.add(this.agent);

    this.stemGeo = new THREE.BufferGeometry();
    this.stemGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(6), 3),
    );
    this.stemLine = new THREE.Line(
      this.stemGeo,
      new THREE.LineBasicMaterial({
        color: COLOR_OBJECT,
        transparent: true,
        opacity: 0.4,
      }),
    );
    this.scene.add(this.stemLine);

    this.buildAnchors();
    this.updateAgent();

    if (this.reduced) {
      // Static: reveal everything at once, no scripted motion.
      for (const anchor of this.anchors) {
        anchor.revealed = true;
        anchor.revealT = 1;
      }
      this.applyAnchorVisual();
      if (this.progressEl) {
        // No scripted sweep here, so show the bar complete rather than stuck.
        this.progressEl.style.width = "100%";
      }
    }

    void this.loadCloud();
    // Page Visibility API keeps deltas sane across tab switches.
    this.timer.connect(document);
    window.addEventListener("resize", this.onResizeBound);
    this.animate();
  }

  private buildAnchors(): void {
    for (const spec of ANCHORS) {
      const [w, h, d] = spec.size;
      const [x, y, z] = spec.position;
      const color = spec.kind === "flag" ? COLOR_FLAG : COLOR_OBJECT;

      const geometry = new THREE.BoxGeometry(w, h, d);
      const fillMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const edges = new THREE.EdgesGeometry(geometry);
      const edgeMat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0,
      });

      const group = new THREE.Group();
      group.add(new THREE.Mesh(geometry, fillMat));
      group.add(new THREE.LineSegments(edges, edgeMat));
      group.position.set(x, y, z);
      group.scale.setScalar(0.9);
      group.visible = false;
      this.scene.add(group);

      this.anchors.push({
        group,
        edgeMat,
        fillMat,
        geometry,
        edges,
        labelPoint: new THREE.Vector3(x, y + h / 2 + 0.06, z),
        revealed: false,
        revealT: 0,
      });
    }
  }

  private async loadCloud(): Promise<void> {
    const loader = new PLYLoader();
    try {
      const geometry = await loader.loadAsync(SCENE_URL);
      if (this.disposed) {
        geometry.dispose();
        return;
      }
      this.normalizeGeometry(geometry);
      const material = new THREE.PointsMaterial({
        size: 0.0075,
        vertexColors: true,
        sizeAttenuation: true,
      });
      this.cloud = new THREE.Points(geometry, material);
      this.scene.add(this.cloud);
    } catch (error) {
      console.error("Error loading spatial-agent point cloud:", error);
    }
  }

  // Center + scale to a known footprint (matches CompareViewer discipline).
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
    const scale = 1.9 / maxDim;

    geometry.translate(-center.x, -center.y, -center.z);
    geometry.scale(scale, scale, scale);
    geometry.computeBoundingBox();
  }

  private onUserGrab(): void {
    // Pause the scripted sweep while the user looks around, then resume on idle.
    if (this.reduced) {
      return;
    }
    this.autoPath = false;
    if (this.resumeTimer !== null) {
      clearTimeout(this.resumeTimer);
    }
    this.resumeTimer = setTimeout(() => {
      if (!this.disposed) {
        this.autoPath = true;
      }
    }, RESUME_AFTER_MS);
  }

  private advanceTimeline(delta: number): void {
    this.pathTime += delta;
    const cycle = SWEEP_SECONDS + HOLD_SECONDS;
    const cycleIndex = Math.floor(this.pathTime / cycle);

    if (cycleIndex !== this.lastCycleIndex) {
      this.lastCycleIndex = cycleIndex;
      this.eventCursor = 0;
      for (const anchor of this.anchors) {
        anchor.revealed = false;
      }
      this.callbacks.onReset();
    }

    const tInCycle = this.pathTime - cycleIndex * cycle;
    this.progress = tInCycle <= SWEEP_SECONDS ? tInCycle / SWEEP_SECONDS : 1;

    while (
      this.eventCursor < EVENTS.length &&
      this.progress >= EVENTS[this.eventCursor].at
    ) {
      const event = EVENTS[this.eventCursor];
      if (event.anchorIndex !== null) {
        this.anchors[event.anchorIndex].revealed = true;
      }
      this.callbacks.onEvent(this.eventCursor);
      this.eventCursor += 1;
    }
  }

  private updateAgent(): void {
    const p = Math.min(Math.max(this.progress, 0), 0.9999);
    this.curve.getPointAt(p, this._pos);
    this.agent.position.copy(this._pos);
    this.curve.getTangentAt(p, this._tan).normalize();
    this._quat.setFromUnitVectors(UP, this._tan);
    this.cone.quaternion.copy(this._quat);

    const stem = this.stemGeo.getAttribute("position") as THREE.BufferAttribute;
    stem.setXYZ(0, this._pos.x, this._pos.y, this._pos.z);
    stem.setXYZ(1, this._pos.x, GRID_Y, this._pos.z);
    stem.needsUpdate = true;

    if (this.progressEl) {
      const pct = Math.min(Math.max(this.progress, 0), 1) * 100;
      this.progressEl.style.width = `${pct.toFixed(1)}%`;
    }
  }

  private updateReveals(delta: number): void {
    for (const anchor of this.anchors) {
      const target = anchor.revealed ? 1 : 0;
      if (anchor.revealT === target) {
        continue;
      }
      const step = delta / REVEAL_SECONDS;
      anchor.revealT = anchor.revealed
        ? Math.min(1, anchor.revealT + step)
        : Math.max(0, anchor.revealT - step * 2);
    }
    this.applyAnchorVisual();
  }

  private applyAnchorVisual(): void {
    for (const anchor of this.anchors) {
      const t = anchor.revealT;
      anchor.group.visible = t > 0.001;
      anchor.group.scale.setScalar(0.9 + 0.1 * t);
      anchor.edgeMat.opacity = t;
      anchor.fillMat.opacity = t * 0.09;
    }
  }

  private updateLabels(): void {
    for (let i = 0; i < this.anchors.length; i += 1) {
      const el = this.labelEls[i];
      if (!el) {
        continue;
      }
      this._proj.copy(this.anchors[i].labelPoint).project(this.camera);
      if (this._proj.z > 1) {
        el.style.visibility = "hidden";
        continue;
      }
      const x = (this._proj.x * 0.5 + 0.5) * this.width;
      const y = (-this._proj.y * 0.5 + 0.5) * this.height;
      el.style.visibility = "visible";
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(
        1,
      )}px) translate(-50%, -100%)`;
    }

    // The moving marker carries its own tag so the agent's viewpoint is named
    // in-scene, not just in the legend.
    if (this.agentEl) {
      this._proj.copy(this.agent.position).project(this.camera);
      if (this._proj.z > 1) {
        this.agentEl.style.visibility = "hidden";
      } else {
        const ax = (this._proj.x * 0.5 + 0.5) * this.width;
        const ay = (-this._proj.y * 0.5 + 0.5) * this.height;
        this.agentEl.style.visibility = "visible";
        this.agentEl.style.transform = `translate(${ax.toFixed(
          1,
        )}px, ${ay.toFixed(1)}px) translate(-50%, -165%)`;
      }
    }
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    this.timer.update();
    const delta = Math.min(this.timer.getDelta(), 0.05);
    if (this.autoPath) {
      this.advanceTimeline(delta);
      this.updateAgent();
    }
    this.updateReveals(delta);
    this.controls.update();
    this.updateLabels();
    this.renderer.render(this.scene, this.camera);
  };

  private onResize(): void {
    this.width = Math.max(this.container.clientWidth, 1);
    this.height = Math.max(this.container.clientHeight, 1);
    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  }

  public dispose(): void {
    this.disposed = true;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.resumeTimer !== null) {
      clearTimeout(this.resumeTimer);
    }
    this.timer.disconnect();
    window.removeEventListener("resize", this.onResizeBound);
    this.controls.removeEventListener("start", this.onControlStartBound);
    this.controls.dispose();

    if (this.cloud) {
      this.scene.remove(this.cloud);
      this.cloud.geometry.dispose();
      (this.cloud.material as THREE.Material).dispose();
    }

    this.pathLine.geometry.dispose();
    (this.pathLine.material as THREE.Material).dispose();
    this.stemGeo.dispose();
    (this.stemLine.material as THREE.Material).dispose();
    this.cone.geometry.dispose();
    (this.cone.material as THREE.Material).dispose();

    for (const anchor of this.anchors) {
      anchor.geometry.dispose();
      anchor.edges.dispose();
      anchor.edgeMat.dispose();
      anchor.fillMat.dispose();
    }

    this.gridHelper.geometry.dispose();
    const gridMaterial = this.gridHelper.material;
    if (Array.isArray(gridMaterial)) {
      gridMaterial.forEach((m) => m.dispose());
    } else {
      gridMaterial.dispose();
    }

    this.renderer.dispose();
    this.container.replaceChildren();
  }
}

const LEGEND: readonly { glyph: string; label: string }[] = [
  { glyph: styles.glyphView, label: "Agent viewpoint + path" },
  { glyph: styles.glyphObject, label: "Grounded object + label" },
  { glyph: styles.glyphFlag, label: "Flagged take" },
];

export default function SpatialAgentDemo() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<SpatialAgentViewer | null>(null);
  const labelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const agentTagRef = useRef<HTMLDivElement | null>(null);

  const [revealed, setRevealed] = useState<boolean[]>(() =>
    ANCHORS.map(() => false),
  );
  const [logLines, setLogLines] = useState<LogLine[]>([]);
  const [fallback, setFallback] = useState(false);

  const handleEvent = useCallback((eventIndex: number) => {
    const event = EVENTS[eventIndex];
    setLogLines((prev) => [...prev, { text: event.text, kind: event.kind }]);
    if (event.anchorIndex !== null) {
      const index = event.anchorIndex;
      setRevealed((prev) => {
        const next = [...prev];
        next[index] = true;
        return next;
      });
    }
  }, []);

  const handleReset = useCallback(() => {
    setLogLines([]);
    setRevealed(ANCHORS.map(() => false));
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    // Reduced motion: the engine reveals all anchors statically, so mirror the
    // full log + all labels here (no scripted events will fire).
    if (prefersReducedMotion()) {
      setRevealed(ANCHORS.map(() => true));
      setLogLines(EVENTS.map((e) => ({ text: e.text, kind: e.kind })));
    }

    // No WebGL (or ?lite=1): skip the viewer, tell the whole story through the
    // log panel. The 3D-anchored labels stay hidden — they only make sense
    // projected from the scene.
    const activateFallback = () => {
      setFallback(true);
      setLogLines(EVENTS.map((e) => ({ text: e.text, kind: e.kind })));
    };

    if (shouldUseStaticFallback()) {
      activateFallback();
      return;
    }

    let engine: SpatialAgentViewer;
    try {
      engine = new SpatialAgentViewer(
        container,
        labelRefs.current,
        progressRef.current,
        agentTagRef.current,
        { onEvent: handleEvent, onReset: handleReset },
      );
    } catch (error) {
      console.error(
        "SpatialAgentDemo: WebGL unavailable, using static fallback:",
        error,
      );
      container.replaceChildren();
      activateFallback();
      return;
    }
    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [handleEvent, handleReset]);

  return (
    <section id="agent-demo" className="landing-section">
      <div className="container">
        <p className="section-kicker">Grounding engine</p>
        <h2 className="section-title">
          The agent that <em>labels and QAs</em> every take
        </h2>
        <p className="section-lead">
          The same agent reasons over the reconstructed 3D scene, not flat
          frames — anchoring objects in metric space, tracking what moved, and
          flagging where a take fails. Those grounded labels and quality flags
          are what ride into each LeRobot episode.
        </p>

        {/* TODO: swap in our own robot/sim walkthrough capture */}
        <div className={styles.stage}>
          <div className={styles.viewerCard}>
            <div
              ref={containerRef}
              className={
                fallback
                  ? `${styles.canvas} ${styles.canvasFallback}`
                  : styles.canvas
              }
              aria-label="Simulated spatial-agent walkthrough grounding objects in an Open Reality capture"
            >
              {fallback ? (
                <span className={styles.fallbackNote}>
                  3D viewer unavailable on this device · the log shows the full
                  sweep
                </span>
              ) : null}
            </div>

            {/* What you are looking at — stated on the canvas. */}
            <div className={styles.caption}>
              <span className={styles.captionTitle}>Simulated agent sweep</span>
              <span className={styles.captionSub}>
                real Open Reality capture · illustrative anchors
              </span>
              {/* Sweep progress — signals this is a timed playback, not live. */}
              <span className={styles.captionTrack} aria-hidden="true">
                <span
                  ref={progressRef}
                  className={styles.captionProgress}
                  style={fallback ? { width: "100%" } : undefined}
                />
              </span>
            </div>

            {/* Map the marks to their meaning — no marks to map in fallback. */}
            {fallback ? null : (
              <div className={styles.legend} aria-hidden="true">
                <span className={styles.legendTitle}>Legend</span>
                {LEGEND.map((row) => (
                  <span className={styles.legendRow} key={row.label}>
                    <span className={`${styles.glyph} ${row.glyph}`} />
                    {row.label}
                  </span>
                ))}
              </div>
            )}

            {/* 3D-anchored object labels, projected to screen each frame.
                Skipped in fallback — there is no scene to project from. */}
            {fallback ? null : (
            <div className={styles.labelLayer} aria-hidden="true">
              {ANCHORS.map((anchor, index) => (
                <div
                  key={anchor.label}
                  ref={(el) => {
                    labelRefs.current[index] = el;
                  }}
                  className={styles.anchorLabel}
                >
                  <span
                    className={[
                      styles.anchorChip,
                      anchor.kind === "flag" ? styles.anchorChipFlag : "",
                      revealed[index]
                        ? styles.anchorVisible
                        : styles.anchorPending,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span className={styles.anchorName}>{anchor.label}</span>
                    <span className={styles.anchorDetail}>{anchor.detail}</span>
                  </span>
                </div>
              ))}

              {/* Rides the moving marker so the agent's viewpoint is named
                  in-scene, not only in the legend. */}
              <div
                ref={agentTagRef}
                className={styles.agentTag}
                aria-hidden="true"
              >
                agent view
              </div>
            </div>
            )}

            {fallback ? null : (
              <p className={styles.viewerHint}>Drag to orbit</p>
            )}
          </div>

          <aside
            className={styles.logPanel}
            aria-label="Simulated walkthrough narration, in step with the viewer"
          >
            <div className={styles.logHeader}>
              <span className={styles.logDot} aria-hidden="true" />
              walkthrough · simulated
            </div>
            <ol className={styles.logBody}>
              {logLines.map((line, index) => (
                <li
                  className={`${styles.logLine} ${
                    line.kind === "flag" ? styles.logLineFlag : ""
                  }`}
                  key={`${index}-${line.text}`}
                >
                  <span className={styles.logPrompt} aria-hidden="true">
                    ›
                  </span>
                  {line.text}
                </li>
              ))}
            </ol>
          </aside>
        </div>

        <p className={styles.note}>
          The walkthrough above is our own simulated agent sweep over a real
          Open Reality capture — we demo in simulation, and the anchors and
          labels are illustrative, not live model output. The same spatial
          memory is built to run on real robots:{" "}
          <a
            className={styles.noteLink}
            href="https://openclaws.io/blog/openclaw-robotics-embodied-ai/"
            target="_blank"
            rel="noopener noreferrer"
          >
            OpenClaw · embodied AI for robotics
          </a>
          .
        </p>
      </div>
    </section>
  );
}
