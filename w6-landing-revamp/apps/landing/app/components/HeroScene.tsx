"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { shouldUseStaticFallback } from "../utils/webgl";

export interface HeroSceneHandle {
  startInteraction: () => void;
}

export interface HeroTelemetry {
  x: number;
  y: number;
  z: number;
  points: number;
}

class HeroSceneEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private pointCloud: THREE.Points | null = null;
  private cameraFrustums: THREE.Group;
  private animationId: number | null = null;
  private userInteracted = false;
  private userControlled = false;
  private objectRadius = 0;
  private viewportOffset = 0;
  private targetViewportOffset = 0;
  private readonly splatModels = ["/assets/Gaussian_splat.ply"];
  private currentModelIndex = 0;
  private rotationInterval: number | null = null;
  private loadingNewSplat = false;
  private frameCount = 0;
  private readonly onResizeBound = () => this.onResize();
  private readonly onThemeChangeBound = () => this.updateThemeColors();

  constructor(
    private readonly container: HTMLElement,
    private readonly onTelemetry?: (telemetry: HeroTelemetry) => void,
  ) {
    const { width, height } = HeroSceneEngine.measure(container);

    this.scene = new THREE.Scene();
    const paperHex = getComputedStyle(document.documentElement)
      .getPropertyValue('--paper')
      .trim();
    this.scene.background = new THREE.Color(paperHex || '#e7e2d2');
    this.scene.fog = new THREE.Fog(paperHex || '#e7e2d2', 8, 25);

    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    this.camera.position.set(5, 3, 5);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 15;
    this.controls.maxPolarAngle = Math.PI / 1.5;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.5;
    // Once the user grabs the cloud, stop auto-reframing it from under them.
    this.controls.addEventListener("start", () => {
      this.userControlled = true;
    });

    this.cameraFrustums = new THREE.Group();
    this.scene.add(this.cameraFrustums);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 5);
    this.scene.add(dirLight);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight2.position.set(-5, 5, -5);
    this.scene.add(dirLight2);

    const gridHelper = new THREE.GridHelper(10, 10, 0x9c958a, 0xc7bfae);
    gridHelper.position.y = -1;
    this.scene.add(gridHelper);

    void this.loadGaussianSplat(this.splatModels[this.currentModelIndex]);

    window.addEventListener("resize", this.onResizeBound);
    window.addEventListener("or-themechange", this.onThemeChangeBound);

    if (this.splatModels.length > 1) {
      this.rotationInterval = window.setInterval(() => {
        this.loadNextSplat();
      }, 15000);
    }

    this.animate();
  }

  private updateThemeColors(): void {
    const paperHex = getComputedStyle(document.documentElement)
      .getPropertyValue('--paper')
      .trim();
    const paperColor = new THREE.Color(paperHex || '#e7e2d2');
    this.scene.background = paperColor;
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color = paperColor;
    }
  }

  // Size from the container itself (it fills the 100svh stage) so the canvas
  // aspect always matches the visible area — using window.innerHeight instead
  // drifts on mobile (URL-bar / svh vs. innerHeight) and crops the cloud.
  private static measure(container: HTMLElement): {
    width: number;
    height: number;
  } {
    const width = container.clientWidth || window.innerWidth || 1;
    const height = container.clientHeight || window.innerHeight || 1;
    return { width, height };
  }

  private getSize(): { width: number; height: number } {
    return HeroSceneEngine.measure(this.container);
  }

  // Pull the camera back far enough that the whole point cloud fits the frame.
  // We frame against the *narrower* active aspect (the cloud renders in the
  // right ~65% once revealed), so it never clips in either layout, on any
  // screen ratio.
  private frameCameraToRadius(radius: number): void {
    if (radius <= 0) {
      return;
    }

    const { width, height } = this.getSize();
    const effectiveAspect = (width * 0.65) / height;
    const vFov = (this.camera.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * effectiveAspect);
    const limitingFov = Math.min(vFov, hFov);

    const margin = 1.25;
    const distance = (radius / Math.sin(limitingFov / 2)) * margin;

    const direction = new THREE.Vector3(0.55, 0.42, 0.9).normalize();
    this.camera.position.copy(direction.multiplyScalar(distance));
    this.camera.near = Math.max(distance / 100, 0.01);
    this.camera.far = distance * 4 + radius * 6;
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();

    this.controls.target.set(0, 0, 0);
    this.controls.minDistance = radius * 0.6;
    this.controls.maxDistance = distance * 2.4;
    this.controls.update();

    // Depth haze that scales with the framing so the cloud never dissolves
    // into the paper background at an unexpected scale.
    const fogHex = getComputedStyle(document.documentElement)
      .getPropertyValue('--paper')
      .trim();
    this.scene.fog = new THREE.Fog(
      fogHex || '#e7e2d2',
      distance + radius * 0.2,
      distance + radius * 6,
    );
  }

  private loadNextSplat(): void {
    if (this.loadingNewSplat || this.splatModels.length <= 1) return;
    this.loadingNewSplat = true;

    if (this.pointCloud && this.userInteracted) {
      const material = this.pointCloud.material as THREE.PointsMaterial;
      material.opacity = 0;
    }

    this.currentModelIndex = (this.currentModelIndex + 1) % this.splatModels.length;
    void this.loadGaussianSplat(this.splatModels[this.currentModelIndex]);
  }

  private async loadGaussianSplat(url: string): Promise<void> {
    const loader = new PLYLoader();

    try {
      console.log(`Loading Gaussian splat from ${url}...`);
      const geometry = await loader.loadAsync(url);
      console.log("Gaussian splat loaded successfully");

      geometry.computeBoundingBox();
      const boundingBox = geometry.boundingBox;
      if (!boundingBox) {
        throw new Error("Gaussian splat has no bounding box");
      }

      const center = new THREE.Vector3();
      boundingBox.getCenter(center);
      // Recenter on the centroid (all three axes) then flip Y to convert the
      // capture's Y-down convention to Three's Y-up. The previous +center.y
      // left the cloud vertically off-centre, which read as "cropped".
      geometry.translate(-center.x, -center.y, -center.z);
      geometry.scale(1, -1, 1);

      geometry.computeBoundingSphere();
      const radius = geometry.boundingSphere?.radius ?? 1;
      this.objectRadius = radius;

      const material = new THREE.PointsMaterial({
        size: 0.02,
        vertexColors: true,
        sizeAttenuation: true,
        transparent: true,
        opacity: this.userInteracted ? 1 : 0,
      });

      if (this.pointCloud) {
        this.scene.remove(this.pointCloud);
        this.pointCloud.geometry.dispose();
        (this.pointCloud.material as THREE.Material).dispose();
      }

      this.pointCloud = new THREE.Points(geometry, material);
      this.scene.add(this.pointCloud);

      this.frameCameraToRadius(radius);

      this.cameraFrustums.clear();
      this.createCameraTrajectory();
      this.loadingNewSplat = false;
    } catch (error) {
      console.error(`Error loading Gaussian splat from ${url}:`, error);
      this.loadingNewSplat = false;
      this.createFallbackScene();
    }
  }

  private createFallbackScene(): void {
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshStandardMaterial({
      color: 0x808080,
      wireframe: true,
    });
    const cube = new THREE.Mesh(geometry, material);
    this.scene.add(cube);
    this.createCameraTrajectory();
  }

  private createCameraTrajectory(): void {
    const frustumPositions = [
      new THREE.Vector3(-2, 0.5, 2),
      new THREE.Vector3(-1, 0.5, 1),
      new THREE.Vector3(0, 0.5, 0),
      new THREE.Vector3(1, 0.5, -0.5),
      new THREE.Vector3(2, 0.5, -1),
    ];

    frustumPositions.forEach((pos, i) => {
      const frustum = this.createCameraFrustum();
      frustum.position.copy(pos);
      frustum.lookAt(0, 0, -1);

      const t = i / (frustumPositions.length - 1);
      const color = new THREE.Color().setHSL(0, 0, 0.18 + t * 0.32);
      frustum.children.forEach((child) => {
        if (child instanceof THREE.LineSegments) {
          (child.material as THREE.LineBasicMaterial).color = color;
        }
      });

      this.cameraFrustums.add(frustum);
    });

    const lineGeometry = new THREE.BufferGeometry().setFromPoints(frustumPositions);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x0e7c8a,
      opacity: 0.55,
      transparent: true,
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    this.cameraFrustums.add(line);
  }

  private createCameraFrustum(): THREE.Group {
    const group = new THREE.Group();
    const size = 0.15;
    const depth = 0.25;

    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-size, -size, -depth),
      new THREE.Vector3(size, -size, -depth),
      new THREE.Vector3(size, size, -depth),
      new THREE.Vector3(-size, size, -depth),
    ];

    const indices = [
      0, 1, 0, 2, 0, 3, 0, 4,
      1, 2, 2, 3, 3, 4, 4, 1,
    ];

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    geometry.setIndex(indices);

    const material = new THREE.LineBasicMaterial({
      color: 0x1a1a1a,
      opacity: 0.6,
      transparent: true,
    });
    const frustum = new THREE.LineSegments(geometry, material);

    group.add(frustum);
    return group;
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    this.viewportOffset += (this.targetViewportOffset - this.viewportOffset) * 0.05;
    this.controls.update();

    if (this.onTelemetry && ++this.frameCount % 10 === 0) {
      this.onTelemetry({
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z,
        points: this.pointCloud?.geometry.getAttribute("position")?.count ?? 0,
      });
    }

    const { width, height } = this.getSize();

    if (this.viewportOffset > 1) {
      const offset = Math.round(this.viewportOffset);

      this.renderer.setScissorTest(false);
      this.renderer.setViewport(0, 0, width, height);
      this.renderer.clear();

      this.renderer.setScissorTest(true);
      this.renderer.setScissor(offset, 0, width - offset, height);
      this.renderer.setViewport(offset, 0, width - offset, height);
      this.camera.aspect = (width - offset) / height;
      this.camera.updateProjectionMatrix();
    } else {
      this.renderer.setScissorTest(false);
      this.renderer.setViewport(0, 0, width, height);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }

    this.renderer.render(this.scene, this.camera);
  };

  private onResize(): void {
    const { width, height } = this.getSize();

    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    if (this.userInteracted) {
      this.targetViewportOffset = width * 0.35;
    }

    // Keep the cloud framed across resizes / orientation changes — but only
    // until the user takes manual control of the orbit, then leave their view.
    if (!this.userControlled) {
      this.frameCameraToRadius(this.objectRadius);
    }
  }

  private fadeIn(): void {
    if (!this.pointCloud) {
      return;
    }

    const material = this.pointCloud.material as THREE.PointsMaterial;
    const startOpacity = material.opacity;
    const targetOpacity = 1.0;
    const duration = 800;
    const startTime = Date.now();

    const animateOpacity = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      material.opacity = startOpacity + (targetOpacity - startOpacity) * eased;

      if (progress < 1) {
        requestAnimationFrame(animateOpacity);
      }
    };

    animateOpacity();
  }

  public startInteraction(): void {
    if (this.userInteracted) return;
    this.userInteracted = true;
    this.controls.autoRotate = false;
    this.targetViewportOffset = this.getSize().width * 0.35;
    this.fadeIn();
  }

  public dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.rotationInterval !== null) {
      window.clearInterval(this.rotationInterval);
    }
    window.removeEventListener("resize", this.onResizeBound);
    window.removeEventListener("or-themechange", this.onThemeChangeBound);
    this.controls.dispose();
    this.renderer.dispose();
    if (this.pointCloud) {
      this.pointCloud.geometry.dispose();
      (this.pointCloud.material as THREE.Material).dispose();
    }
    this.container.replaceChildren();
  }
}

interface HeroSceneProps {
  onFirstInteraction?: () => void;
  onTelemetry?: (telemetry: HeroTelemetry) => void;
}

const HeroScene = forwardRef<HeroSceneHandle, HeroSceneProps>(
  function HeroScene({ onFirstInteraction, onTelemetry }, ref) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const engineRef = useRef<HeroSceneEngine | null>(null);
    const hasInteractedRef = useRef(false);
    const onTelemetryRef = useRef(onTelemetry);
    onTelemetryRef.current = onTelemetry;
    const [fallback, setFallback] = useState(false);

    useEffect(() => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      if (shouldUseStaticFallback()) {
        setFallback(true);
        return;
      }

      let engine: HeroSceneEngine;
      try {
        engine = new HeroSceneEngine(container, (telemetry) => {
          onTelemetryRef.current?.(telemetry);
        });
      } catch (error) {
        console.error("HeroScene: WebGL unavailable, using static hero:", error);
        container.replaceChildren();
        setFallback(true);
        return;
      }
      engineRef.current = engine;

      return () => {
        engine.dispose();
        engineRef.current = null;
      };
    }, []);

    useImperativeHandle(ref, () => ({
      startInteraction: () => {
        if (!hasInteractedRef.current) {
          hasInteractedRef.current = true;
          onFirstInteraction?.();
        }
        engineRef.current?.startInteraction();
      },
    }), [onFirstInteraction]);

    const handleInteraction = () => {
      if (!hasInteractedRef.current) {
        hasInteractedRef.current = true;
        onFirstInteraction?.();
      }
      engineRef.current?.startInteraction();
    };

    return (
      <div
        ref={containerRef}
        className={fallback ? "hero-canvas hero-canvas-fallback" : "hero-canvas"}
        onPointerDownCapture={handleInteraction}
        onTouchStartCapture={handleInteraction}
      />
    );
  },
);

export default HeroScene;
