# CLAUDE.md — OnePromise Customer-Journey Demo

Context for resuming this project in a fresh chat. Read this first.

## What this is

An **internal demo** (Task 2) that simulates a customer's whole journey with the
company as a set of phone-app screens the tester clicks through in order, with an
**AI assistant at every stage** and **everything saved to one local JSON file**.

The journey: **Acquisition → Retention → Conversion → Payment**. The manager
plays the customer and walks from first message to a paid order. It is a mock: it
does **not** connect to real WhatsApp and does **not** take real money (normal
outside-China flow, mocked).

The app lives in **`proj/`**. The git repo root is one level up.

## Stack

- **Frontend**: React 19 + TypeScript + Vite 8 + Tailwind v4 (in `proj/src`).
- **Backend**: a tiny **zero-dependency** Node HTTP server, `proj/server.js`
  (uses Node's built-in `fetch` and `--env-file`; Node 25). It holds the
  OpenRouter API key so the key never reaches the browser.
- **Model**: `openai/gpt-oss-20b` via [OpenRouter](https://openrouter.ai).
- `concurrently` runs web + api together.

## Run it

```bash
cd proj
npm install
npm run dev      # runs BOTH: web (Vite) on :5173  +  api (Node) on :8791
```

- `npm run web` / `npm run server` run them separately.
- `npm run build` = `tsc -b && vite build` (typecheck + build). Keep this green.
- API key is in `proj/.env` as `OPEN_ROUTER_API_KEY = sk-or-...` (git-ignored;
  the code trims whitespace around the value). Optional env: `OPENROUTER_MODEL`,
  `API_PORT` (default 8791).
- Open http://localhost:5173.

## Architecture / data model

- **One JSON record per run**, in `proj/journey.json` (an array). Keyed by a
  `sessionId` the client generates (`crypto.randomUUID`) and persists in
  `localStorage['op_run_v2']`. Language choice persists in `localStorage['op_lang']`.
- The backend **upserts** the record under an in-process file lock. Record shape:
  `{ id, email, name, need, stage, messages[], chosenOption, payment, source, createdAt, updatedAt }`.
  Each `messages[]` entry is `{ stage, role, text, at }`.
- **Lead capture**: after an acquisition chat turn, the server does a background
  JSON-mode LLM call to extract `{name, need}`; email is found via regex. Saved to
  the record. Runs *after* the reply is sent so it doesn't slow the chat.
- **`products.json`** (in `proj/`, imported by BOTH frontend and backend — single
  source of truth) holds the placeholder catalog: OnePromise AI Training Course,
  tiers `starter` $149, `professional` $499 (`"popular": true`), `team` $1299.
  Journey.json stores canonical **English** tier names even when UI is Chinese.

### Backend endpoints (`proj/server.js`)
- `POST /api/chat` — `{sessionId, stage, messages, nudge?, context?, lang?}` → `{reply}`.
  Builds a **stage-specific system prompt**; `nudge:true` = AI speaks first (no
  user turn) for retention follow-up / conversion recommendation / payment confirm.
- `POST /api/order` — `{sessionId, optionId}` → saves `chosenOption`.
- `POST /api/payment` — `{sessionId, cardName, cardNumber}` → saves `payment` (paid).
- `GET /api/journey` (all) or `?id=` (one); `GET /api/products`; `GET /api/health`.

## The forward flow (this went through several iterations — get it right)

- **Acquisition** (`screens/Acquisition.tsx`): WhatsApp chat. Captures email.
  - Once email captured → a green **"Continue to follow-up"** bar → **Retention**.
  - **Explicit buy/pricing intent** (`wantsPlans()` in `journey.ts`) → **skips
    straight to Conversion** (express lane), still captures email in background.
    (Decision by user: a hot lead shouldn't be routed through the day-2 follow-up.)
- **Retention** (`screens/Retention.tsx`): WhatsApp "day 2" follow-up. **"Next
  day"** button triggers an AI re-engagement message. After a follow-up exists →
  **"See the plans"** bar → Conversion; plan-intent also → Conversion.
- **Conversion** (`screens/Conversion.tsx`): **light storefront/pricing page**
  (not a chat). On open, auto-requests an AI recommendation using the prior
  conversation as context; always lists options + recommends one (no markdown
  tables). Choose a tier (`saveOrder`) → **"Checkout"** bar → Payment.
- **Payment** (`screens/Payment.tsx`): **light checkout app**. Mock card form →
  `savePayment` → receipt + AI confirmation.
- Retention stays on the normal walk; only explicit buy-intent skips it.

## Design (each stage = a different phone app — this was an explicit ask)

- Shared **`PhoneStatusBar`** on top (variant `whatsapp` | `store` | `checkout`)
  so it reads as one phone switching apps.
- Acquisition + Retention = **WhatsApp dark** (green/teal, bubbles, call/video
  icons). Conversion = **light store**. Payment = **light checkout** (card-brand
  badges, lock).
- Dark WhatsApp palette tokens are in `src/index.css` (`--color-wa-*`, used as
  Tailwind `wa-*` classes). CSS-only staggered load animations there too.
- **User's design constraints (STRICT)**: no purple/blue gradients, no
  glassmorphism, no glowing spotlights, no heavy card drop-shadows, no
  pill-shaped buttons, no big empty hero sections, no 3-column feature grids, no
  generic flat-icons-in-colored-circles, no uppercase single-word "eyebrows", no
  messy border radii (use harsh right angles or deliberate curves). Prefer subtle
  CSS-only animation.

## Dev panel (left sidebar — `components/DevPanel.tsx`)

Dev-only instrument, **not** part of the customer product. Shows the 4-stage
stepper (clickable to jump), a **Reset** button, a live view of the captured
`journey.json` record, and the **English / 中文 language toggle**. Two-column
layout at `md` (≥768px); stacks below that.

## i18n / bilingual (`src/i18n.tsx`)

- `LangProvider` + `useT()` hook. `t(key, params?)` for strings, `tTier(id)` for
  translated tier display. Dictionary has en/zh for the **whole UI including the
  dev panel** and the product tiers.
- The **AI replies in the language the customer types** (system-prompt rule:
  mirror the customer's latest message; UI `lang` is only the fallback for
  AI-initiated/nudge messages). Verified: Chinese input → Chinese reply even when
  UI is English.

## Key files

```
proj/
  server.js                    backend: prompts, endpoints, lead extraction, journey.json, lang rule
  products.json                catalog (shared FE+BE); has "popular" flag
  journey.json                 the data store (array; currently reset to [])
  vite.config.ts               port 5173 strictPort; proxy /api → :8791; watch.ignored: journey.json
  .env                         OPEN_ROUTER_API_KEY (git-ignored)
  src/
    App.tsx                    orchestrator: run state, localStorage, stage routing, status bar, greeting-swap
    journey.ts                 STAGES, wantsPlans(), types (ProductTier/Catalog/ChosenOption/PaymentInfo/RunState)
    chat.ts                    Message type, makeGreeting(lang), helpers
    api.ts                     sendChat / saveOrder / savePayment (all take lang)
    i18n.tsx                   LangProvider, useT, dictionary, tier translations
    index.css                  Tailwind import + wa-* theme + animations
    main.tsx                   wraps <App/> in <LangProvider>
    components/  PhoneStatusBar, DevPanel, ChatHeader, ChatPanel, AdvanceBar
    screens/     Acquisition, Retention, Conversion, Payment
```

## Gotchas / operational notes

- **Backend has no `--watch`** → after editing `server.js` (e.g. prompts) you
  MUST restart it (restart `npm run dev`, or the preview) to pick up changes.
  Vite auto-restarts on `vite.config.ts` changes; `src/` is HMR.
- **`journey.json` is in `vite.config.ts` `watch.ignored`** — the backend writes
  it inside `proj/`, and without this Vite would full-reload and wipe the run.
  The run also survives reloads via `localStorage`.
- **Ports**: web is `strictPort: 5173`; api is `8791` (its own `API_PORT` so it
  never collides with a generic `PORT` the harness may set). If `EADDRINUSE`:
  `lsof -ti:5173 | xargs kill` (or 8791).
- **`.env`** key name is exactly `OPEN_ROUTER_API_KEY`.
- When verifying with the preview tool: the screenshot occasionally renders tiny,
  and the **first** click right after a reload can miss (headless timing) — verify
  via `preview_eval` DOM reads / a second click. Real usage is fine.
- After manual verification, reset `journey.json` to `[]` and free the ports.

## Status

- **Done**: all 4 stages with AI per stage; journey.json capture; app-per-stage
  restyle; forward walk through retention with buy-intent express lane; bilingual
  UI toggle (incl. dev panel) + AI language matching. `npm run build` passes.
- **Uncommitted**: several `proj/src/*` files modified and `src/i18n.tsx`
  untracked (git branch `user-flow-v2-clear`; main branch is `main`). Nothing has
  been committed by request — commit only if the user asks.
- **Known minor**: on Conversion, the AI recommendation can occasionally fire
  just before the server finishes extracting `need`, so it may ask a clarifying
  question instead of naming a tier; it recovers. Could pass `need` into the
  recommendation request to harden. `wantsPlans()` keyword match is intentionally
  eager (fires on "how much?", "options", etc.).

## Out of scope (do NOT build)

Real WhatsApp Business API, real payment processing, logins/accounts, a real
server DB (the JSON file is the database), production hosting. Keep the API key
server-side. Lead-capture-to-JSON is a kept extra beyond the original ask.

## Working agreement

Don't commit/push unless asked. Confirm before destructive or outward-facing
actions. Prior-art survey (WhatsApp Business auto-reply tools, chatbot builders,
Stripe) is documented in `proj/README.md`.
