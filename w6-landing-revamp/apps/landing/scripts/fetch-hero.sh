#!/usr/bin/env bash
#
# fetch-hero.sh — materialize the hero point cloud into public/ before `next build`.
#
# The hero (app/components/HeroScene.tsx) loads /assets/Gaussian_splat.ply at
# RUNTIME. That ~47 MB file is intentionally NOT in git (see the repo-root
# web/scripts/fetch-assets.sh + .gitignore). On Vercel the deploy uploads only
# this app dir (apps/landing) for the remote build, so the repo-root fetch
# script isn't available there — hence this self-contained, landing-only fetch.
# In prod the file lives in a PUBLIC GitHub release and is pulled here at build
# time so Vercel serves it as a static asset under /assets/.
#
# Wired as the Vercel build command (apps/landing/vercel.json):
#   bash scripts/fetch-hero.sh && next build
#
# Behavior (keeps "the site builds without the asset" true):
#   - already present          -> skip (local dev that ran web/scripts/fetch-assets.sh)
#   - WEB_ASSETS_BASE_URL set   -> curl it (the prod path; serves <name> at BASE/<name>)
#   - neither                  -> warn and continue; the hero just won't render its cloud
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # apps/landing
NAME="Gaussian_splat.ply"
DEST="$DIR/public/assets/$NAME"

if [[ -s "$DEST" ]]; then
  echo "fetch-hero: $NAME already present — skipping."
  exit 0
fi

if [[ -n "${WEB_ASSETS_BASE_URL:-}" ]]; then
  echo "fetch-hero: downloading $NAME from \$WEB_ASSETS_BASE_URL"
  mkdir -p "$(dirname "$DEST")"
  curl -fSL --retry 5 --retry-delay 3 "${WEB_ASSETS_BASE_URL%/}/$NAME" -o "$DEST"
  echo "fetch-hero: → public/assets/$NAME"
else
  echo "fetch-hero: WARNING — WEB_ASSETS_BASE_URL unset and $NAME absent; building WITHOUT the hero cloud." >&2
fi
