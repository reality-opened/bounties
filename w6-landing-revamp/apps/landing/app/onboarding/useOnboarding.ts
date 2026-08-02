import { useCallback, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { driver, type Driver } from "driver.js";
import { TOUR_STEPS } from "./steps";
import type { TourPage } from "./types";

export const ONBOARDING_LOCAL_STORAGE_KEY =
  "openReality.onboarding.v1.completed";
export const ONBOARDING_COMPLETE_ENDPOINT = "/api/onboarding/complete";

function readLocalFlag(): boolean {
  try {
    return window.localStorage.getItem(ONBOARDING_LOCAL_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function writeLocalFlag(): void {
  try {
    window.localStorage.setItem(ONBOARDING_LOCAL_STORAGE_KEY, "true");
  } catch {
    // Storage may be unavailable (private mode); the API call still records it.
  }
}

export interface UseOnboarding {
  runTour: (page: TourPage) => void;
  shouldAutoStart: () => boolean;
  markComplete: () => Promise<void>;
  isLoaded: boolean;
}

export function useOnboarding(): UseOnboarding {
  const { isLoaded, isSignedIn, user } = useUser();
  const tourRef = useRef<Driver | null>(null);
  const migratedRef = useRef(false);

  const isCompleted = useCallback((): boolean => {
    if (isSignedIn && user?.publicMetadata?.onboardingV1Completed === true) {
      return true;
    }
    return readLocalFlag();
  }, [isSignedIn, user]);

  const shouldAutoStart = useCallback(
    (): boolean => !isCompleted(),
    [isCompleted],
  );

  const markComplete = useCallback(async (): Promise<void> => {
    writeLocalFlag();
    if (!isSignedIn) {
      return;
    }
    try {
      await fetch(ONBOARDING_COMPLETE_ENDPOINT, { method: "POST" });
    } catch {
      // Best-effort: localStorage already records completion for this browser.
    }
  }, [isSignedIn]);

  const runTour = useCallback(
    (page: TourPage): void => {
      tourRef.current?.destroy();
      const instance = driver({
        showProgress: true,
        showButtons: ["next", "previous", "close"],
        nextBtnText: "Next",
        prevBtnText: "Back",
        doneBtnText: "Got it",
        steps: TOUR_STEPS[page],
        onDestroyStarted: () => {
          void markComplete();
          instance.destroy();
        },
      });
      tourRef.current = instance;
      instance.drive();
    },
    [markComplete],
  );

  // On sign-in, migrate an anonymous completion to Clerk metadata once.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user || migratedRef.current) {
      return;
    }
    const clerkDone = user.publicMetadata?.onboardingV1Completed === true;
    if (!clerkDone && readLocalFlag()) {
      migratedRef.current = true;
      void markComplete();
    }
  }, [isLoaded, isSignedIn, user, markComplete]);

  return { runTour, shouldAutoStart, markComplete, isLoaded };
}
