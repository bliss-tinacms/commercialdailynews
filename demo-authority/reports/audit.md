# Commercial Daily News demo authority audit

**Standard:** ASTRO-DEMO-LOCK  
**Scope:** exact extraction/audit only; no destination implementation  
**Authority root:** `/home/aaisha/workspaces/commercialdailynews-demo-authority`

## Route map

| Input | Meaning | Served route | HTTP |
|---|---|---|---:|
| index | home | `/` | 200 |
| about | about | `/about/` | 200 |
| team | team | `/team/` | 200 |
| page | representative generic page (Editorial Guidelines) | `/editorial-guidelines/` | 200 |
| contact | contact | `/contact/` | 200 |
| category | category archive (Business & Economy) | `/category/business-economy/` | 200 |
| author | author route (Patricia Waters) | `/author/patricia-waters/` | 200 |
| article | article route (Why a new warehouse can change a whole neighborhood) | `/why-a-new-warehouse-can-change-a-whole-neighborhood/` | 200 |
| 404 | unknown route | `/this-route-does-not-exist/` | 404 |

## Shared visual/system findings

- **Final titles:** All nine unpacked pages have an empty document.title because their templates contain no <title> element.
- **Fonts:** Newsreader (editorial display) and Public Sans (UI/body); the exact WOFF2 files and hashes are in the JSON report and per-page asset inventories.
- **Palette:** #0E1F3D navy, #E8B23A gold, #F4F5F7 light gray, #1B2433 text, #FFFFFF white.
- **Widths:** 1320px header shell, 1280px primary content, 820px/750px article text areas, 640px 404 panel.
- **Responsive behavior:** JavaScript resize listener drives mobile layout below 1100px; article also changes at 960px. CSS media inventory only contains print. Fluid clamp() sizing/padding is also used.
- **Header:** Sticky navy header with 4px gold top rule, centered logo, two desktop navigation groups; below 1100px it switches to a menu-button/mobile navigation state.
- **Footer:** Navy footer containing logo/description, navigation and policy/about/team/contact links, divider, and copyright line.
- **Runtime:** React 18.3.1 + ReactDOM 18.3.1 with bundled DCLogic/x-dc templates.

## Page captures

### index
- Route/status: `/` (200)
- Final title: `` (empty; no `<title>` in unpacked DOM)
- DOM root: `div#dc-root`; child class `sc-host`
- Section/heading order: Where business meets everyday life → Stories that matter, explained clearly. → Stories taking shape → What we cover → A strong story needs substance, not just a headline. → The newsroom
- Content max widths: 1320px, 100%, 1280px, 820px, 720px
- Nonzero radii: 50%
- Assets: 17 manifest entries, 8 runtime blobs, 16 runtime data URLs, 17 manifest-backed replacements plus 7 runtime data-image hashes stabilized
- Screenshots: `screenshots/index-desktop-1440x1000.png` 1440×5720; `screenshots/index-mobile-390x844.png` 390×8380
- Stable DOM: `rendered/index.html`

### about
- Route/status: `/about/` (200)
- Final title: `` (empty; no `<title>` in unpacked DOM)
- DOM root: `div#dc-root`; child class `sc-host`
- Section/heading order: About Commercial Daily News → Where business meets everyday life → To make important stories accessible and relevant. → A strong story needs substance as well as a headline. → A place for different interests → Read our editorial guidelines
- Content max widths: 1320px, 100%, 1280px
- Nonzero radii: none
- Assets: 16 manifest entries, 7 runtime blobs, 9 runtime data URLs, 16 stabilized references
- Screenshots: `screenshots/about-desktop-1440x1000.png` 1440×4321; `screenshots/about-mobile-390x844.png` 390×6344
- Stable DOM: `rendered/about.html`

### team
- Route/status: `/team/` (200)
- Final title: `` (empty; no `<title>` in unpacked DOM)
- DOM root: `div#dc-root`; child class `sc-host`
- Section/heading order: The Commercial Daily News newsroom → Richard Sheppard → Kathleen Greene → Jerry Barnes → Patricia Waters → Bruce Matthews → Teresa Fletcher
- Content max widths: 1320px, 100%, 1280px
- Nonzero radii: 50%
- Assets: 19 manifest entries, 10 runtime blobs, 9 runtime data URLs, 19 stabilized references
- Screenshots: `screenshots/team-desktop-1440x1000.png` 1440×2342; `screenshots/team-mobile-390x844.png` 390×4243
- Stable DOM: `rendered/team.html`

### page
- Route/status: `/editorial-guidelines/` (200)
- Final title: `` (empty; no `<title>` in unpacked DOM)
- DOM root: `div#dc-root`; child class `sc-host`
- Section/heading order: Editorial Guidelines → Accuracy → Sourcing and Attribution → Anonymous Sources → News, Analysis, and Opinion → Fairness → Conflicts of Interest → Corrections → Wire and Partner Material → A Working Note
- Content max widths: 1320px, 100%, 1280px
- Nonzero radii: none
- Assets: 13 manifest entries, 4 runtime blobs, 9 runtime data URLs, 13 stabilized references
- Screenshots: `screenshots/page-desktop-1440x1000.png` 1440×2512; `screenshots/page-mobile-390x844.png` 390×4158
- Stable DOM: `rendered/page.html`

### contact
- Route/status: `/contact/` (200)
- Final title: `` (empty; no `<title>` in unpacked DOM)
- DOM root: `div#dc-root`; child class `sc-host`
- Section/heading order: Contact Us → Send us a message → More ways to reach the newsroom → Corrections → DMCA and Legal Notices → Letters to the Editor
- Content max widths: 1320px, 100%, 1280px
- Nonzero radii: none
- Assets: 13 manifest entries, 4 runtime blobs, 9 runtime data URLs, 13 stabilized references
- Screenshots: `screenshots/contact-desktop-1440x1000.png` 1440×2186; `screenshots/contact-mobile-390x844.png` 390×3742
- Stable DOM: `rendered/contact.html`

### category
- Route/status: `/category/business-economy/` (200)
- Final title: `` (empty; no `<title>` in unpacked DOM)
- DOM root: `div#dc-root`; child class `sc-host`
- Section/heading order: Business & Economy
- Content max widths: 1320px, 100%, 1280px
- Nonzero radii: 50%
- Assets: 23 manifest entries, 14 runtime blobs, 9 runtime data URLs, 23 stabilized references
- Screenshots: `screenshots/category-desktop-1440x1000.png` 1440×2259; `screenshots/category-mobile-390x844.png` 390×3966
- Stable DOM: `rendered/category.html`

### author
- Route/status: `/author/patricia-waters/` (200)
- Final title: `` (empty; no `<title>` in unpacked DOM)
- DOM root: `div#dc-root`; child class `sc-host`
- Section/heading order: Patricia Waters
- Content max widths: 1320px, 100%, 1280px
- Nonzero radii: 50%
- Assets: 21 manifest entries, 12 runtime blobs, 9 runtime data URLs, 21 stabilized references
- Screenshots: `screenshots/author-desktop-1440x1000.png` 1440×2358; `screenshots/author-mobile-390x844.png` 390×4301
- Stable DOM: `rendered/author.html`

### article
- Route/status: `/why-a-new-warehouse-can-change-a-whole-neighborhood/` (200)
- Final title: `` (empty; no `<title>` in unpacked DOM)
- DOM root: `div#dc-root`; child class `sc-host`
- Section/heading order: Why a new warehouse can change a whole neighborhood → What arrives with a large employer → Roads, trucks, and daily routines → The effect on rents and home prices → What it means for local businesses → What to watch next → Related stories
- Content max widths: 1320px, 100%, 1280px, 820px, 750px
- Nonzero radii: 50%
- Assets: 18 manifest entries, 9 runtime blobs, 9 runtime data URLs, 18 stabilized references
- Screenshots: `screenshots/article-desktop-1440x1000.png` 1440×3285; `screenshots/article-mobile-390x844.png` 390×5292
- Stable DOM: `rendered/article.html`

### 404
- Route/status: `/this-route-does-not-exist/` (404)
- Final title: `` (empty; no `<title>` in unpacked DOM)
- DOM root: `div#dc-root`; child class `sc-host`
- Section/heading order: Page not found
- Content max widths: 1320px, 100%, 1280px, 640px
- Nonzero radii: none
- Assets: 13 manifest entries, 4 runtime blobs, 9 runtime data URLs, 13 stabilized references
- Screenshots: `screenshots/404-desktop-1440x1000.png` 1440×1195; `screenshots/404-mobile-390x844.png` 390×1101
- Stable DOM: `rendered/404.html`

## Extraction blockers

- Eight pages rendered with no console errors, page errors, or request failures.
- The home page emitted two expected 404s for unresolved literal template placeholders (`{{ p.img }}` and `{{ t.img }}`) plus corresponding resource warnings. Rendered cards still use their bundled data images; this is recorded, not repaired, to preserve fidelity.
- No credentials were sought or exposed. All transient blob/data resources were hashed while the browser context was alive and matched to stable extracted manifest files.

## Detailed authority

- Sanitized machine report: `reports/audit.json`
- Per-page runtime audits: `metadata/*-audit.json`
- Per-page UUID→hash inventories: `metadata/*-static-assets.json`
- Runtime data-image inventory: `metadata/transient-assets.json` (7 index-page data URLs, deduplicated into stable assets)
- Stable hash-addressed assets: `assets/`
- Unpacked/stabilized DOM: `rendered/`
- Original supplied bundles: `bundles/`
- Full-page screenshots: `screenshots/`
- SHA-256 manifest: `SHA256SUMS` (excludes itself)
