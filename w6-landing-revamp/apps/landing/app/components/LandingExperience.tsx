"use client";

import { useCallback } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import HeroSection from "./landing/HeroSection";
import HowItWorks from "./landing/HowItWorks";
import BeforeAfterDataset from "./landing/BeforeAfterDataset";
import BenchmarkProof from "./landing/BenchmarkProof";
import CaptureComparison from "./landing/CaptureComparison";
import MotionTracking from "./landing/MotionTracking";
import SpatialAgentDemo from "./landing/SpatialAgentDemo";
import ScenesShowcase from "./landing/ScenesShowcase";
import WorkSection from "./landing/WorkSection";
import ContactSection from "./landing/ContactSection";
import FinalCta from "./landing/FinalCta";
import OnboardingTour from "../onboarding/OnboardingTour";
import { storePendingPlanNavigation } from "../utils/navigation";
import type { ShowcaseScene } from "./scenes";

export default function LandingExperience() {
  const { isLoaded, isSignedIn } = useUser();
  const { openSignIn, openSignUp } = useClerk();

  const startScanning = useCallback(() => {
    if (!isLoaded) {
      return;
    }
    if (isSignedIn) {
      window.location.href = "/dashboard";
      return;
    }
    void openSignIn({ forceRedirectUrl: "/dashboard" });
  }, [isLoaded, isSignedIn, openSignIn]);

  const createAccount = useCallback(() => {
    if (!isLoaded) {
      return;
    }
    void openSignUp({ forceRedirectUrl: "/dashboard" });
  }, [isLoaded, openSignUp]);

  // The dashboard consumes this on load and pre-fills the scan composer.
  const runScene = useCallback(
    (scene: ShowcaseScene) => {
      storePendingPlanNavigation({
        prompt: scene.prompt,
        options: { trackingSource: "demo", demoVideoId: scene.videoId },
      });
      startScanning();
    },
    [startScanning],
  );

  return (
    <>
      <OnboardingTour page="landing" />
      <HeroSection ctaDisabled={!isLoaded} onStartScanning={startScanning} />
      <HowItWorks />
      <BeforeAfterDataset />
      <BenchmarkProof />
      <CaptureComparison />
      <MotionTracking />
      <SpatialAgentDemo />
      <ScenesShowcase onRunScene={runScene} />
      <WorkSection />
      <ContactSection />
      <FinalCta
        ctaDisabled={!isLoaded}
        isSignedIn={Boolean(isSignedIn)}
        onStartScanning={startScanning}
        onCreateAccount={createAccount}
      />
    </>
  );
}
