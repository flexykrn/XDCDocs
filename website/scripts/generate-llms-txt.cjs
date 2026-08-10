const fs = require('fs');
const path = require('path');

const BUILD_DIR = path.join(__dirname, '..', 'build');
const BASE_URL = 'https://docs.xdc.network';
const TITLE_SUFFIX = ' | XDC Network Documentation';

const SECTION_ORDER = [
  'learn',
  'xdc-chain',
  'smart-contracts',
  'api-reference',
  'security',
  'subnet',
  'enterprise',
  'ecosystem',
  'community',
  'legal',
  'governance',
  'announcements',
  'whitepaper',
  'homepage',
];

const SECTION_LABELS = {
  learn: 'Start Here',
  'xdc-chain': 'XDC Chain',
  'smart-contracts': 'Smart Contracts',
  'api-reference': 'API Reference',
  security: 'Security',
  subnet: 'XDC Subnet',
  enterprise: 'Enterprise',
  ecosystem: 'Ecosystem',
  community: 'Community',
  legal: 'Legal',
  governance: 'Governance',
  announcements: 'Announcements',
  whitepaper: 'Whitepaper',
  homepage: 'Homepage',
};

function getSection(url) {
  if (url === `${BASE_URL}/`) return 'homepage';
  if (url === `${BASE_URL}/docs/whitepaper`) return 'whitepaper';
  const match = url.match(/\/docs\/([^/]+)/);
  if (!match) return null;
  let seg = match[1];
  if (url.startsWith(`${BASE_URL}/docs/xdc-chain/governance`)) return 'governance';
  if (!SECTION_ORDER.includes(seg)) return null;
  return seg;
}

function getTitle(url) {
  let rel = url.slice(BASE_URL.length).replace(/\/+$/, '');
  const htmlPath = rel === '' ? path.join(BUILD_DIR, 'index.html') : path.join(BUILD_DIR, rel, 'index.html');
  if (!fs.existsSync(htmlPath)) return null;
  const html = fs.readFileSync(htmlPath, 'utf8');
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (!m) return null;
  let title = m[1].trim();
  if (title.endsWith(TITLE_SUFFIX)) title = title.slice(0, -TITLE_SUFFIX.length);
  return title || null;
}

function main() {
  const sitemapPath = path.join(BUILD_DIR, 'sitemap.xml');
  if (!fs.existsSync(sitemapPath)) {
    console.error('sitemap.xml not found; run this script after `docusaurus build`.');
    process.exit(1);
  }
  const sitemap = fs.readFileSync(sitemapPath, 'utf8');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

  const filtered = urls.filter(
    (u) =>
      u.startsWith(BASE_URL) &&
      !u.includes('/category/') &&
      u !== `${BASE_URL}/search` &&
      u !== `${BASE_URL}/search/` &&
      !u.includes('/markdown-page') &&
      !u.includes('/tags')
  );

  const sections = new Map();
  for (const key of SECTION_ORDER) sections.set(key, []);

  for (const url of filtered) {
    const section = getSection(url);
    if (!section) continue;
    const title = getTitle(url) || url;
    sections.get(section).push({ title, url });
  }

  const lines = [];
  lines.push('# XDC Network Documentation');
  lines.push('');
  lines.push(
    '> Developer documentation for the XDC Network (XDC Chain) — EVM-compatible Layer 1 with XDPoS 2.0 consensus, 2s finality, 2000+ TPS. Covers smart contracts, node operation, API reference, security, and subnet deployment. An AI assistant is available on every docs page; raw markdown available via the Copy Markdown button.'
  );
  lines.push('');

  let count = 0;
  for (const key of SECTION_ORDER) {
    const entries = sections.get(key);
    if (!entries || entries.length === 0) continue;
    lines.push(`## ${SECTION_LABELS[key]}`);
    for (const { title, url } of entries) {
      lines.push(`- [${title}](${url})`);
      count++;
    }
    lines.push('');
  }

  fs.writeFileSync(path.join(BUILD_DIR, 'llms.txt'), lines.join('\n'), 'utf8');
  console.log(`llms.txt generated with ${count} entries across ${[...sections.values()].filter((s) => s.length > 0).length} sections.`);
}

main();
