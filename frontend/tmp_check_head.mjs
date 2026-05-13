import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  await page.route('**/api/**', route => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
  });

  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const headContent = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script')).map(s => ({
      src: s.src,
      type: s.type,
      textLength: s.textContent.length
    }));
    const links = Array.from(document.querySelectorAll('link')).map(l => ({
      rel: l.rel,
      href: l.href
    }));
    return { scripts, links };
  });
  console.log('Head content:', JSON.stringify(headContent, null, 2));

  await browser.close();
})();
