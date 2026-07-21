# Our Place — architecture and implementation plan

## Product contract

**Promise:** a two-minute conversation that makes the next family contact more likely.

**Relational stance:** the experience is inspired by person-centered principles associated with Carl Rogers: empathy, genuineness, unconditional positive regard, and trust in the person’s capacity to name their own experience. It is not therapy and does not present the AI as a counselor. The UI listens, offers tentative reflections, invites correction, and protects the speaker’s autonomy.

**Visual stance:** the family is always represented as one intact circle. The primary mark is a true overhead view of four generations holding one another in an unbroken embrace. The palette uses candlelight cream, apricot, muted rose, terracotta clay, cocoa, and evergreen: warmth and affection with deep-enough anchors for accessible contrast. The mark contains no text, medical symbolism, or detached figures.

**Primary user:** an older adult living independently. **Secondary user:** one trusted family member. **Golden path:** start → answer three prompts → review/approve → family sees a short summary, actionable requests, and a preserved memory.

### In scope for July 21

One household, one older adult, one family viewer; daily check-in; speech with text fallback; structured extraction; explicit sharing consent; family dashboard; named commitments; family reactions and short replies; gentle reminder preference; memory conversation prompts; urgent-language interruption; seeded demo mode.

### Explicitly out of scope

Diagnosis, passive surveillance, medication management, fall detection, emergency dispatch, autonomous outreach, therapy, open-ended AI companionship, multiple care organizations, smart devices, and native mobile apps.

## System shape

```text
Browser (older-adult and family modes)
  ├─ speech capture / typed fallback
  ├─ accessible three-prompt state machine
  └─ review, consent, dashboard, archive
             │ HTTPS + session + CSRF protection
Cloudflare Worker / vinext routes
  ├─ authorization and household scoping
  ├─ urgent phrase fast path
  ├─ OpenAI structured extraction adapter
  ├─ persistence service
  └─ notification outbox
       ├─ D1: people, households, check-ins, extracted items
       ├─ R2 later: opt-in audio only (off by default)
       └─ OpenAI Responses API (server-side key only)
```

## Technology choices

| Layer | MVP choice | Why |
|---|---|---|
| Web | React 19 + TypeScript + vinext | Fast iteration, server routes, Cloudflare-compatible output |
| Styling | Plain CSS design tokens | Small bundle and full control over large accessible targets |
| State | Local check-in state; server state on D1 | No state framework needed for four screens |
| API | Route handlers with JSON contracts | Keeps the key and safety logic off the device |
| Data | Cloudflare D1 + Drizzle | Small relational dataset, migrations, ownership queries |
| Audio | Browser MediaRecorder; text fallback | Lowest-friction web MVP; progressive enhancement |
| AI | OpenAI Responses API + strict JSON schema | One call converts a transcript into auditable categories |
| Auth | Family: hosted passkey/magic-link provider; elder: paired device PIN | Avoid passwords for older adults; household authorization remains server-side |
| Deploy | Cloudflare/Sites | Edge-hosted app and D1 binding in one contest deployment |

The scaffold uses the current recommended OpenAI model as a configurable default. Before launch, pin a dated model snapshot after evals; do not let a model alias change behavior untested.

## Data and contracts

The Drizzle schema lives in `db/schema.ts`. Every user-owned query must include `household_id`; IDs are random UUIDs. Store the approved transcript and derived items, not raw check-in audio by default. `source_quote` makes every extracted request or concern traceable. Replies and named commitments close the loop: a reply belongs to one approved check-in, while a commitment belongs to one extracted request and one accountable family member. Voice replies use short-lived R2 objects only after consent; the MVP interface simulates this interaction until R2 is enabled.

Extraction returns:

```json
{
  "summary": "Warm factual update under 70 words",
  "reflection": "Tentative, correctable understanding in the speaker's language",
  "tone": "Brief, non-clinical description",
  "safety_level": "routine | concern | urgent",
  "items": [{
    "kind": "life_update | memory | request | possible_concern",
    "title": "Short label",
    "detail": "Fact-grounded detail",
    "source_quote": "Exact supporting words"
  }]
}
```

No item without transcript evidence is shown. Reflections are phrased tentatively and always paired with an easy “That’s right / Let me say it differently” choice. The user reviews the final family update before `consented_at` is set. Edits preserve both original extraction and approved display text in production.

### Person-centered question set

1. “How is today feeling for you?”
2. “What has stayed with you today?”
3. “What would you like your family to understand or help with?”

Questions remain open, non-evaluative, and optional. The family side follows a simple rhythm: receive the person’s own words, reflect what was heard, then respond authentically. It never supplies clinical interpretations or scripts that pretend to know more than the speaker said.

## Voice and AI flow

1. Browser requests microphone permission only after a clear tap; denial reveals typing immediately.
2. Capture one answer at a time, with visible listening/stopped states and a replay/delete control.
3. Transcribe server-side. Do not retain audio unless the user explicitly opts into a family voice keepsake.
4. Run deterministic urgent-language rules before the model call. An urgent match stops the normal flow and gives one-tap human and emergency options; the app never claims it contacted help unless delivery is confirmed.
5. Send the transcript to the extraction route with a strict schema and a narrow, non-diagnostic prompt.
6. Validate output, require source quotes, store the draft, and show the older adult exactly what will be shared.
7. On approval, persist and enqueue one concise family notification. Notification copy contains no sensitive detail on a lock screen.

## Safety policy

- `routine`: normal update; share after approval.
- `concern`: cautiously surface the exact statement (for example, not eating because of fatigue) and suggest direct contact. Never label a condition.
- `urgent`: interrupt with “You may need immediate help.” Offer a trusted person and local emergency services. Keep the user on screen and make the call action explicit.
- Model output alone never triggers emergency services, diagnosis, or a welfare check.
- A visible “Call family” escape hatch exists throughout the elder flow in production.
- Red-team for hallucinated requests, negation (“I did not fall”), quoted stories, joking, ambiguous pronouns, coercive family access, and prompt injection inside transcripts.

## Privacy and security

- Explicit consent before sharing; elder can delete a check-in or revoke a family member.
- TLS in transit; managed encryption at rest; secrets only in hosted secret storage.
- Short-lived secure, HttpOnly, SameSite cookies; rate limits per account/device/IP; CSRF on mutations.
- Object-level authorization on every read/write; invitation tokens single-use and hashed.
- Minimize retention: raw audio deleted after transcription; transcript deletable; derived memory follows source deletion policy.
- No training claims beyond the provider's current contractual controls; document subprocessors and retention settings before real-user launch.
- Audit membership, export, deletion, and emergency-screen actions without logging transcript content.

## Accessibility and UX acceptance

- Base elder text 20px, major actions 56px+, high contrast, large spacing, plain language.
- Never rely on color alone. Visible focus, keyboard completion, screen-reader labels, reduced-motion support.
- Every recording state is announced with an ARIA live region in production; captions/transcript always available.
- Destructive actions require clear confirmation and recovery where feasible.
- Test at 200% zoom, 320px width, VoiceOver, keyboard only, low bandwidth, mic denied, and interrupted recording.

## Observability and reliability

Use structured logs with request ID, household-safe pseudonymous ID, route, latency, model name, schema-valid flag, safety tier, and error code—never transcript text. Track check-in completion, extraction success, false/unsupported item rate, share approval, family open, request completion, and memory saves. Alert on elevated API failures, notification backlog, auth failures, and urgent-flow delivery problems. Add OpenTelemetry/Sentry after the vertical slice; sample successful traces and retain all errors after redaction.

Graceful degradation: text when mic fails, draft retry when AI fails, dashboard remains readable when notifications fail, and demo fixture mode when credentials are absent.

## Test strategy

1. Unit: prompt state machine, input limits, urgent phrase/negation rules, schema validation, household scoping.
2. Contract: recorded extraction fixtures and provider failure/timeout cases.
3. Integration: create check-in → approve → dashboard → complete request → memory deletion.
4. Accessibility: automated axe plus manual keyboard, VoiceOver, zoom, motion, and contrast.
5. Safety eval set: at least 100 labeled transcripts; block release on any missed obvious emergency or fabricated request. Human review all concern/urgent errors.
6. Demo smoke: fresh browser, denied mic, no API key, slow network, and mobile width.

## Deployment plan

- Environments: local fixture, preview with synthetic data, production with separate D1 and secrets.
- CI: typecheck/build, lint, unit/contract tests, migration check, dependency scan.
- Generate migration, back up D1, deploy preview, run smoke/evals, then promote immutable commit.
- Feature flags: `DEMO_MODE`, `LIVE_EXTRACTION`, `NOTIFICATIONS_ENABLED`; kill switch live extraction independently.
- Never use real elder data in demo or preview.

## Implementation sequence

1. **Vertical demo (done in scaffold):** polished five-view UI, deterministic voice simulation, family output, archive, API contract.
2. **Data slice:** migrations, repository layer, seed command, household authorization tests.
3. **Real voice/extraction:** MediaRecorder, transcription, `/api/extract`, review/approval, retry states.
4. **Pairing/auth:** family magic link/passkey and elder paired-device PIN; authorization matrix tests.
5. **Delivery:** notification outbox and email/SMS provider; delivery receipts and privacy-safe copy.
6. **Hardening:** safety evals, accessibility audit, telemetry, deletion/export, threat model.

## Demo path (90 seconds)

1. Say: “My family loves my grandmother, but no one knows what happens between calls.”
2. Evelyn taps **Start my check-in** and answers the three prompts; use the simulated capture for reliability.
3. Show the approved summary: sunshine, tomatoes, one porch-swing memory, milk, flickering light.
4. Open **Family view** and check one practical request.
5. Open **Memories** and show the archive growing.
6. Close with: “Our Place does not replace a family call. It makes the next one more likely.”
