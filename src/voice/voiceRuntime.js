/**
 * Provider-neutral Voice Runtime registry.
 *
 * The voice architecture decision (docs/VOICE-RUNTIME.md): IterativWorld owns
 * the world intelligence — context engine, entity graph, action schemas,
 * provenance — and the realtime voice provider is a replaceable runtime behind
 * this seam. Nothing above this module may name a vendor.
 *
 * Today one runtime is registered: `openai-realtime` (the inherited,
 * production path). `gemini-live` is the planned second runtime for
 * comparative testing (async tool execution, native multimodal input); it is
 * deliberately NOT registered until its adapter exists — an empty registry
 * entry would be dead code, and a half-registered runtime would be a lie the
 * UI could select.
 */

/** Runtime ids this build knows how to reason about (not necessarily serve). */
export const VOICE_RUNTIME_IDS = Object.freeze([
  'openai-realtime',
  'gemini-live',
]);

/** The runtime used when nothing (or nonsense) was requested. */
export const DEFAULT_VOICE_RUNTIME = 'openai-realtime';

const isNonEmptyString = (value) =>
  typeof value === 'string' && value.trim().length > 0;

/**
 * Validate a runtime id without resolving it. Unknown ids are reported as
 * unknown rather than silently coerced, so callers can surface the typo
 * instead of quietly talking to the wrong provider.
 *
 * @param {unknown} id
 * @returns {{known: boolean, id: string}}
 */
export function validateVoiceRuntimeId(id) {
  const normalized = isNonEmptyString(id) ? id.trim() : '';
  return {
    known: VOICE_RUNTIME_IDS.includes(normalized),
    id: normalized || DEFAULT_VOICE_RUNTIME,
  };
}

/**
 * Create the voice runtime registry.
 *
 * @param {object} [options]
 * @param {Array<{id: string, createBackend: Function, label: string}>} [options.runtimes]
 *   Registrable runtimes. Each entry is `{id, label, createBackend}` where
 *   `createBackend()` returns the transport object the controller consumes
 *   (see `realtimeBackend.js` for the shape: `protocol`, `requestToken`,
 *   `connect`). The registry never inspects vendor internals — adapters
 *   translate, the registry only routes.
 * @returns {object} Frozen registry: `list()`, `resolve(id)`, `has(id)`.
 */
export function createVoiceRuntimeRegistry({ runtimes = [] } = {}) {
  const byId = new Map();
  for (const entry of runtimes) {
    if (!entry || !isNonEmptyString(entry.id)) {
      throw new TypeError('Voice runtime entries need an id');
    }
    if (typeof entry.createBackend !== 'function') {
      throw new TypeError(`Voice runtime ${entry.id} needs createBackend()`);
    }
    if (byId.has(entry.id)) {
      throw new TypeError(`Duplicate voice runtime id: ${entry.id}`);
    }
    byId.set(entry.id, {
      id: entry.id,
      label: isNonEmptyString(entry.label) ? entry.label : entry.id,
      createBackend: entry.createBackend,
    });
  }
  if (!byId.has(DEFAULT_VOICE_RUNTIME)) {
    throw new TypeError(
      `The default voice runtime (${DEFAULT_VOICE_RUNTIME}) must be registered`,
    );
  }
  return Object.freeze({
    list() {
      return [...byId.values()].map(({ id, label }) => ({ id, label }));
    },
    has(id) {
      return byId.has(validateVoiceRuntimeId(id).id);
    },
    /** Resolve a backend factory; unknown ids fall back to the default with `fallback: true`. */
    resolve(id) {
      const { known, id: normalized } = validateVoiceRuntimeId(id);
      const entry = byId.get(normalized) || byId.get(DEFAULT_VOICE_RUNTIME);
      return {
        id: entry.id,
        label: entry.label,
        createBackend: entry.createBackend,
        requested: normalized,
        known,
        fallback: entry.id !== normalized,
      };
    },
  });
}
