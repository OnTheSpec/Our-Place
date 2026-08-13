# Our Place product boundary

## User promise

Our Place gives an older adult one calm, voice-first way to share their day and helps family respond with care. The older adult remains the author: reflections stay close to their words, nothing is shared until they approve it, and practical help remains traceable to what they actually said.

## Primary loop

1. The older adult begins one large check-in and answers three gentle prompts by voice or text.
2. Our Place reflects the answers without diagnosis or unsupported interpretation; the person corrects or approves what was understood.
3. The person approves a concise family update before sharing.
4. Family members listen, reply, and may offer help with a practical request that includes the speaker's source quote and a named commitment.
5. A meaningful memory can appear in Stories from the current approved extraction and become an open invitation for the next conversation.

The family-side role switch in the current interface is a clearly labeled deterministic demo affordance. It is not a promise that production users can impersonate another family member. The family navigation keeps the focused **Today** and **Stories** destinations.

## What belongs here

- One accessible older-adult check-in with three non-judgmental prompts
- Voice-first capture with a typed fallback and deterministic fixture behavior
- Tentative reflection, correction, explicit approval, and safety language
- A factual family update grounded in the older adult's words
- Family replies and one small, source-quoted practical-help commitment surface
- A Stories view for approved memories that preserves authorship and invites conversation
- Household-scoped data needed for check-ins, replies, commitments, and stories

## Explicit exclusions

Our Place is not a chore board, household operations dashboard, or general family organizer. This repository must not contain or add:

- chore, grocery, or errand category models;
- rooms, assignments, progress tracking, goals, streaks, or completion dashboards;
- wardrobe or character customization;
- a `tasks` database table; or
- an `/api/tasks` route.

The existing `commitments` table belongs because it records a named family promise tied to a source-quoted request. It deliberately has no workflow status or completion timestamps and must not expand into task assignment or progress management.
