# Development Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive Fusion OS Development Lab for data structures and algorithms.

**Architecture:** Pure TypeScript engines generate deterministic structure states and algorithm traces. A focused React overlay renders those states, owns playback and persistence, and plugs into the existing App Center overlay route.

**Tech Stack:** React 19, TypeScript 6, Node test runner, CSS, lucide-react, existing Fusion OS overlay and i18n infrastructure.

---

### Task 0: Localize And Extend The Lab

**Files:**
- Create: `Frontend/src/devlab/developmentLabText.ts`
- Modify: `Frontend/src/i18n/I18nContext.tsx`
- Modify: `Frontend/src/devlab/developmentLabEngine.ts`
- Modify: `Frontend/src/devlab/developmentLabCatalog.ts`
- Modify: `Frontend/tests/developmentLab.test.ts`

- [ ] Add failing tests for Merge Sort, Heap Sort, deterministic dataset
  presets, sorting benchmarks, and localized dynamic trace messages.
- [ ] Add source-as-key Development Lab translations for all Fusion OS
  languages.
- [ ] Extend the trace engine with phase metadata, Merge Sort, Heap Sort,
  dataset presets, and sorting benchmarks.
- [ ] Replace visible catalog copy with Traditional Chinese source keys and
  correct all complexity notation.

### Task 0.5: Improve The Spatial Experience

**Files:**
- Modify: `Frontend/src/components/FusionDevelopmentLab.tsx`
- Modify: `Frontend/src/styles/fusionDevelopmentLab.css`

- [ ] Connect every visible string and dynamic event to the shared language.
- [ ] Add a live date/time capsule using the shared timezone and clock mode.
- [ ] Add dataset preset, size, regenerate, and sorting comparison controls.
- [ ] Add reduced-motion-aware Framer Motion transitions for structures, bars,
  graph nodes, and frame phase changes.
- [ ] Add phase lighting, progress feedback, comparison results, and responsive
  layouts without changing the established three-column shell.

### Task 1: Define The Tested Lab Contract

**Files:**
- Create: `Frontend/tests/developmentLab.test.ts`
- Modify: `Frontend/tsconfig.feature-tests.json`
- Modify: `Frontend/package.json`

- [ ] Add failing tests for number-list parsing, graph parsing, structure
  operations, BST ordering, complete sorting traces, search results, BFS order,
  and DFS order.
- [ ] Run `npm run test:features` and verify failure because the Development Lab
  engine does not exist.

### Task 2: Implement Data Structures And Trace Engines

**Files:**
- Create: `Frontend/src/devlab/developmentLabEngine.ts`
- Create: `Frontend/src/devlab/developmentLabCatalog.ts`

- [ ] Implement strict parsers and immutable stack, queue, linked-list, and BST
  operations.
- [ ] Implement Bubble, Insertion, Selection, and Quick Sort traces.
- [ ] Implement Linear Search, Binary Search, BFS, and DFS traces.
- [ ] Add complexity and pseudocode metadata for every algorithm.
- [ ] Run `npm run test:features` and verify all Development Lab tests pass.

### Task 3: Build The Interactive Overlay

**Files:**
- Create: `Frontend/src/components/FusionDevelopmentLab.tsx`
- Create: `Frontend/src/styles/fusionDevelopmentLab.css`
- Modify: `Frontend/src/main.tsx`

- [ ] Build the command bar, grouped navigator, visual canvas, timeline,
  inspector, and activity console.
- [ ] Implement structure actions, sample loading, algorithm input validation,
  deterministic trace generation, and local autosave.
- [ ] Implement run, play, pause, previous, next, scrub, speed selection, and
  keyboard shortcuts.
- [ ] Add responsive layouts for desktop, tablet, and short viewports.

### Task 4: Connect App Center And Catalog Metadata

**Files:**
- Modify: `Frontend/src/components/SpatialHomeStage.tsx`
- Modify: `Frontend/src/data/fusionApps.ts`
- Modify: `Frontend/src/i18n/featureTranslations.ts`
- Modify: `Frontend/tests/appCatalog.test.ts`

- [ ] Change Development Lab from host launch to an in-shell overlay.
- [ ] Render `FusionDevelopmentLab` when `overlayApp === 'dev'`.
- [ ] Update the launcher description, tags, and status to represent Data
  Structures and Algorithms, with all supported translations.
- [ ] Extend catalog tests to require the new overlay contract.

### Task 5: Verify The Production Experience

**Files:**
- Create: `design-qa.md`
- Modify: generated `dist/**`

- [ ] Run `npm run test:features`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run build`.
- [ ] Start the local preview and launch Development Lab through App Center.
- [ ] Verify structure operations and algorithm playback.
- [ ] Inspect the browser console for errors.
- [ ] Compare the source references and rendered screen, fix all P0/P1/P2
  findings, and record `final result: passed` in `design-qa.md`.
