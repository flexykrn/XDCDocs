# XDC Docs RAG Server

Backend chatbot server for the XDC Network documentation site. Retrieves relevant docs chunks from Pinecone and answers with Groq, using Gemini for embeddings.

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
| `GEMINI_API_KEY` | Google Gemini API key |
| `GEMINI_MODEL` | Gemini model (reserved) |
| `EMBEDDING_MODEL` | Gemini embedding model (e.g. text-embedding-004) |
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
| `POST` | `/api/chat` | Body: `{message, history?}`. Returns `{answer, sources}` or SSE stream when streaming enabled |
| `POST` | `/api/feedback` | Body: `{vote: 'up'\|'down', messageId?, page?, comment?, answerExcerpt?}`. Appends to feedback file |

## Ingest

`npm run ingest` (ingest.js provided separately).
