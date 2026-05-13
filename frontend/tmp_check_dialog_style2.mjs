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

  // 动态创建一个 dialog 来检查样式
  const styles = await page.evaluate(() => {
    // 创建 dialog
    const div = document.createElement('div');
    div.innerHTML = `
      <div class="el-dialog" style="display:block;position:fixed;top:100px;left:100px;width:400px;z-index:9999;background:#fff;border-radius:12px;box-shadow:0 0 20px rgba(0,0,0,0.3);">
        <div class="el-dialog__header">
          <span class="el-dialog__title">测试标题</span>
          <button class="el-dialog__headerbtn" type="button">
            <i class="el-icon el-dialog__close">X</i>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(div.firstElementChild);

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

  await page.screenshot({ path: 'D:/AI/saas_CRM/tmp_dialog_style.png' });
  console.log('Screenshot saved');

  await browser.close();
})();
