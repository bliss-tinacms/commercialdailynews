#!/usr/bin/env python3
"""Controlled negative: an incomplete fullcheck must fail closed."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
result = subprocess.run(
    [sys.executable, str(root / "scripts" / "tina-fullcheck.py")],
    cwd=root,
    text=True,
    capture_output=True,
    check=False,
)
combined = result.stdout + result.stderr
if result.returncode == 0:
    raise SystemExit("FAIL: incomplete tina:fullcheck returned success")
if "TINA_FULLCHECK_OK False" not in combined or '"status": "BLOCKED"' not in combined:
    raise SystemExit("FAIL: incomplete tina:fullcheck did not report BLOCKED/False")
print("TINA_FULLCHECK_FAILCLOSED_NEGATIVE_PASS")
