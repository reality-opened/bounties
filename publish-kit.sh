#!/usr/bin/env bash
# OPERATOR TOOL — do not ship inside a kit.
#
# Builds a clean, standalone, publish-ready git repo for one bounty kit.
#
# Why this exists: the kits used to be individually git-initialized with a neutral author
# identity, but commit e3bf97d ("Flatten sub-repos into super repo") collapsed them into this
# single repo, whose history is authored by a real person's name + personal email. Pushing a kit
# directory directly from here would therefore leak (a) the operator index in README.md, which is
# explicitly not for interns, (b) all 27 kits including internal-only X1, and (c) the founder's
# identity in every commit. This script rebuilds the per-kit repo the run-book assumes.
#
# Usage:  ./publish-kit.sh r2-incumbent-pricing
# Output: .publish/<kit>/      — standalone repo, one commit, neutral identity, scrubbed.
#         .publish/<kit>.zip   — same content, no .git, for handing over without a repo.
#
# Both artifacts are regenerated together on every run so they can never disagree about what the
# kit currently says. .publish/ is gitignored build output: delete it whenever, rebuild with this.

set -euo pipefail

KIT="${1:-}"
if [[ -z "$KIT" ]]; then
  echo "usage: $0 <kit-dir>" >&2
  exit 2
fi

cd "$(dirname "$0")"
KIT="${KIT%/}"

if [[ ! -d "$KIT" || ! -f "$KIT/README.md" ]]; then
  echo "error: '$KIT' is not a bounty kit directory (no README.md)" >&2
  exit 2
fi

NEUTRAL_NAME="OpenReality Bounty Program"
NEUTRAL_EMAIL="bounty-kits@openreality.example"

# Client names, internal project codenames, and personal identity. /usr/bin/grep explicitly:
# the shell's grep alias skips dotfiles/.git in some configs.
SCRUB_RE='finc|efficura|chorus|labrador|neural[ _-]?motion|aurora|davzhang|galois|@gmail|david'
# Credential-shaped strings.
SECRET_RE='(sk-[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{12,}|ghp_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)'

STAGE=".publish/$KIT"
ZIP=".publish/$KIT.zip"
# Remove both artifacts up front: a stale zip left next to a fresh tree is how you hand an intern
# last week's spec.
rm -rf "$STAGE" "$ZIP"
mkdir -p "$STAGE"

# Copy kit contents, excluding any VCS/OS cruft.
tar --exclude='.git' --exclude='.DS_Store' --exclude='node_modules' \
    --exclude='__pycache__' --exclude='.pytest_cache' \
    -cf - -C "$KIT" . | tar -xf - -C "$STAGE"

fail=0
echo "== scrubbing content =="
if /usr/bin/grep -rinE "$SCRUB_RE" "$STAGE" ; then
  echo "!! FAIL: client/identity strings found above" >&2; fail=1
else
  echo "   clean (no client/identity strings)"
fi
if /usr/bin/grep -rinE "$SECRET_RE" "$STAGE" ; then
  echo "!! FAIL: credential-shaped strings found above" >&2; fail=1
else
  echo "   clean (no credential-shaped strings)"
fi
[[ $fail -eq 0 ]] || { echo "aborting; staged tree left at $STAGE for inspection" >&2; exit 1; }

echo "== initializing standalone repo =="
git -C "$STAGE" init -q -b main
git -C "$STAGE" config user.name  "$NEUTRAL_NAME"
git -C "$STAGE" config user.email "$NEUTRAL_EMAIL"
git -C "$STAGE" add -A
git -C "$STAGE" -c commit.gpgsign=false commit -q \
  -m "$KIT bounty kit" \
  -m "Self-contained bounty kit. See README.md for the spec and acceptance criteria."

echo "== verifying committed history =="
if /usr/bin/grep -rinE "$SCRUB_RE" "$STAGE/.git" ; then
  echo "!! FAIL: strings present inside .git" >&2; exit 1
fi
git -C "$STAGE" log --format='   author: %an <%ae>%n   commits: %h %s'

echo "== building handover zip =="
( cd .publish && zip -r -X "$KIT.zip" "$KIT" -x "$KIT/.git/*" '*/.DS_Store' >/dev/null )
echo "   $ZIP ($(du -h "$ZIP" | cut -f1)), $(unzip -l "$ZIP" | tail -1 | awk '{print $2}') entries, no .git"

cat <<EOF

Ready — both artifacts regenerated from the same scrubbed tree:
  repo: $STAGE
  zip:  $ZIP

Next (run-book steps 3-5):
  1. Sign the contributor IP agreement with the intern FIRST.
  2. Either
       gh repo create openreality-bounties/$KIT --private --source $STAGE --push
     or just send $ZIP.
  3. Invite the intern to that one repo only (repo route).
Re-run this script after any edit to $KIT/ — never edit inside .publish/, it gets wiped.
EOF
