# IterativWorld — Product Concept

## The Interactive Operating System for Understanding the World

IterativWorld is an immersive 3D world interface that combines live geospatial
intelligence, structured global knowledge, historical context, statistical
comparison and AI-guided exploration on a single interactive globe.

Instead of navigating between maps, encyclopedias, dashboards, historical
timelines and data tools, users explore the world directly through space,
time and context.

## Core Thesis

**The globe is not the visualisation. The globe is the interface.**

Every visible place, object, event and data point can become an entry point
into deeper knowledge. A user can:

- fly over a country and immediately understand what they are seeing;
- inspect aircraft, ships, satellites, infrastructure and natural events;
- open contextual country, city or landmark knowledge without leaving the globe;
- compare countries, regions or places using structured global data;
- travel through historical events at their real geographic locations;
- move through time and observe how geography, borders and places change;
- ask natural-language questions about the current view;
- generate cinematic stories from world history and geography;
- save and share complete world-view states.

## The Core Loop

**Observe → Identify → Understand → Compare → Explore → Remember**

The system continuously understands the user's spatial and temporal context
and surfaces relevant knowledge without forcing the user through menus.

## World Context Engine

At the heart of IterativWorld is the World Context Engine. It combines:

- camera position;
- visible geography;
- selected entities;
- nearby places;
- country and regional relationships;
- live signals;
- historical events;
- statistical datasets;
- user intent;
- temporal state.

The engine produces contextual knowledge and actions. "What am I looking at?"
resolves to a chain like:

> Acropolis → Athens → Greece → Classical Greece → nearby landmarks → current activity.

The same engine powers search, voice, panels, recommendations, comparisons
and cinematic experiences.

**Status:** v0 ships as `src/world/worldContextEngine.js` — a pure,
dependency-free transformation from the scene snapshot (camera, basemap
identity, landmarks, live layers) into a provenance-tagged context object
plus the deterministic "Explain this view" brief. It is wired into the
voice pipeline as the `explain_view` action.

## World Entity Graph

All knowledge is represented as interconnected entities rather than isolated
country records. Primary entities include countries, regions, cities,
landmarks, historical sites and events, people, organisations, aircraft,
ships, satellites, infrastructure, natural features, live events and
statistics. Entities contain spatial, temporal and provenance metadata and
can reference one another.

## Three Classes of Knowledge

- **Live** — rapidly changing signals: aircraft, ships, weather, traffic,
  earthquakes, public cameras.
- **Periodic** — statistics: population, GDP, energy, communications,
  transportation indicators.
- **Historical / Editorial** — events, timelines, people, narratives,
  landmarks, curated educational material.

Every datum records its source, publication or retrieval date and temporal
validity where applicable.

## The Killer Interaction: "Explain this view"

The user flies anywhere and asks:

> "Explain everything important I'm looking at."

IterativWorld responds contextually with the current view's identity chain,
nearby landmarks, live activity and suggested explorations — grounded in the
World Context Engine, never invented. The deterministic brief (v0) renders:

```text
CURRENT VIEW
Tokyo Tower — Yokohama — Kanagawa — Japan (local view · camera 8,500 m)

LANDMARKS
Tokyo Tower (3.2 km) · Sensō-ji (7.9 km) · Meiji Shrine (8.4 km)

LIVE
Satellites: 1200 · Live Aircraft: 34 · Marine Traffic: 6 · 1,240 total across 3 layers

EXPLORE
[compare] [timeline] [story] [follow]
```

## Sacred Architecture Concepts

1. **World Entity Graph** — everything is an entity connected to other entities.
2. **World Context Engine** — the system always knows what the user is looking at and why it might matter.
3. **Temporal World Model** — places exist across time, not just in the present.
4. **Provenance Layer** — knowledge is traceable to sources and dates.
5. **Globe-native UX** — information comes to the user through the world.

Everything else — dossiers, rankings, voice, POIs, history, games, dioramas —
is an experience built on those five foundations.

## Product Positioning

IterativWorld is not another flight tracker, 3D globe, country encyclopedia,
dashboard or AI geography chatbot. It is a **spatial interface for
understanding the world**:

> **See the world. Understand the world. Move through the world.**

---

*IterativWorld is a fork of [God's Eye View](https://github.com/bilawalsidhu/gods-eye-view)
by [Bilawal Sidhu](https://github.com/bilawalsidhu), which contributes the
photorealistic globe, the live-signal layers and the realtime voice
foundation this concept builds upon.*
