---
name: perf-cost-guard
description: Protect the frame budget and the metered per-session cost of tiles and Realtime voice as features are added. Use before merging anything that renders, streams or calls a metered API, and for release performance sign-off; not for functional bugs or for data licensing.
---

# Performance & Cost Guard

Two budgets, both of which scale with exactly the engagement this product is designed to
create. Features that succeed make both worse.

## Frame budget

The Cesium viewer is the substrate, and its render governor and tile budgets are the scarce
resource every knowledge feature competes for. The "adaptive globe" is, in implementation
terms, a frame-budget allocation policy — treat it as one.

Harnesses available: `npm test`, `npm run test:track` (tracking invariants), and the headless
`scripts/qa-*.mjs` family (`qa-application.mjs`, `qa-attribution-b12.mjs`,
`qa-cables-overlay.mjs`, `qa-focus-evidence.mjs`, and others). `docs/PERFORMANCE.md` records
a hardware-rendered baseline captured 22 August 2026 on Apple M5 / Chrome 150 at 1440×900 —
**it is a record of results, not a runnable benchmark and not a minimum spec.** Do not quote
it as a target for other hardware.

Checks before merge:

- Does the change add per-frame work, new entities at global scale, or a new always-on
  overlay? If so, what drops to pay for it?
- Does it respect the render governor rather than forcing renders?
- Has it been measured on the **mobile case** — mid-range Android over mobile data — not just
  desktop? 3D tile streaming is bandwidth- and GPU-bound and the launch region's first-touch
  device is a phone.

## Cost budget

Four budgets, all metered, all per-user:

- **Google Photorealistic 3D Tiles** — billed per session. Cesium ion's free tier is
  non-commercial and is not the production path. Verify current pricing before modelling
  launch traffic; figures from earlier planning are stale.
- **OpenAI Realtime voice** — priced per active minute. At a 20-minute average session this
  is the dominant variable cost today.
- **Network** — federated lookups (Wikidata, World Bank, OSM) and tile bandwidth, separate
  from the tile *billing* line above; a feature can be cheap in dollars and still expensive
  in round-trips on the mobile case.
- **Tokens/LLM** — every non-Realtime model call the knowledge layer makes: narration
  generation, "Explain this view" composition, federated-content summarisation. Currently
  small; will not stay small once contextual composition (Section on `voice-tool-smith`'s
  intent resolution) starts chaining multiple queries per utterance. Track it now so its
  growth is visible before it's the dominant line, not after.

For any new feature, before merge, name the expected per-session cost on all four lines
explicitly — "negligible" is an acceptable answer, an unstated line is not.

`src/voice/voiceCost.js` (~463 lines) already implements live session-spend readout, a model
toggle, a warning threshold and a hard session cap. **Extend it to cover tiles**, so the
product has one spend surface rather than a voice cap beside an unmetered tile bill.

Design rules:

- Pre-render TTS for curated narration; reserve live Realtime for interactive "ask the guide"
  and premium tiers.
- Every new metered call site declares its expected per-session frequency. "Occasional" is
  not a number.

## Reporting

Use the shared report shape (see `AGENTS.md`). `evidence` is the harness results with hardware
and viewport used; `blocking` is true if the mobile case wasn't measured or if any of the four
cost lines is unstated for a new feature. Include the frame-budget trade made and the
projected change to cost per session, broken out by line.
