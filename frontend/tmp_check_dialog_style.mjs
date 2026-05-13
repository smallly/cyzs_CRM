import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.route('**/api/**', route => {
    const url = route.request().url();
    if (url.includes('/api/me')) {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ tenantName: '测试租户' }) });
    } else if (url.includes('/api/auth/tenants')) {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ tenantId: 'test-tenant', tenantName: '测试租户', isDefault: true }]) });
    } else if (url.includes('/api/projects')) {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ records: [{ id: 'test-project-id', name: '测试项目', code: '20260430-0001', dealType: 'RENT', source: '客户推荐', ownerId: 'admin', stage: 'PROSPECTING', createdAt: '2026-04-30T10:00:00' }], total: 1 }) });
    } else {
      route.continue();
    }
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

  await page.goto('http://localhost:5173/projects', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // 点击项目名称打开详情页
  await page.click('button.is-link');
  await page.waitForTimeout(2000);

  // 执行 JS 获取弹窗 header 的计算样式
  const styles = await page.evaluate(() => {
    const header = document.querySelector('.el-dialog__header');
    const title = document.querySelector('.el-dialog__title');
    const btn = document.querySelector('.el-dialog__headerbtn');
    if (!header || !title || !btn) return null;

    const headerStyle = window.getComputedStyle(header);
    const titleStyle = window.getComputedStyle(title);
    const btnStyle = window.getComputedStyle(btn);

    return {
      header: {
        paddingTop: headerStyle.paddingTop,
        paddingBottom: headerStyle.paddingBottom,
        paddingLeft: headerStyle.paddingLeft,
        paddingRight: headerStyle.paddingRight,
        height: headerStyle.height,
        alignItems: headerStyle.alignItems
      },
      title: {
        marginTop: titleStyle.marginTop,
        marginBottom: titleStyle.marginBottom,
        lineHeight: titleStyle.lineHeight,
        fontSize: titleStyle.fontSize,
        height: titleStyle.height
      },
      btn: {
        height: btnStyle.height,
        width: btnStyle.width
      }
    };
  });

  console.log('Dialog header computed styles:', JSON.stringify(styles, null, 2));

  await browser.close();
})();
