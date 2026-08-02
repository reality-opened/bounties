#!/usr/bin/env bash
# Regenerate the static landing-page scene thumbnails from the demo videos.
# Requires ffmpeg and the real video files (git lfs pull) in server/demo_videos/.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/server/demo_videos"
OUT="$ROOT/landing/public/assets/scenes"
mkdir -p "$OUT"

extract() { # <source> <slug> <timestamp>
  ffmpeg -y -ss "$3" -i "$SRC/$1" -frames:v 1 -update 1 -vf "scale=960:-2" -q:v 3 "$OUT/$2.jpg"
}

extract office_loop.mp4    office-loop 00:00:02
extract house.MOV          house       00:00:40
extract house2.MOV         house-2     00:00:06
extract crime_scene.mov    crime-scene 00:00:04
extract disaster.mov       disaster    00:00:03
extract disaster2.mov      disaster-2  00:00:03
extract hackathon_loop.MOV hackathon   00:00:36
extract our_workspace.MOV  workspace   00:00:03
