/**
 * World Context Engine — v0.
 *
 * Pure transformation from a scene/view snapshot into the structured,
 * provenance-tagged world context that powers "explain this view".
 *
 * The engine is deliberately dependency-free: no Cesium, no window, no Node
 * builtins. Callers hand it the same scene shape `getSceneContext` already
 * produces ({@link src/voice/gevActions.js}) and receive a context object
 * that downstream experiences — voice narration, HUD summaries, dossiers,
 * comparisons, stories — can consume without re-deriving meaning.
 *
 * Concept reference: docs/PRODUCT-CONCEPT.md (World Context Engine, the
 * "Explain this view" interaction, and the provenance layer).
 */

export const WORLD_CONTEXT_ENGINE_VERSION = '0.1.0';

/** View-scale thresholds mirror `classifyViewScale` in gevActions.js. */
export function classifyViewScale(cameraHeightM) {
  if (!Number.isFinite(cameraHeightM)) return 'unknown';
  if (cameraHeightM > 12000000) return 'global';
  if (cameraHeightM > 3000000) return 'continental';
  if (cameraHeightM > 750000) return 'regional';
  if (cameraHeightM > 100000) return 'metro';
  if (cameraHeightM > 10000) return 'city';
  return 'local';
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

function placeName(place) {
  if (place == null) return null;
  if (typeof place === 'string') return nonEmpty(place);
  return nonEmpty(place.name) || nonEmpty(place.displayName);
}

function dedupeChain(items) {
  const seen = new Set();
  const chain = [];
  for (const item of items) {
    if (item == null) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    chain.push(item);
  }
  return chain;
}

function liveRollup(layers) {
  const enabled = Array.isArray(layers)
    ? layers.filter((layer) => layer && layer.enabled !== false)
    : [];
  const totalEntities = enabled.reduce(
    (total, layer) => total + (Number.isFinite(layer.count) ? layer.count : 0),
    0,
  );
  const topLayers = enabled
    .filter((layer) => Number.isFinite(layer.count) && layer.count > 0)
    .sort(
      (a, b) => b.count - a.count || String(a.id).localeCompare(String(b.id)),
    )
    .slice(0, 3)
    .map((layer) => ({
      id: layer.id,
      name: layer.name,
      count: layer.count,
    }));
  return { layerCount: enabled.length, totalEntities, topLayers };
}

function suggestedActionsFor({ identity, landmarks, live }) {
  const actions = [];
  if (identity.country) {
    actions.push({ action: 'compare', reason: 'country in view' });
  }
  if (identity.country || identity.locality) {
    actions.push({ action: 'timeline', reason: 'place with history in view' });
  }
  if (landmarks.length > 0 || identity.locality) {
    actions.push({
      action: 'story',
      reason: 'narratable place or landmarks in view',
    });
  }
  if (live.totalEntities > 0) {
    actions.push({ action: 'follow', reason: 'live entities in view' });
  }
  return actions;
}

/**
 * Resolve a scene snapshot into structured world context.
 *
 * @param {object|null} scene Scene shape from `getSceneContext`:
 *   `{ camera: {latitude, longitude, heightM}, basemap: {viewScale, place,
 *   nearbyPlaces, knownLandmarks, source, ...}, enabledLayers, style }`.
 *   Every part is optional; the engine degrades gracefully.
 * @param {{ now?: Date }} [options] Injectable clock for deterministic tests.
 * @returns {object} World context with identity chain, landmarks, live
 *   rollup, suggested actions, and per-field provenance.
 */
export function resolveWorldContext(scene, options = {}) {
  const asOf =
    options.now instanceof Date && !Number.isNaN(options.now.getTime())
      ? options.now.toISOString()
      : new Date().toISOString();

  const camera =
    scene?.camera &&
    Number.isFinite(Number(scene.camera.latitude)) &&
    Number.isFinite(Number(scene.camera.longitude))
      ? {
          latitude: Number(scene.camera.latitude),
          longitude: Number(scene.camera.longitude),
          heightM: Number.isFinite(Number(scene.camera.heightM))
            ? Math.round(scene.camera.heightM)
            : null,
        }
      : null;

  const basemap = scene?.basemap || null;
  const viewScale =
    nonEmpty(basemap?.viewScale) ||
    classifyViewScale(camera?.heightM ?? Number.NaN);

  const place = basemap?.place || null;
  const placeCountry = nonEmpty(place?.country);
  const placeRegion = nonEmpty(place?.region);
  const placeLocality = nonEmpty(place?.locality) || nonEmpty(place?.city);
  const nearbyPlaces = Array.isArray(basemap?.nearbyPlaces)
    ? basemap.nearbyPlaces
    : [];
  const knownLandmarks = Array.isArray(basemap?.knownLandmarks)
    ? basemap.knownLandmarks
    : [];

  const nearestNearbyPlace =
    nearbyPlaces.map(placeName).find((name) => name != null) || null;
  const locality = placeLocality || nearestNearbyPlace || null;
  const region = placeRegion;
  const country = placeCountry;
  const landmark =
    knownLandmarks.length > 0
      ? nonEmpty(knownLandmarks[0]?.name) || placeName(knownLandmarks[0])
      : null;

  const chain = dedupeChain([landmark, locality, region, country]);
  const landmarks = knownLandmarks
    .slice(0, 3)
    .map((entry) => ({
      name: nonEmpty(entry?.name) || placeName(entry),
      city: nonEmpty(entry?.city) || null,
      distanceKm: Number.isFinite(Number(entry?.distanceKm))
        ? Number(entry.distanceKm)
        : null,
    }))
    .filter((entry) => entry.name != null);

  const live = liveRollup(scene?.enabledLayers);
  const identity = {
    chain,
    precision: viewScale,
    landmark,
    locality,
    region,
    country,
  };
  const suggestedActions = suggestedActionsFor({ identity, landmarks, live });

  const provenance = {
    asOf,
    place: {
      source: nonEmpty(basemap?.source) || 'unresolved',
      note: 'Place identity derives from the basemap reverse-geocode and nearby-place lookups available at capture time.',
    },
    landmarks: {
      source: nonEmpty(basemap?.source) || 'unresolved',
      note: 'Landmarks come from the bundled city POI set near the view target.',
    },
    live: {
      sources: (Array.isArray(scene?.enabledLayers) ? scene.enabledLayers : [])
        .filter((layer) => layer && layer.enabled !== false)
        .map((layer) => ({ id: layer.id, source: layer.source || 'unknown' })),
      note: 'Entity counts are the live layers currently enabled, each with its own upstream source and refresh cadence.',
    },
    engine: {
      version: WORLD_CONTEXT_ENGINE_VERSION,
      note: 'Derived fields (identity chain, rollup, suggested actions) are computed locally from the supplied scene.',
    },
  };

  return {
    ok: true,
    engine: WORLD_CONTEXT_ENGINE_VERSION,
    asOf,
    view: { scale: viewScale, camera },
    identity,
    landmarks,
    live,
    temporal: {
      asOf,
      note: 'v0 resolves the present view only; the temporal world model (borders, events, time travel) lands in Phase 3.',
    },
    suggestedActions,
    provenance,
  };
}

/**
 * Format the world context as the "Explain this view" brief — the
 * deterministic, model-independent summary the AI layer narrates from and
 * the UI can render directly.
 *
 * @param {object} context Result of `resolveWorldContext`.
 * @returns {string} Multi-section plain-text brief.
 */
export function formatViewBrief(context) {
  if (!context || context.ok !== true) return '';
  const lines = [];
  const scale = context.view?.scale || 'unknown';

  lines.push('CURRENT VIEW');
  const headline =
    context.identity.chain.length > 0
      ? context.identity.chain.join(' — ')
      : 'Earth';
  const altitude = Number.isFinite(context.view?.camera?.heightM)
    ? ` · camera ${context.view.camera.heightM.toLocaleString('en-US')} m`
    : '';
  lines.push(`${headline} (${scale} view${altitude})`);
  lines.push('');

  if (context.landmarks.length > 0) {
    lines.push('LANDMARKS');
    lines.push(
      context.landmarks
        .map((entry) =>
          entry.distanceKm != null
            ? `${entry.name} (${entry.distanceKm} km)`
            : entry.name,
        )
        .join(' · '),
    );
    lines.push('');
  }

  if (context.live.layerCount > 0) {
    lines.push('LIVE');
    const parts =
      context.live.topLayers.length > 0
        ? context.live.topLayers
            .map((layer) => `${layer.name || layer.id}: ${layer.count}`)
            .join(' · ')
        : 'no entities currently reported';
    lines.push(
      `${parts} · ${context.live.totalEntities.toLocaleString('en-US')} total across ${context.live.layerCount} layers`,
    );
    lines.push('');
  }

  if (context.suggestedActions.length > 0) {
    lines.push('EXPLORE');
    lines.push(
      context.suggestedActions.map((entry) => `[${entry.action}]`).join(' '),
    );
  }

  return lines.join('\n').trimEnd();
}
