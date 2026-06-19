# Engineering Math Input Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace delimiter-based engineering math inputs with structured, familiar controls while preserving the verified calculation engines.

**Architecture:** Keep all existing math algorithms unchanged. Add a small input-model layer that converts editable grids, series rows, graph edges, and formula-keyboard actions into the existing engine types, then split reusable editors into focused React components used by `EngineeringMathLab`.

**Tech Stack:** React 19, TypeScript 6, CSS, Node test runner, existing Fusion OS i18n and settings contexts.

---

### Task 1: Structured Input Models

**Files:**
- Create: `Frontend/src/math/structuredInputs.ts`
- Modify: `Frontend/src/math/index.ts`
- Modify: `Frontend/tests/engineeringMath.test.ts`

- [ ] Add failing tests for matrix resizing, blank-cell conversion, series conversion, graph edge conversion, and caret-aware formula insertion.
- [ ] Run `npm run test:features` and verify the new imports fail because the helpers do not exist.
- [ ] Implement immutable helpers with explicit validation errors and sensible defaults such as blank matrix cells becoming zero and blank graph weights becoming one.
- [ ] Run `npm run test:features` and verify all feature tests pass.

### Task 2: Reusable Math Editors

**Files:**
- Create: `Frontend/src/components/toolbox/EngineeringMathInputs.tsx`
- Modify: `Frontend/src/styles/engineeringMath.css`

- [ ] Add `NumberControl` with direct typing and increment/decrement buttons.
- [ ] Add `OperationPicker` so operations are visible buttons rather than hidden select options.
- [ ] Add `MatrixEditor` with row and column controls and cell-level entry.
- [ ] Add `SeriesEditor` and `PairedSeriesEditor` with add/remove row controls.
- [ ] Add `GraphEdgeEditor` with from, to, weight, add, and delete controls.
- [ ] Add `FormulaEditor` with caret-aware math keys and a readable expression surface.

### Task 3: Human-Centered Mode Panels

**Files:**
- Modify: `Frontend/src/components/toolbox/EngineeringMathLab.tsx`

- [ ] Replace scientific and calculus text-only entry with formula editors and operation cards.
- [ ] Replace matrix textareas with matrix grids; show matrix B or constant vector only when the selected operation requires it.
- [ ] Replace generic discrete fields with formula-specific controls and previews for `gcd`, `lcm`, `nPr`, `nCr`, factorization, primality, modular power, and base conversion.
- [ ] Replace comma-separated statistics input with editable value rows or paired X/Y rows; use steppers and a probability slider for distributions.
- [ ] Replace graph edge-list text with editable edge rows and populate start/end vertex selectors from current rows.
- [ ] Replace Boolean assignment text with detected variable switches while retaining the expression builder for truth tables and minimization.

### Task 4: Localization and Responsive Styling

**Files:**
- Modify: `Frontend/src/math/engineeringMathText.ts`
- Modify: `Frontend/src/styles/engineeringMath.css`

- [ ] Add translations for all new controls, labels, formula summaries, and accessibility text.
- [ ] Style grids and editors using the existing deep navy glass and cyan/indigo accent system.
- [ ] Ensure matrix cells and graph rows remain usable at desktop and narrow viewport widths.

### Task 5: Verification

**Files:**
- Verify: `Frontend/tests/engineeringMath.test.ts`
- Verify: `Frontend/src/components/toolbox/EngineeringMathLab.tsx`

- [ ] Run `npm run test:features`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run build`.
- [ ] Run the C# MSBuild project build.
- [ ] Open the local preview in the in-app browser, exercise every structured editor, inspect narrow layout, and confirm the browser console has no errors.
