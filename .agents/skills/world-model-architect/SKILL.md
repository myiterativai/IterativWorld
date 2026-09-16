---
name: world-model-architect
description: Own the shape of the world entity graph — entity and relationship schemas, canonical identifiers, temporal semantics, and the query contracts services are built against. Use when a new entity type, relationship, or cross-dataset join is proposed; not for whether a specific record is sourced correctly (use knowledge-steward) or where code lives (use boundary-warden).
---

# World Model Architect

Countries, cities, landmarks, historical events, people, organisations, aircraft, ships and
statistics are converging into one graph. `knowledge-steward` decides whether a given record
is properly sourced. This skill decides whether the *type* that record belongs to is coherent,
stable, and compatible with everything else already in the graph — a distinct and prior
question.

```text
data-licence         "May we use this source at all?"
knowledge-steward     "Is this specific record properly sourced and reviewed?"
world-model-architect "How does this record's type fit the world model?"
```

## What this skill owns

- **Entity schemas** — the field set for each entity type (country, city, landmark,
  historical event, person, organisation, aircraft, ship, statistic) and what's required
  vs. optional.
- **Relationship schemas** — how entities reference one another (located-in, occurred-at,
  part-of, succeeded-by) and which relationships are permitted between which types.
- **Canonical identifiers** — one stable id per real-world entity, with a mapping table to
  each federated source's own id (Wikidata QID, ISO code, OSM way/node id). Two records from
  different sources describing the same place must resolve to one entity, not two.
- **Temporal semantics** — the difference between *event time* (a date an entity carries),
  *observation time* (when a statistic was measured or reported) and *cartographic time*
  (when a boundary had a given shape). These are different fields with different query
  patterns; conflating them is how "show me 1945" silently returns 2024 borders with 1945
  population figures.
- **Query contracts** — the interface services are built against (what a "get entities near
  this point, valid at this time" query can return, and in what shape), so the country-data
  layer, the context engine, dossiers and voice tools all consume the same contract instead
  of each service inventing its own.
- **Schema versioning and compatibility** — when a schema changes, what happens to existing
  records and to services built against the old shape.

## What this skill does not own

Whether a specific record has a source, a date, and a review sign-off is `$knowledge-steward`.
Which file a module lives in and which direction it may import is `$boundary-warden`. Whether
a data source's licence permits use at all is `$data-licence`. This skill is upstream of all
three on the *type* question and has no opinion on the *instance* question.

## Design discipline

- Prefer extending an existing entity type over inventing a new one, for the same reason
  `$voice-tool-smith` prefers extending an existing tool — fewer types means more of the
  graph is genuinely comparable.
- A new relationship type is approved only when an existing one, generalised, doesn't already
  cover it. "located-in" plus a qualifier beats a new relationship for every near-miss — an
  uncontrolled type system is as much a long-term liability here as an uncontrolled licence
  set is for `$data-licence`.
- Every schema change states its migration path for existing records before it's approved,
  not after.
- Federated sources (Wikidata, OSM, World Bank/IMF/UN) are mapped into this schema at the
  boundary, not replicated verbatim — their field names and shapes are theirs, not the
  graph's.

## Reporting

Use the shared report shape (see `AGENTS.md`). `scope` is the entity/relationship types
touched; `evidence` is the schema diff and the migration path for existing records; `blocking`
is true for any change with no migration path or that breaks an existing query contract.
`handoff` names `knowledge-steward` once a type is approved and ready to admit records, or
`boundary-warden` when a query contract change requires new module placement.
