const {chromium} = require('playwright');
const BASE = 'http://localhost:3100';

(async () => {
  const b = await chromium.launch();

  // ---- 1. Admonitions rendered ----
  for (const p of ['/docs/learn/glossary', '/docs/learn/gas-fees', '/docs/enterprise/', '/docs/learn/blockchain-basics']) {
    const pg = await b.newPage();
    await pg.goto(BASE + p, {waitUntil: 'networkidle'});
    const n = await pg.locator('.theme-admonition').count();
    const kinds = await pg.locator('.theme-admonition').evaluateAll((els) => els.map((e) => e.className.match(/theme-admonition-(\w+)/)?.[1]));
    console.log(`ADMON ${p} => ${n} [${kinds}]`);
    await pg.close();
  }

  // ---- 2. Tabs rendered + switching ----
  for (const p of ['/docs/api-reference/', '/docs/api-reference/json-rpc', '/docs/learn/gas-fees']) {
    const pg = await b.newPage();
    await pg.goto(BASE + p, {waitUntil: 'networkidle'});
    const groups = await pg.locator('.tabs').count();
    const tabs = await pg.getByRole('tab').count();
    let switched = 'n/a';
    if (tabs > 1) {
      const panel1 = await pg.locator('[role="tabpanel"]').first().textContent();
      await pg.getByRole('tab').nth(1).click();
      await pg.waitForTimeout(400);
      const panel2 = await pg.locator('[role="tabpanel"]').first().textContent();
      switched = panel1 !== panel2;
    }
    console.log(`TABS ${p} => groups=${groups} tabs=${tabs} contentSwitches=${switched}`);
    await pg.close();
  }

  // ---- 3. Mermaid ----
  {
    const pg = await b.newPage();
    await pg.goto(BASE + '/docs/enterprise/trade-finance', {waitUntil: 'networkidle'});
    await pg.waitForTimeout(3000);
    const svg = await pg.locator('.docusaurus-mermaid-container svg').count();
    console.log(`MERMAID trade-finance => svg=${svg}`);
    await pg.close();
  }

  // ---- 4. Emoji shortcodes gone from rendered text ----
  for (const p of ['/docs/learn/', '/docs/enterprise/', '/docs/enterprise/rwa-tokenization']) {
    const pg = await b.newPage();
    await pg.goto(BASE + p, {waitUntil: 'networkidle'});
    const text = await pg.locator('article').textContent();
    const hits = text.match(/:[a-z][a-z0-9]+(-[a-z0-9]+)+:/g);
    console.log(`EMOJI ${p} => remaining shortcodes: ${hits ? hits.length : 0}`);
    await pg.close();
  }

  // ---- 5. Link/image crawl on 5 pages ----
  const crawl = ['/docs/learn/blockchain-basics', '/docs/subnet/components/relayer', '/docs/xdc-chain/developers/quick-guide', '/docs/enterprise/iso-20022', '/docs/api-reference/method-reference/eth'];
  for (const p of crawl) {
    const pg = await b.newPage();
    await pg.goto(BASE + p, {waitUntil: 'networkidle'});
    const links = await pg.evaluate(() => Array.from(document.querySelectorAll('article a[href]')).map((a) => a.getAttribute('href')));
    const internal = [...new Set(links.filter((h) => h && h.startsWith('/docs') && !h.startsWith('/docs/category')))];
    let bad = 0;
    for (const l of internal) {
      const r = await pg.request.get(BASE + l.split('#')[0]);
      if (r.status() !== 200) { bad++; console.log(`  BADLINK ${p} -> ${l} (${r.status()})`); }
    }
    const imgs = await pg.evaluate(() => Array.from(document.querySelectorAll('article img')).filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute('src')));
    console.log(`CRAWL ${p} => internalLinks=${internal.length} bad=${bad} brokenImgs=${imgs.length}${imgs[0] ? ' first=' + imgs[0] : ''}`);
    await pg.close();
  }

  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
