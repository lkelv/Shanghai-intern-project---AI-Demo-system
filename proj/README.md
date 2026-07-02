# OnePromise Customer-Journey Demo

A single web app that simulates a customer's whole journey with the company —
from first contact to a paid order — as four screens the tester clicks through
in order. An AI assistant responds at every stage, and everything the customer
does is saved to one local JSON file. It's an internal demo: no real WhatsApp,
no real payments.

- **Frontend** — React + TypeScript + Vite + Tailwind. A phone-style panel that
  visibly changes app as the customer moves through the journey.
- **Backend** — a tiny zero-dependency Node server ([server.js](server.js)) that
  holds the OpenRouter API key. Every screen calls it; the key never reaches the
  browser.
- **Model** — `openai/gpt-oss-20b` via [OpenRouter](https://openrouter.ai).

## The four stages (four different "apps")

Each stage is styled as the app a real customer would actually be in, so the
app-switching across the journey is visible. A shared phone status bar sits on
top; the app below it changes.

1. **Acquisition** — a WhatsApp-style **messaging app**. The customer asks a
   question, the AI answers, and at the right moment asks for their email and
   need. Email + need are extracted and saved.
2. **Retention** — the same messaging app, a day later. "Next day" triggers the
   AI to send a re-engagement message; the customer can keep chatting.
3. **Conversion** — a **store / pricing page** (not a chat). The AI shopping
   assistant recommends a fit and answers questions; the customer picks a tier.
4. **Payment** — a **checkout app**. The customer "pays" (no real money), the AI
   confirms, and a receipt is shown. The order + payment status are saved.

The forward walk is **acquisition → retention → conversion → payment**: each
screen offers a "continue" action once its goal is met (and asking about pricing
moves the customer one step along), so retention is always part of the path.

A **dev panel** on the left (not part of the customer product) shows which stage
the tester is on, lets them jump between stages, **Reset** for a fresh run, and
watch the captured record grow. It also has an **English / 中文** toggle that
translates the customer-facing UI.

## Bilingual

- The dev panel's **English / 中文** toggle switches the whole UI (the
  customer-facing screens and the dev panel itself) between English and
  Simplified Chinese.
- The **AI replies in whatever language the customer types** — write in Chinese
  and it answers in Chinese, write in English and it answers in English —
  independent of the UI toggle (the toggle only sets the fallback language for
  AI-initiated messages like the retention follow-up).

## Setup

The API key lives in `proj/.env` (git-ignored):

```
OPEN_ROUTER_API_KEY = sk-or-...
```

Optional overrides: `OPENROUTER_MODEL` (default `openai/gpt-oss-20b`) and
`API_PORT` (default `8791`).

```bash
npm install
```

## Run

```bash
npm run dev
```

Starts both processes:

- web (Vite) on http://localhost:5173
- api (Node) on http://localhost:8791

The frontend calls `/api/*`, which Vite proxies to the backend. Open
http://localhost:5173 and play the customer from the first message to a paid order.

Run them separately with `npm run web` and `npm run server`.

## The data capture

One file, [journey.json](journey.json), holds **one record per customer**
(keyed by a per-run session id), accreted across the stages:

```json
{
  "id": "session-uuid",
  "email": "priya@brightlabs.io",
  "name": "Priya",
  "need": "Upskilling a 6-person team in practical AI.",
  "stage": "payment",
  "messages": [{ "stage": "acquisition", "role": "user", "text": "…" }],
  "chosenOption": { "id": "team", "name": "Team", "price": 1299 },
  "payment": {
    "status": "paid", "cardName": "Priya Sharma", "last4": "4242",
    "amount": 1299, "currency": "USD", "receiptNo": "OP-…", "paidAt": "…"
  }
}
```

View all runs at http://localhost:8791/api/journey (or one with
`?id=<sessionId>`), or just open `journey.json`.

## API

| Method + path      | Purpose                                             |
| ------------------ | --------------------------------------------------- |
| `POST /api/chat`   | AI reply for a stage. Body: `{sessionId, stage, messages, nudge?, context?}` |
| `POST /api/order`  | Save the chosen tier. Body: `{sessionId, optionId}` |
| `POST /api/payment`| Save the mock payment. Body: `{sessionId, cardName, cardNumber}` |
| `GET /api/journey` | All records, or one via `?id=`                      |
| `GET /api/products`| The course catalog                                  |
| `GET /api/health`  | Liveness + model + key status                       |

## The placeholder product

The thing being sold is a placeholder — an "OnePromise AI Training Course" with
three priced tiers, defined in [products.json](products.json) (imported by both
the frontend and the backend). Swap the names/prices there; the screens don't change.

## Prior art we looked at

This was built from scratch to keep it simple and self-contained, but mature
tools already cover pieces of this flow. For a real deployment you'd likely
assemble these rather than hand-roll:

- **WhatsApp Business Platform (Cloud API)** — the official way to send/receive
  WhatsApp messages and run auto-replies; this demo's chat is a stand-in for it.
- **Auto-reply / inbox tools** — WATI, Twilio for WhatsApp, 360dialog, Respond.io,
  Zoko — hosted WhatsApp Business auto-reply and shared-inbox products.
- **Chatbot / flow builders** — ManyChat, Landbot, Tidio, Chatfuel, Voiceflow —
  drag-and-drop conversation flows with lead capture.
- **AI assistant layer** — the OpenRouter/LLM call here is the same pattern these
  tools now expose for generative replies.
- **Checkout** — Stripe / Stripe Checkout is the standard for the payment screen
  (mocked here).

The value of this demo is stitching the *whole journey* (acquisition → retention
→ conversion → payment) into one clickable path with the AI plugged in at each
stage and every step captured to a JSON record — which is the structure the
manager asked to see first.

## Out of scope (by design)

No real WhatsApp integration and no real payment processing — the brief is the
normal outside-China flow, mocked. Lead capture to JSON is included as a useful
extra.

## Next step

Connecting to the real WhatsApp Business API: replace the Acquisition/Retention
chat UI with a webhook that receives inbound WhatsApp messages and posts replies
via the WhatsApp Cloud API. The `/api/chat` logic and journey capture stay the same.
