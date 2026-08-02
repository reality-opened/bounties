# 7-Scenes dataset — layout & pointers

**7-Scenes** is a public RGB-D relocalization/tracking benchmark released by
Microsoft Research: seven small indoor environments, each captured as
multiple short handheld sequences with per-frame ground-truth camera pose.
It's widely used as an off-the-shelf benchmark for visual odometry / SLAM
tracking accuracy, which is why it's a natural target for a benchmark
runner.

> This doc describes the dataset's public layout from general knowledge of
> the release; if any specific detail (exact per-scene sequence counts,
> frame counts, or a distribution mirror's URL) has since changed, treat the
> dataset's own included readme as the final authority and correct this doc.

## The seven scenes

```
chess
fire
heads
office
pumpkin
redkitchen
stairs
```

Each scene is distributed as its own archive/folder, and each contains
multiple sequence subfolders plus a train/test split file:

```
<scene>/
  TrainSplit.txt        # which seq-XX folders are "train" for this scene
  TestSplit.txt         # which seq-XX folders are "test" for this scene
  seq-01/
  seq-02/
  ...
```

## Per-frame file naming inside a sequence

Within a `seq-XX/` folder, every captured frame contributes three files,
sharing a common zero-padded 6-digit frame index:

```
frame-000000.color.png     # RGB color image
frame-000000.depth.png     # 16-bit depth image (millimeters; a reserved
                            # sentinel value marks invalid/missing depth —
                            # check the dataset's own readme for the exact
                            # sentinel used in your copy)
frame-000000.pose.txt      # 4x4 camera-to-world transform for this frame
```

- Frame indices are contiguous starting at `000000` within a sequence;
  sequence length (frame count) varies by scene/sequence — some are a few
  hundred frames, others closer to a thousand. Don't assume a fixed count.
- A runner driving a SLAM binary against this layout only needs the
  `frame-XXXXXX.color.png` images as `--image_folder` input (per
  `docs/cli-contract.md`) — depth and pose are for ground-truth/evaluation
  purposes, not SLAM input, for a monocular-style benchmark run.

## Ground-truth pose availability

**Ground truth is available per frame**, as `frame-XXXXXX.pose.txt`: a
plain-text 4x4 matrix (4 lines, 4 space-separated floats each) giving that
frame's camera-to-world transform, originally produced by the dataset's own
capture-time tracking. This is a meaningfully different shape from a single
aggregated TUM trajectory file — a runner needs a conversion/aggregation
step that:

1. reads each frame's `pose.txt` in frame order,
2. decomposes the 4x4 matrix into translation + rotation,
3. converts rotation to a quaternion (scalar-last, to match this program's
   TUM convention elsewhere),
4. assigns each frame a timestamp (frame index is a reasonable choice, since
   the dataset doesn't ship separate capture timestamps),

and writes the result out as one TUM-format ground-truth file per sequence,
before that sequence's estimate can be scored against it with `evo_ape`.

## Where to get it

The dataset is published by Microsoft Research for non-commercial research
use; search "Microsoft 7-Scenes dataset" for the current official download
page and license terms, and confirm the license permits your intended use
before redistributing any of it. This kit does not bundle any of the real
dataset — see `fixtures/` for small, synthetic stand-ins in the same
directory shape, used to develop and test the runner without the real
(multi-gigabyte) download.
