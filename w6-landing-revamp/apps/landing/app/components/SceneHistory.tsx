"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { getModalSlamToken } from "../utils/navigation";

const MODAL_URL = (process.env.NEXT_PUBLIC_MODAL_URL ?? "").replace(/\/$/, "");

type KeyframeRef = { submap_id: number; frame_idx: number; blob_key: string };

type SceneListItem = {
  scan_id: string;
  created_at: number;
  room_type: string;
  summary: string;
  object_count: number;
  point_count: number;
  thumbnail: KeyframeRef | null;
};

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/**
 * Scene history — lists the signed-in user's persisted scans by calling the
 * always-on CPU broker (`GET /api/scenes`). Opening one routes to the broker-served
 * `/revisit.html`, so revisiting a past scan never boots a GPU worker.
 */
export default function SceneHistory({ enabled }: { enabled: boolean }) {
  const { getToken } = useAuth();
  const [scenes, setScenes] = useState<SceneListItem[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [token, setToken] = useState<string>("");
  const [error, setError] = useState<string>("");

  const load = useCallback(async () => {
    if (!MODAL_URL) {
      setState("error");
      setError("NEXT_PUBLIC_MODAL_URL is not configured.");
      return;
    }
    setState("loading");
    try {
      const t = await getModalSlamToken(getToken);
      setToken(t);
      const res = await fetch(`${MODAL_URL}/api/scenes`, {
        headers: { Authorization: `Bearer ${t}` },
        mode: "cors",
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Failed to load scans (${res.status}).`);
      const data = await res.json();
      setScenes(Array.isArray(data.scenes) ? data.scenes : []);
      setState("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load history.");
      setState("error");
    }
  }, [getToken]);

  useEffect(() => {
    if (enabled) void load();
  }, [enabled, load]);

  if (!enabled) return null;

  const revisitHref = (scanId: string) =>
    `${MODAL_URL}/revisit.html#scan_id=${encodeURIComponent(scanId)}&token=${encodeURIComponent(token)}`;
  const thumbUrl = (scanId: string, blobKey: string) =>
    `${MODAL_URL}/api/scenes/${encodeURIComponent(scanId)}/keyframes/${encodeURIComponent(blobKey)}?auth_token=${encodeURIComponent(token)}`;

  return (
    <div className="glass-card dashboard-panel scene-history">
      <p className="eyebrow">Your scans</p>
      <h2 className="hero-title">Revisit a past scan.</h2>
      <p className="lead">
        Open a saved reconstruction with reports, photos, 3D views, and grounded Q&amp;A 
        without spinning up a GPU.
      </p>

      {state === "loading" && <p className="note">Loading your scans…</p>}
      {state === "error" && <p className="note config-warning">{error}</p>}
      {state === "ready" && scenes.length === 0 && (
        <p className="note">No saved scans yet. Finish a scan and it will appear here.</p>
      )}

      {scenes.length > 0 && (
        <ul className="scene-history-grid">
          {scenes.map((s) => (
            <li key={s.scan_id}>
              <a
                href={revisitHref(s.scan_id)}
                target="_blank"
                rel="noreferrer"
                className="scene-history-card"
              >
                {s.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbUrl(s.scan_id, s.thumbnail.blob_key)}
                    alt=""
                    className="scene-history-thumb"
                  />
                ) : (
                  <div className="scene-history-thumb" />
                )}
                <div className="scene-history-text">
                  <strong>{s.room_type && s.room_type !== "unknown" ? cap(s.room_type) : "Scan"}</strong>
                  <span className="scene-history-summary">{s.summary || "No summary"}</span>
                  <span className="scene-history-sub">
                    {s.object_count} object{s.object_count === 1 ? "" : "s"} ·{" "}
                    {new Date(s.created_at * 1000).toLocaleDateString()}
                  </span>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
