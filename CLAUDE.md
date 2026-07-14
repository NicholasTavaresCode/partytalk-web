# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

**Heed the warning above.** This is Next.js 16 + React 19 — APIs and conventions differ from older Next.js. Before writing framework code (routing, metadata, server/client boundaries, `next.config`), read the relevant guide under `node_modules/next/dist/docs/` (`01-app/` for App Router). Don't assume training-data Next.js behavior.

## Commands

```bash
npm run dev     # dev server on http://localhost:3001 (port is pinned)
npm run build   # production build
npm run start   # serve the build on 3001
npm run lint    # eslint (flat config, next core-web-vitals + typescript)
```

There is no test runner configured. The web app runs on **3001**; it expects the PartyTalk API (NestJS) on **3000** (`/api/v1` REST, Socket.IO namespace `/rooms`, Swagger at `:3000/docs`). Both must run for the rooms feature to work end to end. Copy `.env.local.example` → `.env.local` and set `NEXT_PUBLIC_GOOGLE_CLIENT_ID`; until then the app boots but the sign-in screen shows a "not configured" notice (`googleConfigured` in [src/lib/env.ts](src/lib/env.ts)).

## Architecture

**The integration seam (read this first).** Components **never call `fetch` directly**. Data flows: component → React Query hook ([src/lib/queries.ts](src/lib/queries.ts)) → typed fetcher (`src/lib/api/*.ts`) → `api` client ([src/lib/apiClient.ts](src/lib/apiClient.ts)). All request/response shapes live in [src/lib/types.ts](src/lib/types.ts) and are the contract with the backend (see [API_HANDOFF.md](API_HANDOFF.md)). Change a data shape in one place and it propagates; keep this seam intact.

- **`apiClient.ts`** — attaches the Google ID token as `Authorization: Bearer`, unwraps the backend's `{ data, meta }` envelope (returns `data`), and throws `ApiError` carrying the HTTP `status` (callers branch on it, e.g. 404 → "no profile yet" in `useMe`).
- **`queries.ts`** — the single home for query keys (`queryKeys`) and all React Query hooks. Room queries are `enabled` only when a user is signed in; `useRooms` polls every 15s; mutations invalidate/`setQueryData` to keep the cache fresh.

**Rooms are live against the real API. IELTS is parked on mock data.** `src/lib/api/rooms.ts` and `users.ts` hit real REST endpoints; `src/lib/api/ielts.ts` returns in-repo mock objects via `Promise`, seeded as React Query `initialData`. The IELTS pages (`/ielts/*`) are a parked simulator — don't wire them to the API unless asked.

**Auth & gating.** "Sign in with Google" via **Google Identity Services** (GIS) — no Firebase. The API verifies the raw Google ID token on every request (its `sub` claim is the user's `uid`). [src/lib/googleAuth.ts](src/lib/googleAuth.ts) loads GIS, holds the current ID token in memory, decodes it into an `AuthUser` (`{ uid, email, displayName, picture }`), and exposes `getIdToken()` (silently re-issues on expiry via One Tap), `renderSignInButton`, `signOut`, and an `onAuthChange` subscription. [AuthProvider](src/components/auth/AuthProvider.tsx) wraps that in `useAuth()` and, on load, calls `restoreSession()` to silently sign returning users back in (`auto_select`). `SignInScreen` renders the official GIS button; auth-gated pages wrap content in `<RequireAuth>` (→ `SignInScreen` if signed out) then `<ProfileGate>` (→ `ProfileOnboarding` if the user has no profile — first sign-in calls `PUT /users/me`). The same fresh ID token authenticates both REST calls and the Socket.IO handshake. Requires `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (OAuth web client, with the app origin in "Authorized JavaScript origins").

**Realtime room loop.** [useRoomSocket](src/lib/useRoomSocket.ts) owns one room's connection: it seeds history from REST (`getTranscript`/`getSuggestions`), then connects the `/rooms` Socket.IO namespace ([socket.ts](src/lib/socket.ts)) and streams `transcript` / `topicSuggested` / `presence` / `sessionEnded` events into React state. Each client transcribes its own mic via the browser Web Speech API ([useSpeechRecognition.ts](src/lib/useSpeechRecognition.ts)) and emits `transcript` events (typed fallback where unavailable, e.g. Firefox). [RoomExperience](src/components/practice/room/RoomExperience.tsx) is the main live-room UI. Socket event types are in `types.ts` (`ServerToClientEvents` / `ClientToServerEvents`).

**Voice mesh is a stub.** [useVoiceMesh.ts](src/lib/useVoiceMesh.ts) implements the WebRTC P2P signaling client, but the backend relay (`webrtc:*`) is an unshipped milestone, so peer audio degrades gracefully (mic acquired, waiting for signaling). The AI-topic loop works without it.

**Providers.** [providers.tsx](src/components/providers.tsx) wraps the app in `QueryClientProvider` (60s `staleTime`, `retry: 1`, no refetch-on-focus) then `AuthProvider`.

## Conventions

- `@/*` path alias → `src/*` (tsconfig). Client components need `"use client"`.
- **Styling is Tailwind v3 with semantic design tokens**, not raw colors — use `bg-surface`, `text-primary`, `text-on-surface-variant`, `rounded-pill`, `font-display`, etc. The full token scale (Material-style, lifted from a Google Stitch design system) is defined in [tailwind.config.ts](tailwind.config.ts). Prefer tokens over hex values so the IELTS and marketing surfaces stay consistent.
- Fonts: **Arimo** (body, `font-sans`) and **Sora** (marketing display, `font-display`), wired in [src/lib/fonts.ts](src/lib/fonts.ts) and the root layout. Icons: `lucide-react`.
- `cn()` ([src/lib/cn.ts](src/lib/cn.ts)) for conditional class names.
