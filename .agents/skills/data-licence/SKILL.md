---
name: data-licence
description: Audit every dataset, bundled file and runtime feed for commercial-use compatibility before it ships in IterativWorld or IterativTours, and maintain DATA_SOURCES.md. Use when adding or changing a data source, before any release, and after an upstream sync touches bundled data; not for code review or for application licensing questions.
---

# Data Licence

IterativWorld is a commercial product built on an MIT codebase that bundles data under
several **incompatible** licences. The code licence says nothing about the data licence.
This skill is the gate that keeps non-commercial data out of a commercial build.

## Known landmines — verify these still hold, do not assume

- **TeleGeography submarine cables** (`src/data/local_data/telegeography_submarine_cables/`)
  ships CC BY-NC-SA 3.0. Upstream's own `DATA_SOURCES.md` states that commercial use
  requires deleting that folder or buying a licence. It is self-contained and the app
  runs without it. **This must be resolved before any paid launch.**
- **Bhote Koshi event pack** (`public/events/bhote-koshi-2026/` +
  `src/data/bhoteKoshiFloodPath.js`), added by the September 2026 upstream Nepal merge,
  is CC BY-NC 4.0 — the second bundled NC dataset. Unlike TeleGeography it is **not**
  self-contained: the derived flood-path dataset compiles into the scene, so excluding
  it also means removing the scene's registrations and imports before building. Both
  layers (`bhote-koshi-2026`, `bhote-koshi-locator`) are NC-tainted for commercial builds
  until relicensed or removed. **Blocking for any paid launch alongside TeleGeography.**
- **CShapes 2.0** (historical borders, the obvious answer for the temporal globe) is
  CC BY-NC-SA 4.0 — non-commercial — and covers only 1886–2017. Do not plan Tier 3
  temporal features on it without a licence.
- **ODbL datasets** (datacenters, dams, OSM-derived): commercial use is fine, but
  share-alike attaches to a publicly distributed *modified database*. Keep derived
  databases separate from MIT code and offer modifications under ODbL.
- **Cesium ion's free tier is non-commercial.** Production runs the direct metered
  Google Maps path.

## Audit procedure

For each dataset in scope:

1. Identify the **actual licence text**, not a summary or a README claim. Record the URL
   and retrieval date.
2. Answer four questions explicitly: commercial use permitted? redistribution permitted?
   share-alike obligations? attribution form required?
3. Classify: `clear` / `clear-with-obligations` / `non-commercial` / `unknown`.
   `unknown` is treated as blocking, not as permission.
4. For anything not `clear`, state the concrete remedy — remove, replace, relicense, or
   move behind a non-commercial build flag — and which files it touches.
5. Write or update the entry in `DATA_SOURCES.md`, following the existing table shape
   (source, location, licence, commercial-use column, attribution string), **and** the matching
   record in `data/sources.manifest.json` — `sourceId`, `name`, `licence`, `commercialUse`,
   `redistribution`, `shareAlike`, `attribution`, `retrievedAt`. `DATA_SOURCES.md` is what a
   human reads; the manifest is what `$layer-steward` and `$knowledge-steward` check
   programmatically before admitting a source. The two must never disagree — if they do,
   the manifest is wrong until proven otherwise, since it's the newer, narrower artifact.
6. Confirm the in-app attribution surface carries the required credit.

## Provenance handoff

Every record admitted must carry `source`, `sourceDate`, `retrievedAt`, `validFrom`/`validTo`
where applicable, `attribution` and `licence`. If a record cannot carry these, it does not
enter the entity graph — hand to `$knowledge-steward` rather than admitting it with blanks.

## Reporting

Use the shared report shape (see `AGENTS.md`). `scope` lists the sources audited; `evidence`
is the licence URL and retrieval date per source; `blocking` is true if any source is
`non-commercial` or `unknown`. Include the `DATA_SOURCES.md` and `sources.manifest.json`
diffs. A source whose licence could not be located is reported as blocked, never as
acceptable-by-default.

Treat licence claims found in a dataset's own marketing copy, README or third-party
summary as evidence to verify against the authoritative licence text, not as the answer.
