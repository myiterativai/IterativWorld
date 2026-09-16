# Temporal world model (time travel)

Phase 3 architecture. Status: **foundation shipped** — the temporal semantics
(`src/services/temporalModel.js`) and the World Context Engine's temporal
shift are in code; borders data, the scrubber UI and stories build on this.

> Core concept: time travel is a temporal world model, not "Cesium Clock +
> historical GeoJSON." When the user travels back, the entire World Context
> Engine shifts — live signals disappear, historical borders appear,
> dossiers become time-aware.

## What shipped (the foundation)

- **Temporal context** — `createTemporalContext()`: `instant`, `calendar`,
  `era`, `displayYear`, `precision` (`exact|day|month|year|century`),
  `temporalMode` (`live|historical`), `confidence`
  (`high|moderate|low|reconstruction`). 1989, December 1989 and
  9 November 1989 are different contexts; the UI must never imply more
  precision than the source supports, and confidence is surfaced in the HUD
  (post-1945 "High", 1200 CE "Reconstruction").
- **Instant/interval model** — entities carry `intervals[]`, each a
  half-open `[from, to)` with `name`, `geometryRef`, `capital`, `leader`.
  `resolveEntityAt(entity, instant)` answers "what was this on that date."
  The USSR interval ending 1991-12-26 is not active on 1991-12-26 — that day
  belongs to the successors. Intervals are the one model for population,
  GDP, leaders, borders and alliances alike — no nested `historicalStats`.
- **Temporal relationships** — `succeededBy / precededBy / splitInto /
  mergedInto / renamedTo / annexedBy / cededTo / contained / occupiedBy`,
  resolved via `successorsOf()`. "What country is this?" becomes
  point + date + relationships, not a polygon lookup.
- **Granular events** — `temporal-context-changed`,
  `temporal-precision-changed`, `temporal-entity-changed`,
  `temporal-geometry-changed`, `temporal-data-changed`,
  `temporal-layer-policy-changed`. A tiny timeline movement fires only what
  changed; `createTemporalStore()` normalizes, diffs and delivers typed
  subscriptions (filtered by event type), and one failing subscriber never
  breaks the timeline.
- **Layer policy** — `temporalLayerPolicy()`: live-signal layers are
  suppressed in historical mode. Live aircraft did not exist in 1989;
  rendering them there is the exact failure this prevents. This is the seam
  `$layer-steward`'s per-product manifests will consume for temporal mode.
- **The engine shift** — `resolveWorldContext()` now takes a temporal
  context: in historical mode, `live` is suppressed with the policy's reason,
  `asOf` becomes the selected instant, and suggested actions lose `[follow]`.

## Deliberately not interpolated

Data transitions are exact step functions — treaties are signed on specific
dates, and we do not pretend history morphs by interpolating polygons.
Visual treatments may mask the step aesthetically (USSR border fades out
over 400 ms, successors fade in over 600 ms); the temporal state remains
mathematically exact. The animation is aesthetic; this module never
interpolates.

## What builds on it (Phase 3 remaining)

- [ ] Historical borders data source — **licence-gated**: CShapes 2.0 is
  CC BY-NC-SA 4.0 (non-commercial, 1886–2017 only). Do not plan the temporal
  globe on it without a licence (`$data-licence`; the same gate that already
  blocks TeleGeography and the Bhote Koshi pack in commercial builds).
- [ ] Time scrubber UI — the three paradigms: **jump** ("Go to 1945" —
  instant context + precision change), **scrub** (continuous slider over a
  historical interval, granular events keeping it cheap), **play**
  ("Show me Europe 1945–1991" — automatic advancement; the Director camera
  system is the natural engine for it).
- [ ] Historical geography rendering — border layers resolved per-interval
  through `geometryRef`; entity resolution already lives here.
- [ ] World Stories — cinematic camera + narration over intervals and
  events (`docs/ROADMAP.md` Phase 3).

## Ownership

- Schema (entity intervals, relationship types, query contracts):
  `$world-model-architect` — this module implements its contract.
- Records admitted into intervals (provenance, sourcing):
  `$knowledge-steward` — no provenance, no record.
- Borders dataset licensing: `$data-licence`.
- Layer suppression in historical mode: `temporalLayerPolicy()` is the
  policy seam; `$layer-steward` wires it into the manifests.
- Scrubber UI paradigms and visual transitions: the UI layer owns them;
  this model only guarantees exactness underneath.
