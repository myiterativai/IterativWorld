import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WORLD_CONTEXT_ENGINE_VERSION,
  classifyViewScale,
  resolveWorldContext,
  formatViewBrief,
} from './worldContextEngine.js';

const NOW = new Date('2026-09-16T10:00:00.000Z');

const SCENE = {
  camera: { latitude: 35.36, longitude: 139.01, heightM: 8500 },
  basemap: {
    source: 'Google Photorealistic 3D Tiles / Cesium basemap',
    viewScale: 'local',
    place: {
      country: 'Japan',
      region: 'Kanagawa',
      locality: 'Yokohama',
    },
    knownLandmarks: [
      { name: 'Tokyo Tower', city: 'Tokyo', distanceKm: 3.2 },
      { name: 'Sensō-ji', city: 'Tokyo', distanceKm: 7.9 },
      { name: 'Meiji Shrine', city: 'Tokyo', distanceKm: 8.4 },
      { name: 'Tokyo Skytree', city: 'Tokyo', distanceKm: 9.1 },
    ],
    nearbyPlaces: [
      { name: 'Minato' },
      { name: 'Shinagawa' },
    ],
  },
  enabledLayers: [
    { id: 'flights', name: 'Live Aircraft', enabled: true, count: 34, source: 'adsb-lol' },
    { id: 'vessels', name: 'Marine Traffic', enabled: true, count: 6, source: 'ais' },
    { id: 'earthquakes', name: 'Earthquakes', enabled: false, count: 2, source: 'usgs' },
    { id: 'satellites', name: 'Satellites', enabled: true, count: 1200, source: 'celestrak' },
  ],
};

test('resolves the identity chain landmark → locality → region → country', () => {
  const context = resolveWorldContext(SCENE, { now: NOW });
  assert.equal(context.ok, true);
  assert.equal(context.engine, WORLD_CONTEXT_ENGINE_VERSION);
  assert.deepEqual(context.identity.chain, [
    'Tokyo Tower',
    'Yokohama',
    'Kanagawa',
    'Japan',
  ]);
  assert.equal(context.identity.country, 'Japan');
  assert.equal(context.identity.locality, 'Yokohama');
  assert.equal(context.identity.precision, 'local');
});

test('the identity chain dedupes repeated names case-insensitively', () => {
  const context = resolveWorldContext(
    {
      camera: { latitude: 1, longitude: 1, heightM: 5000 },
      basemap: {
        viewScale: 'local',
        place: { country: 'japan', locality: 'Yokohama' },
        knownLandmarks: [],
        nearbyPlaces: [],
      },
    },
    { now: NOW },
  );
  assert.deepEqual(context.identity.chain, ['Yokohama', 'japan']);
});

test('falls back to the nearest nearby place when the locality is missing', () => {
  const context = resolveWorldContext(
    {
      camera: { latitude: 1, longitude: 1, heightM: 5000 },
      basemap: {
        viewScale: 'local',
        place: { country: 'Japan' },
        knownLandmarks: [],
        nearbyPlaces: [{ name: 'Kamakura' }],
      },
    },
    { now: NOW },
  );
  assert.equal(context.identity.locality, 'Kamakura');
  assert.deepEqual(context.identity.chain, ['Kamakura', 'Japan']);
});

test('the live rollup counts only enabled layers and ranks the top three', () => {
  const context = resolveWorldContext(SCENE, { now: NOW });
  assert.equal(context.live.layerCount, 3);
  assert.equal(context.live.totalEntities, 1240);
  assert.deepEqual(
    context.live.topLayers.map((layer) => layer.id),
    ['satellites', 'flights', 'vessels'],
  );
  // The disabled earthquake layer must not leak into provenance sources.
  assert.deepEqual(
    context.provenance.live.sources.map((entry) => entry.id).sort(),
    ['flights', 'satellites', 'vessels'],
  );
});

test('suggested actions reflect what is actually in view', () => {
  const context = resolveWorldContext(SCENE, { now: NOW });
  assert.deepEqual(
    context.suggestedActions.map((entry) => entry.action),
    ['compare', 'timeline', 'story', 'follow'],
  );

  const empty = resolveWorldContext(
    { camera: { latitude: 0, longitude: 0, heightM: 20000000 } },
    { now: NOW },
  );
  assert.deepEqual(empty.suggestedActions, []);
  assert.equal(empty.view.scale, 'global');
  assert.deepEqual(empty.identity.chain, []);
});

test('every context records asOf timestamps and provenance', () => {
  const context = resolveWorldContext(SCENE, { now: NOW });
  assert.equal(context.asOf, '2026-09-16T10:00:00.000Z');
  assert.equal(context.temporal.asOf, context.asOf);
  assert.equal(context.provenance.asOf, context.asOf);
  assert.equal(
    context.provenance.place.source,
    'Google Photorealistic 3D Tiles / Cesium basemap',
  );
  assert.equal(context.provenance.engine.version, WORLD_CONTEXT_ENGINE_VERSION);
  assert.ok(context.temporal.note.includes('Phase 3'));
});

test('a null scene degrades to a valid global context rather than throwing', () => {
  const context = resolveWorldContext(null, { now: NOW });
  assert.equal(context.ok, true);
  assert.equal(context.view.scale, 'unknown');
  assert.deepEqual(context.identity.chain, []);
  assert.equal(context.live.layerCount, 0);
  assert.equal(context.view.camera, null);
  assert.equal(context.provenance.place.source, 'unresolved');
});

test('classifyViewScale mirrors the camera thresholds', () => {
  assert.equal(classifyViewScale(20000000), 'global');
  assert.equal(classifyViewScale(5000000), 'continental');
  assert.equal(classifyViewScale(1000000), 'regional');
  assert.equal(classifyViewScale(200000), 'metro');
  assert.equal(classifyViewScale(50000), 'city');
  assert.equal(classifyViewScale(5000), 'local');
  assert.equal(classifyViewScale(Number.NaN), 'unknown');
  assert.equal(classifyViewScale(undefined), 'unknown');
});

test('formatViewBrief renders the explain-this-view brief', () => {
  const context = resolveWorldContext(SCENE, { now: NOW });
  const brief = formatViewBrief(context);
  assert.ok(brief.startsWith('CURRENT VIEW'));
  assert.ok(brief.includes('Tokyo Tower — Yokohama — Kanagawa — Japan'));
  assert.ok(brief.includes('(local view · camera 8,500 m)'));
  assert.ok(brief.includes('LANDMARKS'));
  assert.ok(brief.includes('Tokyo Tower (3.2 km)'));
  assert.ok(brief.includes('Sensō-ji (7.9 km)'));
  assert.ok(brief.includes('LIVE'));
  assert.ok(brief.includes('Satellites: 1200'));
  assert.ok(brief.includes('1,240 total across 3 layers'));
  assert.ok(brief.includes('[compare] [timeline] [story] [follow]'));
  // Sections appear in the canonical order.
  assert.ok(brief.indexOf('CURRENT VIEW') < brief.indexOf('LANDMARKS'));
  assert.ok(brief.indexOf('LANDMARKS') < brief.indexOf('LIVE'));
  assert.ok(brief.indexOf('LIVE') < brief.indexOf('EXPLORE'));
});

test('formatViewBrief omits empty sections and handles invalid input', () => {
  const brief = formatViewBrief(resolveWorldContext(null, { now: NOW }));
  assert.equal(brief, 'CURRENT VIEW\nEarth (unknown view)');
  assert.equal(formatViewBrief(null), '');
  assert.equal(formatViewBrief({ ok: false }), '');
});
