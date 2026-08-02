"""Kit-root path bootstrap so `import qc` resolves under pytest regardless of
how pytest determines rootdir/sys.path insertion for the `tests/` package."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
