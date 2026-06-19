# Fusion Sports Center Design

## Product Goal

Add a fully interactive Fusion OS application for major global sporting events. The application must remain useful without accounts, paid services, or user-provided API keys. It combines live/public score feeds, cached and bundled fallback schedules, team or player comparison, deterministic Monte Carlo prediction, and optional local Ollama commentary.

## Product Surface

- App Center entry: `全球體育中心`
- Launch mode: in-shell full-screen overlay
- Default language: Traditional Chinese
- Other languages: Simplified Chinese, English, Japanese, Korean
- Date, time, timezone, and 12/24-hour presentation: inherited from Fusion OS settings
- Visual target: the existing Fusion OS shell and Development Lab overlay, using deep navy glass, cyan, electric blue, indigo, violet, and restrained magenta

## Information Architecture

The overlay uses three primary workspaces:

1. `賽事中心`
   - Date rail centered on the current Fusion OS date
   - Sport and competition filters
   - Live, upcoming, final, and postponed states
   - Favorites and source freshness
   - Selected-event detail

2. `預測實驗室`
   - Conservative, balanced, and upset-sensitive presets
   - Goal, point, set, and generic rating models
   - Seeded Monte Carlo simulation in a Web Worker
   - Win/draw/loss probability, projected score, likely scorelines, confidence, and assumptions
   - User-editable rating, offense, defense, and form inputs

3. `比較與 AI`
   - Side-by-side participant comparison
   - Normalized rating/form/offense/defense indicators
   - Deterministic local summary available at all times
   - Optional Ollama report using the configured local model

## Supported Sports

The first version exposes:

- Football: FIFA World Cup, Premier League, La Liga, Bundesliga, Serie A, Ligue 1, UEFA Champions League
- Basketball: NBA, WNBA
- Baseball: MLB
- American football: NFL
- Ice hockey: NHL
- Motorsport: Formula 1
- Racket sports: ATP, WTA, badminton, table tennis
- Volleyball
- Golf: PGA Tour
- Combat sports: UFC

Coverage is intentionally provider-dependent. The UI must say when a competition is using bundled fallback data instead of implying that stale data is live.

## Data Architecture

### Provider boundary

All external payloads normalize to:

- `SportsEvent`
- `SportsParticipant`
- `SportsCompetition`
- `SportsDataSnapshot`

The UI never consumes provider-specific response shapes.

### Provider order

1. ESPN public scoreboard feed for competitions with a working browser-accessible endpoint
2. TheSportsDB public `123` endpoint for limited schedule fallback
3. Bundled, realistic fallback events and competition metadata

Each fetch has a timeout. One provider failure cannot reject the complete refresh.

### Cache

- Live snapshot TTL: 45 seconds
- Schedule snapshot TTL: 15 minutes
- Competition metadata TTL: 24 hours
- Cache key includes competition and local calendar date
- Cached results remain visible when refresh fails and are marked as cached

## Prediction Models

### Goal sports

Football and hockey use rating-adjusted Poisson scoring. Football allows draws; hockey resolves ties through a small overtime win adjustment.

### Point sports

Basketball, baseball, and American football use rating/form-adjusted normal score generation with sport-specific base scores and variance.

### Set sports

Tennis, badminton, table tennis, and volleyball use logistic participant strength converted to best-of-three or best-of-five set simulations.

### Generic model

Combat and unsupported head-to-head events use a logistic rating/form model.

All models:

- accept a deterministic seed
- return probabilities summing to one within floating-point tolerance
- expose the model name and number of simulations
- cap unsafe or nonsensical numeric inputs
- are educational analysis, not betting advice

## AI Policy

No cloud key is required.

- If local Ollama is enabled and reachable at `http://localhost:11434`, the app requests a short analysis in the selected language.
- Only normalized event statistics and simulation output are sent.
- Model output is treated as untrusted display text and length-limited.
- If Ollama is disabled or unavailable, the local rule-based report is returned immediately.

## Interaction and Accessibility

- Escape closes the overlay.
- Refresh, date navigation, filters, favorites, event selection, prediction controls, and comparison controls are functional.
- Animations follow the Fusion OS animation setting and `prefers-reduced-motion`.
- Keyboard focus is visible.
- Loading, empty, error, stale-cache, offline-fallback, and AI-unavailable states have useful copy.
- Responsive layout collapses from three columns to a single scrollable flow.

## Validation

- Feature tests cover provider normalization, provider fallback, deterministic simulation, probability invariants, stronger-side behavior, and translated App Center registration.
- `npx tsc --noEmit`
- `npm run test:features`
- `npm run build`
- In-app browser verification at the local preview URL
- Browser console checked before completion

