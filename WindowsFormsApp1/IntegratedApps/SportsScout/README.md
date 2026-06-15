# SportsScout — real player market-value proxy (Layer 3)

A tiny **local** service that gives the Fusion Global Sports Center real per-player
**market values (身價)** from Transfermarkt. The browser can't scrape cross-origin, so this
process does it and serves clean JSON with CORS enabled. Everything is optional: if this is
not running, the Sports Center silently falls back to its built-in star table.

## Run

```
python server.py --port 8796
```

(Standard library only — no `pip install`. Also registered in `.claude/launch.json` as
`sports-scout`.)

The frontend auto-detects it at `http://127.0.0.1:8796` whenever the **比較與 AI** tab is
open for a football match. When active, the position-matchup panel shows a
**身價來源 · Transfermarkt** badge and each player's € value, and those values drive the
per-player scores (preferred over the star table).

## Endpoints

- `GET /health` — liveness probe.
- `GET /api/squad?team=Germany` — one squad: `{ teamId, players:[{name, marketValue, valueLabel}], valued, source }`.
- `GET /api/values?home=Germany&away=Curacao` — both squads in one call (fetched in parallel).

## Notes

- Squads are cached on disk (`cache/`, 12h) and team-id lookups are remembered
  (`cache/resolved.json`), so repeat views are instant and the source is hit rarely.
- National teams resolve via a verified id map (≈37 nations) plus a search fallback.
- Transfermarkt is an **unofficial** source and rate-limits aggressive callers; the cache +
  a polite request interval keep usage light. For personal / educational analysis only —
  the values are not official ratings.
