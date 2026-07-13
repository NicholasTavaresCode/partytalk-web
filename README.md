# PartyTalk

Practise a new language out loud in small **live group rooms**, guided by a friendly **AI host** — plus a faithful **IELTS exam simulator** for solo test prep. This repository is the **frontend only** (no backend yet). English is the only supported practice language for now; the UI is already built to welcome more.

The IELTS simulation screens reproduce the official computer-delivered exam look, following the **Google Stitch** design ("Standard Academic Assessment System"). The marketing and group-practice surfaces extend that same navy/gold brand with a warmer display font.

## Tech stack

- **Next.js 16** (App Router) + **React 19**
- **Tailwind CSS v3** — design tokens ported 1:1 from the Stitch design system (`tailwind.config.ts`)
- **TanStack React Query v5** — wired up now with mock fetchers; API-ready (see below)
- **Google Fonts** via `next/font` — **Arimo** (exam/body) and **Sora** (marketing display)
- **lucide-react** icons

## Getting started

Requires Node.js ≥ 18.18 (developed on Node 22).

```bash
npm install
npm run dev     # http://localhost:3000
```

Other scripts: `npm run build` (production build), `npm start` (serve the build), `npm run lint`.

## Routes

| Route | Description |
| --- | --- |
| `/` | Marketing landing page |
| `/practice` | Browse live group rooms (filter by level, search) |
| `/practice/[roomId]` | Immersive live room: participants, AI guide, live transcript, controls |
| `/ielts` | IELTS hub — overview of the four papers (solo mode) |
| `/ielts/listening` | Listening simulation — once-only audio, form completion, MCQ |
| `/ielts/reading` | Reading simulation — split-screen passage + heading matching |
| `/ielts/writing` | Writing simulation — chart prompt, live word count, Task 1/2 |
| `/ielts/speaking` | Speaking simulation — AI examiner, waveform, mic recorder |

## Project structure

```
src/
  app/
    layout.tsx              Root layout (fonts + React Query provider)
    page.tsx                Landing
    practice/               Rooms browser + live room
    ielts/                  Hub + 4 exam simulators
  components/
    brand/                  Logo, wordmark
    site/                   Marketing header / footer / shell
    marketing/              Hero room preview, landing visuals
    practice/               Room cards, avatars, live-room UI
    ielts/                  ExamShell (header/timer/footer), palette, chart, examiner
    ui/                     Button, Container
  lib/
    api/                    Mock data + fetchers (rooms, ielts)
    queries.ts              React Query hooks + query keys
    types.ts, fonts.ts, cn.ts
```

## Data layer (React Query, API-ready)

There is no backend yet, so `src/lib/api/*` returns data from `Promise`-based mock fetchers. Every component reads data through the hooks in `src/lib/queries.ts`. When a real API arrives, only the fetcher bodies change:

```ts
// before
export async function fetchRooms() { return delay(ROOMS); }
// after
export async function fetchRooms() { return fetch("/api/rooms").then((r) => r.json()); }
```

Components and hooks stay untouched. Static exam content is seeded with `initialData` so the simulators render instantly.

## Design system

`tailwind.config.ts` defines the exam palette (`primary` navy `#001e40`, `secondary` red, `tertiary-fixed` gold `#ffe16d`), the Arimo type scale (`text-headline-lg`, `text-body-lg`, `text-display-timer`, …) and spacing tokens (`header-height`, `nav-footer-height`, `gutter`). The exam chrome lives in `components/ielts/ExamShell.tsx`.

## Notes

- Frontend only — interactions (audio, recording, timers, chat) are simulated on the client.
- English is the only active practice language; other languages appear as "coming soon".
