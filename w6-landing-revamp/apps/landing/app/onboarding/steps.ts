import type { DriveStep } from "driver.js";
import type { TourPage } from "./types";

export const TOUR_STEPS: Record<TourPage, DriveStep[]> = {
  landing: [
    {
      popover: {
        title: "Welcome to Open Reality",
        description:
          "We turn the demo video your team already has into trainable, policy-ready robot datasets.",
      },
    },
    {
      element: ".hero-canvas",
      popover: {
        title: "A live reconstruction",
        description:
          "Every demo becomes metric, gravity-aligned 3D with a recovered camera path. Drag to orbit it.",
        side: "top",
        align: "center",
      },
    },
    {
      element: "#startScanningBtn",
      popover: {
        title: "Start scanning",
        description:
          "Sign in here and we'll spin up a GPU session to begin your scan.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: ".scene-grid",
      popover: {
        title: "Explore real scans",
        description:
          "Eight sample scenes captured with the live pipeline, run any of them from your dashboard.",
        side: "top",
        align: "start",
      },
    },
  ],
  "dashboard-approved": [
    {
      element: ".scan-composer",
      popover: {
        title: "Describe your scan",
        description:
          "Tell the agent what matters in your scene while the GPU warms up, the status pill flips when it's ready.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: ".launch-button",
      popover: {
        title: "Start tracking",
        description:
          "When the GPU is ready, this opens the live planner and routes capture to your phone.",
        side: "top",
        align: "center",
      },
    },
    {
      popover: {
        title: "Or try a sample video",
        description:
          "No space to scan right now? Run a bundled demo clip to watch the full pipeline.",
      },
    },
  ],
  "dashboard-waitlist": [
    {
      element: ".dashboard-panel",
      popover: {
        title: "You're on the waitlist",
        description:
          "You're signed in, but GPU demo access is still pending approval.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: ".status-panel",
      popover: {
        title: "We'll switch this on",
        description:
          "The moment your access is approved, the live SLAM session unlocks right here.",
        side: "left",
        align: "start",
      },
    },
    {
      popover: {
        title: "What happens next",
        description:
          "Once approved, you'll launch a live scan and watch your space become a 3D map.",
      },
    },
  ],
};
