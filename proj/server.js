// Small local backend for the OnePromise customer-journey demo.
//
// Responsibilities (all must stay server-side):
//   1. Keep the OpenRouter API key OFF the browser. Every screen calls
//      POST /api/chat; this server adds the key + a stage-specific prompt.
//   2. Capture the journey: one record per customer (keyed by sessionId) is
//      accreted across the four stages and saved to journey.json —
//      email, need, messages, chosen option, and payment status.
// Run it with:  node --env-file=.env server.js   (see the "server" npm script)

import http from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import products from './products.json' with { type: 'json' }

// Use a dedicated var so we never collide with a generic PORT that the web
// dev server (or a harness) may also be using.
const PORT = process.env.API_PORT || 8791
const MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-oss-20b'
const API_KEY = (process.env.OPEN_ROUTER_API_KEY || '').trim()
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const JOURNEY_FILE = fileURLToPath(new URL('./journey.json', import.meta.url))
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi

const STAGES = ['acquisition', 'retention', 'conversion', 'payment']

// ---- Prompting --------------------------------------------------------------

const BASE_PROMPT = `You are the OnePromise customer assistant. OnePromise sells the "OnePromise AI Training Course" — a practical online course that teaches teams and individuals how to build and apply AI.

Style: keep replies short and conversational, like chat messages (usually 1-3 sentences). Never use markdown tables. Be warm, helpful and never pushy. Never invent prices, discounts, or delivery promises beyond what you're told here.`

const STAGE_PROMPT = {
  acquisition: `STAGE — First contact. Answer the customer's question clearly. Once you've genuinely helped, ask for their email address and a short description of what they need, so the team can follow up.`,
  retention: `STAGE — Follow-up, the next day. Warmly re-engage the customer, reference what they came for, answer any new questions, and gently encourage them to enrol in the course.`,
  conversion: `STAGE — Choosing a plan. Always name the available tiers with their prices in a short, natural, conversational way (NO markdown tables, NO long bulleted lists — the tiers are also shown as cards on screen). Then recommend the single best-fit tier for the customer and briefly say why, and invite them to pick one. Show the options rather than only asking more questions. Answer objections honestly. Do not offer discounts.`,
  payment: `STAGE — Checkout confirmation. The customer is paying now. Warmly confirm their order and reassure them in 1-2 sentences.`,
}

// Extra instruction used when a screen asks the AI to speak first (no user turn).
const NUDGE = {
  retention:
    "(It's the next day. Send me a brief, friendly follow-up that re-engages me and gently nudges me toward enrolling in the course.)",
  conversion:
    '(Based on our conversation, briefly name the tiers and their prices in a sentence or two — no tables — then recommend the single best one for me and why, and invite me to choose.)',
  payment:
    '(Confirm my order and give me a short, friendly confirmation message.)',
}

function catalogText() {
  return products.tiers
    .map(
      (t) =>
        `- ${t.name} ($${t.price}): ${t.blurb} Includes: ${t.features.join(', ')}.`,
    )
    .join('\n')
}

function buildSystemPrompt(stage, record, context, lang) {
  let p = `${BASE_PROMPT}\n\n${STAGE_PROMPT[stage] || STAGE_PROMPT.acquisition}`

  if (record?.need) {
    p += `\n\nWhat the customer said they need: "${record.need}"`
  }
  if (stage === 'retention' || stage === 'conversion') {
    p += `\n\nCourse tiers:\n${catalogText()}`
  }
  const option = context?.option || record?.chosenOption
  if (option && (stage === 'conversion' || stage === 'payment')) {
    p += `\n\nThe customer has chosen the ${option.name} tier ($${option.price}).`
  }

  // Language: always mirror the customer's most recent message; fall back to the
  // UI language when there's no customer message to go on (AI-initiated turns).
  const fallback = lang === 'zh' ? 'Simplified Chinese' : 'English'
  p += `\n\nLanguage: reply in the SAME language the customer wrote their latest message in (if they write in Chinese, reply in Chinese; if in English, reply in English). If there is no customer message to judge from, reply in ${fallback}.`
  return p
}

// ---- HTTP helpers -----------------------------------------------------------

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

async function parseJson(req) {
  return JSON.parse(await readBody(req))
}

// ---- OpenRouter -------------------------------------------------------------

async function callOpenRouter(messages, { jsonMode = false } = {}) {
  const body = { model: MODEL, messages }
  if (jsonMode) body.response_format = { type: 'json_object' }

  const upstream = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost',
      'X-Title': 'OnePromise Journey Demo',
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

// ---- Journey persistence (one record per session) ---------------------------

// Serialize all reads/writes so concurrent requests can't clobber the file.
let fileChain = Promise.resolve()
function withLock(fn) {
  const run = fileChain.then(fn, fn)
  fileChain = run.then(
    () => {},
    () => {},
  )
  return run
}

async function readJourneys() {
  try {
    const parsed = JSON.parse(await readFile(JOURNEY_FILE, 'utf8'))
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    if (err.code === 'ENOENT') return []
    console.error('[journey] could not read journey.json:', err.message)
    return []
  }
}

function newRecord(sessionId, now) {
  return {
    id: sessionId,
    email: null,
    name: null,
    need: null,
    stage: 'acquisition',
    messages: [],
    chosenOption: null,
    payment: null,
    source: 'journey-demo',
    createdAt: now,
    updatedAt: now,
  }
}

// Read → mutate → write for a single session, under the file lock.
async function upsertJourney(sessionId, mutate) {
  return withLock(async () => {
    const journeys = await readJourneys()
    const now = new Date().toISOString()
    let record = journeys.find((r) => r.id === sessionId)
    if (!record) {
      record = newRecord(sessionId, now)
      journeys.push(record)
    }
    mutate(record, now)
    record.updatedAt = now
    await writeFile(JOURNEY_FILE, JSON.stringify(journeys, null, 2) + '\n')
    return record
  })
}

async function getJourney(sessionId) {
  const journeys = await withLock(readJourneys)
  return journeys.find((r) => r.id === sessionId) || null
}

// Ask the model to pull structured lead fields out of the transcript.
async function extractLead(cleaned) {
  const transcript = cleaned
    .map((m) => `${m.role === 'user' ? 'Customer' : 'Assistant'}: ${m.content}`)
    .join('\n')

  const raw = await callOpenRouter(
    [
      {
        role: 'system',
        content:
          'You extract CRM lead details from a customer chat. Respond with ONLY a JSON object, no prose or code fences. Schema: {"name": string|null, "need": string}. "name" is the customer\'s name if given, else null. "need" is a concise one-sentence summary of what the customer is asking for.',
      },
      { role: 'user', content: `Conversation:\n${transcript}` },
    ],
    { jsonMode: true },
  )

  let parsed = {}
  try {
    parsed = JSON.parse(raw)
  } catch {
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

// Detect an email in the customer's turns and save email + extracted details.
async function captureLead(sessionId, cleaned) {
  const emails = cleaned
    .filter((m) => m.role === 'user')
    .flatMap((m) => m.content.match(EMAIL_RE) || [])
  const email = emails.at(-1)?.toLowerCase()
  if (!email) return

  let details = { name: null, need: '' }
  try {
    details = await extractLead(cleaned)
  } catch (err) {
    console.error('[journey] extraction failed:', err.message)
  }

  await upsertJourney(sessionId, (r) => {
    r.email = email
    if (details.name) r.name = details.name
    if (details.need) r.need = details.need
  })
  console.log(`[journey] captured lead ${email} for session ${sessionId}`)
}

// Append the new user turn (if any) and the assistant reply to the record.
async function persistTurn(sessionId, stage, cleaned, reply, nudge) {
  const at = new Date().toISOString()
  const turns = []
  const lastUser = cleaned.at(-1)
  if (!nudge && lastUser && lastUser.role === 'user') {
    turns.push({ stage, role: 'user', text: lastUser.content, at })
  }
  turns.push({ stage, role: 'assistant', text: reply, at })

  await upsertJourney(sessionId, (r) => {
    r.messages.push(...turns)
    if (STAGES.indexOf(stage) >= STAGES.indexOf(r.stage)) r.stage = stage
  })
}

// ---- Request handlers -------------------------------------------------------

function cleanMessages(messages) {
  return (Array.isArray(messages) ? messages : [])
    .filter((m) => m && typeof m.content === 'string')
    .map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content.slice(0, 4000),
    }))
    .slice(-24)
}

async function handleChat(req, res) {
  if (!API_KEY) {
    return sendJson(res, 500, {
      error: 'Server is missing OPEN_ROUTER_API_KEY. Check proj/.env.',
    })
  }

  let payload
  try {
    payload = await parseJson(req)
  } catch {
    return sendJson(res, 400, { error: 'Invalid JSON body.' })
  }

  const sessionId = String(payload.sessionId || '').trim()
  if (!sessionId) return sendJson(res, 400, { error: 'Missing sessionId.' })

  const stage = STAGES.includes(payload.stage) ? payload.stage : 'acquisition'
  const nudge = !!payload.nudge
  const lang = payload.lang === 'zh' ? 'zh' : 'en'
  const cleaned = cleanMessages(payload.messages)

  const record = await getJourney(sessionId)
  const system = buildSystemPrompt(stage, record, payload.context, lang)
  const llm = [{ role: 'system', content: system }, ...cleaned]
  if (nudge && NUDGE[stage]) llm.push({ role: 'user', content: NUDGE[stage] })

  try {
    const reply = await callOpenRouter(llm)
    if (!reply) {
      return sendJson(res, 502, { error: 'No reply returned by the model.' })
    }
    sendJson(res, 200, { reply })

    // Persist in the background so the reply isn't held up.
    persistTurn(sessionId, stage, cleaned, reply, nudge).catch((err) =>
      console.error('[journey] persist failed:', err.message),
    )
    if (stage === 'acquisition') {
      captureLead(sessionId, cleaned).catch((err) =>
        console.error('[journey] capture failed:', err.message),
      )
    }
  } catch (err) {
    console.error('Chat handler failed', err.status || '', err.detail || err)
    return sendJson(res, err.status ? 502 : 500, {
      error: err.status ? err.message : 'Failed to reach the model.',
    })
  }
}

async function handleOrder(req, res) {
  let payload
  try {
    payload = await parseJson(req)
  } catch {
    return sendJson(res, 400, { error: 'Invalid JSON body.' })
  }
  const sessionId = String(payload.sessionId || '').trim()
  if (!sessionId) return sendJson(res, 400, { error: 'Missing sessionId.' })

  const tier = products.tiers.find((t) => t.id === payload.optionId)
  if (!tier) return sendJson(res, 400, { error: 'Unknown option.' })

  const record = await upsertJourney(sessionId, (r) => {
    r.chosenOption = { id: tier.id, name: tier.name, price: tier.price }
    if (STAGES.indexOf('conversion') >= STAGES.indexOf(r.stage))
      r.stage = 'conversion'
  })
  console.log(`[journey] order ${tier.id} for session ${sessionId}`)
  return sendJson(res, 200, { ok: true, chosenOption: record.chosenOption })
}

async function handlePayment(req, res) {
  let payload
  try {
    payload = await parseJson(req)
  } catch {
    return sendJson(res, 400, { error: 'Invalid JSON body.' })
  }
  const sessionId = String(payload.sessionId || '').trim()
  if (!sessionId) return sendJson(res, 400, { error: 'Missing sessionId.' })

  const existing = await getJourney(sessionId)
  if (!existing?.chosenOption) {
    return sendJson(res, 400, { error: 'No option chosen yet.' })
  }

  const last4 = String(payload.cardNumber || '')
    .replace(/\D/g, '')
    .slice(-4)
  const paidAt = new Date().toISOString()
  const receiptNo = `OP-${sessionId.slice(0, 8).toUpperCase()}`

  const record = await upsertJourney(sessionId, (r) => {
    r.payment = {
      status: 'paid',
      method: 'card',
      cardName: String(payload.cardName || '').slice(0, 120),
      last4,
      amount: r.chosenOption.price,
      currency: products.currency,
      receiptNo,
      paidAt,
    }
    r.stage = 'payment'
  })
  console.log(`[journey] payment PAID for session ${sessionId}`)
  return sendJson(res, 200, { ok: true, payment: record.payment })
}

// ---- Router -----------------------------------------------------------------

const server = http.createServer((req, res) => {
  const url = req.url || ''

  if (req.method === 'POST' && url === '/api/chat') return handleChat(req, res)
  if (req.method === 'POST' && url === '/api/order') return handleOrder(req, res)
  if (req.method === 'POST' && url === '/api/payment')
    return handlePayment(req, res)

  if (req.method === 'GET' && url === '/api/health') {
    return sendJson(res, 200, { ok: true, model: MODEL, hasKey: !!API_KEY })
  }
  if (req.method === 'GET' && url === '/api/products') {
    return sendJson(res, 200, products)
  }
  if (req.method === 'GET' && url.startsWith('/api/journey')) {
    const id = new URL(url, 'http://localhost').searchParams.get('id')
    if (id) {
      return getJourney(id).then((record) =>
        record
          ? sendJson(res, 200, { record })
          : sendJson(res, 404, { error: 'Not found' }),
      )
    }
    return withLock(readJourneys).then((journeys) =>
      sendJson(res, 200, { journeys }),
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
