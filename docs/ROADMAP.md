# IterativWorld — Roadmap

How the [product concept](PRODUCT-CONCEPT.md) maps onto this codebase, phase
by phase. Each phase lists what already exists (inherited from the
God's Eye View foundation), what lands new, and the acceptance signal.

## Phase 1 — World Foundation

**Goal:** every view resolves to structured, provenance-tagged context, and
the globe answers "what am I looking at?" without leaving the globe.

Already in place (inherited):

- Photorealistic Cesium globe, camera verbs, cinematic flights.
- Live layers: aircraft, vessels, satellites, earthquakes, CCTV, transit, weather.
- Realtime voice agent with a 29-tool action schema.
- Scene context assembly: camera, reverse-geocode place, nearby places,
  known landmarks, enabled layers (`getSceneContext`).

New in Phase 1 (shipped):

- **World Context Engine v0** — `src/world/worldContextEngine.js`: pure
  scene→context transformation with identity chain, live rollup, suggested
  actions and per-field provenance.
- **`explain_view` voice action** — narrates the engine's brief; the concept's
  killer interaction, wired through the existing realtime pipeline.

Phase 1 remaining:

- [ ] World Entity Graph v0: entity records with ids, spatial/temporal/
      provenance metadata, and typed relations (place-in-country,
      landmark-in-city, event-at-place).
- [ ] Country/place dossier panel rendering from the context engine
      (overview, geography, live activity, rankings stub).
- [ ] Shareable world-view state (camera + layers + style as a URL).
- [ ] Search unified through the entity graph.

Acceptance: "Explain this view" works from any camera position without API
keys (identity chain + landmarks); dossiers open from the context engine.

## Phase 2 — Live × Knowledge

**Goal:** live entities and knowledge reference each other.

- [ ] Live entity ↔ country/region association (aircraft over Japan reads as
      Japan-linked activity).
- [ ] Contextual POIs on live signals (nearest places to a tracked vessel).
- [ ] Live geographic queries ("how many aircraft over the North Sea?").
- [ ] Contextual statistics surfaces (layer counts per country in view).

Acceptance: selecting any live entity shows its geographic and statistical
context from the graph, not just its kinematic state.

## Phase 3 — Time

**Goal:** the temporal world model.

- [ ] Historical events at real locations (event entities with time + place).
- [ ] Timeline UI bound to the globe camera.
- [ ] Temporal globe: borders and places change with the selected period.
- [ ] World Stories: cinematic camera + narration sequences over events.

Acceptance: "show me the evolution of European borders" plays as a grounded
camera-and-timeline experience.

## Phase 4 — AI

**Goal:** grounded natural-language world queries. The voice layer stays
provider-neutral (`docs/VOICE-RUNTIME.md`): the capability contract is ours,
runtimes are adapters, and the World Action API verb surface — if adopted —
is a world-model query contract, not a voice-layer rewrite.

- [ ] NL → entity graph queries (compare, rank, filter).
- [ ] Contextual explanations with citations into the provenance layer.
- [ ] Story generation from graph paths.
- [ ] Personalised exploration and the learning loop
      (Explore → Learn → Test → Recall).

Acceptance: "Compare Japan and Germany by population, GDP and area" renders
from the world model, not bespoke commands.

## Engineering Principles (inherited + new)

- Pure, dependency-free core modules (`src/world/` follows the engine's
  pattern) — testable in Node without a browser.
- Pinned-contract tests are re-derived deliberately, never deleted
  (see `src/voice/actionSchemas.test.mjs`, `src/radioMarkup.test.mjs`).
- Every knowledge datum carries source, retrieval date and temporal validity.
- Upstream sync: this fork tracks `bilawalsidhu/gods-eye-view` (see
  `docs/MAINTAINER_WORKFLOW.md`).
