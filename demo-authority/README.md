# Commercial Daily News Demo Authority

This directory is an extraction-only authority produced under **ASTRO-DEMO-LOCK**. It does not implement or modify the destination site.

## Contents

- `bundles/` — byte-for-byte copies of the nine supplied bundled HTML demos.
- `rendered/` — unpacked DOM captured after browser rendering, with blob/data references rewritten to stable hash-addressed files.
- `assets/` — deduplicated assets named by SHA-256.
- `screenshots/` — full-page desktop (1440×1000 viewport) and mobile (390×844 viewport) PNG captures.
- `metadata/` — sanitized per-page runtime audits and asset inventories.
- `reports/audit.json` and `reports/audit.md` — machine and human audit reports.
- `SHA256SUMS` — authority manifest of every regular file except `SHA256SUMS` itself.

## Reproduction

```bash
python3 scripts/extract_static.py
node scripts/capture.js
python3 scripts/stabilize_data_assets.py
python3 scripts/build_report.py
```

The capture script serves all nine bundles on an ephemeral localhost port and uses headless Chromium through Playwright. The final manifest must be regenerated only after all other output is complete.
