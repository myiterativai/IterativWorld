---
name: boundary-warden
description: Keep new IterativWorld modules inside the inherited component ownership and import-direction rules, and place new code in the correct package. Use when adding modules, panels, services or layers, and whenever check:boundaries fails; not for behavioural bugs or UI design work.
---

# Boundary Warden

The inherited codebase enforces architecture mechanically:
`npm run check:boundaries` runs `scripts/check-import-directions.mjs` (parses every runtime
JS/MJS/CJS file in `src/` and `server/`, including files the bundle doesn't use) and
`scripts/check-package-boundaries.mjs` (builds every declared export without app Vite config
or env files, against `scripts/package-boundaries.json`).

This matters more for IterativWorld than it did upstream, because the knowledge layer —
entity graph, context engine, dossiers, rankings, temporal model — is a large body of new
code being added to someone else's architecture.

## Ownership table to respect

| Owner | Responsibility |
|---|---|
| `src/app/` | Construct supplied components, share scene/request services, cancel startup, dispose |
| `src/standalone/` | Default catalog, local sources, setup controls |
| `src/ui/` | Navigation, restoration, visual state, panel snapshots, subscriptions |
| `src/data/` | Lifecycle, context and feed state |
| `src/layers/<family>/` | Source acquisition, records, Cesium resources, explicit controller/renderer owners |
| `src/sources/` | Portable protocols and source contracts |
| `src/services/` | Supplied application operations; scene construction owns caches and cancellation |
| `src/voice/` | Action schemas/session, controls, action execution, protocol adapters |
| `server/providers/` | Node route factories, process-scoped caches, shutdown cleanup |
| `server/standalone/` | Environment, local settings writes, server composition |

Package imports use the declared exports. Do not reach into internal files.

## Placement guidance for new IterativWorld work

- **Country/boundary rendering** → `src/layers/country-data/` with explicit controller and
  renderer owners, matching the existing layer families.
- **Entity graph and federation clients** → `src/sources/` for the protocols, `src/services/`
  for the application-facing operations. Not `src/ui/`.
- **World Context Engine** → `src/services/`. It is a supplied application operation, not a
  UI concern, even though the UI is its loudest consumer.
- **Dossier, rankings, timeline panels** → `src/ui/`, using the existing panel snapshot and
  subscription machinery rather than a parallel one.
- **Temporal model** → `src/data/` for state, `src/services/` for queries.

Browser graphs cannot reach Node, server or test modules through helpers. Reusable modules
cannot select standalone setup. Provider modules cannot import application or rendering
modules.

**UI must never be the source of world truth.** A dossier panel that fetches country JSON
directly, caches it locally, or reshapes it for its own convenience has created a second copy
of the entity graph that will drift from the first. The path is always panel → service →
entity graph → source federation/cache, never panel → source. This is the specific way the
knowledge layer would turn into a second application quietly embedded inside this one — watch
for it in review even when the shortcut is small.

This skill owns *where code lives and which direction it may import*. It does not own *what
shape the data takes* — entity schemas, relationship types, temporal semantics and query
contracts belong to `$world-model-architect`. A module in the right place with the wrong
schema is their finding, not this skill's.

## Procedure

1. Run `npm run check:boundaries` before proposing placement, not after.
2. For each new module, name its owner, its consumers, and the direction of every import
   it introduces.
3. New reusable modules and their tests get added to `scripts/format-scope.json`
   (see `docs/CODE-BOUNDARIES.md`); keep mechanical formatting in its own commit after
   behaviour is stable.
4. If a placement requires a new declared export, update `scripts/package-boundaries.json`
   so the export is assigned exactly once.

## Reporting

Use the shared report shape (see `AGENTS.md`). `evidence` is the import edges introduced and
the `check:boundaries` output; `blocking` is true on any boundary failure or any UI module
reaching past a service into a raw source. `handoff` names `world-model-architect` when the
module's data shape, not its placement, is in question. A boundary failure is reported and
fixed, never suppressed.
