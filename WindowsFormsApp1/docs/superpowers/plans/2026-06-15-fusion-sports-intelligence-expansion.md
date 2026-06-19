# Fusion Sports Intelligence Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add event dossiers, explainable multi-factor predictions, and position/player matchup analysis to Global Sports Center using free public data and Fusion OS settings.

**Architecture:** Normalize ESPN event summaries into a provider-independent detail model, derive bounded evidence and matchup reports in pure TypeScript modules, and render them through focused React components coordinated by the existing sports overlay. All remote sections fail independently and all analytical estimates remain explicitly labeled.

**Tech Stack:** React 19, TypeScript 6, Vite 8, browser Fetch API, Web Workers, Node test runner, Framer Motion, Lucide React, existing Fusion OS i18n/settings.

---

### Task 1: Normalize event details and enriched player profiles

**Files:**
- Create: `Frontend/src/sports/sportsDetail.ts`
- Modify: `Frontend/src/sports/sportsTypes.ts`
- Modify: `Frontend/src/sports/sportsRoster.ts`
- Test: `Frontend/tests/sportsIntelligence.test.ts`
- Modify: `Frontend/tsconfig.feature-tests.json`
- Modify: `Frontend/package.json`

- [ ] **Step 1: Write failing summary-normalization tests**

Cover venue/address, broadcasts, season, recent five games, head-to-head games, standings, partial payloads, and enriched roster fields.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
npx tsc -p tsconfig.feature-tests.json
node --test ../output/feature-tests/tests/sportsIntelligence.test.js
```

Expected: compilation fails because the new module and types do not exist.

- [ ] **Step 3: Implement provider-independent detail types**

Add explicit types for recent games, standings, broadcasts, coverage, event statistics, player availability, and event detail.

- [ ] **Step 4: Implement ESPN summary normalization and loading**

Use:

```text
https://site.api.espn.com/apis/site/v2/sports/{providerPath}/summary?event={eventId}
```

Normalize each subsection independently and return an empty but valid detail object for sparse payloads.

- [ ] **Step 5: Enrich roster players**

Normalize height, weight, birth date, status, injuries, and public profile URL without requiring them.

- [ ] **Step 6: Run the focused test and verify GREEN**

Run the focused compilation and Node test commands. Expected: all intelligence normalization tests pass.

### Task 2: Build explainable evidence and contextual prediction input

**Files:**
- Create: `Frontend/src/sports/sportsEvidence.ts`
- Modify: `Frontend/src/sports/sportsSimulation.ts`
- Modify: `Frontend/src/sports/sportsAi.ts`
- Test: `Frontend/tests/sportsIntelligence.test.ts`
- Test: `Frontend/tests/sportsSimulation.test.ts`

- [ ] **Step 1: Write failing evidence tests**

Assert that:

- recent wins favor that side
- head-to-head advantage contributes only when samples exist
- neutral venues remove home advantage
- injury and depth signals remain bounded
- sparse input returns low coverage without throwing

- [ ] **Step 2: Run tests and verify RED**

Expected: missing `buildPredictionEvidence` and contextual input behavior.

- [ ] **Step 3: Implement bounded factor scoring**

Every factor returns values, impact, confidence, source, and localized explanation key. Clamp total rating adjustment to a conservative range and form/offense/defense adjustments to their valid scales.

- [ ] **Step 4: Apply evidence to simulation input**

Preserve determinism by applying evidence before seeding and simulation. Manual sliders remain the base input.

- [ ] **Step 5: Include top evidence in local and Ollama reports**

The local report names the leading factors. Ollama receives normalized evidence and coverage, never raw provider payloads.

- [ ] **Step 6: Run focused and full sports tests**

Expected: deterministic simulation invariants still pass and evidence tests are green.

### Task 3: Build position-group and player matchup analysis

**Files:**
- Create: `Frontend/src/sports/sportsMatchups.ts`
- Test: `Frontend/tests/sportsIntelligence.test.ts`

- [ ] **Step 1: Write failing matchup tests**

Cover football groups, player pairing, active-player advantage, injury penalty, average score bounds, and empty roster fallback.

- [ ] **Step 2: Run the focused test and verify RED**

Expected: missing matchup module.

- [ ] **Step 3: Implement transparent comparison scores**

Use team baseline, position depth, age curve, and availability. Keep every score between 0 and 100 and include evidence tags explaining the estimate.

- [ ] **Step 4: Verify GREEN**

Run the focused test and confirm all matchup cases pass.

### Task 4: Add complete sports translations

**Files:**
- Modify: `Frontend/src/sports/sportsText.ts`
- Modify: `Frontend/tests/appCatalog.test.ts`

- [ ] **Step 1: Add failing translation coverage**

List every new static source key used by the dossier, evidence panel, matchup panel, and player sheet; assert all four non-default languages exist.

- [ ] **Step 2: Run feature tests and verify RED**

Expected: missing translation entries.

- [ ] **Step 3: Add translations**

Add Traditional Chinese source keys with Simplified Chinese, English, Japanese, and Korean values.

- [ ] **Step 4: Verify GREEN**

Run the catalog and feature tests.

### Task 5: Add focused React presentation components

**Files:**
- Create: `Frontend/src/components/sports/SportsEventDetailDialog.tsx`
- Create: `Frontend/src/components/sports/SportsPredictionEvidence.tsx`
- Create: `Frontend/src/components/sports/SportsPositionMatchups.tsx`
- Create: `Frontend/src/components/sports/SportsPlayerProfile.tsx`
- Modify: `Frontend/src/components/FusionSportsCenter.tsx`
- Modify: `Frontend/src/styles/fusionSportsCenter.css`

- [ ] **Step 1: Add source-level failing checks**

Assert the sports center source includes event double-click handling, a detail action, and imports for the focused components.

- [ ] **Step 2: Run feature tests and verify RED**

Expected: source assertions fail before component wiring.

- [ ] **Step 3: Wire detail loading and interaction**

Single click selects. Double-click, Enter, or `View details` opens the dossier. Escape closes the player sheet first, then dossier, then sports center.

- [ ] **Step 4: Render evidence in Prediction Lab**

Show coverage, top factors, impact bars, samples, and methodology below the existing probability results.

- [ ] **Step 5: Render position and player matchups**

Show group tabs, group advantage, depth/age/availability, pairings, and player-profile actions.

- [ ] **Step 6: Add responsive glass styles**

Preserve the existing deep navy shell, cyan/blue/violet hierarchy, visible focus, reduced motion, desktop density, and single-column mobile behavior.

- [ ] **Step 7: Run TypeScript and feature tests**

Run:

```powershell
npx tsc --noEmit
npm run test:features
```

Expected: both exit 0.

### Task 6: Production and visual verification

**Files:**
- Generated: `dist/**`

- [ ] **Step 1: Build production assets**

Run:

```powershell
npm run build
```

Expected: TypeScript and Vite build exit 0.

- [ ] **Step 2: Open the local preview in the in-app browser**

Launch Global Sports Center and inspect the event list at desktop width.

- [ ] **Step 3: Exercise critical flows**

Verify double-click dossier, form/history, player sheet, Prediction Lab evidence, position tabs, player pairings, language switching, timezone formatting, and responsive layout.

- [ ] **Step 4: Check the browser console**

Expected: no uncaught errors, React key warnings, missing chunks, or failed required assets.

- [ ] **Step 5: Re-run final verification**

Run:

```powershell
npx tsc --noEmit
npm run test:features
npm run build
```

Expected: all commands exit 0.

