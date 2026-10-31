# PartyTalk (web)

Frontend for **PartyTalk** — live group English-practice **rooms** where an AI host listens to the
conversation and suggests fresh topics in real time, then delivers a highlights + suggestions
**report** at the end.

This app talks to the **PartyTalk API** (NestJS) and authenticates with **Google Identity Services ("Sign in with Google")** — the API verifies the Google ID token directly.

## Ports

| Service | Port | Notes |
| --- | --- | --- |
| PartyTalk API | `8080` | Runs separately; Swagger at http://localhost:8080/docs |
| This web app | `3000` | `npm run dev` (already pinned to `-p 3000`) |

## Setup

Requires Node ≥ 18.18 (developed on Node 22).

```bash
npm install
cp .env.local.example .env.local   # then fill in the Google OAuth client ID
npm run dev                         # http://localhost:3000
```

`.env.local` values:

- `NEXT_PUBLIC_API_BASE_URL` — REST base, e.g. `http://localhost:8080/api/v1` (the built-in default of `localhost:3000` collides with the web port, so set it)
- `NEXT_PUBLIC_API_SOCKET_URL` — Socket.IO origin, e.g. `http://localhost:8080` (namespace `/rooms`)
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` — OAuth 2.0 **Web application** client ID (Google Cloud console →
  APIs & Services → Credentials). Add `http://localhost:3000` to the client's **Authorized
  JavaScript origins**. Until it's filled in, the app runs but the sign-in screen shows a "not
  configured" notice.
- `NEXT_PUBLIC_DISABLE_AUTH` / `NEXT_PUBLIC_DEV_BEARER_TOKEN` — optional, dev only. Skip the
  sign-in gate, and optionally attach a real Google ID token to requests.

Keep the two API URLs set. If they're missing, the app falls back to `localhost:3000`, which is
this dev server rather than the API.

## How the room feature works

1. **Auth** — "Sign in with Google" → Google ID token, attached as `Authorization: Bearer` on every
   REST call and in the Socket.IO handshake (`auth.token`). First sign-in prompts a quick profile
   (`PUT /users/me`).
2. **Browse / create** — `GET /rooms` (only rooms you own or are invited to), `POST /rooms` (topic +
   AI host persona + max 5 participants + emails to invite). Rooms are **invite-only**: inside the
   room the owner can invite more people, revoke them (which removes them on the spot), or share an
   invite link (`/practice/<id>?invite=<code>`) that adds whoever opens it to the guest list.
3. **Live loop** — join via REST, then connect the `rooms` Socket.IO namespace. Each client
   transcribes its own mic with the **browser Web Speech API** and emits `transcript` events (typed
   fallback where the API is unavailable, e.g. Firefox). The backend AI facilitator pushes
   `topicSuggested` events (trigger: volume / silence / manual) which render live; `roomUpdated` carries the
   full room (members, status, scheduled end) and `presence` only says who's online.
4. **Report** — the owner ends the room → backend generates the `RoomReport` (summary, highlights,
   suggestions, topics explored), delivered on `sessionEnded` and the room's `report` field.
5. **Voice (peer-to-peer)** — participants hear each other over a WebRTC **P2P mesh**; the API
   only relays the `webrtc:*` signaling (see its `docs/audio-architecture.md`), so audio never
   touches the server. ICE servers come from the API: STUN, plus a TURN relay (with a short-lived
   credential) where one is deployed, so peers on strict networks can still connect.

## Tech stack

- **Next.js 16** (App Router) + **React 19**
- **Tailwind CSS v3** (design tokens from a Google Stitch design system)
- **TanStack React Query v5** + a typed `api` client (`src/lib/apiClient.ts`)
- **Google Identity Services** (`src/lib/googleAuth.ts`, `src/components/auth/*`)
- **socket.io-client** (`src/lib/socket.ts`, `src/lib/useRoomSocket.ts`)
- **WebRTC** mesh (`src/lib/useVoiceMesh.ts`) + **Web Speech API** (`src/lib/useSpeechRecognition.ts`)
- Google Fonts **Arimo** (body/exam) + **Sora** (marketing display), **lucide-react** icons

## Structure

```
src/
  app/
    page.tsx                 Public marketing landing
    practice/                Rooms browser + live room (auth-gated)
  components/
    auth/                    AuthProvider, RequireAuth, SignInScreen
    profile/                 Onboarding + ProfileGate
    app/                     AppHeader, LoadingScreen
    practice/                RoomsBrowser, RoomCard, room/RoomExperience
    brand/, site/, marketing/, ui/
  lib/
    apiClient.ts, socket.ts, googleAuth.ts, env.ts
    api/rooms.ts, api/users.ts
    queries.ts               React Query hooks + keys
    useRoomSocket.ts, useVoiceMesh.ts, useSpeechRecognition.ts
    types.ts, cn.ts
```

## Routes

| Route | Auth | Description |
| --- | --- | --- |
| `/` | public | Marketing landing |
| `/practice` | required | Browse + create rooms |
| `/practice/[roomId]` | required | Live room: transcript, topic suggestions, report |

## Notes

- English is the only active practice language; others show "coming soon".
