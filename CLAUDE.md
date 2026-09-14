# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

**Heed the warning above.** This is Next.js 16 + React 19 — APIs and conventions differ from older Next.js. Before writing framework code (routing, metadata, server/client boundaries, `next.config`), read the relevant guide under `node_modules/next/dist/docs/` (`01-app/` for App Router). Don't assume training-data Next.js behavior.

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

**Providers.** [providers.tsx](src/components/providers.tsx) wraps the app in `QueryClientProvider` (60s `staleTime`, `retry: 1`, no refetch-on-focus) then `AuthProvider`.

## Conventions

- `@/*` path alias → `src/*` (tsconfig). Client components need `"use client"`.
- **Styling is Tailwind v3 with semantic design tokens**, not raw colors — use `bg-surface`, `text-primary`, `text-on-surface-variant`, `rounded-pill`, `font-display`, etc. The full token scale (Material-style, lifted from a Google Stitch design system) is defined in [tailwind.config.ts](tailwind.config.ts). Prefer tokens over hex values so the app and marketing surfaces stay consistent.
- Fonts: **Arimo** (body, `font-sans`) and **Sora** (marketing display, `font-display`), wired in [src/lib/fonts.ts](src/lib/fonts.ts) and the root layout. Icons: `lucide-react`.
- `cn()` ([src/lib/cn.ts](src/lib/cn.ts)) for conditional class names.
