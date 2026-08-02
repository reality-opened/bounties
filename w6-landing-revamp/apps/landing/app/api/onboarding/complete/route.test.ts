import { describe, it, expect, vi, beforeEach } from "vitest";

const authMock = vi.fn();
const updateUserMetadata = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: () => authMock(),
  clerkClient: () => Promise.resolve({ users: { updateUserMetadata } }),
}));

import { POST } from "./route";

describe("POST /api/onboarding/complete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when there is no signed-in user", async () => {
    authMock.mockResolvedValue({ userId: null });

    const response = await POST();

    expect(response.status).toBe(401);
    expect(updateUserMetadata).not.toHaveBeenCalled();
  });

  it("updates metadata and returns 200 when signed in", async () => {
    authMock.mockResolvedValue({ userId: "user_abc123" });

    const response = await POST();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(updateUserMetadata).toHaveBeenCalledWith("user_abc123", {
      publicMetadata: { onboardingV1Completed: true },
    });
  });
});
