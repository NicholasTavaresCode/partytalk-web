# PartyTalk (web)

Frontend for **PartyTalk** — live group English-practice **rooms** where an AI host listens to the
conversation and suggests fresh topics in real time, then delivers a highlights + suggestions
**report** at the end.

This app talks to the **PartyTalk API** (NestJS) and authenticates with **Google Identity Services ("Sign in with Google")** — the API verifies the Google ID token directly.

## Ports

| Service | Port | Notes |
| --- | --- | --- |
| PartyTalk API | `3000` | Runs separately; Swagger at http://localhost:3000/docs |
| This web app | `3001` | `npm run dev` (already pinned to `-p 3001`) |

## Setup

Requires Node ≥ 18.18 (developed on Node 22).

```bash
npm install
cp .env.local.example .env.local   # then fill in the Google OAuth client ID
npm run dev                         # http://localhost:3001
```

`.env.local` values:

- `NEXT_PUBLIC_API_BASE_URL` — REST base, default `http://localhost:3000/api/v1`
- `NEXT_PUBLIC_API_SOCKET_URL` — Socket.IO origin, default `http://localhost:3000` (namespace `/rooms`)
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` — OAuth 2.0 **Web application** client ID (Google Cloud console →
  APIs & Services → Credentials). Add `http://localhost:3001` to the client's **Authorized
  JavaScript origins**. Until it's filled in, the app runs but the sign-in screen shows a "not
  configured" notice.

## How the room feature works

1. **Auth** — "Sign in with Google" → Google ID token, attached as `Authorization: Bearer` on every
   REST call and in the Socket.IO handshake (`auth.token`). First sign-in prompts a quick profile
   (`PUT /users/me`).
2. **Browse / create** — `GET /rooms`, `POST /rooms` (topic + AI host persona + max 5 participants).
3. **Live loop** — join via REST, then connect the `rooms` Socket.IO namespace. Each client
   transcribes its own mic with the **browser Web Speech API** and emits `transcript` events (typed
   fallback where the API is unavailable, e.g. Firefox). The backend AI facilitator pushes
   `topicSuggested` events (trigger: volume / silence / manual) which render live; `presence` tracks
   who's in.
4. **Report** — the owner ends the room → backend generates the `RoomReport` (summary, highlights,
   suggestions, topics explored), delivered on `sessionEnded` and the room's `report` field.
5. **Voice (peer-to-peer)** — a WebRTC **P2P mesh** client is wired to the `webrtc:*` signaling
   contract in the API's `docs/audio-architecture.md`. That relay is a **backend milestone (M1) not
   yet implemented**, so peer audio degrades gracefully (mic acquired, waiting for signaling) until
   the backend ships it. The AI-topic-suggestion loop above works today without it.

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
