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
npm run dev     # dev server on http://localhost:3000 (port is pinned)
npm run build   # production build
npm run start   # serve the build on 3000
npm run lint    # eslint (flat config, next core-web-vitals + typescript)
npx tsc --noEmit
./deploy-hml.sh # Cloud Build (cloudbuild.yaml → Dockerfile) + Cloud Run deploy to HML
```

- **Lint:** `npm run lint` has one pre-existing error in the parked `src/app/ielts/speaking/page.tsx` (`react-hooks/set-state-in-effect`). Lint the files you touched with `npx eslint <paths>`.
- **Stale route types:** if `tsc` complains about a route that no longer exists, it is reading stale generated types. Run `rm -rf .next/dev/types .next/types` and check again.
- **Builds:** production images use `output: "standalone"` and run `node server.js` (see [Dockerfile](Dockerfile)). `NEXT_PUBLIC_*` values are inlined at **build** time, so they're Docker build args fed by `deploy-hml.sh` through `cloudbuild.yaml` (`gcloud run deploy --source` can't pass build args). Changing one means rebuilding the image. `.env*` files are kept out of the build context on purpose.
- **Turbopack panic:** if `next dev` prints `FATAL: An unexpected Turbopack error occurred` with "Next.js package not found" in the panic log (the page loops on "[Fast Refresh] rebuilding"), Turbopack's persistent dev cache in `.next/dev/cache` is stale, typically after `node_modules` was reinstalled. Stop the server, `rm -rf .next`, restart. It only shows up with a browser attached (HMR), not with `curl`.

## Running locally

- **The API must run too.** The web app runs on **3000** and expects the API on **8080**: `/api/v1` REST, Socket.IO namespace `/rooms`, Swagger at `:8080/docs`. In `../partytalk-api`, run `docker compose up firestore` (the emulator) and `npm run start:dev`.
- **Env:** copy `.env.local.example` → `.env.local` and set `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, which must equal the API's `GOOGLE_OAUTH_CLIENT_ID`. Until then the app boots but the sign-in screen shows a "not configured" notice (`googleConfigured` in [src/lib/env.ts](src/lib/env.ts)). Keep the API URLs set: `env.ts` falls back to `localhost:3000`, which is this dev server, not the API.
- **Sign-in origin:** "Sign in with Google" works only on origins listed in the OAuth client, which locally is `http://localhost:3000`. On any other port, GIS's status call returns 403 and sign-in fails, so auth-gated pages can't be reached there.
- **Dev auth bypass:** `NEXT_PUBLIC_DISABLE_AUTH=true` skips the GIS gate with a fake dev user. Requests then go out unauthenticated unless `NEXT_PUBLIC_DEV_BEARER_TOKEN` holds a real Google ID token (e.g. copied from Swagger's Authorize dialog). Pair it with the API's `AUTH_DISABLED=true` for REST; the Socket.IO handshake always needs a real token.
- **Dev servers:** the user usually runs their own `next dev` on 3000; reuse it and its log. If you need your own, run `npx next dev -p <other port>` and stop only the PIDs you started. Never kill by pattern.

## Verifying UI changes

There is no test runner. Before you call a change done, run `npx tsc --noEmit`, `npx eslint` on the changed files and `npm run build`. Then look at it:

- **Tooling:** drive headless Chromium with `playwright-core`, installed in a scratch directory and not in this repo, against a dev server. Take screenshots and read console errors.
- **Pages behind sign-in:** `/practice` and the room pages need a real Google sign-in. Render the component you changed from a temporary harness page under `src/app/<name>/page.tsx` (export the component temporarily if needed), screenshot it, then delete the harness, revert the export and clear `.next/dev/types`.
- **Dev overlay badge:** a red "1 Issue" badge while signed out is Google sign-in's FedCM message ("Provider's accounts list is empty"), not an app error.
- **Landing page:** it must stay **one screen with no scrolling**. Check that `document.documentElement.scrollHeight` is at most the viewport height, and that the page doesn't scroll horizontally, at 1440×900, 1366×657, 1280×720, 1024×640, 768×1024, 390×844 and 375×667.

## Architecture

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

- `@/*` path alias → `src/*` (tsconfig). Client components need `"use client"`; keep pages as server components where possible, e.g. the landing page, which exports `metadata` and imports small client pieces.
- **Styling is Tailwind v3 with semantic design tokens**, not raw colors. Use `bg-surface`, `text-primary`, `text-on-surface-variant`, `rounded-pill`, `font-display`, etc. The full token scale (Material-style, from a Google Stitch design system: navy `primary`, red `secondary`, gold `tertiary-fixed`) is defined in [tailwind.config.ts](tailwind.config.ts). Prefer tokens over hex values. The live room's dark surfaces (`#202124`, `#3c4043`) are the one deliberate exception.
- Custom animations live in `tailwind.config.ts`: `fade-up`, `float`, `eq`, `aurora`, `topic-in`, `pulse-ring`. Use them as `motion-safe:animate-*`. Texture utilities (`bg-grid`, `bg-dots`) are in [globals.css](src/app/globals.css).
- Fonts: **Arimo** (body, `font-sans`) and **Sora** (display, `font-display`), wired in [src/lib/fonts.ts](src/lib/fonts.ts) and the root layout. Icons: `lucide-react`.
- `cn()` ([src/lib/cn.ts](src/lib/cn.ts)) for conditional class names.
- Work on the local checkout as it is: don't pull, and don't ask to pull. Commit or push only when the user asks.
