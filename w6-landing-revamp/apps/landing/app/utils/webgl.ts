/*
  WebGL availability + lite-mode gate for the Three.js components.

  On machines without WebGL (hardware acceleration off, blocklisted GPU,
  sandboxed browser) `new THREE.WebGLRenderer()` throws, and an uncaught
  throw from a component effect takes the whole page down. Every component
  that constructs a renderer must:

    1. check `shouldUseStaticFallback()` before constructing, and
    2. still wrap construction in try/catch (the probe can pass while the
       real context creation fails — e.g. different context attributes),

  and degrade to its static fallback in both cases.

  `?lite=1` (or `?lite=true`) forces the fallback everywhere — a manual
  escape hatch for low-power devices.
*/

let cachedSupport: boolean | null = null;

export function isLiteMode(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const lite = new URLSearchParams(window.location.search).get("lite");
  return lite === "1" || lite === "true";
}

export function isWebGLAvailable(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  if (cachedSupport !== null) {
    return cachedSupport;
  }
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ??
      canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl");
    cachedSupport = gl !== null;
    if (gl && "getExtension" in gl) {
      (gl as WebGLRenderingContext)
        .getExtension("WEBGL_lose_context")
        ?.loseContext();
    }
  } catch {
    cachedSupport = false;
  }
  return cachedSupport;
}

export function shouldUseStaticFallback(): boolean {
  return isLiteMode() || !isWebGLAvailable();
}
