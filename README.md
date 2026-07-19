# Still Here

A warm, voice-first family check-in for older adults. The contest MVP demonstrates one complete loop: Evelyn talks for two minutes, the app extracts a useful family update and a memory, and her family sees what matters between calls.

## Run it

Requirements: Node.js 22.13+.

```bash
npm install
npm run dev
```

The prototype works with deterministic demo data and no credentials. For live extraction, set `OPENAI_API_KEY`; `OPENAI_MODEL` optionally overrides the model. Never expose the API key in browser code.

## What is implemented

- Responsive, keyboard-friendly older-adult home and three-question check-in
- Simulated voice capture plus a text fallback
- Family dashboard with summary, requests, cautious tone signal, and check-in rhythm
- Reciprocal family reactions, short voice replies, and named help commitments
- Gentle daily check-in preference and personal family invitation onboarding
- Family memory archive with prompts for the next call
- Server-only structured extraction endpoint with input validation, schema-constrained output, urgent-language fast path, and credential-free demo fallback
- D1/Drizzle data model for households, people, check-ins, and extracted items

The UI is intentionally seeded for a reliable 90-second contest demo. Durable writes, real speech capture, real invitation delivery, and notification delivery are the next implementation slice, not hidden mock claims.

## Key documents

- [Architecture and implementation plan](docs/ARCHITECTURE.md)
- [Codex execution playbook](docs/CODEX_PLAYBOOK.md)

## Verification

```bash
npm run build
npm run lint
```
