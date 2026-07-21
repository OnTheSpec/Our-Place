# Our Place

**A warm place to stay close.**

A warm, voice-first family check-in for older adults. The contest MVP demonstrates one complete loop: Evelyn talks for two minutes, the app extracts a useful family update and a memory, and her family sees what matters between calls.

Our Place does not replace family contact. It makes family contact more likely.

## Run it

Requirements: Node.js 22.13+.

```bash
npm install
npm run dev
```

The prototype works with deterministic synthetic demo data and no credentials. For live extraction, set `OPENAI_API_KEY`; `OPENAI_MODEL` optionally overrides the default `gpt-5.6-sol` model. Never expose the API key in browser code.

## Judge-ready demo

No account, microphone permission, API key, database, or private data is required for the golden path.

1. Open the home page and choose **Talk about my day**.
2. Tap the voice circle once per prompt. The fixture fills three synthetic answers after a short listening animation.
3. Confirm each reflection, approve the family update, and open the family side of the demo.
4. Try a family response, claim a practical request, and open the story archive.

The fixture portrays Evelyn, a fictional older adult. Every person, quote, memory, request, and relationship in the demo is synthetic.

## What is implemented

- Responsive, keyboard-friendly older-adult home and three-question check-in
- “Circle of Changing Light” overhead family-embrace identity and an accessible, Klee-inspired relational color system
- Simulated voice capture plus a text fallback
- Family dashboard with summary, requests, cautious tone signal, and check-in rhythm
- Reciprocal family reactions, short voice replies, and named help commitments
- Gentle daily check-in preference and personal family invitation onboarding
- Family memory archive with prompts for the next call
- Server-only structured extraction endpoint with input validation, schema-constrained output, urgent-language fast path, and credential-free demo fallback
- D1/Drizzle data model for households, people, check-ins, and extracted items

The UI is intentionally seeded for a reliable 90-second contest demo. Durable writes, real speech capture, real invitation delivery, and notification delivery are the next implementation slice, not hidden mock claims.

## How GPT-5.6 is used

The server-only extraction route sends the three check-in answers to the OpenAI Responses API with `gpt-5.6-sol`. A strict JSON Schema asks GPT-5.6 to produce:

- a concise, fact-grounded family summary;
- a tentative reflection that stays close to the speaker's words;
- life updates, memories, practical requests, and possible concerns;
- a supporting source quote for every extracted item; and
- a cautious `routine`, `concern`, or `urgent` safety level.

Obvious urgent language takes a deterministic path before the model call. The model is instructed never to diagnose, invent a feeling, or claim that help was sent. When no API key is configured, the same UI contract is exercised with deterministic fixture output.

## How Codex accelerated the build

This project was planned, scaffolded, implemented, reviewed, and iterated with Codex. Codex helped turn a broad mission—help older adults and families stay connected—into one contest-sized interaction, then accelerated:

- the Next.js/Vinext application architecture and D1/Drizzle schema;
- the accessible one-button elder flow and reciprocal family dashboard;
- the strict GPT-5.6 extraction contract and urgent-language boundary;
- the warm visual system, responsive behavior, and original family-embrace identity;
- build, lint, server-render, and safety-boundary tests; and
- the release checklist, demo narrative, and submission documentation.

Key human decisions remained explicit: the app must connect people rather than replace them, elders approve what is shared, concerns stay quote-grounded, and the contest demo must work without credentials.

## Safety and privacy

- Synthetic demo data only; no real health or family information is included.
- Nothing is presented to the family until the elder approves the update.
- The app does not diagnose, score cognition, or passively monitor behavior.
- API credentials remain server-side.
- Raw audio is not stored in this MVP; voice capture is simulated for the deterministic demo.
- The urgent-language path tells the user to contact a trusted person or local emergency services and never claims assistance was dispatched.

## Key documents

- [Architecture and implementation plan](docs/ARCHITECTURE.md)
- [Codex execution playbook](docs/CODEX_PLAYBOOK.md)
- [Build Week submission packet and video script](docs/SUBMISSION.md)

## Verification

```bash
npm run build
npm run lint
```
