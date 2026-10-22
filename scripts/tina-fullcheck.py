#!/usr/bin/env python3
"""Fail-closed entry point for the global TINA-FULLCHECK contract.

The legacy backend/SSR/SEO probe is intentionally available as
`scripts/tina-backend-public-check.py`. It is useful, but it is not a full
Tina acceptance gate because it does not authenticate to the live admin,
exercise every dynamic sidebar/island, mutate and restore every collection,
or verify every required system class.

Keep this command blocked until a collection-complete browser gate generates
and validates the required evidence manifest. This prevents a partial checker
from printing a false completion result.
"""
from __future__ import annotations

import json


def main() -> int:
    report = {
        "status": "BLOCKED",
        "TINA_FULLCHECK_OK": False,
        "reason": "The collection-complete authenticated browser gate is not yet implemented in this repository.",
        "partialCheck": "python3 scripts/tina-backend-public-check.py",
        "missingRequiredEvidence": [
            "authenticated live-admin login",
            "dynamic sidebar/island matrix for every configured collection and editable route alias",
            "non-empty form id/query/variables/data and exactly one intended primary form",
            "real Tina Save mutation for every configured collection",
            "authenticated backend and cache-busted public reflection",
            "exact admin/backend/public restoration and marker absence",
            "required media, relationship, SEO, route, browser-health, responsive, RSS/sitemap, and integration classes",
            "Cloudinary reversible upload/delete when applicable",
            "controlled-negative omission tests",
            "current Git-to-production lineage and zero unrun items",
        ],
    }
    print(json.dumps(report, indent=2))
    print("TINA_FULLCHECK_OK False")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
