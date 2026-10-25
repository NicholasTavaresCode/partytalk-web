# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

**Heed the warning above.** This is Next.js 16 + React 19 — APIs and conventions differ from older Next.js. Before writing framework code (routing, metadata, server/client boundaries, `next.config`), read the relevant guide under `node_modules/next/dist/docs/` (`01-app/` for App Router). Don't assume training-data Next.js behavior.

## Commands

```bash
npm run dev     # dev server on http://localhost:3000 (port is pinned)
npm run build   # production build
npm run start   # serve the build on 3000
npm run lint    # eslint (flat config, next core-web-vitals + typescript)
./deploy-hml.sh # Cloud Build (cloudbuild.yaml → Dockerfile) + Cloud Run deploy to HML
```

Production images use `output: "standalone"` and run `node server.js` (see [Dockerfile](Dockerfile)). `NEXT_PUBLIC_*` values are inlined at **build** time, so they're Docker build args fed by `deploy-hml.sh` through `cloudbuild.yaml` (`gcloud run deploy --source` can't pass build args). Changing one means rebuilding the image. `.env*` files are kept out of the build context on purpose.

If `next dev` prints `FATAL: An unexpected Turbopack error occurred` with "Next.js package not found" in the panic log (the page loops on "[Fast Refresh] rebuilding"), Turbopack's persistent dev cache in `.next/dev/cache` is stale — typically after `node_modules` was reinstalled. Stop the server, `rm -rf .next`, restart. It only shows up with a browser attached (HMR), not with `curl`.

There is no test runner configured. The web app runs on **3000**; it expects the PartyTalk API (NestJS) on **8080** (`/api/v1` REST, Socket.IO namespace `/rooms`, Swagger at `:8080/docs`), as set in `.env.local.example`. Both must run for the rooms feature to work end to end. Copy `.env.local.example` → `.env.local` and set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (must equal the API's `GOOGLE_OAUTH_CLIENT_ID`); until then the app boots but the sign-in screen shows a "not configured" notice (`googleConfigured` in [src/lib/env.ts](src/lib/env.ts)). Keep the API URLs set: `env.ts` falls back to `localhost:3000`, which is this dev server, not the API.

Dev-only auth bypass: `NEXT_PUBLIC_DISABLE_AUTH=true` skips the GIS gate with a fake dev user. Requests then go out unauthenticated unless `NEXT_PUBLIC_DEV_BEARER_TOKEN` holds a real Google ID token (e.g. copied from Swagger's Authorize dialog). Pair it with the API's `AUTH_DISABLED=true` for REST; the Socket.IO handshake always needs a real token.

## Architecture

**The integration seam (read this first).** Components **never call `fetch` directly**. Data flows: component → React Query hook ([src/lib/queries.ts](src/lib/queries.ts)) → typed fetcher (`src/lib/api/*.ts`) → `api` client ([src/lib/apiClient.ts](src/lib/apiClient.ts)). All request/response shapes live in [src/lib/types.ts](src/lib/types.ts) and are the contract with the backend (the API's Swagger at `/docs` is the live reference; [API_HANDOFF.md](API_HANDOFF.md) is the original backend brief from when this app ran on mocks — historical, not the current spec). Change a data shape in one place and it propagates; keep this seam intact.

- **`apiClient.ts`** — attaches the Google ID token as `Authorization: Bearer`, unwraps the backend's `{ data, meta }` envelope (returns `data`), and throws `ApiError` carrying the HTTP `status` (callers branch on it, e.g. 404 → "no profile yet" in `useMe`).
- **`queries.ts`** — the single home for query keys (`queryKeys`) and all React Query hooks. Room queries are `enabled` only when a user is signed in; `useRooms` polls every 15s; mutations invalidate/`setQueryData` to keep the cache fresh.

**Rooms are live against the real API. IELTS is parked on mock data** and unlinked everywhere while `IELTS_ENABLED` in [src/lib/features.ts](src/lib/features.ts) is false (the pages still exist). `src/lib/api/rooms.ts` and `users.ts` hit real REST endpoints; `src/lib/api/ielts.ts` returns in-repo mock objects via `Promise`, seeded as React Query `initialData`. The IELTS pages (`/ielts/*`) are a parked simulator — don't wire them to the API unless asked.

**Auth & gating.** "Sign in with Google" via **Google Identity Services** (GIS) — no Firebase. The API verifies the raw Google ID token on every request (its `sub` claim is the user's `uid`). [src/lib/googleAuth.ts](src/lib/googleAuth.ts) loads GIS, holds the current ID token in memory, decodes it into an `AuthUser` (`{ uid, email, displayName, picture }`), and exposes `getIdToken()` (silently re-issues on expiry via One Tap), `renderSignInButton`, `signOut`, and an `onAuthChange` subscription. [AuthProvider](src/components/auth/AuthProvider.tsx) wraps that in `useAuth()` and, on load, calls `restoreSession()` to silently sign returning users back in (`auto_select`). `SignInScreen` renders the official GIS button; auth-gated pages wrap content in `<RequireAuth>` (→ `SignInScreen` if signed out) then `<ProfileGate>` (→ `ProfileOnboarding` if the user has no profile — first sign-in calls `PUT /users/me`). The same fresh ID token authenticates both REST calls and the Socket.IO handshake. Requires `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (OAuth web client, with the app origin in "Authorized JavaScript origins").

**Rooms are invite-only.** The API returns 403 for a room unless you're the owner or your Google email is on its invite list, and `GET /rooms` only lists your own/invited rooms. In [RoomExperience](src/components/practice/room/RoomExperience.tsx): a 403 with `?invite=<code>` in the URL (passed down from the page's `searchParams`) is redeemed via `join(inviteCode)`, then the code is stripped with `router.replace`; a 403 without one, a 404, or a `removedFromRoom` socket event (owner revoked you) render [RoomAccessScreen](src/components/practice/room/RoomAccessScreen.tsx). `useRoom` doesn't retry 403/404. The owner manages invites and the invite link in [InvitePanel](src/components/practice/room/InvitePanel.tsx) (`useRoomInvites`, which writes the returned room straight into the cache); `invitedEmails`/`inviteCode` only ever arrive for the owner. Email parsing and link building live in [src/lib/invites.ts](src/lib/invites.ts).

**Realtime room loop.** [useRoomSocket](src/lib/useRoomSocket.ts) owns one room's connection: it seeds topic suggestions from REST (`getSuggestions`), then connects the `/rooms` Socket.IO namespace ([socket.ts](src/lib/socket.ts)) and streams `topicSuggested` / `presence` / `sessionEnded` events into React state. The handshake's `auth` is a **callback** ([socket.ts](src/lib/socket.ts)), so every (re)connect sends a fresh ID token — Cloud Run ends each socket at its 1-hour request timeout, exactly when the old token expires. A refused handshake (`connect_error` with `!socket.active`) or server disconnect is retried with backoff (1–16 s, 5 tries), then `connection` becomes `"failed"` and the header offers Reconnect; drops are otherwise shown as "Reconnecting…". A REST 401 calls `expireSession(token)` ([googleAuth.ts](src/lib/googleAuth.ts)) to fall back to the sign-in screen. Other people's changes arrive as `roomUpdated`, which invalidates the room query (tiles and `live` status come from that REST copy), and as `roster` on (re)join, which replaces the `presence` map of who's connected. It emits `joinRoom` only once the socket is connected **and** the user is a participant, re-emitting when either flips: opening a room card starts the REST join concurrently with the socket, and the server rejects (silently, from the UI's view) a `joinRoom` that arrives first. Voice is gated the same way. Each client transcribes its own mic via the browser Web Speech API ([useSpeechRecognition.ts](src/lib/useSpeechRecognition.ts)) and emits `transcript` events. **The transcript is never shown in the UI** — it only feeds the AI host's topic suggestions and end-of-room report, so the client ignores `transcript` broadcasts. Browsers without the Web Speech API (e.g. Firefox) get a disabled mic button; the AI can't hear those participants. [RoomExperience](src/components/practice/room/RoomExperience.tsx) is the main live-room UI. Socket event types are in `types.ts` (`ServerToClientEvents` / `ClientToServerEvents`).

**Voice is a P2P WebRTC mesh.** [useVoiceMesh.ts](src/lib/useVoiceMesh.ts) signals through the API's `webrtc:*` relay; audio flows browser-to-browser. The joiner offers to every peer in `webrtc:peers`; any new offer/peers list replaces the existing connection to that uid (never renegotiates), `webrtc:peer-left` drops a peer immediately, and a socket reconnect rebuilds the whole mesh. ICE servers come from the API (`roomsApi.iceServers`: STUN + TURN with a short-lived credential when the deployment has a relay), re-fetched on every reconnect; if the call fails it falls back to public STUN. Both exits ("Leave" and "← Rooms") call `POST /leave` to free the seat (rooms cap at 5); closing the tab doesn't.

**Providers.** [providers.tsx](src/components/providers.tsx) wraps the app in `QueryClientProvider` (60s `staleTime`, `retry: 1`, no refetch-on-focus) then `AuthProvider`.

## Conventions

- `@/*` path alias → `src/*` (tsconfig). Client components need `"use client"`.
- **Styling is Tailwind v3 with semantic design tokens**, not raw colors — use `bg-surface`, `text-primary`, `text-on-surface-variant`, `rounded-pill`, `font-display`, etc. The full token scale (Material-style, lifted from a Google Stitch design system) is defined in [tailwind.config.ts](tailwind.config.ts). Prefer tokens over hex values so the IELTS and marketing surfaces stay consistent.
- Fonts: **Arimo** (body, `font-sans`) and **Sora** (marketing display, `font-display`), wired in [src/lib/fonts.ts](src/lib/fonts.ts) and the root layout. Icons: `lucide-react`.
- `cn()` ([src/lib/cn.ts](src/lib/cn.ts)) for conditional class names.
