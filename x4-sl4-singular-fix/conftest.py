"""Root conftest — make `src` and `fixtures` importable as plain packages
regardless of the directory pytest is invoked from.

pytest auto-loads this file (it walks up from each test file looking for
conftest.py) before collection starts, so inserting the repo root here is
enough for `from src.sl4_normalize import ...` and
`from fixtures.synthetic_degenerate import ...` to resolve in every test file
under tests/.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
