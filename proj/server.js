// Small local backend for the OnePromise chat demo.
//
// It does two things, and both must stay server-side:
//   1. Keeps the OpenRouter API key OFF the browser — the frontend calls
//      POST /api/chat and this server adds the key + system prompt.
//   2. Captures leads: when a conversation contains an email, it extracts the
//      prospect's details and saves them as a record in leads.json.
// Run it with:  node --env-file=.env server.js   (see the "server" npm script)

import http from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'

// Use a dedicated var so we never collide with a generic PORT that the web
// dev server (or a harness) may also be using.
const PORT = process.env.API_PORT || 8791
const MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-oss-20b'
const API_KEY = (process.env.OPEN_ROUTER_API_KEY || '').trim()
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const LEADS_FILE = fileURLToPath(new URL('./leads.json', import.meta.url))
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi

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

// Single place that talks to OpenRouter. Returns the assistant message string.
async function callOpenRouter(messages, { jsonMode = false } = {}) {
  const body = { model: MODEL, messages }
  if (jsonMode) body.response_format = { type: 'json_object' }

  const upstream = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost',
      'X-Title': 'OnePromise Chat Demo',
    },
    body: JSON.stringify(body),
  })

  if (!upstream.ok) {
    const detail = await upstream.text()
    const err = new Error(`OpenRouter request failed (${upstream.status})`)
    err.status = upstream.status
    err.detail = detail
    throw err
  }

  const data = await upstream.json()
  return data?.choices?.[0]?.message?.content?.trim() ?? ''
}

// ---- Lead persistence -------------------------------------------------------

// Serialize all reads/writes so concurrent chats can't clobber leads.json.
let leadsChain = Promise.resolve()
function withLeadsLock(fn) {
  const run = leadsChain.then(fn, fn)
  leadsChain = run.then(
    () => {},
    () => {},
  )
  return run
}

async function readLeads() {
  try {
    const raw = await readFile(LEADS_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    if (err.code === 'ENOENT') return [] // file not created yet
    console.error('[leads] could not read leads.json:', err.message)
    return []
  }
}

// Ask the model to pull structured lead fields out of the transcript.
async function extractLead(cleaned, email) {
  const transcript = cleaned
    .map((m) => `${m.role === 'user' ? 'Customer' : 'Assistant'}: ${m.content}`)
    .join('\n')

  const raw = await callOpenRouter(
    [
      {
        role: 'system',
        content:
          'You extract CRM lead details from a customer chat. Respond with ONLY a JSON object, no prose or code fences. Schema: {"name": string|null, "need": string}. "name" is the customer\'s name if they gave one, else null. "need" is a concise one-sentence summary of what the customer is asking for.',
      },
      { role: 'user', content: `Conversation:\n${transcript}` },
    ],
    { jsonMode: true },
  )

  let parsed = {}
  try {
    parsed = JSON.parse(raw)
  } catch {
    // Fall back to the first {...} block if the model wrapped it in prose.
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        parsed = JSON.parse(match[0])
      } catch {
        /* keep empty */
      }
    }
  }

  return {
    name: typeof parsed.name === 'string' ? parsed.name.trim() || null : null,
    need: typeof parsed.need === 'string' ? parsed.need.trim() : '',
  }
}

// Runs AFTER the reply is sent so it never slows the chat. Detects an email in
// the customer's messages and upserts a lead record keyed by that email.
async function captureLead(cleaned) {
  const emails = cleaned
    .filter((m) => m.role === 'user')
    .flatMap((m) => m.content.match(EMAIL_RE) || [])
  const email = emails.at(-1)?.toLowerCase()
  if (!email) return

  let details
  try {
    details = await extractLead(cleaned, email)
  } catch (err) {
    console.error('[leads] extraction failed:', err.message)
    details = { name: null, need: '' }
  }

  await withLeadsLock(async () => {
    const leads = await readLeads()
    const now = new Date().toISOString()
    const existing = leads.find((l) => l.email === email)

    if (existing) {
      existing.name = details.name ?? existing.name
      if (details.need) existing.need = details.need
      existing.messageCount = cleaned.length
      existing.updatedAt = now
    } else {
      leads.push({
        id: randomUUID(),
        email,
        name: details.name,
        need: details.need,
        source: 'whatsapp-demo',
        messageCount: cleaned.length,
        createdAt: now,
        updatedAt: now,
      })
    }

    await writeFile(LEADS_FILE, JSON.stringify(leads, null, 2) + '\n')
    console.log(
      `[leads] ${existing ? 'updated' : 'captured'} lead for ${email}`,
    )
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
    const reply = await callOpenRouter(messages)
    if (!reply) {
      return sendJson(res, 502, { error: 'No reply returned by the model.' })
    }

    sendJson(res, 200, { reply })

    // Fire-and-forget: extract + save the lead without holding up the reply.
    captureLead(cleaned).catch((err) =>
      console.error('[leads] capture failed:', err.message),
    )
  } catch (err) {
    console.error('Chat handler failed', err.status || '', err.detail || err)
    if (err.status) {
      return sendJson(res, 502, { error: err.message })
    }
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
  if (req.method === 'GET' && req.url === '/api/leads') {
    return withLeadsLock(readLeads).then((leads) =>
      sendJson(res, 200, { leads }),
    )
  }
  sendJson(res, 404, { error: 'Not found' })
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `[api] Port ${PORT} is already in use — another server is probably still running.\n` +
        `[api] Free it with:  lsof -ti:${PORT} | xargs kill\n` +
        `[api] Or run on a different port:  API_PORT=8792 npm run server`,
    )
    process.exit(1)
  }
  throw err
})

server.listen(PORT, () => {
  console.log(`[api] OnePromise backend on http://localhost:${PORT}`)
  console.log(`[api] model: ${MODEL}  key: ${API_KEY ? 'loaded' : 'MISSING'}`)
})
