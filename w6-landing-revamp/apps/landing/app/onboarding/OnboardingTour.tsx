"use client";

import { useEffect, useRef } from "react";
import { useOnboarding } from "./useOnboarding";
import type { TourPage } from "./types";

// If Clerk hasn't reported its load state yet (e.g. offline/headless), fall
// back to the anonymous (localStorage) decision after this grace period so the
// tour still runs.
const CLERK_LOAD_GRACE_MS = 1200;

export default function OnboardingTour({ page }: { page: TourPage }) {
  const { runTour, shouldAutoStart, isLoaded } = useOnboarding();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }

    const tryStart = () => {
      if (startedRef.current) {
        return;
      }
      if (shouldAutoStart()) {
        startedRef.current = true;
        runTour(page);
      }
    };

    if (isLoaded) {
      tryStart();
      return;
    }

    const timer = window.setTimeout(tryStart, CLERK_LOAD_GRACE_MS);
    return () => window.clearTimeout(timer);
  }, [isLoaded, page, runTour, shouldAutoStart]);

  return null;
}
