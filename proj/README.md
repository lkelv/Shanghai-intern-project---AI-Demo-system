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

## Next step

Lead persistence: when a message contains an email + a described need, save the
lead as a record in a local `leads.json`. The backend in [server.js](server.js)
is where that endpoint will live.
