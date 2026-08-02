"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import {
  getModalSlamToken,
  type PlanNavigationOptions,
} from "../utils/navigation";
import { hasScanAccess } from "../utils/scans";
import { DEMO_PROMPT_BY_VIDEO } from "./scenes";

interface DemoVideo {
  video_id: string;
  name: string;
  thumbnail?: string | null;
  filename?: string;
}

interface DemoCarouselProps {
  onPlanRequest: (prompt: string, options?: PlanNavigationOptions) => void | Promise<void>;
  sessionUrl?: string;
  isSessionReady?: boolean;
  /** Video the user picked upstream (e.g. the landing scene gallery); preselected when present in the catalog. */
  preferredVideoId?: string | null;
}

export default function DemoCarousel({
  onPlanRequest,
  sessionUrl,
  isSessionReady = false,
  preferredVideoId = null,
}: DemoCarouselProps) {
  const { getToken } = useAuth();
  const { isLoaded, user } = useUser();
  const [demoVideos, setDemoVideos] = useState<DemoVideo[]>([]);
  const [selectedDemoVideoId, setSelectedDemoVideoId] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const canUseDemos = isLoaded && hasScanAccess(user?.publicMetadata);

  useEffect(() => {
    if (!canUseDemos || !isSessionReady) {
      setIsAvailable(false);
      return;
    }

    const modalUrl = sessionUrl?.replace(/\/$/, "") ?? "";
    if (!modalUrl) {
      return;
    }

    const controller = new AbortController();

    const loadDemoVideos = async () => {
      try {
        const token = await getModalSlamToken(getToken);
        const response = await fetch(`${modalUrl}/api/demo/videos`, {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          mode: "cors",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch demo videos (${response.status})`);
        }
        const data = await response.json() as { videos?: DemoVideo[] };
        const videos = Array.isArray(data.videos) ? data.videos : [];
        if (videos.length === 0) {
          return;
        }
        setDemoVideos(videos);
        const preferred = preferredVideoId
          && videos.some((video) => video.video_id === preferredVideoId)
          ? preferredVideoId
          : videos[0].video_id;
        setSelectedDemoVideoId(preferred);
        setIsAvailable(true);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.warn("Failed to load demo videos:", error);
          setIsAvailable(false);
        }
      }
    };

    void loadDemoVideos();
    return () => controller.abort();
  }, [getToken, canUseDemos, isSessionReady, sessionUrl, preferredVideoId]);

  if (!isAvailable || demoVideos.length === 0) {
    return null;
  }

  const startDemo = () => {
    if (!selectedDemoVideoId) {
      return;
    }
    const selectedVideo = demoVideos.find((video) => video.video_id === selectedDemoVideoId);
    const label = selectedVideo?.name || selectedVideo?.filename || selectedDemoVideoId;
    const prompt = DEMO_PROMPT_BY_VIDEO[selectedDemoVideoId]
      || `DEMO: Explore scene from ${label} and track furniture, containers, and navigation landmarks.`;

    void onPlanRequest(prompt, {
      trackingSource: "demo",
      demoVideoId: selectedDemoVideoId,
    });
  };

  return (
    <aside className="demo-quick-launch glass-card">
      <label className="demo-label">Demo Mode</label>
      <div className="demo-grid">
        {demoVideos.map((video) => (
          <button
            key={video.video_id}
            type="button"
            className={`demo-thumb-btn ${
              selectedDemoVideoId === video.video_id ? "selected" : ""
            }`}
            onClick={() => setSelectedDemoVideoId(video.video_id)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="demo-thumb"
              src={video.thumbnail || ""}
              alt={`${video.name || video.filename || video.video_id} thumbnail`}
            />
            <span className="demo-thumb-name">
              {video.name || video.filename || video.video_id}
            </span>
          </button>
        ))}
      </div>
      <div className="demo-row">
        <button
          type="button"
          className="btn-secondary demo-start-btn"
          disabled={!selectedDemoVideoId}
          onClick={startDemo}
        >
          Use Demo
        </button>
      </div>
    </aside>
  );
}
