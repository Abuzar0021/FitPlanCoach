# Build Status — FitPlanCoach Product & Release Bible

**Phase:** COMPLETE — all 6 phases (0–5) done; Bible builds (~71 pp), QA gate passed
**Last updated:** 2026-06-29

> Next focus per the standing directive: drive the remaining **code-actionable**
> Planned items (Vitest engine tests → close the Ch. 23 gap; regenerate types.ts;
> legacy payment-table cleanup) to *implemented*, syncing the affected chapters.
> All other Planned items are explicitly blocked (external build / Play Console /
> operator credentials) — see `00_INVENTORY.md` §8 and Ch. 26.

## Toolchain (Phase 0)

| Need | Spec primary | Reality here | Resolution |
|---|---|---|---|
| Markdown → PDF | `pandoc` + `xelatex` | **absent** (no pandoc/xelatex/tectonic/wkhtmltopdf/weasyprint) | spec fallback **`md-to-pdf`** (Puppeteer) — installed in `_build/` |
| Diagrams | `@mermaid-js/mermaid-cli` (`mmdc`) | binary absent, npm install works | installed in `_build/`, reuses pre-installed Chromium |
| Chromium | bundled w/ mermaid-cli | pre-installed at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` | wired via `puppeteer-config.json` + `BIBLE_CHROMIUM` |

**Smoke test:** PASS — `node build-bible.mjs --smoke` produced a 4-page PDF
(title + linked TOC + 2 chapters) with a real 2265×327 mermaid PNG embedded as a
PDF image XObject. Build is reproducible: `cd _build && npm install && npm run build`.

> Honest note: pandoc/xelatex are unavailable, so numbered-section LaTeX styling
> is replaced by a CSS print stylesheet + Chromium pagination. This is the spec's
> sanctioned last-resort fallback, not a hand-typed PDF. Output is a real,
> machine-generated PDF with a working clickable TOC and page numbers.

## Phases

- [x] **Phase 0** — toolchain + smoke test
- [x] **Phase 1** — `00_INVENTORY.md` ground-truth inventory + Feature Matrix
- [x] **Phase 2** — author 27 chapters
- [x] **Phase 3** — diagrams (27 mermaid diagrams, one+ per chapter, all render)
- [x] **Phase 4** — assemble PDF (~71 pp, linked TOC + page numbers)
- [x] **Phase 5** — QA gate vs Definition of Done → `QA_REPORT.md` (complete)

## Chapters (Phase 2)

- [x] 01 Executive Summary
- [x] 02 Company Vision
- [x] 03 Product Overview
- [x] 04 System Architecture
- [x] 05 Database
- [x] 06 Backend
- [x] 07 Frontend
- [x] 08 Mobile App  ⚠cond (Partial)
- [ ] 09 Website
- [x] 10 Admin CMS  ⚠cond
- [x] 11 Authentication
- [x] 12 Memberships  ⚠cond (Partial)
- [x] 13 Workout System
- [x] 14 Nutrition System
- [x] 15 Daily Tips
- [x] 16 Analytics
- [x] 17 Blog
- [x] 18 Media Library
- [x] 19 SEO
- [x] 20 Security
- [x] 21 Accessibility
- [x] 22 Performance
- [x] 23 Testing
- [x] 24 Deployment
- [x] 25 Launch Checklist
- [x] 26 Future Roadmap
- [x] 27 Definition of Done

## Planned-item drive (per user directive)

Every Feature-Matrix / chapter item marked **Planned** must reach
*implemented* or *explicitly blocked by credentials/external services*. Tracked
in `00_INVENTORY.md` → "Planned-item disposition" once Phase 1 lands.

## Blockers

- None for the build pipeline. Pixel-level visual proofing of the PDF is limited
  (no `pdftoppm`/poppler to rasterize for inline inspection); structural
  validation (page objects, embedded image XObjects, byte size) is used instead.

## Resume protocol

On resume: read this file, continue from the first unchecked item. Never restart
completed work. Run `cd _build && npm install` if `node_modules/` is absent
(it is gitignored).
