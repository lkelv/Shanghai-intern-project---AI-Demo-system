// Cloudflare Workers version of the OnePromise backend.
//
// It mirrors the logic in server.js (prompts, lead extraction, endpoints) but is
// adapted to the Workers runtime:
//   - `export default { fetch }` instead of a node:http server
//   - Cloudflare KV (env.JOURNEY) instead of writing journey.json to disk
//   - env.* secrets/vars instead of process.env + --env-file
//   - ctx.waitUntil() so the post-reply lead capture finishes after responding
//   - CORS headers so the hosted frontend can call it cross-origin if needed
//
// The local Node server.js is unchanged — keep it for the file-based demo.
// If you edit prompts, update BOTH files (they intentionally duplicate the text).

import products from './products.json'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi
const STAGES = ['acquisition', 'retention', 'conversion', 'payment']
const DEFAULT_MODEL = 'openai/gpt-oss-20b'

// ---- Prompting (mirror of server.js) ---------------------------------------

const BASE_PROMPT = `You are the OnePromise customer assistant. OnePromise sells the "OnePromise AI Training Course" — a practical online course that teaches teams and individuals how to build and apply AI.

Style: keep replies short and conversational, like chat messages (usually 1-3 sentences). Never use markdown tables. Be warm, helpful and never pushy. Never invent prices, discounts, or delivery promises beyond what you're told here.`

const STAGE_PROMPT = {
  acquisition: `STAGE — First contact. Answer the customer's question clearly. Once you've genuinely helped, ask for their email address and a short description of what they need, so the team can follow up.`,
  retention: `STAGE — Follow-up, the next day. Warmly re-engage the customer, reference what they came for, answer any new questions, and gently encourage them to enrol in the course.`,
  conversion: `STAGE — Choosing a plan. Always name the available tiers with their prices in a short, natural, conversational way (NO markdown tables, NO long bulleted lists — the tiers are also shown as cards on screen). Then recommend the single best-fit tier for the customer and briefly say why, and invite them to pick one. Show the options rather than only asking more questions. Answer objections honestly. Do not offer discounts.`,
  payment: `STAGE — Checkout confirmation. The customer is paying now. Warmly confirm their order and reassure them in 1-2 sentences.`,
}

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
  const fallback = lang === 'zh' ? 'Simplified Chinese' : 'English'
  p += `\n\nLanguage: reply in the SAME language the customer wrote their latest message in (if they write in Chinese, reply in Chinese; if in English, reply in English). If there is no customer message to judge from, reply in ${fallback}.`
  return p
}

// ---- OpenRouter -------------------------------------------------------------

async function callOpenRouter(apiKey, model, messages, { jsonMode = false } = {}) {
  const body = { model, messages }
  if (jsonMode) body.response_format = { type: 'json_object' }

  const upstream = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://onepromise.demo',
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

// ---- Journey store (Cloudflare KV, one record per session) ------------------

function newRecord(id, now) {
  return {
    id,
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

async function getJourney(env, id) {
  return (await env.JOURNEY.get(id, 'json')) || null
}

// Read → mutate → write for a single session. Each session is its own KV key, so
// there's no cross-session clobbering; the caller keeps per-session writes
// serialized (see finishChat) to avoid intra-session races.
async function upsertJourney(env, id, mutate) {
  const now = new Date().toISOString()
  let record = await getJourney(env, id)
  if (!record) record = newRecord(id, now)
  mutate(record, now)
  record.updatedAt = now
  await env.JOURNEY.put(id, JSON.stringify(record))
  return record
}

async function listJourneys(env) {
  const out = []
  const { keys } = await env.JOURNEY.list({ limit: 1000 })
  for (const k of keys) {
    const r = await env.JOURNEY.get(k.name, 'json')
    if (r) out.push(r)
  }
  return out
}

async function extractLead(env, cleaned) {
  const transcript = cleaned
    .map((m) => `${m.role === 'user' ? 'Customer' : 'Assistant'}: ${m.content}`)
    .join('\n')

  const raw = await callOpenRouter(
    (env.OPEN_ROUTER_API_KEY || '').trim(),
    env.OPENROUTER_MODEL || DEFAULT_MODEL,
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
    const m = raw.match(/\{[\s\S]*\}/)
    if (m) {
      try {
        parsed = JSON.parse(m[0])
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

// Runs via ctx.waitUntil after the reply is sent. Appends the turn(s) AND (on
// acquisition) captures the lead in ONE read-modify-write so the two updates
// can't clobber each other in KV.
async function finishChat(env, sessionId, stage, cleaned, reply, nudge) {
  const at = new Date().toISOString()
  const turns = []
  const lastUser = cleaned.at(-1)
  if (!nudge && lastUser && lastUser.role === 'user') {
    turns.push({ stage, role: 'user', text: lastUser.content, at })
  }
  turns.push({ stage, role: 'assistant', text: reply, at })

  let email = null
  let details = { name: null, need: '' }
  if (stage === 'acquisition') {
    const emails = cleaned
      .filter((m) => m.role === 'user')
      .flatMap((m) => m.content.match(EMAIL_RE) || [])
    email = emails.at(-1)?.toLowerCase() || null
    if (email) {
      try {
        details = await extractLead(env, cleaned)
      } catch {
        /* extraction is best-effort */
      }
    }
  }

  await upsertJourney(env, sessionId, (r) => {
    r.messages.push(...turns)
    if (STAGES.indexOf(stage) >= STAGES.indexOf(r.stage)) r.stage = stage
    if (email) {
      r.email = email
      if (details.name) r.name = details.name
      if (details.need) r.need = details.need
    }
  })
}

// ---- HTTP helpers -----------------------------------------------------------

// Same-origin (this Worker also serves the frontend), so no CORS needed.
function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function cleanMessages(messages) {
  return (Array.isArray(messages) ? messages : [])
    .filter((m) => m && typeof m.content === 'string')
    .map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content.slice(0, 4000),
    }))
    .slice(-24)
}

// ---- Handlers ---------------------------------------------------------------

async function handleChat(request, env, ctx) {
  const apiKey = (env.OPEN_ROUTER_API_KEY || '').trim()
  if (!apiKey) {
    return json({ error: 'Server is missing OPEN_ROUTER_API_KEY.' }, 500)
  }

  let payload
  try {
    payload = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }

  const sessionId = String(payload.sessionId || '').trim()
  if (!sessionId) return json({ error: 'Missing sessionId.' }, 400)

  const stage = STAGES.includes(payload.stage) ? payload.stage : 'acquisition'
  const nudge = !!payload.nudge
  const lang = payload.lang === 'zh' ? 'zh' : 'en'
  const cleaned = cleanMessages(payload.messages)

  const record = await getJourney(env, sessionId)
  const system = buildSystemPrompt(stage, record, payload.context, lang)
  const llm = [{ role: 'system', content: system }, ...cleaned]
  if (nudge && NUDGE[stage]) llm.push({ role: 'user', content: NUDGE[stage] })

  let reply
  try {
    reply = await callOpenRouter(apiKey, env.OPENROUTER_MODEL || DEFAULT_MODEL, llm)
  } catch (err) {
    return json(
      { error: err.status ? err.message : 'Failed to reach the model.' },
      err.status ? 502 : 500,
    )
  }
  if (!reply) return json({ error: 'No reply returned by the model.' }, 502)

  ctx.waitUntil(finishChat(env, sessionId, stage, cleaned, reply, nudge))
  return json({ reply }, 200)
}

async function handleOrder(request, env) {
  let payload
  try {
    payload = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }
  const sessionId = String(payload.sessionId || '').trim()
  if (!sessionId) return json({ error: 'Missing sessionId.' }, 400)

  const tier = products.tiers.find((t) => t.id === payload.optionId)
  if (!tier) return json({ error: 'Unknown option.' }, 400)

  const record = await upsertJourney(env, sessionId, (r) => {
    r.chosenOption = { id: tier.id, name: tier.name, price: tier.price }
    if (STAGES.indexOf('conversion') >= STAGES.indexOf(r.stage))
      r.stage = 'conversion'
  })
  return json({ ok: true, chosenOption: record.chosenOption }, 200)
}

async function handlePayment(request, env) {
  let payload
  try {
    payload = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }
  const sessionId = String(payload.sessionId || '').trim()
  if (!sessionId) return json({ error: 'Missing sessionId.' }, 400)

  const existing = await getJourney(env, sessionId)
  if (!existing?.chosenOption) {
    return json({ error: 'No option chosen yet.' }, 400)
  }

  const last4 = String(payload.cardNumber || '')
    .replace(/\D/g, '')
    .slice(-4)
  const record = await upsertJourney(env, sessionId, (r) => {
    r.payment = {
      status: 'paid',
      method: 'card',
      cardName: String(payload.cardName || '').slice(0, 120),
      last4,
      amount: r.chosenOption.price,
      currency: products.currency,
      receiptNo: `OP-${sessionId.slice(0, 8).toUpperCase()}`,
      paidAt: new Date().toISOString(),
    }
    r.stage = 'payment'
  })
  return json({ ok: true, payment: record.payment }, 200)
}

async function handleApi(request, env, ctx) {
  const { pathname, searchParams } = new URL(request.url)

  if (request.method === 'POST' && pathname === '/api/chat')
    return handleChat(request, env, ctx)
  if (request.method === 'POST' && pathname === '/api/order')
    return handleOrder(request, env)
  if (request.method === 'POST' && pathname === '/api/payment')
    return handlePayment(request, env)

  if (request.method === 'GET' && pathname === '/api/health') {
    return json({
      ok: true,
      model: env.OPENROUTER_MODEL || DEFAULT_MODEL,
      hasKey: !!(env.OPEN_ROUTER_API_KEY || '').trim(),
    }, 200)
  }
  if (request.method === 'GET' && pathname === '/api/products') {
    return json(products, 200)
  }
  if (request.method === 'GET' && pathname === '/api/journey') {
    const id = searchParams.get('id')
    if (id) {
      const r = await getJourney(env, id)
      return r ? json({ record: r }, 200) : json({ error: 'Not found' }, 404)
    }
    return json({ journeys: await listJourneys(env) }, 200)
  }

  return json({ error: 'Not found' }, 404)
}

// ---- Router -----------------------------------------------------------------

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url)
    // Backend API...
    if (pathname.startsWith('/api/')) return handleApi(request, env, ctx)
    // ...otherwise serve the built frontend (SPA static assets).
    return env.ASSETS.fetch(request)
  },
}
