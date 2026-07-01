# OnePromise Customer-Journey Demo

A single web app that simulates a customer's whole journey with the company —
from first contact to a paid order — as four screens the tester clicks through
in order. An AI assistant responds at every stage, and everything the customer
does is saved to one local JSON file. It's an internal demo: no real WhatsApp,
no real payments.

- **Frontend** — React + TypeScript + Vite + Tailwind. One panel with a stage
  indicator, the active screen, and back/next navigation.
- **Backend** — a tiny zero-dependency Node server ([server.js](server.js)) that
  holds the OpenRouter API key. Every screen calls it; the key never reaches the
  browser.
- **Model** — `openai/gpt-oss-20b` via [OpenRouter](https://openrouter.ai).

## The four stages

1. **Acquisition** — a WhatsApp-style chat. The customer asks a question, the AI
   answers, and at the right moment asks for their email and need. Email + need
   are extracted and saved.
2. **Retention** — a follow-up screen. "Next day" triggers the AI to send a
   re-engagement message that nudges toward buying; the customer can keep chatting.
3. **Conversion** — an order page with three priced course tiers. The AI
   recommends a fit and answers objections. The customer picks a tier (saved).
4. **Payment** — a mock card checkout. The customer "pays" (no real money), the
   AI confirms, and a receipt is shown. The order + payment status are saved.

A four-step indicator shows progress (steps are clickable), and **Reset** starts
a fresh run.

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

## Next step

Connecting to the real WhatsApp Business API: replace the Acquisition/Retention
chat UI with a webhook that receives inbound WhatsApp messages and posts replies
via the WhatsApp Cloud API. The `/api/chat` logic and journey capture stay the same.
