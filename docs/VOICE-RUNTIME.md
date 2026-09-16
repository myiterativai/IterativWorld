# Voice runtime architecture

Decision record for the voice layer. Status: **accepted, phased** — the seam
exists in code today; one runtime is registered.

## The decision

**IterativWorld owns the world intelligence; the voice provider is a
replaceable runtime behind `src/voice/voiceRuntime.js`.** Nothing above the
registry may name a vendor. The product is not "IterativWorld powered by
Gemini" or "powered by OpenAI" — it is IterativWorld with a provider-neutral
Voice Runtime interface, and whichever runtime is registered first is an
implementation detail.

```text
user voice / UI
      │
VoiceRuntime registry (src/voice/voiceRuntime.js)
      │  resolve(id) → backend
      ├── openai-realtime   (registered today — the inherited production path)
      └── gemini-live       (planned second runtime, comparative testing)
      │
controller / turns / input / radio owners (docs/VOICE-OWNERSHIP.md)
      │
action schemas (src/voice/actionSchemas.js — 29 tools, the capability contract)
      │
World Context Engine + entity graph + live layers (the intelligence)
```

## What is deliberately NOT neutral

The **capability contract** is IterativWorld's, not the vendor's: the 29 tools
in `src/voice/actionSchemas.js` and their execution in `gevActions.js`. A new
runtime adapter translates this contract into its vendor's function-calling
shape; it never re-authors tools per vendor. Tool descriptions are written once
(`server/providers/openai/toolDescriptions.js` is the OpenAI *wording*, not the
capability source of truth) and re-derivation discipline stays in the pinned
tests.

Visual grounding follows the same rule: the structured **View Snapshot** —
camera, identity chain, landmarks, live rollup, provenance, from the World
Context Engine — is the primary context. A raw viewport frame is sent only when
visual reasoning is genuinely required and structured identity has not already
answered the question (`hasStructuredViewIdentity` gates every send). This is
cheaper, more deterministic, and the same contract for every runtime.

## Why a second runtime is planned

Gemini Live's realtime multimodal input and **asynchronous function calling**
(model keeps talking while tools execute; results can interrupt, wait for idle,
or stay silent) map well onto "look at what I'm looking at" interactions where
several world tools run while the conversation stays fluid. OpenAI Realtime
stays registered regardless — the point of the seam is comparative testing on
the real workload (latency, interruption handling, tool reliability, cost),
not vendor replacement.

**Open verification task before any `gemini-live` registration:** confirm the
current stable Live API model id, its WebRTC/WS transport requirements, and the
async tool-call semantics against Google's docs at adapter-build time. The
model id quoted in the original recommendation (`gemini-3.8-live`) was **not
verifiable** from the linked documentation and must not be hardcoded from the
proposal alone.

ElevenLabs (conversational audio quality, client-side tools) and Vapi
(orchestration infrastructure) are held at **benchmark later**: neither is an
architecture decision today. Vapi would add an orchestration layer on top of
the Context Orchestrator role the product already owns — that is complexity to
earn, not to assume.

## World Action API (direction, not current state)

The capability contract may eventually collapse toward a small verb surface —
`inspect / navigate / search / compare / filter / explain / visualize / story /
remember` — with the Context Orchestrator composing tools behind those verbs.
That is a **direction for the world-model query contract**
(`docs/ROADMAP.md` Phase 4), not a refactor of the working 29-tool surface:
`voice-tool-smith`'s rule applies in both directions — the tool count should
grow slower than features, and a working contract is not redesigned while it is
the only one wired end to end.

## Adoption path

1. **Done** — registry seam + controller wiring (`voiceRuntime.js`, tests).
2. **Next, when voice work resumes** — `gemini-live` adapter: translate the 29
   tool schemas, port session config, pass the recorded-audio QA harnesses
   (`scripts/qa-voice-wav.mjs` both modes) against both runtimes, then register
   it. Register only a working adapter; the registry must never carry a
   placeholder.
3. **When comparative data exists** — pick the default runtime on evidence
   (latency, interruption, tool reliability, voice quality, per-session cost
   across `perf-cost-guard`'s four budget lines), record the decision here.
4. **Only if testing demands it** — split reasoning and audio rendering across
   runtimes (e.g. Gemini reasoning + ElevenLabs voice). Extra moving parts need
   evidence first.

## Fleet ownership

- `voice-tool-smith` owns the capability contract: tools declared once,
  translated per-runtime, never re-authored per vendor; enums stay in sync with
  `$layer-steward` manifests.
- `world-model-architect` owns the World Action API verb surface if/when it is
  designed.
- `perf-cost-guard` owns the four metered cost lines across runtimes
  (tiles, Realtime voice minutes, network, tokens) — comparative runtime
  testing produces evidence for exactly these lines.
- `boundary-warden` placement: runtime adapters live in `src/voice/` beside
  `realtimeBackend.js`; they are protocol adapters, not application modules.
