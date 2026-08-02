#!/usr/bin/env python
from pathlib import Path
import struct

import numpy as np


ROOT = Path(__file__).resolve().parents[2]
CONVERSIONS = [
    (ROOT / "hero" / "cov_web_shoe.npz", ROOT / "landing" / "public" / "assets" / "compare" / "casual.ply"),
    (ROOT / "hero" / "cov_delib_shoe.npz", ROOT / "landing" / "public" / "assets" / "compare" / "deliberate.ply"),
]


def load_cloud(path: Path) -> tuple[np.ndarray, np.ndarray]:
    with np.load(path) as data:
        keys = set(data.files)
        expected = {"centers", "colors"}
        if keys != expected:
            raise ValueError(f"{path} has keys {sorted(keys)}, expected {sorted(expected)}")

        centers = data["centers"]
        colors = data["colors"]

    if centers.dtype != np.float32 or centers.ndim != 2 or centers.shape[1] != 3:
        raise ValueError(f"{path} centers must be (N, 3) float32")
    if colors.dtype != np.uint8 or colors.ndim != 2 or colors.shape[1] != 3:
        raise ValueError(f"{path} colors must be (N, 3) uint8")
    if centers.shape[0] != colors.shape[0]:
        raise ValueError(f"{path} centers/colors row counts differ")

    return np.ascontiguousarray(centers, dtype="<f4"), np.ascontiguousarray(colors, dtype=np.uint8)


def write_binary_ply(path: Path, centers: np.ndarray, colors: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    header = (
        "ply\n"
        "format binary_little_endian 1.0\n"
        f"element vertex {centers.shape[0]}\n"
        "property float x\n"
        "property float y\n"
        "property float z\n"
        "property uchar red\n"
        "property uchar green\n"
        "property uchar blue\n"
        "end_header\n"
    ).encode("ascii")

    with path.open("wb") as handle:
        handle.write(header)
        for center, color in zip(centers, colors):
            handle.write(struct.pack("<fffBBB", center[0], center[1], center[2], color[0], color[1], color[2]))


def main() -> None:
    for source, destination in CONVERSIONS:
        centers, colors = load_cloud(source)
        write_binary_ply(destination, centers, colors)
        print(f"Wrote {destination.relative_to(ROOT)} ({centers.shape[0]} vertices)")


if __name__ == "__main__":
    main()
