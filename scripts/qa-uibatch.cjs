const {chromium} = require('playwright');
const BASE = 'http://localhost:3100';
const OUT = process.env.TEMP + '/xdc-shots/';

(async () => {
  const b = await chromium.launch();

  // 1. SEARCH
  const s = await b.newPage({viewport: {width: 1440, height: 900}});
  await s.goto(BASE + '/docs/learn/', {waitUntil: 'networkidle'});
  const searchBtn = s.locator('.xdc-search-btn--live, [class*="searchBar"]').first();
  console.log('search bar present:', await searchBtn.count());
  await searchBtn.click();
  await s.waitForTimeout(800);
  const input = s.locator('.navbar__search-input, [class*="searchInput"], input[type="search"]').first();
  console.log('search input visible:', await input.isVisible());
  await input.fill('masternode');
  await s.waitForTimeout(1500);
  const results = await s.locator('[class*="searchResult"], [class*="search-result"]').count();
  console.log('search results for "masternode":', results);
  await s.screenshot({path: OUT + 'qa-search.png'});
  await s.close();

  // 2. MERMAID colors
  const m = await b.newPage({viewport: {width: 1440, height: 1200}});
  await m.goto(BASE + '/docs/enterprise/trade-finance', {waitUntil: 'networkidle'});
  await m.waitForTimeout(3000);
  const svgCount = await m.locator('.docusaurus-mermaid-container svg').count();
  const fill = await m.evaluate(() => {
    const r = document.querySelector('.docusaurus-mermaid-container rect');
    return r ? getComputedStyle(r).fill : 'none';
  });
  console.log('mermaid svg:', svgCount, '| actor fill:', fill);
  await m.screenshot({path: OUT + 'qa-mermaid-themed.png'});
  await m.close();

  // 3. LANDING new sections (light + dark)
  for (const [mode, scheme] of [['light', 'light'], ['dark', 'dark']]) {
    const p = await b.newPage({viewport: {width: 1440, height: 3200}, colorScheme: scheme});
    await p.goto(BASE + '/', {waitUntil: 'networkidle'});
    const tooling = await p.getByText('SDKs & tooling').count();
    const checklist = await p.getByText('Operator checklist').count();
    const cta = await p.getByText('Join builders shipping on XDC Network.').count();
    console.log(`landing ${mode}: tooling=${tooling} checklist=${checklist} cta=${cta}`);
    await p.screenshot({path: OUT + 'qa-landing-' + mode + '.png', fullPage: false});
    await p.evaluate(() => window.scrollTo(0, 2600));
    await p.waitForTimeout(400);
    await p.screenshot({path: OUT + 'qa-landing-' + mode + '-bottom.png'});
    await p.close();
  }

  // 4. 404
  const nf = await b.newPage({viewport: {width: 1440, height: 900}});
  const resp = await nf.goto(BASE + '/docs/no-such-page', {waitUntil: 'networkidle'});
  const lost = await nf.getByText('Lost?').count();
  console.log('404 status:', resp.status(), '| custom Lost? heading:', lost);
  await nf.screenshot({path: OUT + 'qa-404.png'});
  await nf.close();

  // 5. FEEDBACK widget
  const f = await b.newPage({viewport: {width: 1440, height: 1600}});
  await f.goto(BASE + '/docs/learn/glossary', {waitUntil: 'networkidle'});
  const widget = await f.getByText('Was this helpful?').count();
  console.log('feedback widget present:', widget);
  if (widget) {
    await f.locator('button:has(svg)').last().scrollIntoViewIfNeeded();
    const upBtn = f.locator('[class*="feedback"] button').first();
    await upBtn.click();
    await f.waitForTimeout(300);
    console.log('thanks shown:', await f.getByText('Thanks for the feedback.').count());
    await upBtn.scrollIntoViewIfNeeded();
    await f.screenshot({path: OUT + 'qa-feedback.png'});
  }
  await f.close();

  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
