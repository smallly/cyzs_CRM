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
  await page.waitForTimeout(2000);

  // Check if any stylesheets exist
  const styleTags = await page.evaluate(() => document.querySelectorAll('style').length);
  const linkTags = await page.evaluate(() => document.querySelectorAll('link[rel="stylesheet"]').length);
  console.log('style tags:', styleTags, 'link tags:', linkTags);

  // Create a real Element Plus dialog structure in DOM
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

  // Screenshot
  await page.screenshot({ path: 'tmp_dialog_final.png', fullPage: false });

  // Check computed styles
  const styles = await page.evaluate(() => {
    const header = document.querySelector('.el-dialog__header');
    const title = document.querySelector('.el-dialog__title');
    const btn = document.querySelector('.el-dialog__headerbtn');
    const s = window.getComputedStyle;
    return {
      header: {
        paddingTop: s(header).paddingTop,
        paddingBottom: s(header).paddingBottom,
        paddingLeft: s(header).paddingLeft,
        paddingRight: s(header).paddingRight,
        display: s(header).display,
        alignItems: s(header).alignItems,
        justifyContent: s(header).justifyContent,
        borderBottom: s(header).borderBottom,
        height: s(header).height
      },
      title: {
        marginTop: s(title).marginTop,
        marginBottom: s(title).marginBottom,
        lineHeight: s(title).lineHeight,
        fontSize: s(title).fontSize,
        fontWeight: s(title).fontWeight
      },
      btn: {
        position: s(btn).position,
        display: s(btn).display,
        height: s(btn).height,
        width: s(btn).width,
        top: s(btn).top,
        right: s(btn).right
      }
    };
  });

  console.log('Computed styles:', JSON.stringify(styles, null, 2));

  await browser.close();
})();
