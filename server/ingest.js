require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pinecone } = require('@pinecone-database/pinecone');

const DRY_RUN = process.argv.includes('--dry-run');
const MAX_CHUNK_WORDS = 1200;
const MIN_CHUNK_WORDS = 30;
const EMBED_BATCH_SIZE = 5;
const EMBED_BATCH_DELAY_MS = 200;
const UPSERT_BATCH_SIZE = 100;

function resolveDocsDir() {
  const raw = process.env.DOCS_DIR;
  if (!raw) {
    console.error('Missing required env var: DOCS_DIR');
    process.exit(1);
  }
  const repoRoot = path.join(__dirname, '..');
  const candidates = [
    path.resolve(__dirname, raw),
    path.resolve(repoRoot, raw),
    path.resolve(raw),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isDirectory()) return c;
  }
  console.error(`DOCS_DIR does not resolve to a directory: ${raw}`);
  process.exit(1);
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.toLowerCase() === 'img') continue;
      out.push(...walk(full));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

function stripFrontmatter(content) {
  const m = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  const frontmatter = m ? m[0] : '';
  const body = m ? content.slice(m[0].length) : content;
  return { frontmatter, body };
}

function frontmatterTitle(frontmatter) {
  const m = frontmatter.match(/^title:\s*(.+)$/m);
  if (!m) return null;
  return m[1].trim().replace(/^["']|["']$/g, '');
}

function firstH1(body) {
  const m = body.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

function deriveUrl(docsDir, filePath) {
  let rel = path.relative(docsDir, filePath).split(path.sep).join('/');
  rel = rel.replace(/\.md$/i, '');
  if (rel.endsWith('/index')) rel = rel.slice(0, -'/index'.length);
  return `/docs/${rel}`;
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function splitParagraphs(heading, text) {
  const paragraphs = text.split(/\n{2,}/);
  const chunks = [];
  let current = '';
  for (const p of paragraphs) {
    const candidate = current ? `${current}\n\n${p}` : p;
    if (current && wordCount(candidate) > MAX_CHUNK_WORDS) {
      chunks.push({ heading, text: current });
      current = p;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push({ heading, text: current });
  return chunks;
}

function chunkBody(body) {
  const lines = body.split('\n');
  const sections = [];
  let heading = null;
  let buffer = [];
  const flush = () => {
    const text = buffer.join('\n').trim();
    if (text) sections.push({ heading, text });
    buffer = [];
  };
  for (const line of lines) {
    const m = line.match(/^(#{2,3})\s+(.+)$/);
    if (m) {
      flush();
      heading = m[2].trim();
    } else {
      buffer.push(line);
    }
  }
  flush();

  const chunks = [];
  for (const s of sections) {
    if (wordCount(s.text) > MAX_CHUNK_WORDS) {
      chunks.push(...splitParagraphs(s.heading, s.text));
    } else {
      chunks.push(s);
    }
  }
  return chunks.filter((c) => wordCount(c.text) >= MIN_CHUNK_WORDS);
}

function processFile(docsDir, filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const { frontmatter, body } = stripFrontmatter(raw);
  const url = deriveUrl(docsDir, filePath);
  const title =
    firstH1(body) ||
    frontmatterTitle(frontmatter) ||
    path.basename(filePath, path.extname(filePath));
  const chunks = chunkBody(body).map((c) => ({
    section: c.heading || title,
    text: `Page: ${title}\nSection: ${c.heading || title}\n\n${c.text}`,
  }));
  return { url, title, chunks };
}

function sha1(input) {
  return crypto.createHash('sha1').update(input).digest('hex');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

let extractorPromise = null;
function getExtractor(model) {
  if (!extractorPromise) {
    extractorPromise = import('@xenova/transformers').then(({ pipeline }) =>
      pipeline('feature-extraction', model)
    );
  }
  return extractorPromise;
}

async function embedWithRetry(extractor, text) {
  const delays = [1000, 2000, 4000];
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const out = await extractor(text, { pooling: 'mean', normalize: true });
      return Array.from(out.data);
    } catch (err) {
      const msg = (err && err.message) || String(err);
      const isRateLimit = msg.includes('429') || /rate.?limit|quota|resource.?exhausted/i.test(msg);
      if (!isRateLimit || attempt === 2) throw err;
      await sleep(delays[attempt]);
    }
  }
  throw new Error('unreachable');
}

async function main() {
  const docsDir = resolveDocsDir();
  const files = walk(docsDir);
  if (!files.length) {
    console.error(`No .md files found under ${docsDir}`);
    process.exit(1);
  }
  console.log(`Docs dir: ${docsDir}`);
  console.log(`Found ${files.length} markdown files`);

  const pages = [];
  let totalChunks = 0;
  for (const f of files) {
    const page = processFile(docsDir, f);
    pages.push(page);
    totalChunks += page.chunks.length;
    console.log(`${page.url} — ${page.chunks.length} chunk(s)`);
  }

  if (DRY_RUN) {
    console.log(`\nDry run: ${files.length} files, ${totalChunks} chunks. No API calls made.`);
    return;
  }

  const { PINECONE_API_KEY, PINECONE_INDEX, PINECONE_NAMESPACE, EMBEDDING_MODEL } = process.env;
  const missingEnv = ['PINECONE_API_KEY', 'PINECONE_INDEX', 'EMBEDDING_MODEL'].filter(
    (k) => !process.env[k]
  );
  if (missingEnv.length) {
    console.error(`Missing required env vars: ${missingEnv.join(', ')}`);
    process.exit(1);
  }

  console.log(`Loading embedding model ${EMBEDDING_MODEL} (first run downloads it)...`);
  const extractor = await getExtractor(EMBEDDING_MODEL);
  const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
  const index = pinecone.index(PINECONE_INDEX);
  const namespace = PINECONE_NAMESPACE ? index.namespace(PINECONE_NAMESPACE) : index;

  // clear stale vectors first so removed/renamed docs don't linger in the index
  // (skip with --no-clean). Brief empty-index window; FAQ layer still serves common answers.
  if (process.argv.includes('--no-clean')) {
    console.log('Skipping namespace clean (--no-clean).');
  } else {
    console.log('Clearing namespace before upsert...');
    await namespace.deleteAll();
  }

  let upserted = 0;
  let pending = [];

  const flushUpserts = async () => {
    if (!pending.length) return;
    await namespace.upsert({ records: pending });
    upserted += pending.length;
    pending = [];
  };

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    for (let b = 0; b < page.chunks.length; b += EMBED_BATCH_SIZE) {
      const batch = page.chunks.slice(b, b + EMBED_BATCH_SIZE);
      for (let j = 0; j < batch.length; j++) {
        const chunkIndex = b + j;
        const chunk = batch[j];
        const values = await embedWithRetry(extractor, chunk.text);
        pending.push({
          id: sha1(page.url + chunkIndex),
          values,
          metadata: {
            url: page.url,
            title: page.title,
            section: chunk.section,
            text: chunk.text,
          },
        });
        if (pending.length >= UPSERT_BATCH_SIZE) await flushUpserts();
      }
      if (b + EMBED_BATCH_SIZE < page.chunks.length) await sleep(EMBED_BATCH_DELAY_MS);
    }
    await flushUpserts();
    console.log(`[${i + 1}/${pages.length}] ${page.url} — ${page.chunks.length} chunk(s) upserted`);
  }

  console.log(`\nDone: ${files.length} files, ${totalChunks} chunks, ${upserted} vectors upserted.`);
}

main().catch((err) => {
  console.error('Ingestion failed:', err && err.message ? err.message : err);
  process.exit(1);
});
