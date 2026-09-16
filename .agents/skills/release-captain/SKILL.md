---
name: release-captain
description: Run the full release gate for IterativWorld or IterativTours and produce the release record. Use before tagging a release or promoting a build; not for routine PR review or for individual feature validation.
---

# Release Captain

Orchestrates the other skills into one ordered gate and produces a record that survives the
release. Nothing here is new validation — it is the assurance that every gate actually ran,
in an order where earlier failures stop expensive later work.

## Consuming specialist reports

Every specialist skill returns the shared report shape (`AGENTS.md`). Read `blocking` and
`handoff` directly rather than re-deriving a pass/fail judgement from prose — a specialist
that says `blocking: false` with three `followUps` is a pass with a note, not a fail, and a
specialist that says `blocking: true` stops the gate regardless of how measured its language
is. Treat a change's progress as a simple lifecycle — discovered → classified (which gates
apply) → implemented → validated (gates run) → integrated → release-candidate → released —
mainly so "validated" and "released" are never conflated in a report: a gate set that passed
on a branch is a release candidate until the tag exists and the tagged build has itself been
verified.

## Gate order

Ordered so cheap and blocking checks fail first.

| # | Gate | Command / skill | Blocking |
|---|---|---|---|
| 1 | Environment | `npm run doctor` | yes |
| 2 | Formatting | `npm run format:check` | yes |
| 3 | Unit tests | `npm test` | yes |
| 4 | Tracking invariants | `npm run test:track` | yes |
| 5 | Architecture | `npm run check:boundaries` | yes |
| 6 | World-model schema conformance | `$world-model-architect audit` | yes |
| 7 | Layer manifests | `$layer-steward audit` | yes |
| 8 | Data licensing | `$data-licence scan` | yes |
| 9 | Provenance completeness | `$knowledge-steward` | yes |
| 10 | Headless QA | `scripts/qa-*.mjs` for affected surfaces | yes |
| 11 | Performance & cost | `$perf-cost-guard` incl. mobile case | yes |
| 12 | Build | `npm run build` | yes |
| 13 | Upstream drift note | `$fork-sync` range since last release | no |

## Product-specific release checks

**IterativTours** — confirm the shipped layer set matches the tourism manifest and that no
surveillance-flavoured layer re-enabled itself since the last release; confirm no weapons,
lock, damage-state or "target" language in user-facing strings; confirm every route ships
with `reviewedBy` / `reviewedAt` populated.

**IterativWorld** — confirm the platform surface exposed to products is unchanged or
versioned; confirm temporal Tier 3 content (if present) cleared its own licensing review.

**Both** — confirm the MIT notice and © 2026 Bilawal Sidhu attribution are retained, and that
credits name Bilawal Sidhu and Sameh Khamis / Halfpixel. Confirm the non-commercial
TeleGeography folder is absent from any commercial build.

## Hosting posture check

Upstream binds to localhost and brokers API keys to anyone who can reach the dev server. A
public multi-tenant build must not ship that model. Before any public release, confirm auth,
server-side key isolation, per-user rate limiting and per-session quota enforcement are
present and tested — this is a blocking gate for public launch even though it is not an
automated one.

## Reporting

Produce a release record: version, commit SHA, every gate with its result and evidence
location (the specialist reports consumed as-is, not re-summarised into new prose),
product-specific check results, known-blocked items, and the upstream drift range. A passing
gate set is a recommendation until the tag exists and its build has been verified.
