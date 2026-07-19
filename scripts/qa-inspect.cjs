const {chromium} = require('playwright');

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('http://localhost:3100/docs/learn/', {waitUntil: 'networkidle'});
  const count = await p.locator('.navbar [class*=search], .navbar [class*=Search]').count();
  console.log('search elements in navbar:', count);
  const outer = await p.locator('.navbar__items').first().innerHTML();
  console.log('left items snippet:', outer.replace(/<svg[\s\S]*?<\/svg>/g, '[svg]').slice(0, 700));
  const right = await p.locator('.navbar__items--right').innerHTML();
  console.log('right items snippet:', right.replace(/<svg[\s\S]*?<\/svg>/g, '[svg]').slice(0, 700));

  const fb = await b.newPage();
  await fb.goto('http://localhost:3100/docs/learn/glossary', {waitUntil: 'networkidle'});
  const w = await fb.getByText('Was this helpful?').evaluate((el) => el.parentElement.outerHTML.slice(0, 600));
  console.log('feedback DOM:', w);
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
