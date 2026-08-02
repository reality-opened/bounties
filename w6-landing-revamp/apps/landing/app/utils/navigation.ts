export interface PlanNavigationOptions {
  trackingSource?: "live" | "demo";
  demoVideoId?: string;
}

export type OnboardingHashDirective = "show" | "skip";

export interface PendingPlanNavigation {
  prompt: string;
  options?: PlanNavigationOptions;
}

export const PENDING_PLAN_NAVIGATION_KEY = "openRealityPendingPlanNavigation";
export const MODAL_SLAM_JWT_TEMPLATE = "modal-slam";

export type ClerkTokenGetter = (options?: { template?: string }) => Promise<string | null>;

export interface ModalGpuSession {
  session_id: string;
  url: string | null;
  status: string;
  expires_at?: number;
}

export class ModalCapacityError extends Error {}

export class OutOfScansError extends Error {}

export interface ScanConsumeResult {
  remaining: number | null;
  unlimited?: boolean;
}

/**
 * Spend one of the signed-in user's scans via the Next.js API route (which holds
 * the Clerk secret needed to write publicMetadata). Throws OutOfScansError when
 * the balance is empty; approved accounts are unlimited and never spend.
 */
export async function consumeScan(): Promise<ScanConsumeResult> {
  const response = await fetch("/api/scans/consume", {
    method: "POST",
    cache: "no-store",
  });
  if (response.status === 402) {
    throw new OutOfScansError("You're out of scans.");
  }
  if (!response.ok) {
    throw new Error(`Unable to update your scan balance (${response.status})`);
  }
  return (await response.json()) as ScanConsumeResult;
}

export function getModalUrl(): string {
  return (process.env.NEXT_PUBLIC_MODAL_URL ?? "").replace(/\/$/, "");
}

export function buildPlanUrl(
  prompt: string,
  options?: PlanNavigationOptions,
  endpoint: string = getModalUrl(),
): string {
  if (!endpoint) {
    throw new Error("NEXT_PUBLIC_MODAL_URL is not configured");
  }

  const url = new URL("/plan.html", endpoint);
  url.searchParams.set("prompt", prompt);
  if (options?.trackingSource === "demo") {
    url.searchParams.set("mode", "demo");
    if (options.demoVideoId) {
      url.searchParams.set("video_id", options.demoVideoId);
    }
  }
  return url.toString();
}

export async function getModalSlamToken(getToken: ClerkTokenGetter): Promise<string> {
  const token = await getToken({ template: MODAL_SLAM_JWT_TEMPLATE });
  if (!token) {
    throw new Error("Unable to create Modal access token");
  }
  return token;
}

async function readSessionResponse(response: Response): Promise<ModalGpuSession> {
  const payload = await response.json().catch(() => ({})) as Partial<ModalGpuSession> & {
    error?: string;
  };
  if (response.status === 503 && payload.error === "at_capacity") {
    throw new ModalCapacityError("All GPU sessions are in use. Please try again shortly.");
  }
  if (!response.ok && response.status !== 202) {
    throw new Error(`Unable to allocate GPU session (${response.status})`);
  }
  if (typeof payload.session_id !== "string") {
    throw new Error("Modal did not return a GPU session identifier.");
  }
  return {
    session_id: payload.session_id,
    url: typeof payload.url === "string" ? payload.url : null,
    status: typeof payload.status === "string" ? payload.status : "starting",
    expires_at: payload.expires_at,
  };
}

export async function allocateModalGpuSession(token: string): Promise<ModalGpuSession> {
  const brokerUrl = getModalUrl();
  if (!brokerUrl) {
    throw new Error("NEXT_PUBLIC_MODAL_URL is not configured");
  }
  const response = await fetch(`${brokerUrl}/session`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    mode: "cors",
  });
  return readSessionResponse(response);
}

async function getModalGpuSessionStatus(token: string): Promise<ModalGpuSession> {
  const brokerUrl = getModalUrl();
  const response = await fetch(`${brokerUrl}/session/status`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
    mode: "cors",
  });
  return readSessionResponse(response);
}

async function waitForReadyModalGpuSession(
  token: string,
  timeoutMs = 120000,
): Promise<ModalGpuSession & { url: string }> {
  const deadline = Date.now() + timeoutMs;
  let session = await allocateModalGpuSession(token);

  while (Date.now() < deadline) {
    if (session.url) {
      try {
        const response = await fetch(`${session.url}/health`, {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          mode: "cors",
        });
        if (response.ok) {
          return { ...session, url: session.url };
        }
      } catch {
        // The tunnel can be assigned before model initialization starts the server.
      }
    }
    await new Promise((resolve) => window.setTimeout(resolve, 1500));
    try {
      session = await getModalGpuSessionStatus(token);
    } catch {
      session = await allocateModalGpuSession(token);
    }
  }
  throw new Error("Your GPU session is still warming up. Please retry shortly.");
}

export async function createModalSession(token: string, endpoint: string): Promise<void> {
  if (!endpoint) {
    throw new Error("NEXT_PUBLIC_MODAL_URL is not configured");
  }

  let response: Response;
  try {
    response = await fetch(`${endpoint}/auth/session`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
      mode: "cors",
    });
  } catch {
    throw new Error(
      `Unable to reach Modal auth from ${window.location.origin}. ` +
      "Check that Modal is deployed and CLERK_JWT_AZP includes this exact origin.",
    );
  }

  if (response.status === 403) {
    throw new OutOfScansError("You're out of scans.");
  }
  if (!response.ok) {
    throw new Error(`Unable to start Modal session (${response.status})`);
  }
}

export function appendTokenHash(
  url: string,
  token: string,
  onboarding?: OnboardingHashDirective,
  sessionId?: string,
): string {
  const nextUrl = new URL(url);
  let hash = `token=${encodeURIComponent(token)}`;
  if (sessionId) {
    hash += `&session_id=${encodeURIComponent(sessionId)}`;
  }
  if (onboarding) {
    hash += `&onboarding=${onboarding}`;
  }
  nextUrl.hash = hash;
  return nextUrl.toString();
}

export async function navigateToPlan(
  prompt: string,
  options?: PlanNavigationOptions,
  token?: string,
  onboarding?: OnboardingHashDirective,
): Promise<void> {
  if (!token) {
    throw new Error("Modal access token is required");
  }
  const session = await waitForReadyModalGpuSession(token);
  await createModalSession(token, session.url);
  await consumeScan();
  window.location.href = appendTokenHash(
    buildPlanUrl(prompt, options, session.url),
    token,
    onboarding,
    session.session_id,
  );
}

export function storePendingPlanNavigation(
  pending: PendingPlanNavigation,
): void {
  sessionStorage.setItem(PENDING_PLAN_NAVIGATION_KEY, JSON.stringify(pending));
}

export function consumePendingPlanNavigation(): PendingPlanNavigation | null {
  const raw = sessionStorage.getItem(PENDING_PLAN_NAVIGATION_KEY);
  if (!raw) {
    return null;
  }

  sessionStorage.removeItem(PENDING_PLAN_NAVIGATION_KEY);
  try {
    const parsed = JSON.parse(raw) as PendingPlanNavigation;
    if (typeof parsed.prompt !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
