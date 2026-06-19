# Fusion Sports Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a no-key global sports scores, schedules, comparison, Monte Carlo prediction, and optional local-AI application inside Fusion OS.

**Architecture:** Add a self-contained `src/sports` domain with provider normalization, resilient caching, deterministic simulation, worker execution, and local AI fallback. Expose it through a new full-screen React overlay registered in App Center and translated through the existing source-as-key i18n system.

**Tech Stack:** React 19, TypeScript, Framer Motion, Lucide React, browser Fetch API, Web Workers, Node test runner, existing Fusion OS i18n/settings.

---

### Task 1: Register the sports application

**Files:**
- Modify: `Frontend/src/types.ts`
- Modify: `Frontend/src/data/fusionApps.ts`
- Modify: `Frontend/src/components/FusionAppCenter.tsx`
- Modify: `Frontend/tests/appCatalog.test.ts`

- [ ] **Step 1: Write the failing catalog test**

Add a test that expects `getAppById('sports')` to be an overlay in the `data` category, featured in App Center, and backed by translations in every selectable language.

- [ ] **Step 2: Verify the test fails**

Run: `npm run test:features`

Expected: TypeScript or assertion failure because `sports` is not an `AppId` and has no catalog entry.

- [ ] **Step 3: Add the AppId, catalog entry, and Trophy icon**

Use these Traditional Chinese source values:

```ts
{
  id: 'sports',
  title: '全球體育中心',
  subtitle: '即時比分、賽程與 AI 預測',
  description: '追蹤大型體育賽事，使用蒙地卡羅模擬比較隊伍、選手與賽前勝率。',
  glyph: 'SPORT',
  color: '#55e6ff',
  category: 'data',
  tags: ['即時比分', '世界盃', '蒙地卡羅', 'AI 分析'],
  status: '免金鑰資料',
  launchMode: 'overlay',
  featured: true
}
```

- [ ] **Step 4: Run the focused feature test**

Run: `npm run test:features`

Expected: The sports registration test passes once translation aggregation is added in Task 5; earlier catalog tests remain unchanged.

### Task 2: Define and test normalized sports data

**Files:**
- Create: `Frontend/src/sports/sportsTypes.ts`
- Create: `Frontend/src/sports/sportsCatalog.ts`
- Create: `Frontend/src/sports/sportsProviders.ts`
- Create: `Frontend/tests/sportsProviders.test.ts`
- Modify: `Frontend/tsconfig.feature-tests.json`
- Modify: `Frontend/package.json`

- [ ] **Step 1: Write failing provider normalization tests**

Test an ESPN football payload containing home/away teams, scores, venue, live state, and records. Test malformed payload handling and merging duplicate events by id.

- [ ] **Step 2: Verify RED**

Run: `npx tsc -p tsconfig.feature-tests.json && node --test ../output/feature-tests/tests/sportsProviders.test.js`

Expected: FAIL because the sports provider module does not exist.

- [ ] **Step 3: Implement normalized domain types and ESPN parser**

The parser must map provider state to:

```ts
type SportsEventStatus = 'scheduled' | 'live' | 'final' | 'postponed' | 'cancelled';
```

It must tolerate missing logos, records, venues, scores, and non-head-to-head competitions.

- [ ] **Step 4: Implement the competition catalog**

Define provider paths and model families for the supported competitions. Include bundled fallback events around the current World Cup period and representative events for broad sports coverage.

- [ ] **Step 5: Verify GREEN**

Run the focused provider test and then `npm run test:features`.

### Task 3: Build the deterministic prediction engine

**Files:**
- Create: `Frontend/src/sports/sportsSimulation.ts`
- Create: `Frontend/src/sports/sportsWorker.ts`
- Create: `Frontend/tests/sportsSimulation.test.ts`

- [ ] **Step 1: Write failing simulation tests**

Cover:

```ts
assert.deepEqual(simulateMatch(input), simulateMatch(input));
assert.ok(Math.abs(home + draw + away - 1) < 1e-9);
assert.ok(stronger.homeWin > weaker.homeWin);
assert.ok(result.topScorelines.length > 0);
```

Also test point and set models and numeric input clamping.

- [ ] **Step 2: Verify RED**

Run the compiled `sportsSimulation.test.js`.

Expected: FAIL because `simulateMatch` does not exist.

- [ ] **Step 3: Implement seeded Monte Carlo models**

Implement a seeded PRNG, Poisson generator, normal generator, logistic strength conversion, preset adjustments, scoreline aggregation, confidence calculation, and model-specific summaries.

- [ ] **Step 4: Add the module Web Worker**

The worker accepts `{ requestId, input }` and returns `{ requestId, result }`. Worker failures are handled by the UI with synchronous fallback.

- [ ] **Step 5: Verify GREEN**

Run focused simulation tests and the full feature suite.

### Task 4: Add resilient loading, cache, favorites, and AI fallback

**Files:**
- Create: `Frontend/src/sports/sportsDataService.ts`
- Create: `Frontend/src/sports/sportsAi.ts`
- Extend: `Frontend/tests/sportsProviders.test.ts`
- Extend: `Frontend/tests/sportsSimulation.test.ts`

- [ ] **Step 1: Write failing fallback and report tests**

Test that provider failures return bundled data, duplicate events are removed, cached data is marked correctly, and the local rule report mentions the favored side and simulation count.

- [ ] **Step 2: Verify RED**

Run both focused sports tests.

- [ ] **Step 3: Implement fetch orchestration**

Use browser-accessible ESPN endpoints with a timeout, then TheSportsDB when applicable, then bundled fallback. Read and write versioned localStorage cache without throwing when storage is unavailable.

- [ ] **Step 4: Implement optional Ollama commentary**

Call `http://localhost:11434/api/chat` only when AI is enabled. Limit output length and return the deterministic local report on network, model, JSON, or abort failures.

- [ ] **Step 5: Verify GREEN**

Run all feature tests.

### Task 5: Add complete sports i18n and system date formatting

**Files:**
- Create: `Frontend/src/sports/sportsText.ts`
- Modify: `Frontend/src/i18n/I18nContext.tsx`
- Modify: `Frontend/src/i18n/localeFormatting.ts`
- Modify: `Frontend/tests/localeFormatting.test.ts`
- Modify: `Frontend/tests/appCatalog.test.ts`

- [ ] **Step 1: Write failing date and translation tests**

Test calendar-key generation in `Asia/Taipei`, an event time formatted in `America/New_York`, and every sports catalog field in Simplified Chinese, English, Japanese, and Korean.

- [ ] **Step 2: Verify RED**

Run `npm run test:features`.

- [ ] **Step 3: Add sports translations and formatting helpers**

Register `SPORTS_TRANSLATIONS` ahead of generic feature translations. Add timezone-aware date key, compact date, and event date-time helpers based on `Intl.DateTimeFormat`.

- [ ] **Step 4: Verify GREEN**

Run locale, catalog, and full feature tests.

### Task 6: Build the interactive overlay

**Files:**
- Create: `Frontend/src/components/FusionSportsCenter.tsx`
- Create: `Frontend/src/styles/fusionSportsCenter.css`
- Modify: `Frontend/src/components/SpatialHomeStage.tsx`
- Modify: `Frontend/src/main.tsx`

- [ ] **Step 1: Wire the overlay behind the registered AppId**

Add a Trophy icon, include `sports` in the in-shell launch allowlist, lazy-load the overlay, and return to App Center on close.

- [ ] **Step 2: Implement the event center**

Build date navigation, sport/competition chips, refresh, favorite filter, event list, selected-event detail, live/source badges, loading state, offline state, and freshness timestamp.

- [ ] **Step 3: Implement prediction and comparison**

Provide editable strengths, presets, iteration count, run/cancel feedback, probability bars, projected score, likely scorelines, comparison metrics, and local/AI report action.

- [ ] **Step 4: Add responsive and reduced-motion styles**

Use the existing Fusion OS glass system. Keep the main score list scannable, controls keyboard-accessible, and the mobile layout single-column.

- [ ] **Step 5: Run TypeScript and feature tests**

Run:

```powershell
npx tsc --noEmit
npm run test:features
```

Expected: both commands exit 0.

### Task 7: Production and visual verification

**Files:**
- Generated: `dist/**`

- [ ] **Step 1: Build production assets**

Run: `npm run build`

Expected: TypeScript and Vite build complete without errors.

- [ ] **Step 2: Start or inspect the local preview**

Open the known local Fusion OS target with the in-app browser. Launch App Center and Global Sports Center.

- [ ] **Step 3: Exercise critical flows**

Verify date navigation, filters, event selection, favorites, refresh, prediction presets, editable inputs, report generation, language switching, timezone formatting, responsive layout, Escape close, offline fallback, and reduced motion.

- [ ] **Step 4: Check the browser console**

Expected: no uncaught errors, missing-module errors, React key warnings, or failed required assets.

- [ ] **Step 5: Re-run final verification**

Run:

```powershell
npx tsc --noEmit
npm run test:features
npm run build
```

Expected: all commands exit 0.
