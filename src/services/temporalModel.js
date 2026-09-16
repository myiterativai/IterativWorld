/**
 * Temporal World Model — the Phase 3 foundation.
 *
 * Time travel is a temporal world model, not "Cesium Clock + historical
 * GeoJSON": when the user travels, the World Context Engine's temporal state
 * shifts, live layers yield to historical policy, and entity resolution
 * becomes point + date + relationships. This module owns that semantics,
 * dependency-free, so every consumer — context engine, layer policy, UI
 * scrubber, voice — shares one contract instead of re-deriving it.
 *
 * Design: docs/TEMPORAL-MODEL.md. Schema ownership: $world-model-architect
 * (entity intervals and temporal relationships are graph schema; the query
 * contract lives here).
 */

export const TEMPORAL_MODEL_VERSION = '0.1.0';

/** Temporal modes. 'live' is the present; 'historical' is any past instant. */
export const TEMPORAL_MODES = Object.freeze(['live', 'historical']);

/** Precisions a temporal context can carry — never imply more than the source. */
export const TEMPORAL_PRECISIONS = Object.freeze([
  'exact',
  'day',
  'month',
  'year',
  'century',
]);

/** Confidence of a historical reconstruction, surfaced in the HUD. */
export const TEMPORAL_CONFIDENCES = Object.freeze([
  'high',
  'moderate',
  'low',
  'reconstruction',
]);

/** The granular temporal events (see temporalEventsFor). */
export const TEMPORAL_EVENTS = Object.freeze([
  'temporal-context-changed',
  'temporal-precision-changed',
  'temporal-entity-changed',
  'temporal-geometry-changed',
  'temporal-data-changed',
  'temporal-layer-policy-changed',
]);

/** Typed temporal relationships between political/geographic entities. */
export const TEMPORAL_RELATIONSHIPS = Object.freeze([
  'succeededBy',
  'precededBy',
  'splitInto',
  'mergedInto',
  'renamedTo',
  'annexedBy',
  'cededTo',
  'contained',
  'occupiedBy',
]);

const inSet = (set, value) => set.includes(value);

function toInstant(value) {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function sameInstant(a, b) {
  if (a == null || b == null) return a === b;
  return a.getTime() === b.getTime();
}

/**
 * Create a validated temporal context.
 *
 * @param {object} [options]
 * @param {Date|string|null} [options.instant] The temporal instant; null/now = live.
 * @param {'live'|'historical'} [options.temporalMode] Derived from instant when omitted.
 * @param {'exact'|'day'|'month'|'year'|'century'} [options.precision] Source precision.
 * @param {'high'|'moderate'|'low'|'reconstruction'} [options.confidence]
 * @param {string} [options.displayYear] Human label; derived when omitted.
 * @returns {object} Frozen, normalized temporal context.
 */
export function createTemporalContext({
  instant = null,
  temporalMode = null,
  precision = 'day',
  confidence = 'high',
  displayYear = null,
} = {}) {
  const resolvedInstant = toInstant(instant);
  const mode =
    temporalMode != null && inSet(TEMPORAL_MODES, temporalMode)
      ? temporalMode
      : resolvedInstant
        ? 'historical'
        : 'live';
  const normalizedPrecision = inSet(TEMPORAL_PRECISIONS, precision)
    ? precision
    : 'day';
  const normalizedConfidence = inSet(TEMPORAL_CONFIDENCES, confidence)
    ? confidence
    : 'high';
  const context = {
    model: TEMPORAL_MODEL_VERSION,
    instant: mode === 'live' ? null : resolvedInstant,
    calendar: 'gregorian',
    era: 'CE',
    displayYear:
      displayYear != null && String(displayYear).trim().length > 0
        ? String(displayYear)
        : mode === 'live' || !resolvedInstant
          ? 'Present'
          : String(resolvedInstant.getUTCFullYear()),
    precision: mode === 'live' ? 'exact' : normalizedPrecision,
    temporalMode: mode,
    confidence: mode === 'live' ? 'high' : normalizedConfidence,
  };
  return Object.freeze(context);
}

/**
 * Whether an entity interval is active at an instant. Half-open [from, to):
 * the USSR interval ending 1991-12-26 is NOT active on 1991-12-26 — that day
 * belongs to the successors. A null `to` is open-ended (still active).
 *
 * @param {{from: (Date|string), to?: (Date|string|null)}} interval
 * @param {Date|string|null} instant Live (null) is never active.
 */
export function intervalActiveAt(interval, instant) {
  const at = toInstant(instant);
  if (!at || !interval) return false;
  const from = toInstant(interval.from);
  if (!from || at.getTime() < from.getTime()) return false;
  const to = interval.to == null ? null : toInstant(interval.to);
  return to == null || at.getTime() < to.getTime();
}

/**
 * Resolve an entity at an instant: which interval (name, geometry, capital,
 * leader, …) was in effect. Live mode resolves null — the present is the
 * entity's current identity, not a historical interval.
 *
 * @param {{intervals?: Array}} entity Entity record with temporal intervals.
 * @param {Date|string|null} instant
 * @returns {object|null} The active interval, or null when none matches.
 */
export function resolveEntityAt(entity, instant) {
  if (!Array.isArray(entity?.intervals)) return null;
  return (
    entity.intervals.find((interval) => intervalActiveAt(interval, instant)) ||
    null
  );
}

/**
 * Resolve point-in-time sovereignty: which entity from the candidate set
 * contains/owns the point at the instant, honouring relationship overrides
 * (annexedBy/occupiedBy/contained) recorded on intervals.
 *
 * Minimal v0: callers pass entities whose intervals carry a `contains`
 * predicate (or geometryRef resolution is theirs). The model guarantees the
 * temporal part; geometric point-in-polygon is the rendering layer's job.
 */
export function successorsOf(entity, relationship = 'splitInto') {
  if (!inSet(TEMPORAL_RELATIONSHIPS, relationship)) return [];
  const relations = Array.isArray(entity?.relationships)
    ? entity.relationships.filter(
        (rel) => rel && rel.type === relationship && Array.isArray(rel.targets),
      )
    : [];
  return relations.flatMap((rel) => rel.targets);
}

/**
 * The layer policy for a temporal mode: live-signal layers stay live in the
 * present and are suppressed in historical mode — live signals did not exist
 * in 1989, and pretending they did is the exact failure this model prevents.
 *
 * @param {'live'|'historical'} temporalMode
 * @returns {{liveLayersEnabled: boolean, reason: string}}
 */
export function temporalLayerPolicy(temporalMode) {
  return temporalMode === 'historical'
    ? {
        liveLayersEnabled: false,
        reason:
          'Live signals are suppressed in historical mode; they postdate the selected instant.',
      }
    : {
        liveLayersEnabled: true,
        reason: 'Live mode: present-day signal layers are active.',
      };
}

/**
 * Diff two temporal contexts into the granular events consumers subscribe to.
 * A tiny timeline movement must not behave like a full application reload:
 * each event fires only for what actually changed.
 *
 * @param {object} previous
 * @param {object} next
 * @param {object} [resolution] Optional resolution keys to diff entity/
 *   geometry/data changes: `{entityKey, geometryKey, dataKey}` — values
 *   compared with strict equality between prev and next resolutions.
 * @returns {string[]} The events to fire, in stable order.
 */
export function temporalEventsFor(previous, next, resolution = {}) {
  if (!previous || !next) return [...TEMPORAL_EVENTS];
  const events = [];
  const changed =
    !sameInstant(previous.instant, next.instant) ||
    previous.temporalMode !== next.temporalMode;
  if (!changed) return events;
  events.push('temporal-context-changed');
  if (previous.precision !== next.precision)
    events.push('temporal-precision-changed');
  if (previous.temporalMode !== next.temporalMode)
    events.push('temporal-layer-policy-changed');
  const { entityKey, geometryKey, dataKey } = resolution;
  if (entityKey != null && previous[entityKey] !== next[entityKey])
    events.push('temporal-entity-changed');
  if (geometryKey != null && previous[geometryKey] !== next[geometryKey])
    events.push('temporal-geometry-changed');
  if (dataKey != null && previous[dataKey] !== next[dataKey])
    events.push('temporal-data-changed');
  return events;
}

/**
 * Create the temporal store: one temporal context plus typed subscriptions.
 * `set` normalizes its input, diffs against the previous context, and
 * dispatches only the granular events that changed. Subscribers can filter
 * by event type; `temporal-context-changed` is always delivered.
 *
 * @param {object} [initial] Passed to createTemporalContext.
 */
export function createTemporalStore(initial) {
  let context = createTemporalContext(initial);
  let sequence = 0;
  let subscriberId = 0;
  const subscribers = new Map();
  return Object.freeze({
    get() {
      return context;
    },
    set(update, resolution = {}) {
      const next = createTemporalContext(update);
      const events = temporalEventsFor(context, next, resolution);
      if (events.length === 0) return [];
      const previous = context;
      context = next;
      sequence += 1;
      for (const { listener, eventTypes } of subscribers.values()) {
        const delivered =
          eventTypes == null
            ? events
            : events.filter((event) => eventTypes.includes(event));
        if (delivered.length === 0) continue;
        try {
          listener({ previous, context: next, events: delivered, sequence });
        } catch {
          /* one failing subscriber never breaks the timeline */
        }
      }
      return events;
    },
    subscribe(listener, { eventTypes = null } = {}) {
      if (typeof listener !== 'function') return () => false;
      subscriberId += 1;
      const id = subscriberId;
      subscribers.set(id, { listener, eventTypes });
      return () => subscribers.delete(id);
    },
  });
}
