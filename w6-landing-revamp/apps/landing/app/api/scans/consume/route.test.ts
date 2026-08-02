import { describe, it, expect, vi, beforeEach } from "vitest";

const authMock = vi.fn();
const getUser = vi.fn();
const updateUserMetadata = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: () => authMock(),
  clerkClient: () => Promise.resolve({ users: { getUser, updateUserMetadata } }),
}));

import { POST } from "./route";

describe("POST /api/scans/consume", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when there is no signed-in user", async () => {
    authMock.mockResolvedValue({ userId: null });

    const response = await POST();

    expect(response.status).toBe(401);
    expect(getUser).not.toHaveBeenCalled();
    expect(updateUserMetadata).not.toHaveBeenCalled();
  });

  it("seeds a never-scanned user from the default and decrements", async () => {
    authMock.mockResolvedValue({ userId: "user_new" });
    getUser.mockResolvedValue({ publicMetadata: {} });

    const response = await POST();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ remaining: 1 });
    expect(updateUserMetadata).toHaveBeenCalledWith("user_new", {
      publicMetadata: { scansRemaining: 1 },
    });
  });

  it("decrements an explicit balance", async () => {
    authMock.mockResolvedValue({ userId: "user_x" });
    getUser.mockResolvedValue({ publicMetadata: { scansRemaining: 2 } });

    const response = await POST();

    await expect(response.json()).resolves.toEqual({ remaining: 1 });
    expect(updateUserMetadata).toHaveBeenCalledWith("user_x", {
      publicMetadata: { scansRemaining: 1 },
    });
  });

  it("rejects with 402 when no scans remain", async () => {
    authMock.mockResolvedValue({ userId: "user_empty" });
    getUser.mockResolvedValue({ publicMetadata: { scansRemaining: 0 } });

    const response = await POST();

    expect(response.status).toBe(402);
    await expect(response.json()).resolves.toEqual({
      error: "no_scans_remaining",
      remaining: 0,
    });
    expect(updateUserMetadata).not.toHaveBeenCalled();
  });

  it("never spends a scan for approved (unlimited) accounts", async () => {
    authMock.mockResolvedValue({ userId: "user_admin" });
    getUser.mockResolvedValue({ publicMetadata: { tier: "approved" } });

    const response = await POST();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      remaining: null,
      unlimited: true,
    });
    expect(updateUserMetadata).not.toHaveBeenCalled();
  });
});
