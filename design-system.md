# CRM系统UI设计规范

> 基于4张设计参考图制定的统一设计风格，所有页面开发必须遵循此规范。
> 当前前端框架：Vue 3 + Vite + TypeScript + Element Plus

---

## 1. 整体布局结构

### 1.1 侧边栏
- **宽度**: 220px (展开), 74px (折叠)
- **背景色**: `#f7f9fc` (浅灰蓝背景)
- **边框**: 右侧 1px solid `#e2e8f0`
- **内边距**: padding: 12px 10px

### 1.2 顶部栏(Header)
- **高度**: 62px
- **背景**: `rgba(255, 255, 255, 0.88)` + `backdrop-filter: blur(6px)` (毛玻璃效果)
- **边框**: 底部 1px solid `#e2e8f0`

### 1.3 内容区域
- **背景**: `radial-gradient(circle at 0 0, #ecf4ff 0%, #f7f9fc 35%, #f3f5f9 100%)` (渐变背景)
- **内边距**: padding: 14px

---

## 2. 配色方案

### 2.1 主色系
| 类型 | 颜色值 | 用途 |
|---|---|---|
| **主色(Primary)** | `#2f5cf6` | 按钮、链接、选中状态 |
| **主色渐变** | `linear-gradient(135deg, #2f5cf6, #1d4ed8)` | 激活按钮、选中菜单项 |
| **成功(Success)** | `#10b981` | 成功提示、通过状态 |
| **警告(Warning)** | `#f59e0b` | 警告提示、待处理状态 |
| **危险(Danger)** | `#ef4444` | 删除按钮、错误提示 |
| **信息(Info)** | `#64748b` | 次要文字、辅助信息 |

### 2.2 背景与边框
| 类型 | 颜色值 | 用途 |
|---|---|---|
| 页面背景 | `#f7f9fc` | 整体页面底色 |
| 卡片背景 | `#ffffff` | 内容卡片、表格区域 |
| 边框色 | `#e2e8f0` | 分割线、表单边框 |
| 悬停背景 | `#f1f5f9` | 表格行悬停、菜单悬停 |

---

## 3. 字体规范

| 场景 | 字号 | 字重 | 颜色 |
|---|---|---|---|
| 页面标题 | 20px | 600 | `#1e293b` |
| 模块标题 | 16px | 600 | `#1e293b` |
| 正文 | 14px | 400 | `#334155` |
| 辅助文字 | 13px | 400 | `#64748b` |
| 标签/表头 | 13px | 500 | `#475569` |

---

## 4. 组件规范

### 4.1 按钮
- **主按钮**: 背景 `#2f5cf6`，文字白色，圆角 6px
- **次按钮**: 背景白色，边框 `#e2e8f0`，文字 `#334155`
- **文字按钮**: 无背景，文字 `#2f5cf6`，用于表格内操作
- **危险按钮**: 背景 `#ef4444`，文字白色，仅用于删除操作

### 4.2 表单
- **输入框高度**: 36px
- **必填标记**: 字段标签前红色星号 `*`
- **错误提示**: Toast 形式，2 秒自动消失，不常驻
- **保存按钮文案**: 统一为"保存"

### 4.3 弹窗
- 统一右上角关闭 icon
- 底部主按钮统一为"保存"
- 删除操作必须二次确认
- 遮罩层背景: `rgba(0, 0, 0, 0.4)`

### 4.4 表格
- 去掉竖线，仅保留横线分割
- 内容垂直居中
- 链接去下划线，仅蓝色文字（`#2f5cf6`）
- 操作列使用文字按钮，间距 12px

### 4.5 页签(Tabs)
- 去掉 tab 下方多余分割线
- 激活态文字颜色 `#2f5cf6`，底部 2px 指示线

### 4.6 配置项管理
- 参考图：`design-references/配置项管理-主导产业.png`
- 页面采用左右分栏：左侧为配置分类检索与分类树，右侧为当前分类选项列表。
- 左侧分类选中态使用浅灰背景 + 右侧 `#2f5cf6` 竖向指示线。
- 右侧标题下方放置主按钮“+ 添加选项”，选项以浅灰色整行块展示，行高不低于 58px。
- 选项行格式统一为“选项N：内容”，编辑态在内容区域显示输入框。
- 行内操作使用文字按钮，顺序为：编辑、上移、下移、删除；编辑态为：保存、取消。
- 上移/下移只改变当前分类下选项顺序，最终通过页面右上角“保存”统一提交。
- 删除操作必须二次确认。

### 4.7 表格操作收起
- 参考图：`design-references/用户管理-操作收起.png`
- 当表格操作超过 2 个时，保留高频主操作为文字按钮，其余操作收进“...”下拉菜单。
- 下拉菜单为白底、8px 圆角、轻阴影；危险操作使用 `#ef4444`。
- 操作列固定在右侧时，保持白色背景遮罩，避免横向滚动时内容穿透。

---

## 5. 页面清单（V1 已实现）

| 页面 | 路由 | 组件路径 |
|---|---|---|
| 登录 | `/login` | `views/pages/LoginPage.vue` |
| 工作台 | `/` | `views/pages/WorkbenchPage.vue` |
| 联系人列表 | `/contacts` | `views/modules/ContactsListView.vue` |
| 新增联系人 | `/contacts/create` | `views/pages/ContactCreatePage.vue` |
| 项目列表 | `/projects` | `views/modules/ProjectsListView.vue` |
| 新建项目 | `/projects/create` | `views/modules/ProjectCreateView.vue` |
| 项目详情 | `/projects/:id` | `views/pages/ProjectDetailPage.vue` |
| 跟进记录 | `/followups` | `views/modules/FollowupsView.vue` |
| 新增跟进 | `/followups/create` | `views/pages/FollowupCreatePage.vue` |
| 合同列表 | `/contracts` | `views/modules/ContractsView.vue` |
| 新增合同 | `/contracts/create` | `views/pages/ContractCreatePage.vue` |
| 回款列表 | `/payments` | `views/modules/PaymentsView.vue` |
| 新增回款 | `/payments/create` | `views/pages/PaymentCreatePage.vue` |
| 成员与部门 | `/settings/org` | `views/pages/UsersDepartmentsPage.vue` |
| 角色管理 | `/settings/roles` | `views/pages/RoleSettingsPage.vue` |
| 数据范围 | `/settings/scope` | `views/pages/ScopeModePage.vue` |
| 数据字典 | `/settings/dicts` | `views/pages/DictSettingsPage.vue` |

---

**完整 CSS 覆盖见：** `frontend/src/styles/element-override.css`
