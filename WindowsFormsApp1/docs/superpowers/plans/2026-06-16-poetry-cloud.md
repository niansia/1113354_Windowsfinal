# Poetry Cloud Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fully interactive Traditional Chinese Poetry Cloud overlay to Fusion OS with search, filters, a Canvas relationship universe, poet/poem details, shortest-path exploration, narration, and favorites.

**Architecture:** Register a new lazy-loaded React overlay and keep its domain logic in focused `src/poetry` modules. Ship a curated offline corpus, derive searchable indexes and graph edges locally, and keep the UI independent from any future large remote corpus adapter.

**Tech Stack:** React 19, TypeScript, Canvas 2D, Framer Motion, Lucide React, Web Speech API, localStorage, Node test runner, Vite.

---

### Task 1: Register the application

**Files:**
- Modify: `Frontend/src/types.ts`
- Modify: `Frontend/src/data/fusionApps.ts`
- Modify: `Frontend/src/i18n/featureTranslations.ts`
- Modify: `Frontend/src/components/SpatialHomeStage.tsx`
- Modify: `Frontend/src/main.tsx`
- Test: `Frontend/tests/appCatalog.test.ts`

- [ ] Add a failing catalog test for the `poetry` overlay and translated entry fields.
- [ ] Run `npm run test:features` and confirm the new assertions fail.
- [ ] Add the `poetry` AppId, catalog entry, icon mapping, lazy overlay and stylesheet import.
- [ ] Re-run the focused catalog test and confirm it passes.

### Task 2: Build the poetry domain modules

**Files:**
- Create: `Frontend/src/poetry/poetryTypes.ts`
- Create: `Frontend/src/poetry/poetryCorpus.ts`
- Create: `Frontend/src/poetry/poetrySearch.ts`
- Create: `Frontend/src/poetry/poetryGraph.ts`
- Create: `Frontend/src/poetry/poetryAnalysis.ts`
- Test: `Frontend/tests/poetryCloud.test.ts`
- Modify: `Frontend/tsconfig.feature-tests.json`
- Modify: `Frontend/package.json`

- [ ] Write failing tests for mixed-field search, dynasty/form filters, relationship construction, shortest path and deterministic analysis.
- [ ] Compile and run the poetry test alone to verify RED.
- [ ] Implement the types, curated corpus, search index, graph functions and local analysis.
- [ ] Re-run the poetry test and confirm GREEN.

### Task 3: Implement the Canvas universe

**Files:**
- Create: `Frontend/src/components/poetry/PoetryUniverseCanvas.tsx`
- Create: `Frontend/src/poetry/poetryLayout.ts`
- Test: `Frontend/tests/poetryCloud.test.ts`

- [ ] Add failing deterministic layout tests for bounded node positions and focus scaling.
- [ ] Implement seeded radial placement, hit testing, zoom and pan transforms.
- [ ] Render edges, nodes, labels, focus glow and highlighted paths in Canvas 2D.
- [ ] Verify layout tests pass.

### Task 4: Implement the application shell

**Files:**
- Create: `Frontend/src/components/FusionPoetryCloud.tsx`
- Create: `Frontend/src/styles/fusionPoetryCloud.css`
- Add: `Frontend/public/poetry/poetry-cloud-nebula.png`

- [ ] Copy the generated nebula asset into the public poetry asset directory.
- [ ] Build the top controls, search mode, dynasty/form filters and data status.
- [ ] Build the left route panel, central Canvas workspace and right detail library.
- [ ] Add poem drawer, favorites, copy/share, speech synthesis and reset controls.
- [ ] Add responsive layouts for 1200px and 760px widths.

### Task 5: Verify and visually QA

**Files:**
- Modify: `design-qa.md`

- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run test:features`.
- [ ] Run `npm run build`.
- [ ] Run `git diff --check`.
- [ ] Open the local app in the in-app browser and exercise search, filters, graph selection, path finding, poem detail, favorite and close actions.
- [ ] Check browser console errors.
- [ ] Capture the implementation at the reference viewport, compare it with the supplied visual source, fix P0/P1/P2 issues, and record `final result: passed` in `design-qa.md`.

