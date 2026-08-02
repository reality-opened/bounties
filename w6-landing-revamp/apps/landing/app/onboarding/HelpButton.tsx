"use client";

import { useOnboarding } from "./useOnboarding";
import type { TourPage } from "./types";

export default function HelpButton({ page }: { page: TourPage }) {
  const { runTour } = useOnboarding();
  return (
    <button
      type="button"
      className="onboarding-help-button"
      data-testid="onboarding-help-button"
      aria-label="Replay the tour"
      title="Replay the tour"
      onClick={() => runTour(page)}
    >
      ?
    </button>
  );
}
