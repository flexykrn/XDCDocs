const {chromium} = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const results = [];

  // ---- Light mode ----
  const light = await browser.newPage({viewport: {width: 1440, height: 2400}});
  await light.goto('http://localhost:3100/', {waitUntil: 'networkidle'});
  await light.screenshot({path: process.env.TEMP + '/xdc-shots/landing-light.png', fullPage: true});

  // Tab switching
  const title = light.locator('[data-testid="code-title"]');
  const code = light.locator('[data-testid="code-block"]');
  results.push(['initial tab title', await title.textContent()]);
  await light.getByRole('tab', {name: 'Foundry'}).click();
  results.push(['after Foundry click title', await title.textContent()]);
  results.push(['foundry code has solc_version', (await code.textContent()).includes('solc_version')]);
  await light.getByRole('tab', {name: 'RPC'}).click();
  results.push(['after RPC click title', await title.textContent()]);
  results.push(['rpc code has eth_blockNumber', (await code.textContent()).includes('eth_blockNumber')]);
  await light.screenshot({path: process.env.TEMP + '/xdc-shots/landing-tabs-rpc.png', fullPage: false});

  // Card links resolve
  for (const name of ['Connect a wallet', 'Deploy contracts', 'Run infrastructure']) {
    const page = await browser.newPage();
    await page.goto('http://localhost:3100/', {waitUntil: 'networkidle'});
    await page.getByRole('link', {name: new RegExp(name)}).first().click();
    await page.waitForLoadState('networkidle');
    results.push([name + ' lands on', page.url()]);
    const heading = await page.locator('h1').first().textContent();
    results.push([name + ' target h1', heading]);
    await page.close();
  }

  // ---- Dark mode ----
  const dark = await browser.newPage({viewport: {width: 1440, height: 2400}, colorScheme: 'dark'});
  await dark.goto('http://localhost:3100/', {waitUntil: 'networkidle'});
  await dark.screenshot({path: process.env.TEMP + '/xdc-shots/landing-dark.png', fullPage: true});

  // Font check: computed font-family on h1
  const ff = await light.evaluate(() => getComputedStyle(document.querySelector('.hero-heading')).fontFamily);
  results.push(['hero computed font-family', ff]);
  const ffLoaded = await light.evaluate(() => document.fonts.check('900 16px Inter'));
  results.push(['Inter 900 loaded', ffLoaded]);

  await browser.close();
  for (const [k, v] of results) console.log(k + ' => ' + v);
})().catch((e) => { console.error(e); process.exit(1); });
