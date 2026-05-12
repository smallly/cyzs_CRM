# 附件上传规范

适用范围：
- 跟进记录
- 合同附件
- 回款凭证
- 其他所有单文件附件字段

## 统一交互

1. 通过“选择文件”触发上传。
2. 上传后立即在输入区域内回显文件名。
3. 支持一次选择多个文件，回显区展示为多个胶囊/标签。
4. 每个回显项都可以鼠标悬停删除。
5. 如附件内容可解析为 `data:` 形式，点击回显项可预览。
6. 表单提交时，附件字段统一保存为 JSON 数组字符串：
   - `[{"name":"xxx.pdf","data":"data:..."}, {"name":"yyy.png","data":"data:..."}]`
7. 兼容旧数据：
   - 旧的单对象字符串仍需可回显
   - 旧的仅文件名字符串仍需可回显，但不可预览
8. 编辑态回显时，后端返回的附件字符串直接复用，不做二次结构转换。

## 展示规则

1. 单文件附件默认与相邻字段保持两列布局，不单独占整行，除非页面结构必须占满整行。
2. 回显项显示全部当前附件。
3. 删除动作必须是鼠标悬停可见，避免占用常态布局空间。
4. 附件较长时使用省略号截断，保留完整 `title` 提示。
5. 可预览附件点击回显项打开预览，不可预览附件仅允许下载或静态展示。

## 数据规则

1. 只存文件名会导致后续无法预览，因此禁止作为新规范。
2. 前端在选择文件后应立即编码出可回传的附件 payload。
3. 后端仅负责原样保存与回传，不再剥离附件内容。

## 附件预览技术方案

所有可预览附件（图片、PDF）的点击打开行为统一走 `frontend/src/utils/attachment.ts` 中的 `openInNewTab(url)`。

### 为什么不能用 `window.open(dataUrl)`？

1. **弹窗拦截**：`window.open(dataUrl, '_blank')` 会被 Chrome 等浏览器的弹窗拦截器拦截，打开为 `about:blank#blocked`。
2. **URL 长度限制**：base64 data URL 通常很长（文件越大越长），直接作为 `<a href>` 或地址栏 URL 会超出浏览器限制，导致新标签页空白。

### 正确做法（已封装）

```ts
// utils/attachment.ts
export async function openInNewTab(url: string): Promise<void> {
  let targetUrl = url
  if (url.startsWith('data:')) {
    // 1. data URL → Blob
    const blob = await fetch(url).then((r) => r.blob())
    // 2. Blob → 短 Object URL (blob:http://...)
    targetUrl = URL.createObjectURL(blob)
  }
  // 3. <a> 标签模拟点击，不会被拦截
  const a = document.createElement('a')
  a.href = targetUrl
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    if (targetUrl !== url) URL.revokeObjectURL(targetUrl)
  }, 0)
}
```

关键点：
- data URL 先转 Blob，再生成 Object URL，URL 极短，不受长度限制。
- 用 `<a>` 标签模拟点击而非 `window.open`，浏览器视为用户主动导航，不触发弹窗拦截。
- 用完立即 `URL.revokeObjectURL` 释放内存。

## 当前已落地页面

- [frontend/src/views/pages/FollowupCreatePage.vue](../frontend/src/views/pages/FollowupCreatePage.vue)
- [frontend/src/views/pages/ContractCreatePage.vue](../frontend/src/views/pages/ContractCreatePage.vue)
- [frontend/src/views/pages/PaymentCreatePage.vue](../frontend/src/views/pages/PaymentCreatePage.vue)
- [frontend/src/views/modules/ContractsView.vue](../frontend/src/views/modules/ContractsView.vue)
- [frontend/src/views/modules/PaymentsView.vue](../frontend/src/views/modules/PaymentsView.vue)
- [frontend/src/views/pages/ContractDetailPage.vue](../frontend/src/views/pages/ContractDetailPage.vue)
