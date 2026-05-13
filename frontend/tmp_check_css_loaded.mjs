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

  // Check if element-override.css is loaded
  const sheets = await page.evaluate(() => {
    return Array.from(document.styleSheets).map(s => ({
      href: s.href,
      title: s.title,
      ruleCount: s.cssRules?.length ?? 'N/A (cross-origin)'
    }));
  });
  console.log('Stylesheets:', JSON.stringify(sheets, null, 2));

  // Check a real button style
  const btnStyle = await page.evaluate(() => {
    const btn = document.createElement('button');
    btn.className = 'el-button el-button--primary';
    document.body.appendChild(btn);
    const style = window.getComputedStyle(btn);
    const result = {
      background: style.background,
      backgroundImage: style.backgroundImage,
      borderColor: style.borderColor
    };
    document.body.removeChild(btn);
    return result;
  });
  console.log('Primary button computed style:', btnStyle);

  // Check dialog header style by creating a mock structure
  const headerStyle = await page.evaluate(() => {
    const dialog = document.createElement('div');
    dialog.className = 'el-dialog';
    const header = document.createElement('div');
    header.className = 'el-dialog__header';
    dialog.appendChild(header);
    document.body.appendChild(dialog);
    const style = window.getComputedStyle(header);
    const result = {
      paddingTop: style.paddingTop,
      paddingBottom: style.paddingBottom,
      paddingLeft: style.paddingLeft,
      paddingRight: style.paddingRight,
      display: style.display,
      alignItems: style.alignItems,
      borderBottom: style.borderBottom
    };
    document.body.removeChild(dialog);
    return result;
  });
  console.log('Dialog header computed style:', headerStyle);

  await browser.close();
})();
