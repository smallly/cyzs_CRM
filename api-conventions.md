# API Conventions

当前项目接口规范文档。适用于 V1 现行实现和本轮确认后的成员域扩展设计。

---

## 一、统一响应结构

后端统一响应结构为 `ApiResponse<T>`：

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

响应示例：

```json
{ "code": 0, "message": "ok", "data": { } }
```

```json
{ "code": 422, "message": "phone already bound", "data": null }
```

说明：

1. 当前列表接口默认返回数组到 `data`，未统一包裹分页对象。
2. 鉴权失败场景可能直接返回 HTTP 401 与纯文本 `Unauthorized`。

---

## 二、业务状态码

| code | 含义 |
|---|---|
| `0` | 成功 |
| `401` | 未登录或 token 无效 |
| `403` | 无权限访问 |
| `409` | 唯一性冲突 |
| `422` | 业务规则冲突或参数不满足 |
| `500` | 系统异常 |

---

## 三、URL 与方法规范

1. 统一根前缀：`/api`
2. 资源使用复数名词：如 `/contacts`、`/projects`、`/tenant-users`
3. 子动作使用资源子路径：如 `/projects/{id}/stage`、`/tenant-users/{id}/status`
4. HTTP 方法语义：
   - `GET`：查询
   - `POST`：创建
   - `PUT`：更新
   - `DELETE`：删除

---

## 四、已落地接口清单

### 4.1 认证与租户切换

| 模块 | 方法 | 路径 | 说明 |
|---|---|---|---|
| 认证 | POST | `/api/auth/login` | 登录，返回 JWT + 租户列表 |
| 认证 | PUT | `/api/auth/current-tenant` | 切换当前租户，返回新 token |

### 4.2 联系人

| 模块 | 方法 | 路径 | 说明 |
|---|---|---|---|
| 联系人 | GET | `/api/contacts` | 列表（支持分页 `?page=&size=`） |
| 联系人 | GET | `/api/contacts/{id}` | 详情 |
| 联系人 | POST | `/api/contacts` | 新建 |
| 联系人 | PUT | `/api/contacts/{id}` | 编辑（含关联项目多选同步） |
| 联系人 | DELETE | `/api/contacts/{id}` | 删除（已被项目关联则拒绝） |

### 4.3 项目

| 模块 | 方法 | 路径 | 说明 |
|---|---|---|---|
| 项目 | GET | `/api/projects` | 列表（支持分页） |
| 项目 | GET | `/api/projects/{id}` | 详情 |
| 项目 | POST | `/api/projects` | 新建 |
| 项目 | PUT | `/api/projects/{id}` | 编辑 |
| 项目 | PUT | `/api/projects/{id}/stage` | 更新阶段（约客/带看/谈判/签约/回款/入驻） |
| 项目 | PUT | `/api/projects/{id}/owner` | 转移负责人 |
| 项目 | DELETE | `/api/projects/{id}` | 软删除（联动删除跟进/合同/回款） |

### 4.4 跟进

| 模块 | 方法 | 路径 | 说明 |
|---|---|---|---|
| 跟进 | GET | `/api/followups` | 列表（支持 `?projectId=` 筛选） |
| 跟进 | POST | `/api/followups` | 新建 |
| 跟进 | PUT | `/api/followups/{id}` | 编辑 |
| 跟进 | DELETE | `/api/followups/{id}` | 删除 |

### 4.5 合同

| 模块 | 方法 | 路径 | 说明 |
|---|---|---|---|
| 合同 | GET | `/api/contracts` | 列表（支持分页） |
| 合同 | POST | `/api/contracts` | 新建（手动输入合同编号，组织内唯一） |
| 合同 | PUT | `/api/contracts/{id}/sign-date` | 修改签约日期 |

> 注：V1 暂无完整 `PUT /api/contracts/{id}` 和 `DELETE /api/contracts/{id}`。

### 4.6 回款

| 模块 | 方法 | 路径 | 说明 |
|---|---|---|---|
| 回款 | GET | `/api/payments` | 列表（支持分页） |
| 回款 | POST | `/api/payments` | 新建（必须关联合同） |
| 回款 | PUT | `/api/payments/{id}/paid-date` | 修改实际回款日期 |

> 注：V1 暂无完整 `PUT /api/payments/{id}` 和 `DELETE /api/payments/{id}`。

### 4.7 用户本人（`/api/me`）

| 模块 | 方法 | 路径 | 说明 |
|---|---|---|---|
| 本人 | PUT | `/api/me/profile` | 修改平台级姓名 |
| 本人 | PUT | `/api/me/phone` | 修改主手机号（需全局唯一） |
| 本人 | PUT | `/api/me/password` | 修改密码（需旧密码校验，BCrypt） |

### 4.8 租户成员（`/api/tenant-users`，推荐新接口）

| 模块 | 方法 | 路径 | 说明 |
|---|---|---|---|
| 租户成员 | GET | `/api/tenant-users` | 列表（支持分页） |
| 租户成员 | POST | `/api/tenant-users` | 新增成员 |
| 租户成员 | PUT | `/api/tenant-users/{id}` | 编辑成员（`name`、`employee_no`、`status`） |
| 租户成员 | PUT | `/api/tenant-users/{id}/pending-phone` | 修改未激活成员待绑定手机号 |
| 租户成员 | PUT | `/api/tenant-users/{id}/status` | 更新成员状态 |

### 4.9 部门归属（`/api/memberships`）

| 模块 | 方法 | 路径 | 说明 |
|---|---|---|---|
| 部门归属 | GET | `/api/tenant-users/{id}/memberships` | 查询某成员部门归属列表 |
| 部门归属 | POST | `/api/tenant-users/{id}/memberships` | 新增部门归属 |
| 部门归属 | PUT | `/api/memberships/{membershipId}` | 编辑部门归属 |
| 部门归属 | PUT | `/api/memberships/{membershipId}/status` | 失效部门归属（逻辑失效，记录 `left_at`） |

### 4.10 部门

| 模块 | 方法 | 路径 | 说明 |
|---|---|---|---|
| 部门 | GET | `/api/departments` | 列表 |
| 部门 | POST | `/api/departments` | 新建 |
| 部门 | PUT | `/api/departments/{id}` | 编辑 |
| 部门 | PUT | `/api/departments/{id}/status` | 更新状态（启用/停用） |

### 4.11 角色

| 模块 | 方法 | 路径 | 说明 |
|---|---|---|---|
| 角色 | GET | `/api/roles` | 默认角色列表 |

### 4.12 系统配置

| 模块 | 方法 | 路径 | 说明 |
|---|---|---|---|
| 系统配置 | GET | `/api/system/scope-mode` | 查询项目数据范围配置 |
| 系统配置 | PUT | `/api/system/scope-mode` | 更新项目数据范围配置 |
| 系统配置 | GET | `/api/system/dicts` | 查询数据字典 |
| 系统配置 | PUT | `/api/system/dicts` | 更新数据字典 |

### 4.13 审计日志

| 模块 | 方法 | 路径 | 说明 |
|---|---|---|---|
| 审计 | GET | `/api/audit-logs` | 审计日志列表 |

### 4.14 SSE

| 模块 | 方法 | 路径 | 说明 |
|---|---|---|---|
| SSE | GET | `/api/stream/subscribe` | 事件流订阅 |

### 4.15 厂商租户管理（SaaS 平台级）

| 模块 | 方法 | 路径 | 说明 |
|---|---|---|---|
| 厂商 | GET | `/api/vendor/tenants` | 租户列表（支持分页） |
| 厂商 | GET | `/api/vendor/tenants/admin-phone-exists` | 检查管理员手机号是否存在 |
| 厂商 | POST | `/api/vendor/tenants` | 开通新租户 |
| 厂商 | PUT | `/api/vendor/tenants/{tenantId}/status` | 更新租户状态 |
| 厂商 | PUT | `/api/vendor/tenants/{tenantId}/renew` | 租户续期 |

### 4.16 旧版成员接口（`/api/users`，逐步迁移至 `/api/tenant-users`）

| 模块 | 方法 | 路径 | 说明 |
|---|---|---|---|
| 成员 | GET | `/api/users` | 成员列表 |
| 成员 | POST | `/api/users` | 创建成员（含密码） |
| 成员 | PUT | `/api/users/{id}` | 编辑成员基础信息 |
| 成员 | PUT | `/api/users/{id}/status` | 更新成员状态 |
| 成员 | PUT | `/api/users/{id}/role` | 更新角色 |
| 成员 | PUT | `/api/users/{id}/department` | 更新部门 |

---

## 五、成员域接口详细约定

成员域接口已全部落地。以下为主要接口的请求/响应约定。

### 5.1 租户成员

| 功能 | 方法 | 路径 |
|---|---|---|
| 列表 | GET | `/api/tenant-users?page=&size=` |
| 新增成员 | POST | `/api/tenant-users` |
| 编辑成员 | PUT | `/api/tenant-users/{id}` |
| 修改未激活成员待绑定手机号 | PUT | `/api/tenant-users/{id}/pending-phone` |
| 更新成员状态 | PUT | `/api/tenant-users/{id}/status` |

请求字段约定：

1. `tenant_users.name`：租户内显示姓名
2. `employee_no`：租户内唯一，可为空
3. `pending_phone`：仅未激活成员使用
4. `status`：`pending` / `active` / `disabled` / `left`

规则：

1. 已激活成员禁止通过租户成员接口修改正式手机号
2. 未激活成员修改手机号时，仅更新 `pending_phone`
3. 成员首次登录进入租户后，服务层负责完成 `user_id` 绑定与激活

### 5.2 用户本人

| 功能 | 方法 | 路径 |
|---|---|---|
| 修改平台级姓名 | PUT | `/api/me/profile` |
| 修改主手机号 | PUT | `/api/me/phone` |
| 修改密码 | PUT | `/api/me/password` |

`PUT /api/me/password` 请求示例：

```json
{
  "oldPassword": "current123",
  "newPassword": "newPass456"
}
```

规则：

1. 密码使用 BCrypt 加密存储
2. 修改密码必须提供正确的旧密码
3. 新手机号必须全局唯一
4. 更新 `users.phone` 时同步更新手机号类认证记录

### 5.3 部门归属

| 功能 | 方法 | 路径 |
|---|---|---|
| 查询部门归属 | GET | `/api/tenant-users/{id}/memberships` |
| 新增部门归属 | POST | `/api/tenant-users/{id}/memberships` |
| 编辑部门归属 | PUT | `/api/memberships/{membershipId}` |
| 失效部门归属 | PUT | `/api/memberships/{membershipId}/status` |

请求字段约定：

1. `department_id`：当前部门树下的部门标识
2. `position`：自由文本
3. `role_id`：单值
4. `is_primary`：同一成员仅允许一条有效记录为 `true`
5. `status`：`active` / `inactive`
6. `left_at`：失效时记录离开时间（ISO 格式）

规则：

1. 一个成员可有多条部门归属
2. 删除部门归属时不物理删除，改 `status` 并记录 `left_at`

---

## 六、列表查询与分页

当前实现以“全量列表 + 前端过滤”为主。

现行查询示例：

```http
GET /api/followups
GET /api/followups?projectId=90d737bb-857d-4a96-bf66-a4da74d3aa9f
```

后续若成员列表或部门归属列表数据量扩大，再统一引入：

1. `pageNo`
2. `pageSize`
3. 排序参数

---

## 七、时间格式约定

日期字段统一使用：

```text
yyyy-MM-dd
```

日期时间字段统一使用：

```text
yyyy-MM-ddTHH:mm:ss
```

成员域重点字段：

1. `first_login_at`
2. `last_login_at`
3. `joined_at`
4. `left_at`
5. `verified_at`

---

## 八、字段命名规范

| 领域 | 字段 |
|---|---|
| 用户主体 | `user_id`, `phone`, `name`, `last_tenant_id` |
| 认证方式 | `auth_type`, `auth_identifier`, `password_hash`, `verified_at` |
| 租户成员 | `tenant_id`, `pending_phone`, `employee_no`, `activated`, `first_login_at`, `last_login_at` |
| 部门归属 | `department_id`, `position`, `role_id`, `is_primary`, `left_at` |

说明：

1. `users.phone` 是正式主手机号
2. `users.last_tenant_id` 是最近成功进入的租户
3. `tenant_users.pending_phone` 是待绑定手机号
4. 两者不能混用

---

## 九、鉴权与权限约定

鉴权：

1. `/api/auth/login` 免鉴权
2. 其余 `/api/*` 默认需要 token
3. token 通过 `Authorization: Bearer <token>` 传递

成员域权限：

1. 用户本人可调用 `/api/me/*`
2. 租户管理员可调用 `/api/tenant-users/*` 与部门归属维护接口
3. 租户管理员不可修改已激活成员正式手机号和密码

---

## 十、错误处理原则

1. 业务校验失败抛 `BizException(code, message)`
2. 统一由 `GlobalExceptionHandler` 转换为 `ApiResponse.fail`
3. 前端统一由请求封装处理 `code !== 0`
4. 删除或失效类操作必须先二次确认

成员域推荐错误提示：

1. `phone already bound`
2. `activated member phone is immutable`
3. `employee_no already exists in tenant`
4. `only one primary membership is allowed`

---

## 十一、SSE 约定

订阅接口：

```http
GET /api/stream/subscribe
```

鉴权方式：

1. 优先 `Authorization: Bearer <token>`
2. 兼容 query 参数 `?token=...`
