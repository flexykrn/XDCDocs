# XDC Docs RAG Server

Backend chatbot server for the XDC Network documentation site. Retrieves relevant docs chunks from Pinecone and answers with Groq, using local Xenova/transformers.js embeddings (no embedding API cost).

## Setup

```bash
npm install
npm start
```

Requires a `.env` file at the repo root (one level above this directory).

## Environment variables

| Variable | Purpose |
|---|---|
| `PINECONE_API_KEY` | Pinecone API key |
| `PINECONE_INDEX` | Pinecone index name |
| `PINECONE_NAMESPACE` | Pinecone namespace for docs vectors |
| `GROQ_API_KEY` | Groq API key |
| `GROQ_MODEL` | Groq chat completion model |
| `EMBEDDING_MODEL` | Local transformers.js embedding model (e.g. Xenova/all-MiniLM-L6-v2) |
| `DOCS_DIR` | Docs directory (used by ingest) |
| `PORT` | Server port (default 3101) |
| `RAG_CORS_ORIGIN` | Comma-separated allowed CORS origins |
| `FEEDBACK_FILE` | Path to feedback JSONL file |
| `RATE_LIMIT_PER_HOUR` | Max requests per IP per hour for chat/feedback |
| `ENABLE_STREAMING` | `true` to stream chat responses via SSE |

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Health check: `{ok, index, model}` |
| `POST` | `/api/chat` | Body: `{message, history?}`. Returns `{answer, sources}` or SSE stream when streaming enabled. FAQ hits return `{faq: true, id}` (JSON) or a `{type: 'meta', faq: true, id}` SSE event |
| `POST` | `/api/feedback` | Body: `{vote: 'up'\|'down', messageId?, page?, comment?, answerExcerpt?}`. Appends to feedback file |

## Deterministic FAQ layer

`faq.json` holds ~30 curated entries for the most common questions (derived from `website/docs/xdc-chain/faq.md`):

```json
{ "id": "add-xdc-metamask", "question": "How do I add XDC to MetaMask?",
  "keywords": ["metamask", "add", "network", "wallet", "setup", "configure"],
  "answer": "...", "sources": [{ "title": "...", "url": "/docs/..." }] }
```

Before the embed → Pinecone → Groq pipeline runs, the message is normalized (lowercase, punctuation stripped) and scored against every entry: keyword hit count (multi-word keywords count double) plus word-overlap ratio against the entry's canonical question. A match fires when **keyword hits >= 2 OR question-word overlap ratio > 0.5**; the highest-scoring entry wins. On a hit, the stored answer is returned directly (respecting `ENABLE_STREAMING` — SSE emits `meta` → `sources` → `chunk` → `done`), skipping Pinecone and Groq entirely, and a `FAQ hit` line is logged. On a miss, the request falls through to the normal RAG pipeline unchanged.

To tune: edit entries/keywords in `faq.json` (no restartless reload — restart the server after edits). Loosen/tighten the thresholds in `matchFaq()` in `index.js`. If `sources` is omitted, up to 3 sources are derived from `/docs/...` links in the answer.

## Ingest

`npm run ingest` (ingest.js provided separately).

## Deploy

### Docker

```bash
docker build -t xdc-docs-rag ./server
docker run -p 3101:3101 --env-file .env xdc-docs-rag
```

The image is `node:20-slim` (glibc required by onnxruntime-node used by `@xenova/transformers`). The embedding model is pre-downloaded at build time, so the first request is fast; if that build step is removed, the first non-FAQ chat request pays a ~100MB model-download cold start.

### Render (blueprint)

`render.yaml` at the repo root is a Render Blueprint: New + > Blueprint, point it at this repo. It builds `./server/Dockerfile` (docker context `./server`), health-checks `/api/health`, and injects `PORT` automatically (the server honors it). All env vars are marked `sync: false` — set them in the Render dashboard (Secrets/Environment) on first deploy.

### Railway / Fly

- **Railway**: New project > deploy from repo, set the root directory to `server` (Railway auto-detects the Dockerfile). Set `PORT` if needed (Railway provides it) plus all required env vars below.
- **Fly.io**: `fly launch` from `server/` (picks up the Dockerfile), `fly secrets set KEY=value ...` for each required env var, then `fly deploy`.

### Required env var checklist

| Variable | Notes |
|---|---|
| `PINECONE_API_KEY` | secret |
| `PINECONE_INDEX` | |
| `PINECONE_NAMESPACE` | |
| `GROQ_API_KEY` | secret |
| `GROQ_MODEL` | e.g. `llama-3.1-8b-instant` |
| `EMBEDDING_MODEL` | `Xenova/all-MiniLM-L6-v2` |
| `RAG_CORS_ORIGIN` | set to `https://docs.xdc.network` in production |
| `RATE_LIMIT_PER_HOUR` | optional, default 100 |
| `ENABLE_STREAMING` | optional, `true` for SSE |
| `DOCS_DIR` | ingest only (not needed by the running server) |

### After deploy

Set `RAG_API_URL` on the website (Docusaurus) build environment to the deployed server URL (e.g. `https://xdc-docs-rag.onrender.com`) so the chatbot widget calls the right backend.

### Reindexing

`.github/workflows/reindex.yml` re-runs `ingest.js` on every push to `main` that touches `website/docs/**` (and manually via workflow_dispatch), using the `PINECONE_API_KEY`, `PINECONE_INDEX`, and `PINECONE_NAMESPACE` GitHub secrets.
