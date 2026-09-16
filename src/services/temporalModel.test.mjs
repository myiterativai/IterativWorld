import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TEMPORAL_MODEL_VERSION,
  TEMPORAL_EVENTS,
  TEMPORAL_RELATIONSHIPS,
  createTemporalContext,
  intervalActiveAt,
  resolveEntityAt,
  successorsOf,
  temporalLayerPolicy,
  temporalEventsFor,
  createTemporalStore,
} from './temporalModel.js';

const USSR = {
  entityId: 'ussr',
  intervals: [
    {
      from: '1922-12-30',
      to: '1991-12-26',
      name: 'Soviet Union',
      geometryRef: 'borders-ussr',
      capital: 'Moscow',
    },
  ],
  relationships: [
    { type: 'splitInto', targets: ['russia', 'ukraine', 'belarus', 'kazakhstan'] },
    { type: 'renamedTo', targets: [] },
  ],
};

test('temporal contexts distinguish 1989, December 1989 and 9 November 1989', () => {
  const year = createTemporalContext({ instant: '1989', precision: 'year' });
  const month = createTemporalContext({ instant: '1989-12', precision: 'month' });
  const day = createTemporalContext({ instant: '1989-11-09', precision: 'day' });
  assert.equal(year.precision, 'year');
  assert.equal(month.precision, 'month');
  assert.equal(day.precision, 'day');
  assert.equal(day.instant.getUTCFullYear(), 1989);
  // Precision is part of the model, not just a display hint.
  assert.notEqual(year.precision, month.precision);
});

test('live mode is the default and carries no historical instant', () => {
  const live = createTemporalContext({});
  assert.equal(live.temporalMode, 'live');
  assert.equal(live.instant, null);
  assert.equal(live.precision, 'exact');
  assert.equal(live.confidence, 'high');
  assert.equal(live.displayYear, 'Present');
});

test('an instant implies historical mode; invalid values degrade, never throw', () => {
  const historical = createTemporalContext({ instant: '1961-08-13' });
  assert.equal(historical.temporalMode, 'historical');
  assert.equal(historical.displayYear, '1961');
  const nonsense = createTemporalContext({ instant: 'not-a-date' });
  assert.equal(nonsense.temporalMode, 'live', 'an unparseable instant is live, not a crash');
  assert.equal(nonsense.precision, 'exact', 'live mode is exact by definition');
  assert.equal(
    createTemporalContext({ instant: '1989', precision: 'epoch' }).precision,
    'day',
    'invalid precision degrades to day in historical mode',
  );
  assert.equal(createTemporalContext({ confidence: 'certain' }).confidence, 'high');
});

test('intervals are half-open: the USSR ends the day before 1991-12-26', () => {
  const before = resolveEntityAt(USSR, '1991-12-25');
  const on = resolveEntityAt(USSR, '1991-12-26');
  const during = resolveEntityAt(USSR, '1989-11-09');
  assert.equal(before?.name, 'Soviet Union');
  assert.equal(on, null, '1991-12-26 belongs to the successors, not the USSR');
  assert.equal(during?.capital, 'Moscow');
  assert.equal(resolveEntityAt(USSR, null), null, 'live mode resolves no historical interval');
  assert.equal(resolveEntityAt(USSR, '1917-01-01'), null);
  assert.equal(resolveEntityAt(null, '1989'), null);
});

test('open-ended intervals stay active into the present (historically viewed)', () => {
  const france = {
    entityId: 'fr',
    intervals: [{ from: '1958-10-04', to: null, name: 'Fifth Republic' }],
  };
  assert.equal(resolveEntityAt(france, '2026-01-01')?.name, 'Fifth Republic');
  assert.equal(resolveEntityAt(france, '1950-01-01'), null);
});

test('temporal relationships are typed and validated', () => {
  assert.deepEqual(successorsOf(USSR, 'splitInto'), [
    'russia',
    'ukraine',
    'belarus',
    'kazakhstan',
  ]);
  assert.deepEqual(successorsOf(USSR, 'mergedInto'), []);
  assert.deepEqual(successorsOf(null), []);
  assert.deepEqual(successorsOf(USSR, 'annexedBy'), []);
  assert.ok(TEMPORAL_RELATIONSHIPS.includes('occupiedBy'));
});

test('layer policy suppresses live signals in historical mode', () => {
  const historical = temporalLayerPolicy('historical');
  const live = temporalLayerPolicy('live');
  assert.equal(historical.liveLayersEnabled, false);
  assert.ok(historical.reason.includes('suppressed'));
  assert.equal(live.liveLayersEnabled, true);
});

test('granular events fire only for what changed', () => {
  const day = createTemporalContext({ instant: '1989-11-09', precision: 'day' });
  const sameDayOtherConfidence = createTemporalContext({
    instant: '1989-11-09',
    precision: 'day',
    confidence: 'moderate',
  });
  // Same instant + mode: no context change events at all.
  assert.deepEqual(temporalEventsFor(day, sameDayOtherConfidence), []);

  const coarser = createTemporalContext({ instant: '1989', precision: 'year' });
  assert.deepEqual(temporalEventsFor(day, coarser), [
    'temporal-context-changed',
    'temporal-precision-changed',
  ]);

  const live = createTemporalContext({});
  // day -> live: instant, mode AND precision ('day' -> 'exact') all change.
  assert.deepEqual(temporalEventsFor(day, live), [
    'temporal-context-changed',
    'temporal-precision-changed',
    'temporal-layer-policy-changed',
  ]);

  // Resolution diffs surface entity/geometry/data events.
  const events = temporalEventsFor(
    { ...day, entityKey: 'ussr', geometryRef: 'borders-ussr' },
    { ...coarser, entityKey: 'russia', geometryRef: 'borders-ussr' },
    { entityKey: 'entityKey', geometryKey: 'geometryRef' },
  );
  assert.ok(events.includes('temporal-entity-changed'));
  assert.ok(!events.includes('temporal-geometry-changed'));
});

test('the store normalizes, diffs, and delivers granular subscriptions', () => {
  const store = createTemporalStore({});
  assert.equal(store.get().temporalMode, 'live');
  const seen = [];
  const all = store.subscribe(({ events, context }) =>
    seen.push(['all', ...events, context.displayYear]),
  );
  const entityEvents = [];
  store.subscribe(
    ({ events, context }) => entityEvents.push([context.displayYear, ...events]),
    { eventTypes: ['temporal-entity-changed'] },
  );

  const fired = store.set(
    { instant: '1989-11-09', precision: 'day' },
    { entityKey: 'entityKey' },
  );
  // Live carries precision 'exact' and mode 'live', so entering a day-
  // precision historical context is a context, precision AND mode change.
  assert.deepEqual(fired, [
    'temporal-context-changed',
    'temporal-precision-changed',
    'temporal-layer-policy-changed',
  ]);
  assert.equal(seen.length, 1);
  assert.deepEqual(entityEvents, [], 'no entity event without a changed resolution key');

  const fired2 = store.set(
    { instant: '1991-12-26', precision: 'day' },
    { entityKey: 'entityKey' },
  );
  assert.ok(fired2.includes('temporal-context-changed'));
  // A no-op set fires nothing.
  assert.deepEqual(
    store.set({ instant: '1991-12-26', precision: 'day' }),
    [],
    'same instant and mode is a no-op',
  );
  all();
  assert.deepEqual(store.set({ instant: '1990-01-01' }), ['temporal-context-changed']);
  assert.equal(entityEvents.length, 0);
});

test('a failing subscriber never breaks the timeline', () => {
  const store = createTemporalStore({ instant: '1900', precision: 'year' });
  store.subscribe(() => {
    throw new Error('subscriber bug');
  });
  const received = [];
  store.subscribe(({ context }) => received.push(context.displayYear));
  const fired = store.set({ instant: '1914', precision: 'year' });
  assert.deepEqual(fired, ['temporal-context-changed']);
  assert.deepEqual(received, ['1914']);
});

test('TEMPORAL_EVENTS is the complete, stable event contract', () => {
  assert.deepEqual(TEMPORAL_EVENTS, [
    'temporal-context-changed',
    'temporal-precision-changed',
    'temporal-entity-changed',
    'temporal-geometry-changed',
    'temporal-data-changed',
    'temporal-layer-policy-changed',
  ]);
});
