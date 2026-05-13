import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  await page.route('**/api/**', route => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
  });

  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
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

  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  // Wait longer for Vue app to mount and Vite to inject styles
  await page.waitForTimeout(5000);

  // Check stylesheets again
  const styleInfo = await page.evaluate(() => {
    const sheets = Array.from(document.styleSheets);
    const inlineStyles = Array.from(document.querySelectorAll('style')).map((s, i) => ({
      index: i,
      textLength: s.textContent.length,
      hasDialog: s.textContent.includes('.el-dialog')
    }));
    return {
      stylesheetCount: sheets.length,
      inlineStyleCount: inlineStyles.length,
      inlineStyles: inlineStyles.slice(0, 5),
      bodyClass: document.body.className,
      appExists: !!document.getElementById('app')
    };
  });
  console.log('Style info:', JSON.stringify(styleInfo, null, 2));

  // Create dialog
  await page.evaluate(() => {
    const overlay = document.createElement('div');
    overlay.className = 'el-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';

    const dialog = document.createElement('div');
    dialog.className = 'el-dialog';
    dialog.style.cssText = 'width:500px;background:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.15);';

    const header = document.createElement('div');
    header.className = 'el-dialog__header';
    header.innerHTML = '<span class="el-dialog__title">测试弹窗标题</span><button class="el-dialog__headerbtn"><i class="el-dialog__close">×</i></button>';

    const body = document.createElement('div');
    body.className = 'el-dialog__body';
    body.innerHTML = '<p>这是弹窗内容</p>';

    dialog.appendChild(header);
    dialog.appendChild(body);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
  });

  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tmp_dialog_wait.png', fullPage: false });

  // Check computed styles
  const styles = await page.evaluate(() => {
    const header = document.querySelector('.el-dialog__header');
    const s = window.getComputedStyle;
    return {
      paddingTop: s(header).paddingTop,
      paddingBottom: s(header).paddingBottom,
      paddingLeft: s(header).paddingLeft,
      paddingRight: s(header).paddingRight,
      display: s(header).display,
      alignItems: s(header).alignItems,
      borderBottom: s(header).borderBottom
    };
  });
  console.log('Header computed style:', JSON.stringify(styles, null, 2));

  await browser.close();
})();
