require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const { Pinecone } = require('@pinecone-database/pinecone');
const Groq = require('groq-sdk');

const {
  PINECONE_API_KEY,
  PINECONE_INDEX,
  PINECONE_NAMESPACE,
  GROQ_API_KEY,
  GROQ_MODEL,
  EMBEDDING_MODEL,
  FEEDBACK_FILE,
  RATE_LIMIT_PER_HOUR,
  ENABLE_STREAMING,
} = process.env;

const PORT = parseInt(process.env.PORT, 10) || 3101;

const missingEnv = [
  'PINECONE_API_KEY',
  'PINECONE_INDEX',
  'PINECONE_NAMESPACE',
  'GROQ_API_KEY',
  'GROQ_MODEL',
  'EMBEDDING_MODEL',
].filter((k) => !process.env[k]);
if (missingEnv.length) {
  console.error(`Missing required env vars: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
const index = pinecone.index(PINECONE_INDEX);
const namespace = PINECONE_NAMESPACE ? index.namespace(PINECONE_NAMESPACE) : index;

const groq = new Groq({ apiKey: GROQ_API_KEY });

const SYSTEM_PROMPT =
  'You are the XDC Network documentation assistant. Answer ONLY from the provided documentation context. If the answer is not in the context, say you don\'t know and suggest relevant docs sections. Keep answers concise with code blocks when useful. Cite sources as markdown links using the source URLs provided.';

const app = express();
app.use(express.json({ limit: '256kb' }));

const allowedOrigins = (process.env.RAG_CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      return cb(new Error('Not allowed by CORS'));
    },
  })
);

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: parseInt(RATE_LIMIT_PER_HOUR, 10) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/chat', limiter);
app.use('/api/feedback', limiter);

let extractorPromise = null;
function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = import('@xenova/transformers').then(({ pipeline }) =>
      pipeline('feature-extraction', EMBEDDING_MODEL)
    );
  }
  return extractorPromise;
}

async function embed(text) {
  const extractor = await getExtractor();
  const out = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(out.data);
}

async function queryPinecone(vector) {
  const res = await namespace.query({
    vector,
    topK: 5,
    includeMetadata: true,
  });
  return res.matches || [];
}

function buildContext(matches, cap = 4000) {
  let out = '';
  for (const m of matches) {
    const text = (m.metadata && m.metadata.text) || '';
    if (!text) continue;
    if (out.length + text.length > cap) break;
    out += (out ? '\n\n---\n\n' : '') + text;
  }
  return out;
}

function buildSources(matches, max = 3) {
  const seen = new Set();
  const sources = [];
  for (const m of matches) {
    const meta = m.metadata || {};
    const url = meta.url;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    sources.push({ title: meta.title || url, url });
    if (sources.length >= max) break;
  }
  return sources;
}

function trimHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter(
      (h) =>
        h &&
        (h.role === 'user' || h.role === 'assistant') &&
        typeof h.content === 'string'
    )
    .slice(-6)
    .map((h) => ({ role: h.role, content: h.content }));
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, index: PINECONE_INDEX, model: GROQ_MODEL });
});

app.post('/api/chat', async (req, res) => {
  const { message, history } = req.body || {};
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Missing or invalid "message" field.' });
  }

  try {
    const vector = await embed(message.trim());
    const matches = await queryPinecone(vector);
    const context = buildContext(matches);
    const sources = buildSources(matches);

    const userContent = context
      ? `Documentation context:\n${context}\n\nSources:\n${sources
          .map((s) => `- [${s.title}](${s.url})`)
          .join('\n')}\n\nUser question: ${message.trim()}`
      : `No relevant documentation context was found.\n\nUser question: ${message.trim()}`;

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...trimHistory(history),
      { role: 'user', content: userContent },
    ];

    if (ENABLE_STREAMING === 'true') {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders && res.flushHeaders();

      res.write(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`);

      const stream = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages,
        stream: true,
      });

      for await (const chunk of stream) {
        const delta =
          chunk.choices &&
          chunk.choices[0] &&
          chunk.choices[0].delta &&
          chunk.choices[0].delta.content;
        if (delta) {
          res.write(`data: ${JSON.stringify({ type: 'chunk', content: delta })}\n\n`);
        }
      }
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      return res.end();
    }

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages,
    });
    const answer =
      completion.choices &&
      completion.choices[0] &&
      completion.choices[0].message &&
      completion.choices[0].message.content;
    return res.json({ answer: answer || '', sources });
  } catch (err) {
    console.error('Chat error:', err && err.message ? err.message : err);
    if (!res.headersSent) {
      return res.status(502).json({ error: 'Upstream service error. Please try again later.' });
    }
    try {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Upstream service error.' })}\n\n`);
      res.end();
    } catch (_) {}
  }
});

app.post('/api/feedback', (req, res) => {
  const { vote, messageId, page, comment, answerExcerpt } = req.body || {};
  if (vote !== 'up' && vote !== 'down') {
    return res.status(400).json({ error: '"vote" must be "up" or "down".' });
  }
  const entry = {
    ts: new Date().toISOString(),
    vote,
    messageId: typeof messageId === 'string' ? messageId : undefined,
    page: typeof page === 'string' ? page : undefined,
    comment: typeof comment === 'string' ? comment : undefined,
    answerExcerpt: typeof answerExcerpt === 'string' ? answerExcerpt.slice(0, 500) : undefined,
  };
  try {
    const filePath = FEEDBACK_FILE || path.join(__dirname, 'feedback.jsonl');
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(filePath, JSON.stringify(entry) + '\n');
    return res.json({ ok: true });
  } catch (err) {
    console.error('Feedback error:', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'Failed to record feedback.' });
  }
});

app.listen(PORT, () => {
  console.log(`XDC docs RAG server listening on port ${PORT}`);
  console.log(`Pinecone index: ${PINECONE_INDEX}${PINECONE_NAMESPACE ? ` (namespace: ${PINECONE_NAMESPACE})` : ''}`);
  console.log(`Groq model: ${GROQ_MODEL} | Embedding model: ${EMBEDDING_MODEL}`);
  console.log(`Streaming: ${ENABLE_STREAMING === 'true' ? 'enabled' : 'disabled'}`);
});
