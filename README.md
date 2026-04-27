# 项目开发总说明（AI 执行入口）
> AI 每次开始改代码前必须先读本文件。  
> 若与用户当次明确指令冲突，以用户当次指令为准。

---

## 一、项目简介

产业地产 CRM SaaS 系统，覆盖联系人、项目、跟进、合同、回款及组织配置等业务流程。

---

## 二、技术栈（当前实现）

| 层 | 技术 |
|---|---|
| 前端框架 | Vue 3 + TypeScript + Vite |
| UI 实现方式 | 原生 Vue 模板 + 自定义 CSS（当前未接入 Element Plus） |
| 状态管理 | Composition API（`ref/reactive/computed`） |
| 路由 | 无 Vue Router，使用 `activeMenu` 单页切换 |
| HTTP 客户端 | `fetch`（封装在 `frontend/src/App.vue` 的 `api<T>()`） |
| 后端框架 | Java 17 + Spring Boot 3.3.4 |
| 数据访问 | InMemoryStore + `state_store` 持久化（MyBatis-Plus 依赖已引入） |
| 数据库 | MySQL 8（`indcrm`） |
| 鉴权 | JWT（7 天）+ 角色/数据范围权限 |
| 实时推送 | SSE（`/api/stream/subscribe`） |

---

## 三、权威文档与优先级

### 1. 权威文档
- 需求文档：[`产业地产CRM_SaaS系统_需求说明书.md`](D:\AI\saas_CRM\产业地产CRM_SaaS系统_需求说明书.md)
- 技术方案：[`产业地产CRM_SaaS系统_技术方案说明书_V1.md`](D:\AI\saas_CRM\产业地产CRM_SaaS系统_技术方案说明书_V1.md)
- 任务计划：[`plan.md`](D:\AI\saas_CRM\plan.md)
- 接口规范：[`api-conventions.md`](D:\AI\saas_CRM\api-conventions.md)
- UI 规范：[`design-system.md`](D:\AI\saas_CRM\design-system.md)

### 2. 执行优先级
1. 用户当次明确指令
2. 需求文档
3. 技术方案
4. `plan.md`
5. `api-conventions.md` / `design-system.md`

> 任何冲突或歧义：先询问用户确认，不允许自行猜测。

---

## 四、AI 全局执行要求（改代码前必读）

1. 先读后改  
- 必须先读取并遵循“权威文档”章节中的文件。

2. 单任务执行  
- 每次只做 `plan.md` 中第一个 `[ ]` 的 Task。  
- 一个 Task 完成后，自动进入下一个未完成 Task，直到用户中断或切换需求。

3. 改动边界  
- 只改与当前 Task 直接相关的文件。  
- 禁止顺手改无关代码、无关样式、无关命名。  
- 未经确认禁止新增 npm / Maven 依赖。

4. 规范一致性  
- 接口变更必须符合 `api-conventions.md`。  
- 样式/交互必须符合 `design-system.md`。

5. 高风险操作约束  
- 删除类操作必须二次确认。  
- 错误提示统一 toast（2s）。

6. 不确定先问  
- 遇到需求缺失、字段含义不清、权限口径冲突，必须先问用户。

7. **Git 版本管理（强制）**
- **每次改动代码后必须提交并推送到远程仓库。**
- 流程：`git add -A` → `git commit -m "type: subject"` → `git push origin <current-branch>`
- commit message 格式：`<type>: <subject>`
  - `feat`: 新功能
  - `fix`: 修复 bug
  - `refactor`: 重构
  - `docs`: 文档更新
  - `chore`: 构建/工具改动
- 若推送失败（网络问题），记录原因并在下次交互开始时优先重试推送。

---

## 五、代码改动后必须同步的文档

> 只要代码改动涉及需求变更、范围变化、项目状态变化，必须同步更新以下文档。

### 1. 同步矩阵（强制）
- 需求口径变化：更新需求文档（或在需求文档补充“修订记录”）
- 技术实现方案变化：更新技术方案文档
- 任务状态变化：更新 `plan.md` 勾选状态
- 接口路径/入参/出参/错误码变化：更新 `api-conventions.md`
- UI 样式/交互规则变化：更新 `design-system.md`
- 全局执行规则变化：更新本 `README.md`

### 2. 最低交付要求
每次改动汇报必须包含：
1. 改动文件清单
2. 影响范围
3. 验证结果
4. 本次同步更新了哪些文档

---

## 六、本地启动

### 方式一：一键启动（Windows，推荐）
1. 根目录执行：`.\start-dev.ps1`
2. 访问：
- SaaS 前台：`http://localhost:5173`
- 厂商平台：`http://localhost:5174`
- 后端：`http://localhost:8080`

停止服务：`.\stop-dev.ps1`

### 方式二：手动启动
1. 后端：`cd backend && mvn spring-boot:run`
2. SaaS 前台：`cd frontend && npm install && npm run dev:saas`
3. 厂商平台：`cd frontend && npm run dev:vendor`

---

## 七、环境变量

### 前端
- `VITE_API_BASE_URL`：后端 API 地址  
示例（`frontend/.env.example`）：
```env
VITE_API_BASE_URL=http://localhost:8080
```

### 后端（`application.yml` 可被环境变量覆盖）
- `SERVER_PORT`
- `APP_JWT_SECRET`
- `APP_JWT_EXPIRE_DAYS`
- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `SPRING_DATASOURCE_DRIVER_CLASS_NAME`
