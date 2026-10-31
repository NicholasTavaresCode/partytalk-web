# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. It is meant to be enough on its own: an agent working here may never see the backend repo.

@AGENTS.md

**Heed the warning above.** This is Next.js 16 + React 19 — APIs and conventions differ from older Next.js. Before writing framework code (routing, metadata, server/client boundaries, `next.config`), read the relevant guide under `node_modules/next/dist/docs/` (`01-app/` for App Router). Don't assume training-data Next.js behavior.

## What this is

**PartyTalk** is live group English-practice **rooms**. The owner creates an invite-only room (2–5 people counting the owner, 5–60 minutes), everyone talks by voice, and an **AI host** listens in and, when a topic has run its course, announces a completely different one. The room gets a **report** when it ends. This repo is the frontend: **PartyTalk web**. The IELTS simulator was removed in September 2026; don't bring it back. `features.ts` (`IELTS_ENABLED`) and `SiteLayout`/`SiteHeader`/`SiteFooter` are leftovers.

Stack: Next.js 16 (App Router, Turbopack) · React 19 · React Query 5 · Tailwind v3 · socket.io-client · Google Identity Services · vitest.

**Sibling repo.** The backend is **`partytalk-api`** (NestJS 11, Firestore, Socket.IO, Vertex AI Gemini), a separate git repo usually checked out at `../partytalk-api`. It is not a monorepo and there is no shared types package. Another agent may be working there; see [Contract with partytalk-api](#contract-with-partytalk-api) before changing anything that crosses the wire.

## Commands

```bash
npm run dev     # dev server on http://localhost:3000 (port pinned in package.json)
npm run build   # production build; also the only full type-check (npx tsc --noEmit is quicker)
npm run start   # serve the build on 3000
npm run lint    # eslint (flat config: next core-web-vitals + typescript)
npm test        # vitest run (src/**/*.test.ts, node environment)
npx vitest run src/lib/roomHistory.test.ts   # one test file
```

The tests cover the pure logic in `src/lib/`: the room reducer (`roomHistory`), host voice (speaking and voice choice), the new-topic reveal (`topicReveal`), the countdown, the create-room form and the room cache merge (`queries`). Six `react-hooks` lint errors in `countdown.ts`, `hostVoice.ts`, `useSpeaking.ts` and `useSpeechRecognition.ts` predate the current code; `next build` doesn't run lint.

**Ports and env.** The web app runs on **3000**. The API runs separately; `.env.local.example` points at it on **8080** (`/api/v1` REST, Socket.IO namespace `/rooms`, Swagger at `:8080/docs`). The fallback defaults in [src/lib/env.ts](src/lib/env.ts) say `localhost:3000`, which is this server, so always copy `.env.local.example` → `.env.local`. Both web and API must run for rooms to work end to end.

**Dev auth bypass.** Set `NEXT_PUBLIC_DISABLE_AUTH=true` to skip Google sign-in entirely: `AuthProvider` hands down a stand-in user (`getDevUser()` in `googleAuth.ts`) and GIS is never loaded. Optionally set `NEXT_PUBLIC_DEV_BEARER_TOKEN` to a Google ID token (copy one from Swagger's "Authorize" dialog); it's decoded into the dev user and attached as `Authorization: Bearer`, so protected endpoints and the socket work. Without it, requests go out unauthenticated. `ProfileGate` still runs. Without the bypass, `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is required; until it's set the sign-in screen shows a "not configured" notice (`googleConfigured` in `env.ts`).

`next.config.ts` sets `allowedDevOrigins` for LAN testing from another device; add your machine's IP there if needed.

## Architecture

**The integration seam (read this first).** Components **never call `fetch` directly**. Data flows: component → React Query hook ([src/lib/queries.ts](src/lib/queries.ts)) → typed fetcher (`src/lib/api/*.ts`) → `api` client ([src/lib/apiClient.ts](src/lib/apiClient.ts)). All request/response shapes live in [src/lib/types.ts](src/lib/types.ts), which is the contract with the backend. Keep this seam intact.

- **`apiClient.ts`:** attaches the Google ID token as `Authorization: Bearer`, unwraps the backend's `{ data, meta }` envelope (returns `data`), and throws `ApiError` carrying the HTTP `status`. Callers branch on it, e.g. 404 → "no profile yet" in `useMe`. A 401 calls `expireSession(token)` ([googleAuth.ts](src/lib/googleAuth.ts)) to fall back to the sign-in screen.
- **`queries.ts`:** the single home for query keys (`queryKeys`) and all React Query hooks.
  - Room queries are `enabled` only when a user is signed in, and `useRooms` polls every 15 s. `useRoom` doesn't retry 403/404: those are answers, not glitches.
  - `useRoomLifecycle` holds join (with an optional invite code), leave, start, end and `changeTopic`. `useRoomInvites` holds the owner's invite mutations.
  - **Every Room goes through `useApplyRoom`**, whether it's the REST response to your own action or the `roomUpdated` socket push. It *merges* (`mergeRoom`) rather than replaces, because the push is the non-owner view: replacing would wipe the owner's `invitedEmails`/`inviteCode`.

**Auth & gating.** "Sign in with Google" via **Google Identity Services** (GIS), no Firebase. The API verifies the raw Google ID token on every request; its `sub` claim is the user's `uid`.

- [src/lib/googleAuth.ts](src/lib/googleAuth.ts) loads GIS, holds the current ID token in memory and decodes it into an `AuthUser` (`{ uid, email, displayName, picture }`). It exposes `getIdToken()` (silently re-issues an expired token via One Tap), `renderSignInButton`, `signOut` and an `onAuthChange` subscription.
- [AuthProvider](src/components/auth/AuthProvider.tsx) wraps that in `useAuth()`. On load it calls `restoreSession()` to sign returning users back in silently (`auto_select`).
- Auth-gated pages wrap their content in `<RequireAuth>`, which shows `SignInScreen` (the official GIS button) when signed out, then `<ProfileGate>`. `ProfileGate` shows `ProfileOnboarding` (just a display name) only when the profile has no name (`hasProfile`): the API fills it from the Google account on first sign-in, so most people never see it. Onboarding calls `PUT /users/me`. There are no English levels in the product.
- **Signing out** (`useAuth().signOut`) goes to the landing page; `RequireAuth` shows "Signing out…" meanwhile instead of flashing the sign-in screen. A session that *expires* (a 401 → `expireSession`) stays on the page and shows the sign-in screen.
- **Signed-in people never see the landing.** [LandingGate](src/components/marketing/LandingGate.tsx) wraps `/` and `router.replace`s a signed-in user to `/practice`. GIS restores the session client-side, so the server always renders the landing. To avoid flashing it at returning users, [sessionHint.ts](src/lib/sessionHint.ts) keeps a `localStorage` flag (set on sign-in, cleared on sign-out), and while auth is still loading the gate shows "Signing you in…" when the flag is set. First-time visitors see the landing at once. If the session can't be restored (expired, One Tap dismissed), the landing appears once loading ends.
- The same fresh ID token authenticates REST calls and the Socket.IO handshake.

**Routes** ([src/app/](src/app/)): `/` is the one-screen landing page. `/practice` is the room list and "Create a room" modal ([RoomsBrowser](src/components/practice/RoomsBrowser.tsx)). `/practice/[roomId]` is the live room ([RoomExperience](src/components/practice/room/RoomExperience.tsx)); the page passes `?invite=<code>` down from `searchParams`. `/quests` is the learner's side quests ([SideQuestBoard](src/components/quests/SideQuestBoard.tsx)). All three wrap their content in `<RequireAuth>` then `<ProfileGate>` and use [AppHeader](src/components/app/AppHeader.tsx), which links to `/quests` with the open count. Any other URL (or a `notFound()` call) renders [not-found.tsx](src/app/not-found.tsx), a landing-style 404 where the host "changes the topic" and links back to `/` and `/practice`; it is public, light-only and returns HTTP 404.

**Rooms are invite-only.** The API returns 403 for a room unless you're the owner or your Google email is on its invite list, and `GET /rooms` lists only your own and invited rooms. In [RoomExperience](src/components/practice/room/RoomExperience.tsx):

- **Invitations on `/practice`, the in-app twin of the invite email.** `GET /rooms` already returns every open room you own or are invited to; `splitRooms` ([roomList.ts](src/lib/roomList.ts)) splits it into *Invitations* (not yours, no seat yet) and *Your rooms*, and the All/Open/Live filter applies to both. Past rooms are a separate query (`useEndedRooms` → `GET /rooms?status=ended`, most recently ended first), loaded for **All** and **Ended**. `roomSections` ([roomList.ts](src/lib/roomList.ts)) decides what each filter shows: All = Invitations, Your rooms, then an Ended section; Open/Live narrow the current rooms; Ended shows only past rooms (with their report status, no create card). Ending a room invalidates the ended list. [InviteCard](src/components/practice/InviteCard.tsx) shows who invited you (`room.ownerName`) and an Accept button (`useAcceptInvite`, i.e. `POST /rooms/:id/join`). Accepting takes a seat: a live room opens straight away; a waiting one moves to Your rooms. A full room's button is disabled, and a 409/403 on accept refetches the list. There's no decline yet.
- A 403 with `?invite=<code>` is redeemed via `join(inviteCode)`, then the code is stripped with `router.replace`.
- A 403 without a code, a 404, or a `removedFromRoom` socket event (the owner revoked you) renders [RoomAccessScreen](src/components/practice/room/RoomAccessScreen.tsx).
- The owner opens [InvitePanel](src/components/practice/room/InvitePanel.tsx) from "Invite" in the control bar ("Guests" after the start) to manage the list and the invite link. It shows used/total **spots** (`maxParticipants` − 1, the owner takes a seat): when every spot is taken, the add form is replaced by "remove someone first". **Once the room starts, the guest list is locked**: the panel turns read-only (no add, remove or link controls), matching the API's 409s. The panel builds the link from `window.location`, so it must only mount client-side.
- Email parsing (`parseEmails`), `MAX_INVITES` and link building (`inviteLink`) live in [src/lib/invites.ts](src/lib/invites.ts).

**Create-room modal** (`CreateRoomModal` in [RoomsBrowser](src/components/practice/RoomsBrowser.tsx)): an opening topic or "let the AI host pick" (a 503 offers "Try again" or "Type one myself"), length, seats, and invitees. The form helper is [roomForm.ts](src/lib/roomForm.ts).

- **Invite field:** [EmailListInput / useEmailList](src/components/practice/EmailListInput.tsx). Enter, a comma, a space or the Add button adds an address; pasting adds a whole list; Backspace in the empty field removes the newest. A duplicate highlights the existing row.
- **No add-on-blur, on purpose:** adding a row on blur shifts the layout under the submit click and swallows it. The form calls `flush()` on submit instead, so a typed-but-not-added address is kept.
- **One spot per seat:** `useEmailList(selfEmail, max)` takes the free spots (`maxParticipants` − 1); addresses past it stay in the field with an error rather than being dropped. Lowering the room size below the invitees already added shows an error and disables Create until some are removed. A backdrop click closes the modal only while the form is empty.

**Realtime room loop.** [useRoomSocket](src/lib/useRoomSocket.ts) owns one room's connection, and connects only once the user is a participant: a `joinRoom` that beats the REST join is rejected.

- **Startup:** seeds history from REST (`getTranscript` / `getHostMessages`), then connects the `/rooms` namespace ([socket.ts](src/lib/socket.ts)) and emits `joinRoom` on every (re)connect.
- **Events into state:** `transcript`, `hostMessage`, `presence`, `roster` (replaces who's connected), `removedFromRoom` and `sessionEnded` go through the pure `roomReducer` in [roomHistory.ts](src/lib/roomHistory.ts). That file also merges transcript and host lines by `at` and derives the current topic: the latest `hostMessage.topic`, falling back to `room.topic`, which is only the opening topic. `roomUpdated` bypasses the reducer and goes to `useApplyRoom`, so membership, status and `scheduledEndAt` always come from the `Room`; `presence` is only online status.
- **Auth and reconnects:** the handshake's `auth` is a callback, so every (re)connect sends a fresh ID token (Cloud Run ends each socket at its 1-hour timeout, about when the token expires). A refused handshake (`connect_error` with `!socket.active`) or a server disconnect is retried with backoff (1–16 s, 5 tries), then reported. **Every reconnect refetches the room and the host's lines**, because a reconnect can land on the other API instance after events were missed.

**Side quests are read-only.** The AI host maintains each learner's private list of topic-independent habits: up to 3 added when a room they spoke in ends, at most 20 open, checked off when it hears they've got one. The UI never offers add or remove. `useSideQuests` refetches on every mount, because the list changes whenever a room ends. The report view's [RoomQuestSummary](src/components/quests/RoomQuestSummary.tsx) shows what that room added and completed for the viewer (`roomQuestChanges` in [sideQuests.ts](src/lib/sideQuests.ts)); the API writes quests before it marks the room ended, so they're already there. [QuestCard](src/components/quests/QuestCard.tsx) colors each skill: grammar purple, vocabulary lime, fluency coral, interaction neutral.

**The AI host is a permanent member of every room, not a participant.** It listens to the transcript and, when it decides, *announces* a new, unrelated topic: `hostMessage.message` is the exact sentence it says, and there is no accept/reject. `HostBanner` in RoomExperience shows its latest line and history; the host has no tile of its own (it never takes a seat). The banner's badge is a graduation cap (`GraduationCap`). **A new line is held back for a 3-second countdown** ([topicReveal.ts](src/lib/topicReveal.ts), `REVEAL_DELAY_MS`): the banner shows "New topic in 3… 2… 1…" (`TopicCountdown`, with a bar that drains) over the current topic, then reveals the line and topic and the host speaks it. Only lines that arrive live count down. History from REST and lines older than `FRESH_WINDOW_MS` show at once. Feed `reveal.visible`, not the raw list, to anything that shows or speaks host lines. Each client counts from when it receives the line, so a room stays in step to within socket latency. The owner's Change topic button is disabled during a countdown. [hostVoice.ts](src/lib/hostVoice.ts) reads each revealed line aloud (never seeded history; mutable). **The voice comes from the API:** `apiSpeechOutput` fetches the line's MP3 (`roomsApi.hostSpeech` → `GET /rooms/:id/host-messages/:messageId/speech`, a natural Google Cloud voice, through `api.blob` because it isn't in the JSON envelope). It loads `upcoming` during the countdown and plays lines one after another. A line it can't fetch or play (network, autoplay not yet allowed) is said with the browser's `speechSynthesis` instead, and after a 503 (the API's voice is off) every line is. For that browser fallback, `pickHostVoice` chooses the most natural English voice the browser has (Edge's "(Natural)", Apple's "(Premium)"/"(Enhanced)", Chrome's "Google US English", Android's network voices) and avoids eSpeak and Apple's novelty voices. Left to itself, the browser uses its default voice, which on Linux is robotic. Quality still depends on the browser and OS. Only the **owner** gets the "Change topic" control (the API returns 403 to anyone else); its response is added straight away and also arrives as `hostMessage`, deduped by id.

**One mic button drives speech-to-text and voice.** Each client transcribes its own mic with the Web Speech API ([useSpeechRecognition.ts](src/lib/useSpeechRecognition.ts)) and emits `transcript`, which feeds the host and the report. It can be on before the room starts, but words go out only while live. The same button mutes the voice mesh (`useVoiceMesh({ muted })`, which disables the track and keeps the connection). Without the Web Speech API (e.g. Firefox) the button still mutes and unmutes voice; the AI just can't hear that person.

**Voice is a P2P WebRTC mesh.** [useVoiceMesh.ts](src/lib/useVoiceMesh.ts) signals through the API's `webrtc:*` relay while the room is live; audio flows browser-to-browser.

- **Connecting:** the joiner offers to every peer in `webrtc:peers`. If two people joined at once and offered each other (glare), the lower uid keeps its offer and the other answers it, using the `selfUid` option.
- **Replacing and dropping:** any other new offer or peers list replaces the existing connection to that uid (it never renegotiates). `webrtc:peer-left` drops a peer immediately, and a socket reconnect rebuilds the whole mesh.
- **ICE servers:** they come from the API (`roomsApi.iceServers`: STUN, plus TURN with a short-lived credential when the deployment has a relay) and are re-fetched on every reconnect. If the call fails, the mesh falls back to public STUN.
- **Leaving:** the Leave button calls `POST /leave` to free the seat (rooms cap at 5), then goes back to `/practice`; closing the tab doesn't.

**Landing page** ([src/app/page.tsx](src/app/page.tsx)) is **one screen** on the cream canvas, built from the Stitch screen "PartyTalk - Playful One-Screen Landing Page" (project "PartyTalk Landing Page"). It is only for signed-out visitors (see `LandingGate` above), so the signed-in labels below are only a fallback:
- a header with the wordmark, a purple "Voice rooms" pill and [LandingAuthLink](src/components/marketing/LandingAuthLink.tsx), which reads "Sign in", or "Your rooms" once signed in;
- the headline, whose last word is a tilted lime sticker, and one paragraph;
- a white card with the three steps (invite, talk, report) and one lime "Sign in with Google" button ([LandingSignInButton](src/components/marketing/LandingSignInButton.tsx)): it goes to `/practice` and opens Google's account chooser in the same click (only Google's own rendered button can open its popup; the sign-in screen there is the fallback). The Google "G" stays unmodified on white, per Google's branding rules. Signed in, it reads "Go to your rooms". The header's Sign in carries the animated [TalkingIcon](src/components/marketing/TalkingIcon.tsx);
- [RoomPreview](src/components/marketing/RoomPreview.tsx), a decorative client-side mock of a room: the AI host's latest line (graduation-cap badge), four speaker tiles and the report; the host has no tile. Its speaker, the host's topic and the clock change on a timer and hold still under `prefers-reduced-motion`;
- a footer bar of feature pills.

It doesn't use `SiteLayout`; `SiteLayout`, `SiteHeader` and `SiteFooter` are unused IELTS-era leftovers.

- **Fitting one screen:** Tailwind's custom `short` screen (`max-height: 760px`, in [tailwind.config.ts](tailwind.config.ts)) tightens spacing and type on laptop-height and small-phone screens. Stacked variants like `lg:short:` and `sm:short:` win over single ones.
- **No `max-*` width variants:** they don't generate once a raw screen exists in the config, so write `short:hidden sm:short:block`, not `max-sm:`.
- **Headline:** "Learning comes with friction." The product's idea is friction (the host's unexpected topic changes), so the headline names it and "friction." gets the tilted lime sticker. Sizes are chosen so it wraps to two lines on desktop, with the sticker ending the second.
- **Copy:** keep it truthful to what the product does. The Stitch screen's copy is placeholder (online counts, ratings, "60+ languages", grammar scores, a heat-level picker): take its look, not its claims. No invented stats or social proof, and no features that don't exist (the AI changes topics and writes a report; it does not correct grammar live).

**Providers.** [providers.tsx](src/components/providers.tsx) wraps the app in `QueryClientProvider` (60 s `staleTime`, `retry: 1`, no refetch-on-focus) then `AuthProvider`.

## Contract with partytalk-api

Nothing enforces this contract: [src/lib/types.ts](src/lib/types.ts) is a hand-written mirror of the API's entities and DTOs. The API's Swagger UI (`http://localhost:8080/docs` locally) is the live reference. [API_HANDOFF.md](API_HANDOFF.md) is the original backend brief from when this app ran on mocks; treat it as history, not as the current spec. If a feature needs an API change, don't edit `../partytalk-api` unless the user asks; describe the exact change needed (route, field, type, status code) in your report.

- **REST** is under `/api/v1`, and every response is `{ data, meta }`.
  - **Requests:** the API validates with `forbidNonWhitelisted`, so **sending any field the DTO doesn't declare is a 400**. Send exactly the documented shape.
  - **Status codes the UI depends on:** 401 means re-sign-in; 403 means not invited, or not the owner for owner-only actions; 404 means not found (or no profile on `GET /users/me`); 409 means the room is full, already started or has ended; 503 on `POST /rooms` means the host couldn't pick a topic.
- **Routes the web uses:**
  - `GET/PUT /users/me`, `GET /users/me/side-quests` (open first, then completed; read-only);
  - `POST /rooms` (`topic` or `hostPicksTopic: true`, plus `maxParticipants?`, `durationMinutes?`, `invitedEmails?`) and `GET /rooms` (open rooms; `?status=ended` for past ones);
  - per room: `GET /rooms/:id`, `POST :id/join { inviteCode? }`, `POST :id/leave`, `POST :id/start`, `POST :id/end`, `GET :id/transcript`, `GET :id/host-messages`, `POST :id/change-topic`, `GET :id/ice-servers`;
  - owner invites: `POST :id/invites { emails }`, `DELETE :id/invites/:email`, `POST/DELETE :id/invite-link`.
  - Start, end, change-topic and the invite routes are **owner-only**.
- **Limits mirrored in the UI:** `MAX_INVITES` = 50; `maxParticipants` 2–5, the owner included (default 5; no solo rooms; voice is a P2P mesh); `durationMinutes` ∈ `ROOM_DURATIONS` (5/10/15/30/45/60, default 30); topic 3–120 chars.
- **Owner-only fields:** a non-owner never receives `invitedEmails` / `inviteCode`, including in `roomUpdated`.
- **Socket.IO** namespace `rooms`; the names must match the API gateway's handlers and emits.
  - **Client→server** (`ClientToServerEvents`): `joinRoom`, `leaveRoom`, `transcript`, `webrtc:join`, `webrtc:offer`, `webrtc:answer`, `webrtc:ice`.
  - **Server→client** (`ServerToClientEvents`):
    - room state: `roomUpdated` (the full Room, non-owner view; merge it), `presence`, `roster` (sent to you on `joinRoom`), `transcript`;
    - AI host: `hostMessage` (automatic and manual, to everyone), `sessionEnded { roomId, report? }` (the report is best-effort and may be absent);
    - access: `removedFromRoom`, `error`;
    - voice: `webrtc:peers`, `webrtc:peer-offer`, `webrtc:peer-answer`, `webrtc:peer-ice`, `webrtc:peer-left`.
- **Auth.** The GIS ID token is sent as `Authorization: Bearer` on REST and as `auth.token` in the socket handshake. The API's `GOOGLE_OAUTH_CLIENT_ID` must equal `NEXT_PUBLIC_GOOGLE_CLIENT_ID`; a mismatch is a 401 on every call. A refused handshake reaches the client as `connect_error`.
- **What the API does that the UI relies on:**
  - It ends a live room by itself at `scheduledEndAt` and emits `sessionEnded`. If that's missed, the room refetches when the countdown hits zero.
  - It emails invitees the room link on create and on add (new addresses only, and only when the deployment has SMTP configured). The UI copy says so.
  - Revoking an invite evicts that person live and frees their spot.
  - The guest list holds at most `maxParticipants` − 1 invitations (400 on create, 409 on add or link redemption beyond that), and it is **locked once the room starts**: add, revoke and the invite-link routes return 409, and a link redeemed after the start gets 409. Invitees can still join late.
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
- **Styling is Tailwind v3 with semantic design tokens**, not raw colors. The palette comes from the Google Stitch project "PartyTalk Landing Page" (the screen's own Tailwind config; that project's DESIGN.md text describes a different, older direction) and lives in [tailwind.config.ts](tailwind.config.ts):
  - The Material-style roles (`primary`, `surface`, `on-surface-variant`, …) carry it: `primary` is ink `#141517`, surfaces are cream `#faf7f0`, `tertiary-fixed`/`primary-fixed` are lime, `secondary` is a deep coral that passes AA.
  - Brand names mean that exact color: `ink`, `cream`, `lime` (`-light`, `-dim`), `purple` (`-light`), `coral`. Purple means the AI host. Lime means action, "live" and speaking. Bright `coral` is a fill for ink text only; use `secondary` for coral text or white-on-coral.
  - The look is chunky: `border-2 border-ink` plus a hard offset shadow (`shadow-pop-sm` / `shadow-pop` / `shadow-pop-lg`), pill buttons that press in on hover (`hover:translate-x-px hover:translate-y-px hover:shadow-none`), and tilted lime "sticker" highlights. [Button](src/components/ui/Button.tsx) has the variants.
  - The live room matches the landing's room card (`RoomPreview`): cream page with `bg-dots`, a landing-style header (title, Live/Waiting chip, seats, countdown pill, Invite/Guests), the gradient `HostBanner` (the host's exact line, the current topic as a white sticker with a coral underline, earlier topics folding out), white ink-outlined tiles that turn lime and lift (`shadow-pop`) while someone speaks, and a white pill control dock (mic lime when on, coral when off; Start lime; End/Leave red).
  - **The room moves, its background doesn't.** The page is the static `bg-dots` texture; a moving backdrop was tried and removed, so don't add one back. Tiles pop in (staggered by grid index), idle avatars bob out of step, and a speaker's avatar sends out lime ripples. The host card is the most alive part. Its gradient sits on a layer twice its width that slides to and fro (`gradient-pan`). That layer is clipped with `clip-path: inset(0 round 14px)`, not `overflow-hidden` + `rounded-*`: Chrome lets a moving layer bleed over a rounded overflow clip, which smeared the card's ink border. A sheen crosses it now and then. The graduation-cap badge nods while the host listens (`tilt`, with bouncing `ListeningDots` beside the status) and sends out white ripples with ink-ringed `VoiceBars` while it speaks. [TopicBurst](src/components/practice/room/TopicBurst.tsx) fires confetti once when a topic is revealed after its countdown (`topicReveal`'s `revealed`, never for history). The owner's Start icon nudges like the landing CTA, and the clock pulses in the last minute. Keyframes are in the Tailwind config. Rules: animate only `transform`/`opacity` (a voice call and speech-to-text are running), put every animation behind `motion-safe:` and check that the reduced-motion state still looks right, and keep fills opaque (`bg-card` plus a tint). `pop-in` uses `backwards` fill so a speaking tile's lift still applies afterwards. `cn` is plain `clsx` (no tailwind-merge), so a conflicting class in `className` doesn't reliably override a component's own; wrap the component instead.
- **Dark mode is for signed-in screens only.** Colours that change with the theme are CSS variables (RGB channels on `:root` for light, `.dark` for dark, in [globals.css](src/app/globals.css)) referenced through `themed()` in the Tailwind config. [ThemeScope](src/components/app/ThemeScope.tsx) adds `.dark` around whatever [RequireAuth](src/components/auth/RequireAuth.tsx) renders for a signed-in user (and its session-restore spinner), so the landing and sign-in screens stay light. The choice is per device (`localStorage`, [theme.ts](src/lib/theme.ts), read with `useSyncExternalStore` so hydration always sees light), toggled from the account menu, default light. When adding UI on signed-in screens:
  - `text-ink`/`border-ink` flip (near-white on dark). Text on a **bright fill** (solid lime or coral, the AI host banner, a white sticker) must use `text-ink-fixed`. Dark chips that should stay dark use `bg-ink-fixed`.
  - Card and panel backgrounds are `bg-card`, not `bg-white`. Plain `white` is for text on purple or danger fills, and for stickers inside the bright banner.
  - Purple *text* is `text-purple-fg` (lighter on dark); `bg-purple` is the fill. Destructive fills are `bg-danger` (white text in both themes); `text-secondary` is coral text.
  - `shadow-pop*` is ink in light and black in dark. The modal backdrop is `bg-ink-fixed/50`.
- Fonts, wired in [src/lib/fonts.ts](src/lib/fonts.ts) and the root layout: **Plus Jakarta Sans** (body, `font-sans`), **Bricolage Grotesque** (headlines, names and buttons, `font-display`) and **Space Grotesk** (small all-caps pills, badges and timers, `font-label`). Icons: `lucide-react`.
- `cn()` ([src/lib/cn.ts](src/lib/cn.ts)) for conditional class names.
- Work on the local checkout as it is: don't pull, and don't ask to pull. Commit or push only when the user asks.
