# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. It is meant to be enough on its own: an agent working here may never see the backend repo.

@AGENTS.md

**Heed the warning above.** This is Next.js 16 + React 19 — APIs and conventions differ from older Next.js. Before writing framework code (routing, metadata, server/client boundaries, `next.config`), read the relevant guide under `node_modules/next/dist/docs/` (`01-app/` for App Router). Don't assume training-data Next.js behavior.

## What this is

**PartyTalk** is live group English-practice **rooms**. A host creates an invite-only room (up to 5 people), everyone talks by voice, an **AI host** suggests new topics from the live conversation, and the room gets a **report** when the host ends it. This repo is the frontend: **PartyTalk web**. There is also a parked IELTS simulator, which runs on in-repo mock data.

Stack: Next.js 16 (App Router, Turbopack) · React 19 · React Query 5 · Tailwind v3 · socket.io-client · Google Identity Services. No test runner.

**Sibling repo.** The backend is **`partytalk-api`** (NestJS 11, Firestore, Socket.IO, Vertex AI Gemini), a separate git repo usually checked out at `../partytalk-api`. It is not a monorepo and there is no shared types package. Another agent may be working there; see [Contract with partytalk-api](#contract-with-partytalk-api) before changing anything that crosses the wire.

## Commands

```bash
npm run dev     # dev server on http://localhost:3000 (port pinned in package.json)
npm run build   # production build
npm run start   # serve the build on 3000
npm run lint    # eslint (flat config: next core-web-vitals + typescript)
npm test        # vitest run (src/**/*.test.ts, node environment)
```

Tests: `npm test` runs vitest (node environment, `src/**/*.test.ts`); the pure room logic in `src/lib/roomHistory.ts` and `src/lib/hostVoice.ts` is covered there.

**Ports and env.** The web app runs on **3000**. The PartyTalk API (NestJS) runs separately; `.env.local.example` points at it on **8080** (`/api/v1` REST, Socket.IO namespace `/rooms`, Swagger at `:8080/docs`). The fallback defaults in [src/lib/env.ts](src/lib/env.ts) still say `localhost:3000`, which now collides with the web port — so always copy `.env.local.example` → `.env.local` and set `NEXT_PUBLIC_API_BASE_URL` / `NEXT_PUBLIC_API_SOCKET_URL`. (README.md still describes the older 3001/3000 split; `package.json` and the env example are the source of truth.) Both web and API must run for the rooms feature to work end to end.

**Dev auth bypass.** Set `NEXT_PUBLIC_DISABLE_AUTH=true` to skip Google sign-in entirely: `AuthProvider` hands down a stand-in user (`getDevUser()` in `googleAuth.ts`) and GIS is never loaded. Optionally set `NEXT_PUBLIC_DEV_BEARER_TOKEN` to a Google ID token (copy one from Swagger's "Authorize" dialog) — it's decoded into the dev user and attached as `Authorization: Bearer` so protected endpoints work; without it requests go out unauthenticated. `ProfileGate` still runs, so with a token you'll be onboarded if that user has no profile. Without the bypass, `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is required; until it's set the app boots but the sign-in screen shows a "not configured" notice (`googleConfigured` in `env.ts`).

`next.config.ts` sets `allowedDevOrigins` for LAN testing from another device; add your machine's IP there if needed.

## Architecture

**The integration seam (read this first).** Components **never call `fetch` directly**. Data flows: component → React Query hook ([src/lib/queries.ts](src/lib/queries.ts)) → typed fetcher (`src/lib/api/*.ts`) → `api` client ([src/lib/apiClient.ts](src/lib/apiClient.ts)). All request/response shapes live in [src/lib/types.ts](src/lib/types.ts) and are the contract with the backend (see [API_HANDOFF.md](API_HANDOFF.md), the brief the backend was built from). Change a data shape in one place and it propagates; keep this seam intact.

- **`apiClient.ts`** — attaches the Google ID token as `Authorization: Bearer`, unwraps the backend's `{ data, meta }` envelope (returns `data`), and throws `ApiError` carrying the HTTP `status` (callers branch on it, e.g. 404 → "no profile yet" in `useMe`).
- **`queries.ts`** — the single home for query keys (`queryKeys`) and all React Query hooks. Room queries are `enabled` only when a user is signed in; `useRooms` polls every 15s; `useRoomLifecycle(id)` bundles the join/start/end/changeTopic mutations; mutations invalidate/`setQueryData` to keep the cache fresh.

**Auth & gating.** "Sign in with Google" via **Google Identity Services** (GIS) — no Firebase. The API verifies the raw Google ID token on every request (its `sub` claim is the user's `uid`). [src/lib/googleAuth.ts](src/lib/googleAuth.ts) loads GIS, holds the current ID token in memory, decodes it into an `AuthUser` (`{ uid, email, displayName, picture }`), and exposes `getIdToken()` (silently re-issues on expiry via One Tap), `renderSignInButton`, `signOut`, and an `onAuthChange` subscription. [AuthProvider](src/components/auth/AuthProvider.tsx) wraps that in `useAuth()` and, on load, calls `restoreSession()` to silently sign returning users back in (`auto_select`). `SignInScreen` renders the official GIS button; auth-gated pages wrap content in `<RequireAuth>` (→ `SignInScreen` if signed out) then `<ProfileGate>` (→ `ProfileOnboarding` if the user has no profile — first sign-in calls `PUT /users/me`). The same fresh ID token authenticates both REST calls and the Socket.IO handshake (`auth.token`). Requires `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (OAuth web client, with the app origin in "Authorized JavaScript origins").

**Realtime room loop.** [useRoomSocket](src/lib/useRoomSocket.ts) owns one room's connection: it seeds history from REST (`getTranscript`/`getHostMessages`), then connects the `/rooms` Socket.IO namespace ([socket.ts](src/lib/socket.ts)) and feeds `transcript` / `hostMessage` / `presence` / `sessionEnded` events through the pure `roomReducer`; `roomUpdated` (the full `Room` on join/leave/start) bypasses the reducer and is written straight into the React Query cache via `useApplyRoom`, the same path the REST lifecycle responses take, so membership/status/`scheduledEndAt` always come from the `Room` object and `presence` is only online status in [roomHistory.ts](src/lib/roomHistory.ts), which also merges transcript and host lines by `at` and derives the current topic (latest `hostMessage.topic`, falling back to `room.topic`, which is only the opening topic). Each client transcribes its own mic via the browser Web Speech API ([useSpeechRecognition.ts](src/lib/useSpeechRecognition.ts)) and emits `transcript` events (typed fallback where unavailable, e.g. Firefox). **The AI host is a permanent member of every room**: it listens to the transcript and, when it decides, *announces* a completely new topic (`hostMessage.message` is the exact sentence it says; there is no accept/reject). [hostVoice.ts](src/lib/hostVoice.ts) reads each new host line aloud via `speechSynthesis` (never seeded history; mutable). [RoomExperience](src/components/practice/room/RoomExperience.tsx) is the main live-room UI and composes `useRoom` + `useRoomLifecycle` + `useRoomSocket` + `useHostVoice` + `useSpeechRecognition` + `useVoiceMesh`. Socket event types are in `types.ts` (`ServerToClientEvents` / `ClientToServerEvents`).

**Voice mesh is a stub.** [useVoiceMesh.ts](src/lib/useVoiceMesh.ts) implements the WebRTC P2P signaling client, but the backend relay (`webrtc:*`) is an unshipped milestone. Signaling emits are gated behind `NEXT_PUBLIC_VOICE_MESH=true` (off by default: emitting unhandled events can get the socket dropped server-side); the mic is still acquired when live so the self tile can meter it. `useRoomSocket` reconnects itself after an `io server disconnect`, which socket.io does not retry on its own.

**Routes** ([src/app/](src/app/)):
- `/` is the one-screen landing page (static).
- `/practice` is the room list and "Create a room" modal ([RoomsBrowser](src/components/practice/RoomsBrowser.tsx)).
- `/practice/[roomId]` is the live room ([RoomExperience](src/components/practice/room/RoomExperience.tsx)). The page passes `?invite=<code>` down from `searchParams`.
- `/ielts/*` is parked.

Both practice routes wrap their content in `<RequireAuth>` then `<ProfileGate>` and use [AppHeader](src/components/app/AppHeader.tsx).

**The integration seam (read this first).** Components **never call `fetch` directly**. Data flows: component → React Query hook ([src/lib/queries.ts](src/lib/queries.ts)) → typed fetcher (`src/lib/api/*.ts`) → `api` client ([src/lib/apiClient.ts](src/lib/apiClient.ts)). All request/response shapes live in [src/lib/types.ts](src/lib/types.ts), which is the contract with the backend. Change a data shape in one place and it propagates; keep this seam intact.

- **`apiClient.ts`:** attaches the Google ID token as `Authorization: Bearer`, unwraps the backend's `{ data, meta }` envelope (returns `data`), and throws `ApiError` carrying the HTTP `status`. Callers branch on it, e.g. 404 → "no profile yet" in `useMe`. A 401 calls `expireSession(token)` ([googleAuth.ts](src/lib/googleAuth.ts)) to fall back to the sign-in screen.
- **`queries.ts`:** the single home for query keys (`queryKeys`) and all React Query hooks.
  - Room queries are `enabled` only when a user is signed in, and `useRooms` polls every 15 s.
  - `useRoom` doesn't retry 403/404; those are answers, not glitches.
  - `useRoomLifecycle` holds join/leave/start/end/suggest, and `useRoomInvites` the owner's invite mutations.
  - Mutations invalidate or `setQueryData` to keep the cache fresh.

**Rooms are live against the real API. IELTS is parked on mock data** and unlinked everywhere while `IELTS_ENABLED` in [src/lib/features.ts](src/lib/features.ts) is false (the pages still exist). `src/lib/api/rooms.ts` and `users.ts` hit real REST endpoints; `src/lib/api/ielts.ts` returns in-repo mock objects via `Promise`, seeded as React Query `initialData`. Don't wire IELTS to the API unless asked.

**Auth & gating.** "Sign in with Google" via **Google Identity Services** (GIS) — no Firebase. The API verifies the raw Google ID token on every request; its `sub` claim is the user's `uid`.

- [src/lib/googleAuth.ts](src/lib/googleAuth.ts) loads GIS, holds the current ID token in memory and decodes it into an `AuthUser` (`{ uid, email, displayName, picture }`). It exposes:
  - `getIdToken()`, which silently re-issues an expired token via One Tap;
  - `renderSignInButton`, `signOut` and an `onAuthChange` subscription.
- [AuthProvider](src/components/auth/AuthProvider.tsx) wraps that in `useAuth()` (`user`, `loading`, `configured`, `signIn`, `signOut`). On load it calls `restoreSession()` to sign returning users back in silently (`auto_select`).
- Auth-gated pages wrap their content in `<RequireAuth>`, which shows `SignInScreen` (the official GIS button) when signed out, then `<ProfileGate>`. `ProfileGate` shows `ProfileOnboarding` when `GET /users/me` is 404; the first sign-in calls `PUT /users/me`.
- The same fresh ID token authenticates both REST calls and the Socket.IO handshake.

**Rooms are invite-only.** The API returns 403 for a room unless you're the owner or your Google email is on its invite list, and `GET /rooms` only lists your own and invited rooms. In [RoomExperience](src/components/practice/room/RoomExperience.tsx):

- A 403 with `?invite=<code>` is redeemed via `join(inviteCode)`, then the code is stripped with `router.replace`.
- A 403 without a code, a 404, or a `removedFromRoom` socket event (the owner revoked you) renders [RoomAccessScreen](src/components/practice/room/RoomAccessScreen.tsx).
- The owner manages invites and the invite link in [InvitePanel](src/components/practice/room/InvitePanel.tsx) via `useRoomInvites`, which writes the returned room straight into the cache. `invitedEmails` and `inviteCode` only ever arrive for the owner.
- Email parsing (`parseEmails`), `MAX_INVITES` and link building (`inviteLink`) live in [src/lib/invites.ts](src/lib/invites.ts).

**Create-room modal** (`CreateRoomModal` in [RoomsBrowser](src/components/practice/RoomsBrowser.tsx)):
- **Invite field:** builds the invite list with [EmailListInput / useEmailList](src/components/practice/EmailListInput.tsx). Enter, a comma, a space or the Add button adds an address; pasting adds a whole list; each row has an X; Backspace in the empty field removes the newest. Rows show newest first, a duplicate highlights the existing row, and the field keeps an error until invalid text is fixed.
- **No add-on-blur, on purpose:** adding a row on blur shifts the layout under the submit click and swallows it. The form calls `flush()` on submit instead, so a typed-but-not-added address is kept.
- **Seat warning:** shown when there are more invitees than seats (`maxParticipants` − 1).
- **Layout:** the body scrolls between a fixed header and footer, and a backdrop click closes the modal only while the form is empty.

**Realtime room loop.** [useRoomSocket](src/lib/useRoomSocket.ts) owns one room's connection.

- **Startup:** it seeds topic suggestions from REST (`getSuggestions`), then connects the `/rooms` Socket.IO namespace ([socket.ts](src/lib/socket.ts)).
- **Events into state:** it streams `topicSuggested`, `presence` and `sessionEnded` into React state.
  - Other people's changes arrive as `roomUpdated`, which invalidates the room query; tiles and `live` status come from that REST copy.
  - `roster`, sent on (re)join, replaces the `presence` map of who's connected.
- **Auth and reconnects:**
  - The handshake's `auth` is a **callback**, so every (re)connect sends a fresh ID token. Cloud Run ends each socket at its 1-hour request timeout, exactly when the old token expires.
  - A refused handshake (`connect_error` with `!socket.active`) or a server disconnect is retried with backoff (1–16 s, 5 tries). After that, `connection` becomes `"failed"` and the header offers Reconnect. Other drops show as "Reconnecting…", and a first connect slower than 5 s shows "Connecting…".
  - **On every reconnect** it refetches the room and the suggestions, because the API can run two instances and a reconnect may land on the other one after events were missed.
- **Join order:** it emits `joinRoom` only once the socket is connected **and** the user is a participant, and re-emits when either flips. Opening a room card starts the REST join concurrently with the socket, and the server silently rejects a `joinRoom` that arrives first. Voice is gated the same way.
- **Transcript:** each client transcribes its own mic via the browser Web Speech API ([useSpeechRecognition.ts](src/lib/useSpeechRecognition.ts)) and emits `transcript` events. **The transcript is never shown in the UI**; it only feeds the AI host's topic suggestions and the end-of-room report, so the client ignores `transcript` broadcasts. Browsers without the Web Speech API (e.g. Firefox) get a disabled mic button, and the AI can't hear those participants.

[RoomExperience](src/components/practice/room/RoomExperience.tsx) is the main live-room UI: a dark Meet-style grid, plus a control bar with mic, ✨ AI host, invites (owner), and start/end/leave.

**AI host topics are on demand.** [AiHostPanel](src/components/practice/room/AiHostPanel.tsx) is a right-side panel opened from the ✨ control-bar button.

- On desktop it's docked and the participant grid makes room; on mobile it overlays. Opening it closes the invite panel, and vice versa.
- It never covers the tiles on its own: a topic that arrives while it's closed shows as a dot on the button (unread = newer than the last one seen).
- Only the room **owner** gets "Suggest a topic"; the API returns 403 to anyone else. Its result reaches everyone as `topicSuggested`, and the requester also merges it immediately. Others see a note that the host can ask, and manual topics are badged "Host's request".

**Voice is a P2P WebRTC mesh.** [useVoiceMesh.ts](src/lib/useVoiceMesh.ts) signals through the API's `webrtc:*` relay; audio flows browser-to-browser.

- **Connecting:** the joiner offers to every peer in `webrtc:peers`. If two people joined at once and offered each other (glare), the lower uid keeps its offer and the other answers it, using the `selfUid` option.
- **Replacing and dropping:** any other new offer or peers list replaces the existing connection to that uid (it never renegotiates). `webrtc:peer-left` drops a peer immediately, and a socket reconnect rebuilds the whole mesh.
- **ICE servers:** they come from the API (`roomsApi.iceServers`: STUN, plus TURN with a short-lived credential when the deployment has a relay) and are re-fetched on every reconnect. If the call fails, the mesh falls back to public STUN.
- **Leaving:** both exits ("Leave" and "← Rooms") call `POST /leave` to free the seat (rooms cap at 5); closing the tab doesn't.

**Landing page** ([src/app/page.tsx](src/app/page.tsx)) is **one screen**, a dark navy hero with:
- a minimal header: the logo and [LandingAuthLink](src/components/marketing/LandingAuthLink.tsx), which reads "Sign in", or "Your rooms" once signed in;
- the headline and one paragraph;
- one gold "Start a room" CTA to `/practice`;
- three steps (invite, talk, report);
- [RoomPreview](src/components/marketing/RoomPreview.tsx), a decorative client-side mock of the real dark room. Its speaker and AI topic rotate on a timer and hold still under `prefers-reduced-motion`.

It doesn't use `SiteLayout`; `SiteLayout`, `SiteHeader` and `SiteFooter` serve only the parked IELTS pages.

- **Fitting one screen:** Tailwind's custom `short` screen (`max-height: 760px`, in [tailwind.config.ts](tailwind.config.ts)) tightens spacing and type on laptop-height and small-phone screens. Stacked variants like `lg:short:` and `sm:short:` win over single ones.
- **No `max-*` width variants:** they don't generate once a raw screen exists in the config, so write `short:hidden sm:short:block`, not `max-sm:`.
- **Headline:** sizes are chosen so "Start speaking it." (about 8.4 em wide) stays on one line in its column.
- **Copy:** keep it truthful to what the product does. No invented stats or social proof, and no features that don't exist (the AI suggests topics and writes a report; it does not correct grammar live).

**Providers.** [providers.tsx](src/components/providers.tsx) wraps the app in `QueryClientProvider` (60 s `staleTime`, `retry: 1`, no refetch-on-focus) then `AuthProvider`.

## Contract with partytalk-api

Nothing enforces this contract: [src/lib/types.ts](src/lib/types.ts) is a hand-written mirror of the API's entities and DTOs. The API's Swagger UI (`http://localhost:8080/docs` locally) is the live reference. [API_HANDOFF.md](API_HANDOFF.md) is the original backend brief from when this app ran on mocks; treat it as history, not as the current spec. If a feature needs an API change, don't edit `../partytalk-api` unless the user asks; describe the exact change needed (route, field, type, status code) in your report.

- **REST** is under `/api/v1`, and every response is `{ data, meta }`.
  - **Requests:** the API validates with `forbidNonWhitelisted`, so **sending any field the DTO doesn't declare is a 400**. Send exactly the documented shape.
  - **Status codes the UI depends on:**
    - 401 means re-sign-in;
    - 403 means not invited, or not the owner for owner-only actions;
    - 404 means not found (or no profile on `GET /users/me`);
    - 409 means the room is full or has ended.
- **Routes the web uses:**
  - `GET/PUT /users/me`;
  - `POST /rooms` and `GET /rooms`;
  - per room: `GET /rooms/:id`, `POST :id/join { inviteCode? }`, `POST :id/leave`, `POST :id/start`, `POST :id/end`, `GET :id/suggestions`, `POST :id/suggest-topic`, `GET :id/ice-servers`;
  - owner invites: `POST :id/invites { emails }`, `DELETE :id/invites/:email`, `POST/DELETE :id/invite-link`.
  - Start, end, suggest-topic and the invite routes are **owner-only**.
- **Limits mirrored in the UI:**
  - `MAX_INVITES` = 50;
  - `maxParticipants` 1–5 (default 5; voice is a P2P mesh);
  - topic 3–120 chars, persona ≤ 300.
- **Owner-only fields:** a non-owner never receives `invitedEmails` / `inviteCode`.
- **Socket.IO** namespace `rooms`; the names must match the API gateway's handlers and emits.
  - **Client→server** (`ClientToServerEvents`): `joinRoom`, `leaveRoom`, `transcript`, `webrtc:join`, `webrtc:offer`, `webrtc:answer`, `webrtc:ice`.
  - **Server→client** (`ServerToClientEvents`):
    - room state: `presence`, `roster` (sent to you on `joinRoom`), `roomUpdated` (data-free; refetch the room), `transcript` (ignored);
    - AI host: `topicSuggested` (automatic and manual, to everyone), `sessionEnded { roomId, report? }` (the report is best-effort and may be absent);
    - access: `removedFromRoom`, `error`;
    - voice: `webrtc:peers`, `webrtc:peer-offer`, `webrtc:peer-answer`, `webrtc:peer-ice`, `webrtc:peer-left`.
- **Auth.** The GIS ID token is sent as `Authorization: Bearer` on REST and as `auth.token` in the socket handshake. The API's `GOOGLE_OAUTH_CLIENT_ID` must equal `NEXT_PUBLIC_GOOGLE_CLIENT_ID`; a mismatch is a 401 on every call. A refused handshake reaches the client as `connect_error`.
- **What the API does that the UI relies on:**
  - It emails invitees the room link on create and on add (new addresses only, and only when the deployment has SMTP configured). The UI copy says so.
  - Revoking an invite evicts that person live.
  - In HML only allow-listed Google accounts can sign in (others get 403).

## Deploying to HML

HML is the GCP project `partytalk-hml` (us-central1), used for testing with selected users. The web is `https://partytalk-web-484961620847.us-central1.run.app` and the API `https://partytalk-api-484961620847.us-central1.run.app`. Both URLs are deterministic, so each side is pre-wired to the other.

- **Running a deploy:** `./deploy-hml.sh` builds with Cloud Build ([cloudbuild.yaml](cloudbuild.yaml)), passing `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_API_SOCKET_URL` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` as build args. It then runs `gcloud run deploy --image` (min 0, max 2 instances).
- **Service account:** it builds and runs as the API's service account `partytalk-api-hml`, on purpose.
- **First deploy:** the API must deploy first, because its first deploy creates the `cloud-run-source-deploy` image repository this pushes to.
- **OAuth:** the web URL must be in the OAuth client's Authorized JavaScript origins. While the OAuth app is in "Testing", every tester must also be a test user there and in the API's `ALLOWED_AUTH_EMAILS`.
- **Rules:** deploying changes a shared environment, so run it only when the user asks. After a deploy that changes realtime behaviour, people already in a room need to reload once.

## Conventions

- `@/*` path alias → `src/*` (tsconfig). Client components need `"use client"`.
- **Styling is Tailwind v3 with semantic design tokens**, not raw colors — use `bg-surface`, `text-primary`, `text-on-surface-variant`, `rounded-pill`, `font-display`, etc. The full token scale (Material-style, lifted from a Google Stitch design system) is defined in [tailwind.config.ts](tailwind.config.ts). Prefer tokens over hex values so the app and marketing surfaces stay consistent.
- Fonts: **Arimo** (body, `font-sans`) and **Sora** (marketing display, `font-display`), wired in [src/lib/fonts.ts](src/lib/fonts.ts) and the root layout. Icons: `lucide-react`.
- `cn()` ([src/lib/cn.ts](src/lib/cn.ts)) for conditional class names.
- Work on the local checkout as it is: don't pull, and don't ask to pull. Commit or push only when the user asks.
