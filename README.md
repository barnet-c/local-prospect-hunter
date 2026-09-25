# Local Prospect Hunter

A self-hosted B2B sales-prospecting app: Google Places-based local business discovery, AI need/fit/urgency scoring, AI company enrichment, 3-step cold-email sequences over Gmail, reply detection/classification, watchlist re-scoring, daily briefings, and a Telegram lead-qualifier bot.

Rebuilt from a Base44 app spec into a plain self-hosted stack: Express + `node:sqlite` (RLS-scoped entity layer) + JWT cookie auth + node-cron + Anthropic/OpenAI (auto-detected) + per-user Gmail OAuth + React/Vite/Tailwind frontend.

## Setup

```bash
npm install
cp .env.example .env
# fill in whichever keys you have — the app runs fine with none configured,
# it just reports the relevant features as "not configured"
npm run dev
```

Frontend on http://localhost:5173, API on http://localhost:3001.

## Environment variables

See `.env.example`. Nothing is required to boot the app:

- `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` — enables AI scoring/enrichment/email generation/reply analysis.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — enables the per-user Gmail connector (sending, reply detection, drafts).
- `GOOGLE_PLACES_API_KEY` — enables Hunt (Places Text Search + geocoding + place details).
- `TELEGRAM_BOT_TOKEN` — starts the long-polling Telegram lead-qualifier bot.
- `UNSUBSCRIBE_SIGNING_SECRET` — signs public unsubscribe links (HMAC-SHA256, constant-time verified).

## Production build

```bash
npm run build   # builds dist/
npm start        # serves API + dist/ on $PORT
```

## Notes / known gaps vs. the original spec

- The original spec's model reference (`gemini_3_1_pro` with `add_context_from_internet: true`) implies live web search during scoring. This rebuild's `InvokeLLM` (Anthropic/OpenAI) has no built-in internet browsing, so scoring relies solely on the scraped website text — a documented, accepted gap.
- No websocket/SSE infra exists in this stack; the Base44 `Prospect.subscribe()` realtime pattern is replaced with polling (`refetchInterval`) while a hunt/scoring/enrichment run is in flight.
- Scheduled jobs (`processDueFollowUps`, `sendDripFollowUps`) iterate every user and use *that user's own* stored Gmail token — this is an intentional improvement over the Base44 platform's inability to impersonate arbitrary users from a scheduled context, not a limitation carried over.
