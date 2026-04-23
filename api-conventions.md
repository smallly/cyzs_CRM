# API Conventions
> 前后端接口规范（V1 现行版），联调前必读。  
> 本文档以当前项目代码实现为准，不与未落地架构（如 `src/api/*`、Axios）混写。

---

## 一、统一响应体

### 后端 `ApiResponse<T>` 定义（当前实现）
```java
public record ApiResponse<T>(int code, String message, T data) {
    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(0, "ok", data);
    }

    public static <T> ApiResponse<T> fail(int code, String message) {
        return new ApiResponse<>(code, message, null);
    }
}
```

### 响应示例（当前项目）
```json
// 成功
{ "code": 0, "message": "ok", "data": { ... } }

// 失败（业务异常）
{ "code": 422, "message": "content is required", "data": null }
```

### 说明
- 当前项目未实现统一 `PageResult<T>` 分页包装；列表接口直接返回数组到 `data`。
- 部分鉴权失败（如 JWT 解析失败）会返回 HTTP 401 + 纯文本 `Unauthorized`（非 `ApiResponse`）。

---

## 二、业务状态码（现行）

| code | 含义 | 来源 |
|---|---|---|
| `0` | 成功 | `ApiResponse.ok` |
| `401` | 未登录 / token 无效 | `ErrorCode.AUTH_401` 或 Filter 401 |
| `403` | 无权限 | `ErrorCode.AUTH_403` |
| `409` | 业务冲突（如唯一性） | `ErrorCode.BIZ_409` |
| `422` | 业务规则/参数不满足 | `ErrorCode.BIZ_422` |
| `500` | 系统异常 | `GlobalExceptionHandler` 兜底 |

---

## 三、接口命名规范

### URL 规则（当前项目）
- 根前缀统一：`/api/`
- 资源采用复数名词：`/contacts`、`/projects`、`/followups`
- 子动作使用资源子路径：`/projects/{id}/stage`、`/users/{id}/status`
- HTTP 方法语义：
  - `GET`：查询
  - `POST`：创建
  - `PUT`：更新
  - `DELETE`：删除（当前多为软删）

### 已落地接口清单

| 模块 | 方法 | 路径 |
|---|---|---|
| 认证 | POST | `/api/auth/login` |
| 联系人 | GET | `/api/contacts` |
| 联系人 | POST | `/api/contacts` |
| 联系人 | PUT | `/api/contacts/{id}` |
| 联系人 | DELETE | `/api/contacts/{id}` |
| 项目 | GET | `/api/projects` |
| 项目 | GET | `/api/projects/{id}` |
| 项目 | POST | `/api/projects` |
| 项目 | PUT | `/api/projects/{id}` |
| 项目 | PUT | `/api/projects/{id}/stage` |
| 项目 | PUT | `/api/projects/{id}/owner` |
| 项目 | DELETE | `/api/projects/{id}` |
| 跟进 | GET | `/api/followups?projectId=`（可选） |
| 跟进 | POST | `/api/followups` |
| 跟进 | PUT | `/api/followups/{id}` |
| 跟进 | DELETE | `/api/followups/{id}` |
| 合同 | GET | `/api/contracts` |
| 合同 | POST | `/api/contracts` |
| 回款 | GET | `/api/payments` |
| 回款 | POST | `/api/payments` |
| 成员 | GET | `/api/users` |
| 成员 | PUT | `/api/users/{id}/status` |
| 成员 | PUT | `/api/users/{id}/role` |
| 成员 | PUT | `/api/users/{id}/department` |
| 部门 | GET | `/api/departments` |
| 部门 | POST | `/api/departments` |
| 部门 | PUT | `/api/departments/{id}` |
| 部门 | PUT | `/api/departments/{id}/status` |
| 角色 | GET | `/api/roles` |
| 系统配置 | GET | `/api/system/scope-mode` |
| 系统配置 | PUT | `/api/system/scope-mode` |
| 系统配置 | GET | `/api/system/dicts` |
| 系统配置 | PUT | `/api/system/dicts` |
| 审计日志 | GET | `/api/audit-logs` |
| SSE | GET | `/api/stream/subscribe` |

### 合同/回款附件字段约定（2026-04-23）
- `POST /api/contracts` 新增请求字段 `attachment`（`string`，必填）。
- `POST /api/payments` 新增请求字段 `voucher`（`string`，选填，可为 `null`）。
- 字段内容与跟进附件保持一致：支持纯文件名，或 `{"name":"xxx","data":"data:..."}` JSON 字符串。

---

## 四、列表查询与分页约定

### 当前实现
- 当前列表接口以“全量列表 + 前端过滤”为主。
- 仅跟进列表支持项目筛选参数：`projectId`。
- 暂无统一 `page/size` 分页参数协议。

### 现行查询示例
```http
GET /api/followups
GET /api/followups?projectId=90d737bb-857d-4a96-bf66-a4da74d3aa9f
```

---

## 五、时间与日期格式约定（现行）

### 日期字段（`LocalDate` / 字符串日期）
- 统一使用：`yyyy-MM-dd`
- 典型字段：
  - `signDate`（合同签约日期）
  - `paidDate`（回款日期）
  - `firstVisitDate` / `firstNegotiationDate` / `movedInDate`

### 日期时间字段（`LocalDateTime`）
- 接口字段：
  - 跟进：`followupAt`
  - 项目：`firstContactAt`
- 建议传入：`yyyy-MM-ddTHH:mm:ss`（例如 `2026-04-22T03:39:00`）

---

## 六、字段命名规范（现行）

| 规则 | 后端（Java） | 前端（TS） |
|---|---|---|
| 命名风格 | camelCase | camelCase |
| 主键 | `id` | `id` |
| 租户 | `tenantId` | `tenantId` |
| 部门 | `deptId`（成员）/ `parentId`（部门树） | `deptId` / `parentId` |
| 创建人 | `creatorId` / `ownerId`（按领域对象） | 对应对象字段 |
| 创建时间 | `createdAt` | `createdAt` |
| 软删除 | `deleted` + `deletedAt` | 前端通常不展示 |

---

## 七、前端请求封装规范（当前实现）

当前项目未使用 Axios；统一使用 `frontend/src/App.vue` 中的 `api<T>(path, init?)` 封装。

```ts
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = { "Content-Type": "application/json", ...(init?.headers || {}) };
  if (token.value) headers.Authorization = "Bearer " + token.value;
  const res = await fetch(apiBase + path, { ...init, headers });
  // 若响应体存在 code 字段，则按 code===0 判成功
}
```

约定：
- 所有业务请求都走该封装，不直接散写 `fetch`。
- 默认 `Content-Type: application/json`。
- token 放在 `Authorization: Bearer <token>`。
- 若响应中 `code !== 0`，前端抛错并由统一提示函数处理。

---

## 八、鉴权与权限约定

### 鉴权
- 登录接口：`/api/auth/login` 免鉴权。
- 其余 `/api/*` 接口默认需 token。
- JWT 载荷包含：`uid`、`tid`。
- token 有效期：7 天（见 `app.jwt.expire-days`）。

### 权限
- 接口内通过 `sessionService.requireUser()` 读取当前用户。
- 业务数据可见性与可操作性由服务层按租户、负责人、角色与数据范围判定。
- 系统设置相关接口需要系统管理员权限（`/api/system/*`）。
- 数据范围模式（现行）：
  - `ALL`：全部数据
  - `SELF`：仅本人数据
  - `SELF_AND_SUBORDINATES`：本人及下属的数据（按“部门负责人”递归计算）
  - `DEPT`：本部门数据
  - `DEPT_AND_SUBTREE`：本部门及以下数据
  - `SUBTREE`：历史兼容值，读取时按 `DEPT_AND_SUBTREE` 处理

---

## 九、错误处理原则（现行）

1. 后端业务校验失败：抛 `BizException(code, message)`。  
2. `GlobalExceptionHandler` 统一转换为 `ApiResponse.fail(code, message)`。  
3. 未捕获异常：返回 `code=500` + 异常消息。  
4. 前端请求封装统一抛错，页面层统一 toast 展示错误信息。  
5. 删除类操作必须先二次确认，再发 `DELETE` 请求。

---

## 十、SSE 约定

- 订阅接口：`GET /api/stream/subscribe`
- 鉴权方式：
  - 优先 `Authorization: Bearer <token>`
  - 兼容 query 参数 `?token=...`（当前前端使用该方式）
- 使用场景：关键列表与日志类页面的实时刷新通知
