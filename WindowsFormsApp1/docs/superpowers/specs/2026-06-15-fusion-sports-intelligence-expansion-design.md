# Fusion Sports Intelligence Expansion Design

## Goal

Expand Global Sports Center from a score browser into a transparent event intelligence workspace. Users can open a full event dossier, understand why a prediction was produced, and compare teams or participants at team, position-group, and player levels without paid APIs.

## Product Decisions

- Keep the existing `Events`, `Prediction Lab`, and `Compare & AI` workspaces.
- A single click selects an event. Double-clicking an event, pressing Enter on it, or using `View details` opens the event dossier.
- Traditional Chinese remains the default source language. Simplified Chinese, English, Japanese, and Korean follow the Fusion OS language setting.
- Date, time, timezone, 12/24-hour clock, accent, motion, and local AI settings continue to come from Fusion OS settings.
- Provider values are never presented as official rankings unless the provider explicitly identifies them as such. Missing world rankings display as unavailable; the existing model rating remains clearly labeled as a model rating.
- Every analytical value is labeled by source and confidence. Heuristics are described as model estimates, not real-world facts.

## Data Sources

### Primary: ESPN public endpoints

For ESPN-backed competitions:

- Scoreboard: event identity, state, participants, score, record, provider form, venue, and basic statistics.
- Event summary: venue address, broadcasts, season/round, recent five games, head-to-head games, standings, box score, injuries, and event rosters.
- Team roster: player identity, position, age, height, weight, status, injuries, profile link, and country.
- News: competition headlines.

These endpoints require no user account or API key. Every fetch has a timeout and degrades independently.

### Secondary and fallback

- TheSportsDB free endpoint continues to provide limited schedules for niche sports.
- Bundled events remain available offline.
- When detailed data is unavailable, the dossier still opens with normalized event information and an explicit coverage notice.

## Architecture

### `sportsDetail.ts`

Owns ESPN event-summary normalization and loading.

It returns a provider-independent `SportsEventDetail` containing:

- competition season and round
- venue and address
- broadcasts
- recent form by participant
- head-to-head history
- standings or group rank when supplied
- normalized event rosters
- source and coverage metadata

Malformed subsections are skipped without rejecting the whole detail response.

### `sportsEvidence.ts`

Builds an explainable prediction evidence report from the selected event, event detail, roster summaries, and current tuning values.

Factors include:

- model rating
- provider record
- recent five-game form
- head-to-head history
- standings or world rank when supplied
- attack and defense inputs
- roster depth by position
- average age balance
- unavailable or injured players
- home, away, or neutral-site context

Each factor contains a home value, away value, signed impact, source label, explanation key, and confidence. The combined adjustments are bounded so sparse or noisy data cannot dominate the simulation.

### `sportsMatchups.ts`

Builds sport-aware comparison groups.

For football it compares goalkeeper, defense, midfield, and forward groups. Other team sports map their provider positions into stable groups and fall back to an overall squad group when a precise mapping is unavailable.

Player estimates use only available attributes:

- team baseline strength
- age curve
- active/injury status
- position-group depth
- available provider statistics when present

The UI calls them `comparison scores`, not official player ratings.

### UI components

The current `FusionSportsCenter` remains the workspace coordinator. New focused components keep the main file from absorbing all presentation logic:

- `SportsEventDetailDialog`: dossier navigation and event evidence.
- `SportsPredictionEvidence`: factor cards, impact bars, coverage, and methodology.
- `SportsPositionMatchups`: group selector, group advantage, and player pairings.
- `SportsPlayerProfile`: player biography and availability sheet.

## Event Dossier

The dossier is a large glass dialog inside the sports shell.

Sections:

1. Overview
   - score/status, local date and time, venue/address, round, broadcasts, source, and coverage
2. Form and history
   - both teams' last five matches
   - head-to-head results
   - standings/group rank when available
3. Squads
   - grouped roster, age, height, weight, availability, and player profile action
4. Match data
   - provider box-score statistics when available

The dialog supports Escape, visible focus, keyboard navigation, loading, error, and partial-data states.

## Explainable Prediction

The prediction still uses the deterministic Monte Carlo engine, but the input is enriched by bounded evidence adjustments.

The Prediction Lab displays:

- outcome probabilities and likely scores
- data coverage and confidence
- the strongest positive and negative factors
- recent form and head-to-head samples
- standing/ranking availability
- exact model inputs after adjustments
- methodology and limitations

Changing manual sliders remains possible. The UI distinguishes manual input from provider-derived evidence.

## Position and Player Comparison

The Compare workspace adds:

- position-group tabs
- group score and depth comparison
- availability and average age
- player pairings within the selected group
- per-player comparison score and evidence tags
- existing roster lists and local AI report

When player statistics are unavailable, the UI explains that the score is a roster-context estimate. Individual sports use participant-level comparison and do not fabricate team positions.

## i18n and Formatting

- All visible copy uses Traditional Chinese source keys in `sportsText.ts`.
- Every new static key receives Simplified Chinese, English, Japanese, and Korean translations.
- Provider names remain original when no trusted localization exists.
- Dates and times use existing Fusion OS locale, timezone, and clock helpers.
- Numeric percentages use the active locale.

## Error Handling

- Event detail, news, and rosters load independently.
- A failed detail request leaves the score list usable.
- Partial provider responses show available sections and a coverage notice.
- No remote failure blocks local prediction.
- Local Ollama receives normalized evidence only and falls back to deterministic local text.

## Testing

- Summary normalization: recent form, head-to-head, standings, broadcasts, venue, and rosters.
- Enriched roster normalization: biography and availability.
- Evidence weighting: bounded adjustments, recent-form advantage, neutral-site handling, sparse-data behavior.
- Matchup building: position grouping, player pairing, injury penalty, empty roster fallback.
- Local report: mentions top evidence factors.
- Source checks: event cards expose double-click detail behavior and new UI components compile.
- Final validation: `npx tsc --noEmit`, feature tests, production build, in-app browser layout check, and browser console check.

