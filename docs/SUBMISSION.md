# Our Place — OpenAI Build Week submission packet

## Submission fields

- **Project title:** Our Place
- **Tagline:** A warm place to stay close.
- **Category:** Apps for Your Life
- **Public demo:** `https://still-here-family-checkin.georgej.chatgpt.site/` (currently requires ChatGPT sign-in; judges can always use the credential-free repository demo)
- **Repository URL:** `https://github.com/OnTheSpec/Our-Place`
- **Public YouTube demo:** `[ADD PUBLIC YOUTUBE URL]`
- **Codex /feedback Session ID:** `019f73ff-7acf-78d3-9309-b3b609accd64`

## Short description

Our Place is a warm, voice-first family check-in for older adults. In two minutes, an older adult can share their day, confirm that the app understood them, approve a concise family update, surface practical requests, and preserve a meaningful story. Family members are invited to listen first, respond in their own voice, and take responsibility for concrete help.

## Full project description

Families love one another, but the texture of an older relative's ordinary days can disappear between phone calls. Our Place makes those small moments easier to share without asking an older adult to learn a complicated dashboard or treat an AI as a substitute for human companionship.

The elder experience begins with one large action: **Talk about my day**. Three gentle prompts invite the person to describe how today felt, what stayed with them, and anything they want their family to understand or help with. Before anything is shared, Our Place reflects the person's words back and asks whether it stayed close to what they meant.

GPT-5.6 then turns the approved check-in into a short, fact-grounded family update. It separates ordinary life updates, memories, practical requests, and possible concerns, with a supporting quote for every extracted item. The family side encourages a reciprocal loop: receive what was said, reflect what was heard, respond personally, and claim concrete help such as picking up milk or checking a flickering light. A memory archive turns passing stories into open invitations for the next real conversation.

Our Place is intentionally not medical software. It does not diagnose, assess cognitive decline, or claim to monitor an older adult's wellbeing. Obvious urgent language follows a deterministic safety path that recommends direct human or emergency contact without pretending that the app has dispatched help.

The contest build is a polished, credential-free fixture demo using entirely synthetic data. It demonstrates the complete product loop reliably while also including a production seam: a server-only OpenAI Responses API endpoint using `gpt-5.6-sol`, strict structured output, source-quote grounding, and an urgent-language fast path.

## How it was built

- Next.js 16 and React 19 for the responsive product experience
- Vinext and Cloudflare tooling for the runtime and deployment path
- D1 and Drizzle schemas for households, people, check-ins, and extracted items
- OpenAI Responses API with `gpt-5.6-sol`
- Strict JSON Schema output for summaries, reflections, item categories, quotes, and safety level
- Deterministic synthetic fixtures for judge-friendly testing without credentials
- Accessible interaction patterns: large targets, high contrast, visible keyboard focus, generous spacing, reduced-motion support, and a typed fallback

## How GPT-5.6 was used

GPT-5.6 performs the narrow task where language understanding creates real product value: transforming three free-form answers into a warm but factual family update. The prompt forbids diagnosis and unsupported inference. Every memory, request, or possible concern must include a source quote, and the output must match a strict schema. The API key remains server-side, and the interface keeps working with deterministic fixtures when credentials are absent.

## How Codex was used

Codex was the primary development partner for the project. It helped reduce the original broad mission into a contest-sized golden path; designed the architecture and data model; implemented the elder, family, invitation, and archive experiences; built the GPT-5.6 structured-extraction route; reviewed safety and privacy boundaries; generated and integrated the visual identity; and repeatedly ran build, lint, and server-render verification while the UI was refined.

The most important decisions were made deliberately with Codex rather than hidden behind generation: keep one household and one repeated moment, require elder approval before sharing, keep every derived item traceable to a quote, never position AI companionship as a replacement for family, and preserve a credential-free demo path.

## Challenges

The hardest design problem was making AI useful without letting it become an interpreter of a person's inner life. Our Place uses tentative reflection, source-quote grounding, explicit correction, and user approval to preserve the speaker's authorship. The second challenge was creating an elder-friendly interface that feels emotionally warm without becoming visually busy or patronizing.

## Accomplishments

- A complete two-sided emotional loop rather than a one-way monitoring dashboard
- A one-button elder experience that can be demonstrated without accounts or permissions
- User correction and approval before family sharing
- Quote-grounded extraction with a deterministic urgent-language boundary
- Reciprocal family responses, named help commitments, and an invitation-driven memory archive
- A warm, original identity and accessible responsive interface

## What we learned

The highest-value use of AI here is not companionship or diagnosis. It is connective tissue: helping one person's unstructured words arrive as something another person can understand and act on, while keeping the original speaker in control.

## What's next

The next production slice is real speech capture and transcription, durable encrypted check-ins, household-scoped authentication, expiring family invitations, deletion controls, delivery observability, and a synthetic safety evaluation suite. Medical integrations, passive monitoring, AI avatars, and generalized chat remain deliberately out of scope.

## Under-three-minute demo script

### 0:00–0:18 — The problem

> My family loves our older relatives, but no one knows what happens between phone calls. Our Place is a warm, voice-first check-in that helps an older adult feel heard and gives family one clear reason to come closer.

Show the Our Place home screen and the single **Talk about my day** action.

### 0:18–0:58 — Elder check-in

> Evelyn taps one button and answers three gentle questions in her own words. This contest demo uses synthetic fixture answers so judges can run it without an account, microphone, network dependency, or API key.

Complete the three prompts. Pause briefly on the reflection and correction controls.

> The app reflects each answer back tentatively. Evelyn can correct it before anything moves forward.

### 0:58–1:25 — Consent and extraction

Show the approved update and its milk and kitchen-light tags.

> Evelyn approves the exact family update. GPT-5.6's role is narrow and useful: the server-only Responses API turns free-form answers into a short factual summary, a memory, practical requests, and cautious possible concerns. Every extracted item requires a supporting quote, and obvious urgent language takes a deterministic safety path before the model call.

### 1:25–2:02 — Family response

Open the family dashboard, choose **I hear you**, send the demo voice reply, and claim one task.

> Sarah is invited to receive before she acts. She can reflect what she heard, respond in her own voice, and take responsibility for a concrete need. Our Place never claims to diagnose or replace professional or emergency care.

### 2:02–2:24 — Memory archive

Open **Stories** and pause on the porch-swing memory.

> A passing memory becomes an open invitation for the next real call. Evelyn remains the author and can remove a story at any time.

### 2:24–2:50 — Codex and close

Show the repository README and briefly reveal the extraction route or architecture document.

> Codex helped turn a broad mission into this focused interaction, then accelerated the architecture, accessible interface, database schema, GPT-5.6 structured-output contract, safety boundaries, tests, and release workflow. Our Place does not replace family contact. It makes family contact more likely.

End on the logo and tagline: **Our Place — A warm place to stay close.**

## Final pre-submit checklist

- [x] Working credential-free project
- [x] Apps for Your Life category selected
- [x] Project description prepared
- [x] README includes setup, synthetic sample data, demo steps, Codex use, and GPT-5.6 use
- [x] Build, lint, and server-render tests pass
- [ ] Repository is public with an appropriate license, or private and shared with both required judge addresses
- [ ] Public YouTube video is under three minutes and its audio mentions both Codex and GPT-5.6
- [x] `/feedback` Codex Session ID is recorded
- [ ] Devpost registration and eligibility are complete
- [ ] Submission fields are reviewed and final submission is confirmed before 5:00 PM PDT
