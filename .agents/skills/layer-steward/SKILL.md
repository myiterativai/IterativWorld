---
name: layer-steward
description: Own the per-product layer allow-lists that let IterativWorld and IterativTours run from one fork, and keep the catalog registration consistent. Use when adding, disabling or auditing a data layer, and after any upstream sync; not for implementing layer internals or for rendering work.
---

# Layer Steward

IterativWorld keeps and expands the inherited live layers. IterativTours deliberately
disables most of them — the tourism product's whole editorial premise is scenery, not
surveillance. Both run from the same fork, so **layer availability is per-product
configuration, not a global property of the codebase.**

## The inherited surface

Twenty-one layers register today (post the September 2026 upstream Nepal merge).
Nineteen are constructed in `src/app/constructCatalog.js`: flights, military flights, AIS
vessels, CCTV, radio, traffic, bikeshare, directions, transit, military installations,
satellites, rocket launches, ALPR cameras, military awareness, FIRMS active fires,
earthquakes, submarine cables, and the two Bhote Koshi flood layers (`bhote-koshi-2026`,
`bhote-koshi-locator`). Two more arrive via `createInfrastructureLayers` in
`src/data/infrastructure.js`: datacenters (`local-datacenters`) and dams (`local-dams`).
The authoritative id list is `LAYER_STATE_REGISTRY` in `src/data/layerState.js` — count
from there, not from imports, when auditing.

Weather is **not** one of them — it is a Cesium atmospheric effect wired into the cockpit
briefing (`src/weatherEffectsMath.js`, `src/ui/cockpitBriefing.js`) and toggles separately.
Do not count it as a catalog layer.

## The allow-list contract

Each product declares a manifest — layer id, `enabled`, `defaultOn`, and a `reason` string
for anything disabled. Rules:

- **Disable, don't delete.** A disabled layer stays in the tree so upstream merges stay
  clean. Deletion happens only after the formal delete-vs-diverge decision.
- Every layer id in the catalog must appear in every product manifest. A layer present in
  the code but absent from a manifest is a failure, not a default — that is exactly how a
  surveillance layer silently ships in a tourism product.
- `reason` is required for disabled entries and is expected to be editorial ("reads as
  surveillance; off-thesis for IterativTours") or legal ("NC-licensed data, see
  `$data-licence`"), not "unused".
- **Every externally visible capability has exactly one owner.** A layer's existence is
  decided in the catalog and the manifest — not independently re-decided by a voice tool,
  a UI panel, or a service that happens to also know how to fetch the data. If a panel or
  tool can surface a layer the manifest disabled, that's a boundary bug, not a second
  source of truth to reconcile later.

## Procedures

**Add a layer** — register it, add it to every product manifest with an explicit decision,
run `$data-licence` on its source, run `$boundary-warden` on its module, add it to
`DATA_SOURCES.md`, and add a catalog test.

**Audit** (`$layer-steward audit`) — diff the catalog registration against every manifest;
report layers in code but not in a manifest, manifest entries with no matching layer, and
any layer whose enabled state changed since the last audit. Run this after every
`$fork-sync`.

**Disable** — change the manifest only. If disabling requires touching the layer module,
say so and stop; that means the product coupling is wrong and should be fixed first.

## Reporting

Use the shared report shape (see `AGENTS.md`). `evidence` is the manifest diff per product;
`blocking` is true if any layer exists in code without a manifest entry, or is reachable
through more than one owner. Include the reason strings for new disables and an explicit
statement of which layers each product ships with after the change.
