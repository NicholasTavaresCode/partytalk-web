# PartyTalk API — Build Brief (handoff for the backend agent)

You are picking up **backend/API development** for PartyTalk. The **frontend is already built** (Next.js 16 + React 19 + React Query) and currently runs against an in-repo **mock data layer**. Your job is to build the real API and swap the mocks for it **without changing the frontend's data shapes**.

Read this whole file before writing code. The single most important section is **§1 — the integration seam**: match those types exactly and the frontend lights up with zero component changes.

---

## 0. Context in one paragraph

PartyTalk = live **group English practice rooms** guided by an **AI host**, plus a solo **IELTS exam simulator** (Listening / Reading / Writing / Speaking). English only for now. Frontend-only today: audio, recording, timers, transcript, and chat are simulated client-side. The backend must make them real: persistence, realtime rooms, an AI host, and IELTS content + scoring.

---

## 1. The integration seam (start here)

Components **never call `fetch` directly**. All data flows through:

- **Fetchers** — `src/lib/api/rooms.ts`, `src/lib/api/ielts.ts` (currently return mock data via `Promise`).
- **React Query hooks** — `src/lib/queries.ts` (`useRooms`, `useRoom`, `useIeltsModules`, `useListeningTest`, `useReadingTest`, `useWritingTasks`, `useSpeakingTest`).
- **Types** — `src/lib/types.ts` is the **contract**. Your JSON responses must deserialize into these interfaces unchanged (same field names, same casing, camelCase).

**Integration = replace the fetcher bodies.** Example:

```ts
// src/lib/api/rooms.ts  — before (mock)
export async function fetchRooms(): Promise<Room[]> {
  return delay(ROOMS);
}
// after (real API) — nothing else in the app changes
export async function fetchRooms(): Promise<Room[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/rooms`);
  if (!res.ok) throw new Error(`rooms ${res.status}`);
  return res.json();
}
```

**Rules of engagement**
- Do **not** rename or reshape anything in `src/lib/types.ts` without updating it in lockstep and re-running `npx tsc --noEmit`. The types are the wire contract.
- Exam content is seeded via React Query `initialData` (so the simulator renders instantly). Keep `GET` responses byte-compatible so a background refetch is a no-op.
- Introduce `NEXT_PUBLIC_API_BASE_URL` (browser-safe base URL). Keep all secrets (esp. `ANTHROPIC_API_KEY`) **server-only**.

---

## 2. Recommended architecture

**Option A (recommended to start): Next.js Route Handlers** in `src/app/api/**` — same repo, same deploy, no CORS, server-only secrets, easy to co-locate with the existing types. Realtime (rooms) needs a socket layer that serverless functions can't hold open, so pair it with a dedicated realtime provider (below).

**Option B: standalone service** (NestJS / Fastify / FastAPI / Go). Fine if the team prefers it — then set CORS to the web origin and point `NEXT_PUBLIC_API_BASE_URL` at it. The contract in §1 is identical either way.

Suggested pieces:
- **DB**: Postgres (Prisma or Drizzle).
- **Realtime rooms**: a WebSocket layer — **LiveKit** or **Daily** (they also solve real audio via an SFU, see §4), or Ably/Socket.IO if you only need data channels at first.
- **Speech**: ASR (Deepgram / Whisper) for live transcripts and IELTS speaking; TTS optional for the AI host voice.
- **Object storage**: S3-compatible for IELTS listening audio + speaking recordings (serve via signed URLs).
- **AI**: Anthropic Claude (see §5).

---

## 3. Phase 1 — READ endpoints (do these first; unblocks the whole frontend)

Implement these 7 GETs returning the **current mock JSON** (copy the objects straight out of `src/lib/api/*.ts`). This proves end-to-end integration before any DB or AI work.

| Hook | Fetcher | Method + path | Response type (`src/lib/types.ts`) |
| --- | --- | --- | --- |
| `useRooms` | `fetchRooms` | `GET /rooms` | `Room[]` |
| `useRoom` | `fetchRoom(id)` | `GET /rooms/:id` | `RoomDetail` |
| `useIeltsModules` | `fetchIeltsModules` | `GET /ielts/modules` | `IeltsModuleInfo[]` |
| `useListeningTest` | `fetchListeningTest` | `GET /ielts/tests/listening` | `ListeningTest` |
| `useReadingTest` | `fetchReadingTest` | `GET /ielts/tests/reading` | `ReadingTest` |
| `useWritingTasks` | `fetchWritingTasks` | `GET /ielts/tests/writing` | `WritingTask[]` |
| `useSpeakingTest` | `fetchSpeakingTest` | `GET /ielts/tests/speaking` | `SpeakingTest` |

`Room` / `RoomDetail` shape (abbreviated — full definition in `types.ts`):

```jsonc
// GET /rooms/:id  → RoomDetail
{
  "id": "sunday-cafe",
  "topic": "Sunday Coffee Chat",
  "description": "Relaxed small talk…",
  "level": "A2",                       // CEFR: A1|A2|B1|B2|C1|C2
  "language": "en",
  "host": "Aria",                       // AI host name
  "tags": ["Small talk", "Everyday English"],
  "capacity": 6,
  "minutesLive": 12,
  "participants": [
    { "id": "h1", "name": "Aria", "flag": "✨", "country": "AI Host", "level": "C2", "isAI": true },
    { "id": "p1", "name": "Lucas", "flag": "🇧🇷", "country": "Brazil", "level": "A2", "speaking": true }
  ],
  "prompt": "what did you do last weekend?",
  "goals": ["Speak for at least 2 minutes", "Use 3 new phrases", "Ask one follow-up question"],
  "suggestions": [{ "id": "s1", "phrase": "It reminds me of…", "hint": "Connect a topic to your own experience" }],
  "transcript": [
    { "id": "t1", "speakerId": "h1", "speaker": "Aria", "flag": "✨", "kind": "ai", "time": "0:02", "text": "Welcome…" }
  ]
}
```

`TranscriptEntry.kind` ∈ `"speech" | "ai" | "correction" | "system"` — the UI renders `correction` as a gold "Tip" bubble, so the AI host must tag grammar nudges with `kind: "correction"`.

**Phase-1 done when:** all 7 hooks return live data from your endpoints and the app renders identically to the mocks.

---

## 4. Realtime + WRITE surfaces (what the frontend currently *simulates*)

For each, the UI already exists — you're replacing client-side fakery with real state.

### Group rooms (`src/components/practice/room/RoomExperience.tsx`)
Today: local timer, mic/cam toggles, a canned transcript, and a `setTimeout` "AI reply." Real backend needs:
- `POST /rooms`, `POST /rooms/:id/join`, `POST /rooms/:id/leave`; presence + capacity enforcement.
- **WebSocket protocol** (events): `participant.joined/left`, `participant.speaking`, `participant.muted`, `transcript.append` (a `TranscriptEntry`), `host.turn` (AI host message / correction), `chat.message`. The UI already maps cleanly onto these.
- **Media**: wire the mic/cam tiles to a real SFU (LiveKit/Daily). Run ASR on each speaker to emit `transcript.append`.
- **AI host**: an agent that watches the transcript and periodically injects a prompt or a `correction` (see §5).

### IELTS
- **Attempts**: `POST /ielts/attempts` (start), `PATCH /ielts/attempts/:id` (autosave answers), `POST /ielts/attempts/:id/submit`.
- **Listening**: serve real audio via signed URL; enforce **once-only** playback server-side (the design mandates a non-seekable, play-once recording).
- **Reading/Listening**: score objective answers server-side against a key.
- **Writing**: evaluate essays against IELTS band descriptors → **LLM-judge** (§5), return per-criterion bands + feedback.
- **Speaking**: capture recording → ASR transcript → LLM-judge for fluency/lexical/grammar/pronunciation.

---

## 5. AI layer (Anthropic Claude)

Use the **official SDK** `@anthropic-ai/sdk` from server code only. `ANTHROPIC_API_KEY` lives in server env — **never** ship it to the browser. When you build these, run the `claude-api` skill for exact, current syntax; the essentials:

**Model choice.** Default to **`claude-opus-4-8`** — especially for IELTS scoring, where band accuracy matters. For the **live multi-user host** (many concurrent rooms, latency-sensitive), the team may deliberately choose **`claude-sonnet-5`** (near-Opus quality, faster/cheaper) or **`claude-haiku-4-5`** (cheapest/fastest) — that's a product cost/latency decision, not a silent downgrade. Use the exact ID strings as written (no date suffixes).

**AI host — stream turns** (Opus family uses adaptive thinking; `budget_tokens`/`temperature` are removed and 400). Stream so long turns don't hit HTTP timeouts, and re-stream to the browser over your room socket:

```ts
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic(); // reads ANTHROPIC_API_KEY from server env

const stream = client.messages.stream({
  model: "claude-sonnet-5",              // or claude-opus-4-8; team's latency/cost call
  max_tokens: 1024,
  thinking: { type: "adaptive" },
  system: [{ type: "text", text: HOST_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }], // cache the frozen host rubric
  messages: transcriptAsMessages,        // room transcript → user/assistant turns
});
const final = await stream.finalMessage();
```

**IELTS scorer — structured output (LLM-judge).** Force valid JSON band scores with `output_config.format` / `messages.parse()` — do **not** parse free text. Cache the (frozen) band-descriptor rubric in the system prompt; put the candidate's essay after the last cache breakpoint.

```ts
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const Band = z.object({
  taskAchievement: z.number(),  // 0–9, .5 steps
  coherence: z.number(),
  lexical: z.number(),
  grammar: z.number(),
  overall: z.number(),
  feedback: z.string(),
  improvements: z.array(z.string()),
});

const res = await client.messages.parse({
  model: "claude-opus-4-8",               // quality-critical → Opus 4.8
  max_tokens: 2048,
  thinking: { type: "adaptive" },
  system: [{ type: "text", text: IELTS_WRITING_RUBRIC, cache_control: { type: "ephemeral" } }],
  messages: [{ role: "user", content: `Task ${task.id} prompt:\n${task.prompt}\n\nCandidate essay:\n${essay}` }],
  output_config: { format: zodOutputFormat(Band) },
});
const bands = res.parsed_output!; // typed, schema-validated
```

Same `messages.parse` pattern scores the speaking transcript. If the host ever needs to *do* things (look up a phrase, adjust level), add tools via the SDK tool runner (`betaZodTool` + `toolRunner`) rather than parsing text.

**Cost/latency levers:** prompt-cache the frozen rubric/host prompt (huge win — the descriptors are large and reused every call); use `output_config: { effort: "low" }` for cheap live-host turns and higher effort for scoring; stream everything user-facing.

---

## 6. Data model sketch (Postgres)

`users`, `rooms`, `room_participants`, `messages` (transcript; `kind`, `speaker_id`, `text`, `ts`), `ielts_tests` (module content), `ielts_attempts` (user, module, status, started_at), `ielts_answers` (attempt_id, question_no, value), `ielts_scores` (attempt_id, criterion, band, feedback), `media_assets` (owner, kind, storage_key). Keep exam *content* server-authoritative; never trust client-submitted correctness.

---

## 7. Cross-cutting

- **Auth**: JWT or session; attach a `candidate` identity (the exam chrome shows name + candidate ID). The current UI hardcodes "Jane Doe / 123456" — replace with the authenticated user.
- **Validation**: validate all input (zod) at the boundary; sign & scope media URLs.
- **Errors**: return a consistent shape; the React Query hooks already surface `isLoading`/`error`.
- **CORS**: only if you pick Option B (separate service).
- **Env**: `DATABASE_URL`, `ANTHROPIC_API_KEY` (server-only), `NEXT_PUBLIC_API_BASE_URL`, media/storage creds, realtime provider keys.

---

## 8. Milestones (in order)

1. **Read stubs** — 7 GETs returning the mock JSON; swap the 7 fetchers; verify the app is unchanged. *(No DB, no AI.)*
2. **Persistence + auth** — Postgres, users, rooms CRUD.
3. **Realtime rooms** — WebSocket presence + chat + transcript.
4. **AI host** — streaming Claude turns + `correction` nudges into the transcript.
5. **IELTS attempts** — start / autosave / submit; objective scoring.
6. **Media** — SFU audio + ASR (speaking), signed once-only listening audio.
7. **AI scoring** — structured-output band scores + feedback for writing & speaking.

---

## 9. Guardrails

- Don't change `src/lib/types.ts` shapes without updating the frontend in the same PR (`npx tsc --noEmit` must stay green).
- `ANTHROPIC_API_KEY` and all provider secrets are **server-only** — never reachable from the browser bundle.
- Exam correctness and scoring are **server-authoritative** — the client only submits answers.
- Match field names/casing exactly; a mismatch silently breaks rendering, not the build.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
