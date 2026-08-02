"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import {
  allocateModalGpuSession,
  appendTokenHash,
  buildPlanUrl,
  consumePendingPlanNavigation,
  consumeScan,
  createModalSession,
  getModalSlamToken,
  ModalCapacityError,
  navigateToPlan,
  OutOfScansError,
  type PlanNavigationOptions,
} from "../utils/navigation";
import { DEFAULT_SCANS, hasScanAccess, scansRemaining } from "../utils/scans";
import DemoCarousel from "../components/DemoCarousel";
import ScanComposer from "../components/ScanComposer";
import SceneHistory from "../components/SceneHistory";
import OnboardingTour from "../onboarding/OnboardingTour";
import { useOnboarding } from "../onboarding/useOnboarding";

const RAW_MODAL_URL = process.env.NEXT_PUBLIC_MODAL_URL ?? "";
const MODAL_URL = RAW_MODAL_URL.replace(/\/$/, "");
const POLL_INTERVAL_MS = 3000;
const HEALTH_TIMEOUT_MS = 10000;

type WarmupState = "warming" | "ready" | "error" | "missing-config";
type HealthPayload = {
  status?: string;
  gpu?: boolean;
  gpu_name?: string;
};

type HealthCheckResult = {
  ready: boolean;
  latencyMs: number;
  status: string;
  gpu: boolean;
  gpuName: string;
};

function abortReason(signal: AbortSignal | undefined, fallback: string): Error {
  const reason = signal?.reason;
  return reason instanceof Error ? reason : new Error(fallback);
}

async function checkHealth(
  endpoint: string,
  token: string,
  signal?: AbortSignal,
): Promise<HealthCheckResult> {
  const controller = new AbortController();
  const abortHealthCheck = (reason: Error) => {
    if (!controller.signal.aborted) {
      controller.abort(reason);
    }
  };
  const handleParentAbort = () => {
    abortHealthCheck(abortReason(signal, "Health check cancelled"));
  };
  const timeout = window.setTimeout(
    () => abortHealthCheck(new Error("Health check timed out")),
    HEALTH_TIMEOUT_MS,
  );
  const startedAt = performance.now();

  if (signal?.aborted) {
    handleParentAbort();
  } else {
    signal?.addEventListener("abort", handleParentAbort, { once: true });
  }

  try {
    const response = await fetch(`${endpoint}/health`, {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      mode: "cors",
      signal: controller.signal,
    });
    const latencyMs = Math.round(performance.now() - startedAt);
    const payload = await response.json() as HealthPayload;

    return {
      ready: response.ok,
      latencyMs,
      status: payload.status ?? (response.ok ? "ok" : "error"),
      gpu: Boolean(payload.gpu),
      gpuName: payload.gpu_name ?? "unknown",
    };
  } catch (error) {
    if (controller.signal.aborted) {
      const reason = controller.signal.reason;
      if (reason instanceof Error) {
        throw reason;
      }
      throw new Error("Health check cancelled");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", handleParentAbort);
  }
}

function waitForNextPoll(signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(timeout);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const timeout = window.setTimeout(finish, POLL_INTERVAL_MS);
    signal.addEventListener("abort", finish, { once: true });
  });
}

function healthErrorMessage(error: unknown): string {
  if (error instanceof ModalCapacityError) {
    return error.message;
  }
  if (error instanceof Error && error.message === "Health check timed out") {
    return "Still waiting for the GPU worker to respond.";
  }
  return error instanceof Error ? error.message : "Health check timed out";
}

export default function DashboardPage() {
  const { getToken } = useAuth();
  const { isLoaded, user } = useUser();
  const { shouldAutoStart } = useOnboarding();
  const [warmupState, setWarmupState] = useState<WarmupState>(
    MODAL_URL ? "warming" : "missing-config",
  );
  const [lastCheckedAt, setLastCheckedAt] = useState<string>("Not checked yet");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [gpuName, setGpuName] = useState<string>("Waiting for Modal");
  const [healthStatus, setHealthStatus] = useState<string>("pending");
  const [lastError, setLastError] = useState<string>("");
  const [launchError, setLaunchError] = useState<string>("");
  const [isLaunching, setIsLaunching] = useState(false);
  const [workerUrl, setWorkerUrl] = useState<string>("");
  const [workerSessionId, setWorkerSessionId] = useState<string>("");
  const [scanPrompt, setScanPrompt] = useState<string>("");
  const [planOptions, setPlanOptions] = useState<PlanNavigationOptions | undefined>(undefined);

  const metadata = user?.publicMetadata;
  const hasScans = isLoaded && hasScanAccess(metadata);
  // null = unlimited (approved); otherwise the remaining balance.
  const remaining = scansRemaining(metadata);

  useEffect(() => {
    const pending = consumePendingPlanNavigation();
    if (pending) {
      setScanPrompt(pending.prompt);
      setPlanOptions(pending.options);
    }
  }, []);

  useEffect(() => {
    if (!MODAL_URL || !hasScans) {
      return;
    }

    let cancelled = false;
    const pollingController = new AbortController();

    const poll = async () => {
      try {
        const token = await getModalSlamToken(getToken);
        const session = await allocateModalGpuSession(token);
        if (cancelled) {
          return;
        }
        setWorkerSessionId(session.session_id);
        setWorkerUrl(session.url ?? "");
        if (!session.url) {
          setHealthStatus(session.status);
          setGpuName("Allocating dedicated GPU worker");
          setWarmupState("warming");
          return;
        }
        const result = await checkHealth(session.url, token, pollingController.signal);
        if (cancelled) {
          return;
        }
        setLastCheckedAt(new Date().toLocaleTimeString());
        setLatencyMs(result.latencyMs);
        setGpuName(result.gpu ? result.gpuName : "GPU not reported yet");
        setHealthStatus(result.status);
        setLastError("");
        setWarmupState(result.ready ? "ready" : "warming");
      } catch (error) {
        if (!cancelled) {
          setLastCheckedAt(new Date().toLocaleTimeString());
          setLatencyMs(null);
          setHealthStatus("waiting");
          setLastError(healthErrorMessage(error));
          setWarmupState(error instanceof ModalCapacityError ? "error" : "warming");
        }
      }
    };

    const pollUntilCancelled = async () => {
      while (!cancelled) {
        await poll();
        await waitForNextPoll(pollingController.signal);
      }
    };

    void pollUntilCancelled();

    return () => {
      cancelled = true;
      pollingController.abort(new Error("Dashboard stopped polling"));
    };
  }, [getToken, hasScans]);

  const trimmedPrompt = scanPrompt.trim();
  const isPromptValid = trimmedPrompt.length >= 10;
  const isWarm = warmupState === "ready" && Boolean(workerUrl) && Boolean(workerSessionId);
  const canLaunch = isWarm && isPromptValid;

  const launchScan = async () => {
    if (!canLaunch || isLaunching) {
      return;
    }
    setLaunchError("");
    setIsLaunching(true);
    try {
      const token = await getModalSlamToken(getToken);
      await createModalSession(token, workerUrl);
      // Spend the scan only after the worker session exists, so the user's last
      // scan is never blocked by the (eventually-consistent) JWT-claim gate.
      await consumeScan();
      window.location.href = appendTokenHash(
        buildPlanUrl(trimmedPrompt, planOptions, workerUrl),
        token,
        shouldAutoStart() ? "show" : "skip",
        workerSessionId,
      );
    } catch (error) {
      setLaunchError(error instanceof Error ? error.message : "Unable to launch scan");
      setIsLaunching(false);
      if (error instanceof OutOfScansError) {
        void user?.reload();
      }
    }
  };

  const launchDemoVideo = async (
    prompt: string,
    options?: PlanNavigationOptions,
  ) => {
    setLaunchError("");
    try {
      const token = await getModalSlamToken(getToken);
      await navigateToPlan(
        prompt,
        options,
        token,
        shouldAutoStart() ? "show" : "skip",
      );
    } catch (error) {
      setLaunchError(error instanceof Error ? error.message : "Unable to launch demo video");
      if (error instanceof OutOfScansError) {
        void user?.reload();
      }
    }
  };

  if (!isLoaded) {
    return (
      <section className="container dashboard">
        <div className="glass-card status-panel">
          <div>
            <div className="status-pill" aria-live="polite">
              <span className="status-dot" aria-hidden="true" />
              <span>Checking access...</span>
            </div>
            <h1 className="hero-title">Preparing your workspace.</h1>
            <p className="lead">Loading your account permissions.</p>
          </div>
        </div>
      </section>
    );
  }

  if (!hasScans) {
    return (
      <section className="container dashboard">
        <OnboardingTour page="dashboard-waitlist" />
        <div className="glass-card dashboard-panel">
          <p className="eyebrow">Free scans used</p>
          <h1 className="hero-title">You&apos;ve used all your scans.</h1>
          <p className="lead">
            Every account starts with {DEFAULT_SCANS} free scans, and yours are
            all used up.
          </p>
        </div>
        <div className="glass-card status-panel">
          <div>
            <div className="status-pill status-error" aria-live="polite">
              <span className="status-dot" aria-hidden="true" />
              <span>No scans remaining</span>
            </div>
            <h2 className="hero-title">Need more scans?</h2>
            <p className="lead">
              Reach out to the team to top up your account and keep scanning.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="container dashboard">
      <OnboardingTour page="dashboard-approved" />
      <header className="dashboard-header">
        <p className="eyebrow">Live session</p>
        <h1 className="hero-title">
          Launch the <em>SLAM</em> session.
        </h1>
        <p className="lead">
          Describe your scene while we warm up a dedicated GPU, then point
          your phone at the space and watch it become an interactive 3D map.
        </p>
      </header>

      <ScanComposer
        prompt={scanPrompt}
        onPromptChange={setScanPrompt}
        warmupState={warmupState}
        gpuName={gpuName}
        latencyMs={latencyMs}
        healthStatus={healthStatus}
        lastCheckedAt={lastCheckedAt}
        lastError={lastError}
        launchError={launchError}
        remaining={remaining}
        isLaunching={isLaunching}
        canLaunch={canLaunch}
        isWarm={isWarm}
        onLaunch={launchScan}
        modalUrlMissing={!MODAL_URL}
      />

      <DemoCarousel
        onPlanRequest={launchDemoVideo}
        sessionUrl={workerUrl}
        isSessionReady={warmupState === "ready"}
        preferredVideoId={planOptions?.demoVideoId}
      />

      <SceneHistory enabled={hasScans} />
    </section>
  );
}
