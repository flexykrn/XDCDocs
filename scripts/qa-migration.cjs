const {chromium} = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const out = process.env.TEMP + '/xdc-shots/';
  const pages = [
    ['docs', '/docs'],
    ['learn', '/docs/learn/'],
    ['learn-gas', '/docs/learn/gas-fees'],
    ['xdcchain', '/docs/category/xdc-chain'],
    ['subnet-ui', '/docs/subnet/using-subnet/ui-usage-guide'],
    ['api', '/docs/api-reference/'],
    ['method-ref', '/docs/api-reference/method-reference/'],
    ['trade-finance', '/docs/enterprise/trade-finance'],
    ['ecosystem', '/docs/ecosystem/'],
    ['announcements', '/docs/announcements/'],
  ];
  const results = [];

  for (const [name, path] of pages) {
    const page = await browser.newPage({viewport: {width: 1440, height: 1400}});
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });
    const resp = await page.goto('http://localhost:3100' + path, {waitUntil: 'networkidle'});
    const brokenImgs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('img')).filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute('src'))
    );
    await page.screenshot({path: out + 'mig-' + name + '.png', fullPage: false});
    results.push([name, 'http=' + resp.status(), 'brokenImgs=' + brokenImgs.length, (brokenImgs[0] || ''), errors[0] || '']);
    await page.close();
  }

  // mermaid render check
  const mp = await browser.newPage({viewport: {width: 1440, height: 1600}});
  await mp.goto('http://localhost:3100/docs/enterprise/trade-finance', {waitUntil: 'networkidle'});
  await mp.waitForTimeout(2500);
  const mermaidSvg = await mp.locator('.docusaurus-mermaid-container svg').count();
  results.push(['mermaid svg count', mermaidSvg]);
  await mp.screenshot({path: out + 'mig-mermaid.png'});
  await mp.close();

  // tabs render check on api page
  const tp = await browser.newPage({viewport: {width: 1440, height: 1400}});
  await tp.goto('http://localhost:3100/docs/api-reference/', {waitUntil: 'networkidle'});
  const tabCount = await tp.getByRole('tab').count();
  results.push(['api page tab count', tabCount]);
  if (tabCount > 1) {
    const second = tp.getByRole('tab').nth(1);
    const label = await second.textContent();
    await second.click();
    results.push(['clicked tab', label, 'selected=' + (await second.getAttribute('aria-selected'))]);
    await tp.screenshot({path: out + 'mig-api-tabs.png'});
  }
  await tp.close();

  await browser.close();
  for (const r of results) console.log(r.join(' | '));
})().catch((e) => { console.error(e); process.exit(1); });
