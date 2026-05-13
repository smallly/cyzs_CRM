import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.route('**/api/**', route => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
  });

  await page.goto('http://localhost:5173/login');
  await page.evaluate(() => {
    localStorage.setItem('crm_auth', JSON.stringify({
      token: 'fake-token-for-testing',
      uid: 'test-user-id',
      tid: 'test-tenant-id',
      userName: '测试用户',
      phone: '13800138000',
      tenantName: '测试租户'
    }));
  });

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 通过 styleSheets 检查 element-override.css 的规则
  const rules = await page.evaluate(() => {
    const result = [];
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.selectorText && rule.selectorText.includes('el-dialog__header')) {
            result.push({
              source: sheet.href || '(inline)',
              selector: rule.selectorText,
              cssText: rule.cssText
            });
          }
          if (rule.selectorText && rule.selectorText.includes('el-dialog__title')) {
            result.push({
              source: sheet.href || '(inline)',
              selector: rule.selectorText,
              cssText: rule.cssText
            });
          }
        }
      } catch (e) {
        // cross-origin stylesheet, skip
      }
    }
    return result;
  });

  console.log('Matching CSS rules:');
  for (const r of rules) {
    console.log('\nSource:', r.source);
    console.log('Selector:', r.selector);
    console.log('CSS:', r.cssText);
  }

  await browser.close();
})();
