---
name: voice-tool-smith
description: Add and maintain voice agent tools — schema, action implementation, enums and tests — so every IterativWorld capability is reachable by voice. Use when building a new capability that the agent should drive, or when a tool's enums drift from the catalog; not for prompt/persona tuning or for Realtime session plumbing.
---

# Voice Tool Smith

The fork inherits a working voice agent: 29 tools declared in
`src/voice/actionSchemas.js` (~950 lines) with roughly 4,400 lines of execution in
`src/voice/gevActions.js` — the 28 inherited tools plus the fork's own `explain_view`,
the World Context Engine's voice surface. That is the most valuable inherited asset after
the renderer.

**Standing rule: voice is the integration test.** If a new capability cannot be driven by
the agent, it is not finished. This is why the AI layer is not a late phase — it is the
acceptance criterion for every phase.

## What already exists — extend, don't duplicate

Several tools are already most of what the knowledge layer needs:

- `get_current_view_state` — where the camera is and what is framed.
- `get_entity_context` — `scope: 'auto' | 'selected' | 'in_view'`, with a `layerId` enum.
- `analyst_query` — `scope.kind: 'view' | 'region' | 'radius' | 'anywhere'` over a layer enum.
- `set_context_mode`, `frame_overhead`, `fly_to_location`, `move_camera`, `control_scene`,
  `fly_route`, `track_entity`, `set_layer_visibility`, `set_visual_style`.

"Explain this view" already exists as the fork's `explain_view` tool — the World Context
Engine's brief as a single action. Extend the engine's context (and thus the brief) rather
than adding neighbouring view-inspection tools.

## Resolve intent before reaching for a tool

An utterance implies an intent before it implies a tool. "What's important here?" is an
`INSPECT_VIEW` intent, which is satisfied by composing `get_current_view_state` +
`get_entity_context` + a knowledge-layer query — not by a new bespoke tool, and not by making
the model pick correctly among forty near-duplicate options. When a capability request
arrives, name the intent first, check whether an existing tool (or a small composition of
existing tools) already satisfies it, and only design new schema when the intent has no home.
This is what keeps the tool surface small as product capabilities grow — the tool count should
grow much slower than the feature count.

## Minimal voice path from day one

Because voice is the integration test, no phase of work should land without at least one
voice-reachable utterance, even in skeletal form. When the Country Context Service first
exists, "What country am I over?" should already work end-to-end — camera → context → country
lookup → spoken answer — even before dossiers, rankings or history are built. That thin,
early, working path is worth more than a complete tool schema for a capability nothing can
reach yet.

## Adding a tool

1. **Check for an extension first.** Adding a country scope to `get_entity_context` beats a
   new `get_country_context`. Fewer, richer tools keep the agent's selection accurate.
2. Declare the schema in `src/voice/actionSchemas.js` with
   `additionalProperties: false` and explicit `enum` values, matching the existing style.
3. Implement execution in `src/voice/gevActions.js`, in the same shape as neighbouring
   actions — no direct reaching into layer internals; go through supplied services.
4. **Enum sync is a hard requirement.** `get_entity_context.layerId` and
   `analyst_query.layers` enumerate layer ids. Any layer added, renamed or disabled by
   `$layer-steward` must be reflected here in the same change, or the agent will offer
   users a layer the product doesn't ship.
5. Add tests alongside the existing `*.test.mjs` files.
6. Run `npm test` and `npm run check:boundaries` — `src/voice/` owns portable schemas and
   session, so an import into UI or app internals is a boundary violation.

## Grounding rule

Tools return **structured data from the world model**, never model-authored facts. An action
that would have the agent assert a statistic or historical claim not present in a provenance-
carrying record is wrong by construction — return the record, let the agent narrate it, and
keep the citation attached. Hand disputed or unsourced content to `$knowledge-steward`.

## Reporting

Use the shared report shape (see `AGENTS.md`). `evidence` is the schema diff and test file;
`blocking` is true if an enum went out of sync with `$layer-steward`'s manifests. Include the
intent this tool (or composition) resolves, whether an existing tool was extended instead, and
a sample utterance with the expected call and response shape.
