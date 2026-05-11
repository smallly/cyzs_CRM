# 附件上传规范

适用范围：
- 跟进记录
- 合同附件
- 回款凭证
- 其他所有单文件附件字段

## 统一交互

1. 通过“选择文件”触发上传。
2. 上传后立即在输入区域内回显文件名。
3. 回显项以文件胶囊/标签形式展示，不再只显示纯文本。
4. 鼠标悬停时显示删除按钮，点击即可移除当前附件。
5. 如附件内容可解析为 `data:` 形式，点击回显项可预览。
6. 表单提交时，附件字段统一保存为 JSON 字符串：
   - `{"name":"xxx.pdf","data":"data:..."}`
7. 编辑态回显时，后端返回的附件字符串直接复用，不做二次结构转换。

## 展示规则

1. 单文件附件默认与相邻字段保持两列布局，不单独占整行，除非页面结构必须占满整行。
2. 回显项只显示一个当前附件。
3. 删除动作必须是鼠标悬停可见，避免占用常态布局空间。
4. 附件较长时使用省略号截断，保留完整 `title` 提示。
5. 可预览附件点击回显项打开预览，不可预览附件仅允许下载或静态展示。

## 数据规则

1. 只存文件名会导致后续无法预览，因此禁止作为新规范。
2. 前端在选择文件后应立即编码出可回传的附件 payload。
3. 后端仅负责原样保存与回传，不再剥离附件内容。

## 当前已落地页面

- [frontend/src/views/pages/FollowupCreatePage.vue](../frontend/src/views/pages/FollowupCreatePage.vue)
- [frontend/src/views/pages/ContractCreatePage.vue](../frontend/src/views/pages/ContractCreatePage.vue)
- [frontend/src/views/pages/PaymentCreatePage.vue](../frontend/src/views/pages/PaymentCreatePage.vue)
- [frontend/src/views/modules/ContractsView.vue](../frontend/src/views/modules/ContractsView.vue)
- [frontend/src/views/modules/PaymentsView.vue](../frontend/src/views/modules/PaymentsView.vue)
- [frontend/src/views/pages/ContractDetailPage.vue](../frontend/src/views/pages/ContractDetailPage.vue)
