# 27. Definition of Done

**Status:** Implemented (criteria + current state)
**Last verified against commit:** 26c8ce4 · 2026-06-29

## 1. Purpose & Scope

The shared bar for "done" — both for product features and for this Bible — with
an honest read on where the product stands against it today.

## 2. Implementation

**Feature Definition of Done (engineering).**
- [x] Behaviour implemented and reachable from a route/admin screen.
- [x] Server-side authorisation/entitlement enforced (never client-trusted).
- [x] Inputs validated (Zod) where the handler takes input.
- [x] `tsc` clean (no real errors) + ESLint clean.
- [x] Loading / empty / error states present for user-facing screens.
- [x] Accessibility baseline (labels, focus, reduced-motion).
- [~] **Automated test coverage** — *partial*: the pure engine has 14 unit tests
  (`npm test`); integration/e2e + CI still pending (Ch. 23).

**Release Definition of Done (product).**
- [x] Web surface code-complete and verifiable.
- [ ] Native Android app published + Play Billing wired — *blocked (external)*.
- [ ] Operator config applied (migrations, roles, CMS, Search Console) — *ops*.
- [x] Honest runbook (`LAUNCH.md`) + this Bible exist and are kept in sync.

**Bible Definition of Done (this document).**
- [x] All 27 chapter files exist with the 6 required sections + Source Files.
- [x] Every "Implemented" claim cites a real path; conditional features (mobile,
  billing, admin) are marked per the Phase 1 reality, not assumed.
- [x] Diagrams authored as mermaid and render in the build (verified Phase 0/2).
- [x] PDF builds with a linked TOC via `_build/build-bible.mjs`.
- [x] Consistent product name/version/terminology; prior audit findings folded in
  (Limitations + Launch).
- [x] No padding; shortfalls disclosed (see Ch. 23 testing, Ch. 22 benchmarking).

## 3. User & Data Flows

```mermaid
flowchart LR
  Feat[Feature DoD] --> Rel[Release DoD]
  Rel --> Bible[Bible DoD]
  Bible --> QA[QA gate Ch.5/Phase5]
```

## 4. Dependencies

- Every chapter; `_build/build-bible.mjs`; `_build/STATUS.md`.

## 5. Limitations & Known Issues

- The product does **not** fully meet its own DoD on two axes: **automated
  testing** (engine now covered; integration/e2e + CI still pending) and
  **published native app** (external, blocked). Both are tracked in Ch. 26.

## 6. Planned Future Improvements

- Close the testing gap to make the Feature DoD fully green (Ch. 23, 26 P1).
- Complete the native release to make the Release DoD green (Ch. 08, 12, 26 P0).

---
**Source Files**
- All chapters; `docs/Product-Release-Bible/_build/STATUS.md`
- `package.json`, `docs/LAUNCH.md`
