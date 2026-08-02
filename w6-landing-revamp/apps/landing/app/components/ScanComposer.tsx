"use client";

export type ScanComposerWarmupState =
  | "warming"
  | "ready"
  | "error"
  | "missing-config";

interface ScanComposerProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  warmupState: ScanComposerWarmupState;
  gpuName: string;
  latencyMs: number | null;
  healthStatus: string;
  lastCheckedAt: string;
  lastError: string;
  launchError: string;
  remaining: number | null;
  isLaunching: boolean;
  canLaunch: boolean;
  isWarm: boolean;
  onLaunch: () => void;
  modalUrlMissing: boolean;
}

function pillText(
  warmupState: ScanComposerWarmupState,
  gpuName: string,
  latencyMs: number | null,
): string {
  if (warmupState === "ready") {
    return latencyMs === null
      ? `GPU ready · ${gpuName}`
      : `GPU ready · ${gpuName} · ${latencyMs} ms`;
  }
  if (warmupState === "missing-config") {
    return "Missing Modal URL";
  }
  if (warmupState === "error") {
    return "GPU unavailable";
  }
  return "Warming GPU";
}

export default function ScanComposer({
  prompt,
  onPromptChange,
  warmupState,
  gpuName,
  latencyMs,
  healthStatus,
  lastCheckedAt,
  lastError,
  launchError,
  remaining,
  isLaunching,
  canLaunch,
  isWarm,
  onLaunch,
  modalUrlMissing,
}: ScanComposerProps) {
  const isPromptValid = prompt.trim().length >= 10;
  const pillClass =
    warmupState === "ready"
      ? "status-pill status-ready"
      : warmupState === "error" || warmupState === "missing-config"
        ? "status-pill status-error"
        : "status-pill";

  return (
    <div className="glass-card scan-composer">
      <label htmlFor="scanPromptInput" className="scan-prompt-label">
        What do you want to scan?
      </label>
      <textarea
        id="scanPromptInput"
        className="prompt-input glass-input"
        placeholder="Describe your scene and what matters... (e.g., 'I'm creating a model of my new home in SF')"
        rows={4}
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        aria-label="Scene description"
      />
      <div className="composer-footer">
        <div className={pillClass} aria-live="polite">
          <span className="status-dot" aria-hidden="true" />
          <span>{pillText(warmupState, gpuName, latencyMs)}</span>
        </div>
        <button
          className="button-primary launch-button"
          type="button"
          disabled={!canLaunch || isLaunching}
          onClick={onLaunch}
        >
          {!isWarm || isLaunching ? <span className="spinner" aria-hidden="true" /> : null}
          {isLaunching
            ? "Opening tracker"
            : !isWarm
              ? "Warming GPU…"
              : !isPromptValid
                ? "Describe your scene"
                : "Start Tracking"}
        </button>
      </div>
      {launchError ? <p className="note config-warning">{launchError}</p> : null}
      {warmupState === "error" && lastError ? (
        <p className="note config-warning">{lastError}</p>
      ) : null}
      <p className="note">
        Opens the live planner, then routes to your phone for capture.
        {" "}
        {remaining === null
          ? "Unlimited scans on this account."
          : `${remaining} free scan${remaining === 1 ? "" : "s"} remaining.`}
      </p>
      <details className="composer-details">
        <summary>Session details</summary>
        <div className="gpu-status-grid" aria-label="GPU warm-up details">
          <div className="gpu-status-item">
            <span>Health</span>
            <strong>{healthStatus}</strong>
          </div>
          <div className="gpu-status-item">
            <span>Response</span>
            <strong>{latencyMs === null ? "waiting" : `${latencyMs} ms`}</strong>
          </div>
          <div className="gpu-status-item">
            <span>GPU</span>
            <strong>{gpuName}</strong>
          </div>
          <div className="gpu-status-item">
            <span>Last check</span>
            <strong>{lastCheckedAt}</strong>
          </div>
        </div>
        {lastError && warmupState !== "error" ? (
          <p className="note">{lastError}</p>
        ) : null}
        {modalUrlMissing ? (
          <p className="note config-warning">
            Set NEXT_PUBLIC_MODAL_URL in the deployment env before launch.
          </p>
        ) : null}
      </details>
    </div>
  );
}
