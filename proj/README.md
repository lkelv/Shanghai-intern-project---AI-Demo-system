# OnePromise Chat Demo

A WhatsApp-style AI chat demo for customer acquisition. The bot auto-replies to
inbound questions and guides prospects toward leaving their email and need.

- **Frontend** — React + TypeScript + Vite + Tailwind ([src/App.tsx](src/App.tsx)).
- **Backend** — a tiny zero-dependency Node server ([server.js](server.js)) that
  holds the OpenRouter API key and forwards chat requests to the model. The key
  is **never** shipped to the browser.
- **Model** — `openai/gpt-oss-20b` via [OpenRouter](https://openrouter.ai).

## Setup

The API key lives in `proj/.env` (git-ignored):

```
OPEN_ROUTER_API_KEY = sk-or-...
```

Optional overrides: `OPENROUTER_MODEL` (defaults to `openai/gpt-oss-20b`) and
`API_PORT` (defaults to `8791`).

Install dependencies:

```bash
npm install
```

## Run

```bash
npm run dev
```

This starts both processes together:

- web (Vite) on http://localhost:5173
- api (Node) on http://localhost:8791

The frontend calls `/api/chat`, which Vite proxies to the backend, so the
browser only ever talks to a same-origin path. Open http://localhost:5173.

You can also run them separately with `npm run web` and `npm run server`.

## How it works

1. The browser POSTs the conversation history to `/api/chat`.
2. [server.js](server.js) prepends the OnePromise system prompt, adds the API
   key, and calls OpenRouter.
3. The model's reply is returned and rendered as a chat bubble.

## Lead capture

Whenever a conversation contains an email address, the backend captures a lead:

1. After the reply is sent (so the chat stays snappy), the server makes a second,
   JSON-only model call to extract `{ name, need }` from the transcript.
2. The lead is saved to [leads.json](leads.json), keyed by email — later messages
   in the same conversation **update** the existing record instead of duplicating
   it.

Each record looks like:

```json
{
  "id": "uuid",
  "email": "tom@northwind.co",
  "name": "Tom",
  "need": "Image bounding-box labeling for 50k product photos",
  "source": "whatsapp-demo",
  "messageCount": 2,
  "createdAt": "2026-07-01T03:13:25.755Z",
  "updatedAt": "2026-07-01T03:13:25.755Z"
}
```

View all captured leads at http://localhost:8791/api/leads (or just open
`leads.json`).

## Next step

Connecting to the real WhatsApp Business API: swap the browser frontend for a
webhook that receives inbound WhatsApp messages and posts replies back through
the WhatsApp Cloud API — the `/api/chat` + lead-capture logic stays the same.
