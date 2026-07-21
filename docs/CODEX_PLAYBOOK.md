# Codex execution playbook

Use this as the operating plan through the July 21 submission. One active milestone at a time; every loop ends with visible evidence, not a claim.

## North-star goal

Ship a reliable 90-second demo in which an older adult completes one accessible voice check-in and a family member receives a fact-grounded summary, two actionable needs, and one preserved memory. No medical claims and no hidden dependency on live services.

## The milestone loop

For every milestone:

1. **Orient:** read the product contract, inspect only relevant files, and state the smallest user-visible outcome.
2. **Implement:** build one vertical slice; keep fixture mode working.
3. **Verify:** run focused tests, build, and manually exercise success plus one failure path.
4. **Critique:** ask what could confuse an older adult, leak data, invent a fact, or break the demo.
5. **Tighten:** fix release blockers only; record non-blockers in the post-contest backlog.
6. **Checkpoint:** commit with the acceptance criteria in the message and capture a short demo clip.

## Milestones and acceptance criteria

### M0 — freeze the promise (30 minutes)

- One household, three prompts, four extraction kinds, one family viewer.
- Out-of-scope list is in the architecture doc.
- Seed story and exact demo script are frozen.

### M1 — polished deterministic demo

- Elder can complete the flow with no login, mic, network, or API key.
- All five views work at phone and desktop widths.
- Keyboard focus is visible; reduced motion works; no control is smaller than 44px.
- Family output contains only facts from the seeded answers.

### M2 — durable check-ins

- D1 migrations create households, people, check-ins, and extracted items.
- Every repository query is household scoped and covered by cross-household denial tests.
- Refresh preserves an approved check-in; delete removes or tombstones all dependent derived data.

### M3 — live AI extraction

- API key is server-only; request length, timeout, and rate limits are enforced.
- Output is strict-schema validated; every request/concern has a supporting quote.
- Provider errors return a retryable draft state; fixture mode still works.
- Safety eval fixture suite passes the release thresholds.

### M4 — real voice and consent

- Permission is requested only after a tap; denied mic reveals typing.
- Recording/listening/processing states are visible and announced.
- Audio is deleted after transcription by default.
- Nothing reaches the family view before the elder approves it.

### M5 — auth and delivery

- Family access uses a hosted identity flow; elder device pairing does not require a password.
- Server checks household membership on every route.
- Notification has no lock-screen-sensitive content and delivery failure is observable/retryable.

### M6 — contest release

- Fresh-device demo succeeds three consecutive times in under 90 seconds.
- Build, lint, tests, safety evals, and accessibility smoke pass.
- README setup works from a fresh clone; preview uses synthetic data only.
- Submission has description, repository, 90-second video, architecture image, privacy/safety note, and backup video.

## Phase prompts for Codex

### Orient

> Read `docs/ARCHITECTURE.md` and inspect the current milestone's relevant files. Do not implement yet. Return the smallest vertical slice, risks, files to touch, verification commands, and anything that would expand scope. Preserve fixture mode and unrelated work.

### Data layer

> Implement M2 only. Generate an additive D1 migration and a small repository layer for households, people, check-ins, and extracted items. Enforce household scoping server-side. Add cross-household authorization tests, seed synthetic Evelyn data, run tests and build, and report evidence. Do not add notifications or audio storage.

### OpenAI extraction

> Implement M3 against the extraction contract in `docs/ARCHITECTURE.md`. Keep the API key server-only; use strict structured output, request limits, timeout, retryable failures, source-quote validation, and deterministic fixture fallback. Add contract fixtures for each category, hallucination rejection, negation, prompt injection, and urgent language. Do not diagnose or initiate emergency action.

### Voice

> Implement M4 as progressive enhancement. Capture one answer at a time, support mic denial/interruption/re-recording and typed input, announce state changes accessibly, and delete transient audio after transcription. Add review-and-consent before sharing. Keep the deterministic demo switch.

### Auth/security

> Implement M5 using the chosen hosted auth path. Produce an authorization matrix first, then enforce it in every server handler. Add single-use pairing, revocation, rate limits, secure cookies, CSRF defenses, and audit events without transcript content. Prove a family member from household A cannot read household B.

### Accessibility review

> Audit the elder flow at 320px, 200% zoom, keyboard only, reduced motion, and screen reader semantics. Fix blockers in scope. Report each issue with severity and evidence; do not redesign the visual system unless an accessibility failure requires it.

### Safety/eval review

> Create a synthetic labeled eval set covering routine updates, memories, practical requests, not-eating/fatigue concerns, obvious emergencies, negation, jokes, old stories, quoted speech, and prompt injection. Measure unsupported-item rate and urgent recall. Do not tune on private user data. Block release on a fabricated request or missed obvious emergency.

### Release

> Act as release captain for M6. Work from the checklist, fix only contest blockers, run the complete verification suite, rehearse the exact 90-second demo three times, and produce the submission packet. Keep a credential-free fallback and do not deploy real personal data.

## Fast-shipping checklist

### Product

- [ ] The first screen explains the value without mentioning AI.
- [ ] The primary action is unmistakable and usable with one hand.
- [ ] Every output is traceable to what Evelyn said.
- [ ] Approval happens before family sharing.
- [ ] Demo completes in under 90 seconds offline/fixture mode.

### Safety and privacy

- [ ] Urgent flow is deterministic, direct, and never claims help was sent.
- [ ] No diagnosis, score, cognitive-decline claim, or passive surveillance.
- [ ] Raw audio off by default; deletion/revocation tested.
- [ ] Logs and notifications contain no transcript or sensitive detail.
- [ ] Threat model and household-isolation test reviewed.

### Quality

- [ ] Build, lint, tests, migrations, and dependency scan pass.
- [ ] Mobile, zoom, keyboard, VoiceOver, mic-denied, slow-network tested.
- [ ] Empty, loading, retry, offline, and provider-failure states are legible.
- [ ] Three clean demo rehearsals; backup recording available.

### Submission

- [ ] Project description leads with the human story and tight scope.
- [ ] Repository setup is reproducible and contains no secret or real personal data.
- [ ] Video shows one story, not a feature tour.
- [ ] Architecture, AI value, safety boundary, and privacy posture are explicit.
- [ ] Final sentence: “It does not replace family contact. It makes family contact more likely.”

## Stop rules

Defer anything that does not improve the golden path, safety, accessibility, or demo reliability before July 21. In particular: native apps, medical integrations, analytics dashboards, multiple elder profiles, smart-home devices, AI avatars, and generalized chat. If a live service becomes unreliable, ship the fixture-backed demo and explain the production seam honestly.
