// Small local backend for the OnePromise chat demo.
//
// Its only job right now is to keep the OpenRouter API key OFF the browser:
// the frontend calls POST /api/chat, and this server adds the key + system
// prompt and forwards the conversation to OpenRouter. Run it with:
//   node --env-file=.env server.js   (see the "server" npm script)
//
// Later this same server is where lead persistence to leads.json will live.

import http from 'node:http'

// Use a dedicated var so we never collide with a generic PORT that the web
// dev server (or a harness) may also be using.
const PORT = process.env.API_PORT || 8791
const MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-oss-20b'
const API_KEY = (process.env.OPEN_ROUTER_API_KEY || '').trim()
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

const SYSTEM_PROMPT = `You are the OnePromise assistant, a friendly customer-acquisition helper that chats with prospective customers over a WhatsApp-style channel.

About OnePromise: it provides AI data services — including data labeling and annotation — helping teams get high-quality training data for their models.

Your goals, in order:
1. Greet warmly and answer the customer's question clearly and briefly.
2. Once they've shown interest, ask for their email address and a short description of what they need, so the team can follow up.
3. When you have both their email and their need, confirm that you've noted it and that someone will follow up shortly.

Style rules:
- Keep replies short and conversational, like text messages — usually 1-3 sentences. No long paragraphs or bullet lists.
- Be helpful and natural; don't be pushy. Ask for the email only after you've been useful.
- Never invent prices, delivery times, or commitments you can't back up. If unsure, say the team will confirm.`

function sendJson(res, status, body) {
  const data = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  })
  res.end(data)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > 1_000_000) {
        reject(new Error('Request body too large'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

async function handleChat(req, res) {
  if (!API_KEY) {
    return sendJson(res, 500, {
      error: 'Server is missing OPEN_ROUTER_API_KEY. Check proj/.env.',
    })
  }

  let payload
  try {
    payload = JSON.parse(await readBody(req))
  } catch {
    return sendJson(res, 400, { error: 'Invalid JSON body.' })
  }

  const history = Array.isArray(payload.messages) ? payload.messages : []
  // Only accept the fields OpenRouter expects, and drop anything malformed.
  const cleaned = history
    .filter((m) => m && typeof m.content === 'string')
    .map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content.slice(0, 4000),
    }))
    .slice(-20)

  const messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...cleaned]

  try {
    const upstream = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost',
        'X-Title': 'OnePromise Chat Demo',
      },
      body: JSON.stringify({ model: MODEL, messages }),
    })

    if (!upstream.ok) {
      const detail = await upstream.text()
      console.error('OpenRouter error', upstream.status, detail)
      return sendJson(res, 502, {
        error: `OpenRouter request failed (${upstream.status}).`,
      })
    }

    const data = await upstream.json()
    const reply = data?.choices?.[0]?.message?.content?.trim()
    if (!reply) {
      return sendJson(res, 502, { error: 'No reply returned by the model.' })
    }

    return sendJson(res, 200, { reply })
  } catch (err) {
    console.error('Chat handler failed', err)
    return sendJson(res, 500, { error: 'Failed to reach the model.' })
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/chat') {
    handleChat(req, res)
    return
  }
  if (req.method === 'GET' && req.url === '/api/health') {
    return sendJson(res, 200, { ok: true, model: MODEL, hasKey: !!API_KEY })
  }
  sendJson(res, 404, { error: 'Not found' })
})

server.listen(PORT, () => {
  console.log(`[api] OnePromise backend on http://localhost:${PORT}`)
  console.log(`[api] model: ${MODEL}  key: ${API_KEY ? 'loaded' : 'MISSING'}`)
})
