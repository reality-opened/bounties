import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { driver } from "driver.js";
import { useUser } from "@clerk/nextjs";
import {
  useOnboarding,
  ONBOARDING_LOCAL_STORAGE_KEY,
  ONBOARDING_COMPLETE_ENDPOINT,
} from "./useOnboarding";
import { TOUR_STEPS } from "./steps";

const mockedUseUser = vi.mocked(useUser);
const mockedDriver = vi.mocked(driver);

interface UserState {
  isLoaded?: boolean;
  isSignedIn?: boolean;
  publicMetadata?: Record<string, unknown>;
}

function setUser({
  isLoaded = true,
  isSignedIn = false,
  publicMetadata = {},
}: UserState): void {
  mockedUseUser.mockReturnValue({
    isLoaded,
    isSignedIn,
    user: isSignedIn ? { publicMetadata } : null,
  } as unknown as ReturnType<typeof useUser>);
}

describe("useOnboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true } as Response)),
    );
    setUser({ isSignedIn: false });
  });

  it("shouldAutoStart is true when neither flag is set", () => {
    setUser({ isSignedIn: false });
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.shouldAutoStart()).toBe(true);
  });

  it("shouldAutoStart is false when the localStorage flag is set (anon)", () => {
    window.localStorage.setItem(ONBOARDING_LOCAL_STORAGE_KEY, "true");
    setUser({ isSignedIn: false });
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.shouldAutoStart()).toBe(false);
  });

  it("shouldAutoStart is false when the Clerk publicMetadata flag is set", () => {
    setUser({ isSignedIn: true, publicMetadata: { onboardingV1Completed: true } });
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.shouldAutoStart()).toBe(false);
  });

  it("runTour calls driver() with the steps for the requested page and drives it", () => {
    setUser({ isSignedIn: false });
    const { result } = renderHook(() => useOnboarding());

    act(() => {
      result.current.runTour("dashboard-waitlist");
    });

    expect(mockedDriver).toHaveBeenCalledWith(
      expect.objectContaining({ steps: TOUR_STEPS["dashboard-waitlist"] }),
    );
    const instance = mockedDriver.mock.results.at(-1)?.value as {
      drive: ReturnType<typeof vi.fn>;
    };
    expect(instance.drive).toHaveBeenCalledTimes(1);
  });

  it("markComplete writes localStorage and POSTs when signed in", async () => {
    setUser({ isSignedIn: true, publicMetadata: {} });
    const { result } = renderHook(() => useOnboarding());

    await act(async () => {
      await result.current.markComplete();
    });

    expect(window.localStorage.getItem(ONBOARDING_LOCAL_STORAGE_KEY)).toBe("true");
    expect(fetch).toHaveBeenCalledWith(ONBOARDING_COMPLETE_ENDPOINT, {
      method: "POST",
    });
  });

  it("markComplete writes localStorage but does NOT POST when anonymous", async () => {
    setUser({ isSignedIn: false });
    const { result } = renderHook(() => useOnboarding());

    await act(async () => {
      await result.current.markComplete();
    });

    expect(window.localStorage.getItem(ONBOARDING_LOCAL_STORAGE_KEY)).toBe("true");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("migrates an anonymous completion to Clerk on sign-in, posting once", async () => {
    window.localStorage.setItem(ONBOARDING_LOCAL_STORAGE_KEY, "true");
    setUser({ isSignedIn: true, publicMetadata: {} });

    renderHook(() => useOnboarding());

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(ONBOARDING_COMPLETE_ENDPOINT, {
        method: "POST",
      });
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
