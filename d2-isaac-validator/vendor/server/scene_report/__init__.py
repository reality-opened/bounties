"""Trimmed vendor copy — schemas only.

The real ``server/scene_report`` package (in the ``server`` repo) also has ``features.py``,
``report.py``, ``object_enricher.py`` and ``store.py`` (LLM calls, reverse-image search, a
Modal-backed store, ...). None of that is needed to run the export code paths this kit
vendors, so only ``schemas.py`` is carried over here. Do not treat this as the real package.
"""

from __future__ import annotations
