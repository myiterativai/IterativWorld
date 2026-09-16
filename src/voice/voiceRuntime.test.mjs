import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VOICE_RUNTIME_IDS,
  DEFAULT_VOICE_RUNTIME,
  validateVoiceRuntimeId,
  createVoiceRuntimeRegistry,
} from './voiceRuntime.js';

const stubBackend = () => ({ protocol: 'stub' });
const otherBackend = () => ({ protocol: 'other' });

test('the registry routes to the requested runtime and reports fallbacks honestly', () => {
  const registry = createVoiceRuntimeRegistry({
    runtimes: [
      { id: 'openai-realtime', label: 'OpenAI Realtime', createBackend: stubBackend },
      { id: 'gemini-live', label: 'Gemini Live', createBackend: otherBackend },
    ],
  });
  assert.deepEqual(registry.list(), [
    { id: 'openai-realtime', label: 'OpenAI Realtime' },
    { id: 'gemini-live', label: 'Gemini Live' },
  ]);
  assert.equal(registry.has('gemini-live'), true);

  const direct = registry.resolve('gemini-live');
  assert.equal(direct.id, 'gemini-live');
  assert.equal(direct.known, true);
  assert.equal(direct.fallback, false);
  assert.equal(direct.createBackend().protocol, 'other');

  // An unregistered-but-known id resolves to the default and says so.
  const fallback = registry.resolve('gemini-live-not-registered');
  assert.equal(fallback.id, 'openai-realtime');
  assert.equal(fallback.known, false);
  assert.equal(fallback.fallback, true);
});

test('the default runtime must always be registered', () => {
  assert.throws(
    () => createVoiceRuntimeRegistry({ runtimes: [{ id: 'gemini-live', createBackend: stubBackend }] }),
    /default voice runtime/i,
  );
});

test('registry entries are validated at construction, not at call time', () => {
  assert.throws(() => createVoiceRuntimeRegistry({ runtimes: [{ id: '', createBackend: stubBackend }] }), /need an id/i);
  assert.throws(
    () => createVoiceRuntimeRegistry({ runtimes: [{ id: 'openai-realtime' }] }),
    /createBackend/i,
  );
  assert.throws(
    () =>
      createVoiceRuntimeRegistry({
        runtimes: [
          { id: 'openai-realtime', createBackend: stubBackend },
          { id: 'openai-realtime', createBackend: stubBackend },
        ],
      }),
    /duplicate/i,
  );
});

test('validateVoiceRuntimeId normalizes without silently coercing unknowns', () => {
  assert.deepEqual(validateVoiceRuntimeId('  openai-realtime  '), { known: true, id: 'openai-realtime' });
  assert.deepEqual(validateVoiceRuntimeId('gpt-omni'), { known: false, id: 'gpt-omni' });
  // Nonsense input resolves to the default id but is still reported unknown.
  const nonsense = validateVoiceRuntimeId(null);
  assert.equal(nonsense.id, DEFAULT_VOICE_RUNTIME);
  assert.equal(nonsense.known, false);
  assert.equal(nonsense.id, 'openai-realtime');
});

test('the shipped runtime surface is exactly one production runtime today', () => {
  // gemini-live is a *known* planned id but ships unregistered — see the
  // module doc. This pin fails when a runtime is added or removed, forcing
  // the decision record and the UI list to be updated with it.
  assert.deepEqual([...VOICE_RUNTIME_IDS], ['openai-realtime', 'gemini-live']);
  assert.equal(DEFAULT_VOICE_RUNTIME, 'openai-realtime');
});
