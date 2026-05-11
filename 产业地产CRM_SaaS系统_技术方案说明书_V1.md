# 产业地产 CRM SaaS 系统 - 技术方案说明书（V1）

**版本：** 1.3  
**编制日期：** 2026-04-26  
**适用范围：** V1（测试环境、灰度上线阶段）

---

## 1. 技术基线（已确认）

| 模块 | 结论 |
|------|------|
| 前端框架 | Vue3 |
| 前端语言 | TypeScript |
| 后端语言 | Java |
| 后端框架 | Spring Boot 3.2.12 |
| JDK | 17 |
| 数据库 | MySQL 8.4 |
| 缓存 | Redis |
| ORM | MyBatis-Plus 3.5.9 (`mybatis-plus-spring-boot3-starter`) |
| 接口风格 | REST |
| 实时协议 | SSE（关键页面） |
| 鉴权方案 | JWT + RBAC + 项目数据范围配置拦截 |
| JWT 有效期 | 7 天 |
| 文件存储 | V1 先本地/占位实现，后续切换云存储 |

---

## 2. 目标与边界

### 2.1 V1 技术目标

1. 打通主业务链路：联系人 → 项目 → 合同 → 回款（实收） → 入驻后跟进
2. 建立稳定权限底座：角色权限 + 数据范围权限
3. 满足灰度上线的可用性、可追溯性、可扩展性

### 2.2 V1 非目标

1. 不做钉钉登录与组织同步（V2 规划，仅预留认证扩展位）
2. 不做 Excel 导入
3. 不做审批流
4. 不做云存储正式部署（预留接口）

---

## 3. 系统架构

### 3.1 架构形态

V1 采用单体应用 + 模块化分层：

1. 前端 Web：Vue3 + TypeScript
2. 后端 API：Spring Boot
3. 数据库：MySQL
4. 缓存：Redis
5. 文件：本地文件服务（后续可替换 OSS/MinIO）

### 3.2 后端分层

1. Controller：REST 接口层
2. Service：业务规则层（阶段流转、权限校验、软删除联动）
3. Repository/Mapper：MyBatis-Plus 数据访问层（全部 15 个实体已迁移至关系型表；`state_store` 仅保留历史 JSON 备份，`InMemoryStore` 仅保留 `dailySeq` 编号计数器）
4. Security：JWT 鉴权 + RBAC + 数据范围拦截
5. Audit：审计日志记录层
6. Data Migration：启动时自动将 `state_store` JSON 数据迁移到关系型表（一次性）

---

## 4. 领域模块设计

1. `auth`：登录、JWT 签发与解析、用户认证方式绑定
2. `org-user`：组织、部门、成员、角色、成员状态（启用/停用）、激活状态、多部门归属
3. `contact`：联系人管理、手机号唯一性校验
4. `project`：项目管理、阶段流转、负责人规则、软删联动入口
5. `followup`：跟进记录
6. `contract`：合同管理（一个项目可关联多份合同）
7. `payment`：回款（实收）管理（挂合同）
8. `system-config`：项目数据范围配置、数据字典
9. `audit-log`：变更日志（谁、何时、做了什么）

### 4.1 SaaS 用户模型

V1 在组织成员域采用四层模型，避免把手机号、密码、成员状态、部门归属混在一张表里：

1. `users`：平台级用户主体，保存 `user_id`、`phone`、`name`、`last_tenant_id`
2. `user_authentications`：用户认证方式表，保存 `auth_type`、`auth_identifier`、`password_hash`
3. `tenant_users`：租户成员表，保存 `tenant_id`、`user_id`、`pending_phone`、`activated`、`status`
4. `organization_memberships`：部门归属表，保存 `tenant_user_id`、`department_id`、`position`、`role_id`、`is_primary`

设计口径：

1. `users.phone` 是正式主手机号，全局唯一
2. `users.last_tenant_id` 记录用户最近一次成功进入的租户
3. `tenant_users.pending_phone` 仅用于未激活成员
4. `tenant_users.activated` 表示成员是否首次登录过当前租户
5. 一个 `users` 可绑定多条 `user_authentications`
6. 一个 `tenant_users` 可绑定多条 `organization_memberships`
7. 平台管理员独立存储在 `vendor_admins`，不再占用租户用户主体表 `users`
8. SaaS 租户用户体系与超管平台用户体系互不关联，旧库中的 `users.phone = admin` 和 `vendor-default` 租户数据会在启动迁移时清理
9. 当租户表为空时，启动初始化会补创建默认 SaaS 租户，避免超管组织列表无基础数据

---

## 5. 权限与安全模型

### 5.1 角色模型（两轴）

1. 业务角色（二选一）：销售专员 / 项目管理员
2. 菜单权限角色：系统管理员（V1 默认拥有系统设置相关菜单）

### 5.2 数据范围模型

项目数据范围配置（组织全局）：

1. 仅自己
2. 看下属（全部下属：直接+间接）

该范围统一作用于：查看、编辑、删除、转移负责人。

### 5.3 鉴权流程

1. 登录成功后签发 JWT
2. 每次请求先过 JWT 校验
3. 再做 RBAC 菜单权限校验
4. 最后做数据范围拦截（负责人 + 组织范围）

JWT 策略（V1）：

1. Token 有效期：7 天
2. 到期后需重新登录

### 5.4 租户隔离

1. 全业务表强制携带 `tenant_id`
2. 查询默认注入 `tenant_id` 过滤
3. 唯一性约束包含 `tenant_id` 维度

---

## 6. 数据库设计原则

### 6.1 通用字段

所有核心业务表建议包含：

1. `id`
2. `tenant_id`
3. `created_by`, `created_at`
4. `updated_by`, `updated_at`
5. `deleted_at`, `deleted_by`（软删除）

联系人字段中“最后编辑时间”统一映射为 `updated_at`，在每次编辑成功后自动更新。

合同字段中“最后编辑人”统一映射为 `updated_by`，与 `updated_at` 配对记录最近一次修改人和修改时间。合同新增时默认写入创建人，后续编辑时更新为当前操作者。

### 6.2 核心约束

1. 联系人手机号 1/2 组织内唯一（空值可重复，软删不占用）
2. 同一联系人手机号1 != 手机号2
3. 项目负责人有且仅有一人
4. 一个项目可关联多份合同
5. 回款记录必须关联合同
6. 项目软删联动软删跟进/合同/回款
7. `users.phone` 全局唯一
8. `tenant_users.employee_no` 在租户内唯一，可为空
9. `user_authentications` 建议按 `auth_type + auth_identifier` 唯一
10. 同一 `tenant_user` 仅允许一条 `is_primary = true` 的有效部门归属
11. 项目详情进度条中的“签约日期/回款日期”分别取当前项目合同、回款记录中的最早业务日期
12. 项目详情进度条中的“签约日期/回款日期”不提供直接编辑，调整必须落在对应业务单据

### 6.3 数据持久化策略

V1 已完成全部 15 个实体的关系型表迁移，采用纯关系型表策略：

**已迁移至关系型表（MyBatis-Plus，共 15 个实体）：**

| 域 | 实体 | 表名 | 说明 |
|---|---|---|---|
| 成员域 | User | `users` | 平台级用户主体 |
| 成员域 | UserAuthentication | `user_authentications` | 认证方式绑定 |
| 成员域 | VendorAdmin | `vendor_admins` | 平台管理员主体 |
| 成员域 | VendorAdminAuthentication | `vendor_admin_authentications` | 平台管理员认证方式绑定 |
| 成员域 | TenantUser | `tenant_users` | 租户成员档案 |
| 成员域 | OrganizationMembership | `organization_memberships` | 部门归属 |
| 成员域 | Department | `departments` | 部门树 |
| 成员域 | Tenant | `tenants` | 租户组织 |
| 业务域 | Contact | `contacts` | 联系人 |
| 业务域 | Project | `projects` | 项目 |
| 业务域 | Followup | `followups` | 跟进记录 |
| 业务域 | Contract | `contracts` | 合同 |
| 业务域 | Payment | `payments` | 回款 |
| 配置域 | ScopeConfig | `scope_configs` | 数据范围配置 |
| 配置域 | ProjectDictConfig | `project_dict_configs` | 项目字典 |
| 审计域 | AuditLog | `audit_logs` | 审计日志 |
| 序列域 | — | `daily_sequences` | 日编号序列（如启用） |

#### `payments` 回款表字段

| 数据库字段 | 后端字段 | 中文名 | 说明 |
|---|---|---|---|
| `id` | `id` | 回款ID | 主键，UUID |
| `tenant_id` | `tenantId` | 租户ID | 多租户隔离字段 |
| `contract_id` | `contractId` | 关联合同 | 回款所属合同 |
| `owner_id` | `ownerId` | 负责人ID | 当前负责人 |
| `creator_id` | `creatorId` | 创建人ID | 创建该回款记录的用户 |
| `code` | `code` | 回款编号 | 系统自动生成 |
| `paid_date` | `paidDate` | 回款日期 | 实际收款日期 |
| `amount` | `amount` | 回款金额 | 实际回款金额，单位元 |
| `payer_name` | `payerName` | 付款方名称 | 付款单位或个人名称 |
| `invoice_status` | `invoiceStatus` | 开票状态 | 未开票/已开票/无需开票 |
| `voucher` | `voucher` | 回款凭证 | 回款凭证文件或附件信息 |
| `remark` | `remark` | 备注 | 其他说明 |
| `deleted` | `deleted` | 是否已删除 | 软删除标记 |
| `created_at` | `createdAt` | 创建时间 | 系统自动记录创建时间 |
| `updated_at` | `updatedAt` | 最后编辑时间 | 系统自动记录最近一次编辑时间 |
| `deleted_at` | `deletedAt` | 删除时间 | 软删除时间 |

**`state_store` 保留用途：**
- 仅作为历史 JSON 数据备份，启动时 `BootstrapService` 会一次性将旧数据迁移到关系型表
- 不再承载任何业务实体的运行时读写

**`InMemoryStore` 当前状态：**
- 已移除 14 个废弃内存 Map
- 仅保留 `dailySeq`（`Map<String, AtomicInteger>`）用于按租户按天生成编号（`YYYYMMDD-0001` 格式）
- 所有业务数据读写均通过 MyBatis-Plus Mapper 操作数据库

### 6.4 成员域表设计建议

#### `users`

1. 主键：`id`（VARCHAR(64)，UUID）
2. 关键字段：`phone`（全局唯一）、`name`、`password`（BCrypt 密文）
3. 不存成员状态，不存部门信息
4. `last_tenant_id` 记录最近一次成功进入的租户

#### `user_authentications`

1. 一用户多条
2. `auth_type` 先支持 `phone`，后续扩展 `dingtalk`
3. `password_hash` 仅手机号类认证使用
4. 后续接钉钉时只扩展该表，不改 `users` 主体结构

#### `vendor_admins` / `vendor_admin_authentications`

1. `vendor_admins` 保存平台管理员主体信息，主键为 `id`（VARCHAR(64)，UUID）
2. `vendor_admins.phone` 全局唯一，用于平台管理端登录
3. `vendor_admin_authentications` 保存平台管理员认证方式，按 `auth_type + auth_identifier` 唯一
4. 平台管理员登录态通过 JWT `type=VENDOR` 区分，不写入 `users.vendor_admin`
5. 旧版本遗留的 `users.phone = admin` 会随其 `user_authentications`、`tenant_users`、`organization_memberships` 一并清理，避免超管账号从 SaaS 登录口进入

#### `tenant_users`

1. 已激活成员：`user_id` 必填
2. 未激活成员：`user_id` 可空，使用 `pending_phone`
3. `status` 由租户控制，建议取值：`pending`、`active`、`disabled`、`left`
4. `activated` 建议由 `first_login_at is not null` 推导

#### `organization_memberships`

1. 当前组织模型按部门树处理，V1 先保留 `department_id`
2. `position` 先采用自由文本
3. `role_id` 先按单值
4. 删除部门归属采用逻辑失效：更新 `status` 并记录 `left_at`

### 6.4 MyBatis-Plus 兼容性说明

V1 使用 `mybatis-plus-spring-boot3-starter:3.5.9`（Spring Boot 3 专用 starter，非 `mybatis-plus-boot-starter`）。

关键注意事项：
1. `updateById()` 默认忽略 `null` 字段，如需将字段设为 `null`，必须使用 `UpdateWrapper.set("column", null)`
2. 自定义 TypeHandler（如 `JsonListTypeHandler`）需在 `application.yml` 中配置 `mybatis-plus.type-handlers-package`
3. 所有实体主键统一使用 `VARCHAR(64)`，配合 `@TableId` 注解

### 6.5 编号规则

统一编号格式：`YYYYMMDD-0001`（按组织、按天重置）

适用：联系人、项目、跟进、回款。  
例外：合同编号手输且组织内唯一，且一个项目可关联多份合同。

---

## 7. 接口设计规范

### 7.1 REST 规范

1. 资源化 URL（如 `/api/projects`）
2. 标准 HTTP 方法（GET/POST/PUT/DELETE）
3. 统一响应结构（code/message/data）
4. 分页查询统一参数（pageNo/pageSize）
5. 成员域接口区分“租户成员”“用户本人”“部门归属”三类资源，避免同一接口混改认证字段与成员字段

### 7.2 错误码建议

1. `AUTH_401`：未登录或 token 无效
2. `AUTH_403`：无权限访问
3. `BIZ_409`：唯一性冲突
4. `BIZ_422`：业务规则冲突（如必填项缺失、引用对象不存在）

### 7.3 SSE 应用范围（V1）

实时页面：

1. 项目列表
2. 跟进记录列表
3. 合同/回款状态列表

非关键配置页使用普通轮询/手动刷新。

### 7.4 成员域接口（已落地）

V1 成员域采用以下接口分层，已全部实现：

1. 租户成员
   - `GET /api/tenant-users` — 列表（支持分页）
   - `POST /api/tenant-users` — 新增成员
   - `PUT /api/tenant-users/{id}` — 编辑成员（`name`、`employee_no`、`status`）
   - `PUT /api/tenant-users/{id}/pending-phone` — 修改未激活成员待绑定手机号
   - `PUT /api/tenant-users/{id}/status` — 更新成员状态

2. 用户本人
   - `PUT /api/me/profile` — 修改平台级姓名
   - `PUT /api/me/phone` — 修改主手机号
   - `PUT /api/me/password` — 修改密码（需旧密码校验，BCrypt）

3. 部门归属
   - `GET /api/tenant-users/{id}/memberships` — 查询某成员部门归属
   - `POST /api/tenant-users/{id}/memberships` — 新增部门归属
   - `PUT /api/memberships/{membershipId}` — 编辑部门归属
   - `PUT /api/memberships/{membershipId}/status` — 失效部门归属（逻辑失效，记录 `left_at`）

4. 激活逻辑
   - 首次登录进入租户时，由 `AuthService` 内部完成 `pending_phone -> user_id` 绑定与 `activated = true`
   - 不暴露为租户管理员可调用的开放接口

### 7.5 厂商管理接口（已落地）

SaaS 平台级租户管理：

- `GET /api/vendor/tenants` — 租户列表（支持分页）
- `GET /api/vendor/tenants/admin-phone-exists` — 检查管理员手机号是否存在
- `POST /api/vendor/tenants` — 开通新租户
- `PUT /api/vendor/tenants/{tenantId}/status` — 更新租户状态
- `PUT /api/vendor/tenants/{tenantId}/renew` — 租户续期

---

## 8. 文件与附件策略

### 8.1 V1 方案

1. 本地文件存储（测试环境）
2. 数据库存储附件信息（文件名、路径或可预览内容、大小、上传人、上传时间）
3. 单文件大小上限：50MB
4. 文件格式：不限
5. 最低安全防护：文件仅下载，不直接在线执行
6. 最低安全防护：存储目录不暴露为可执行目录
7. 服务层抽象 `FileStorageService`，屏蔽底层实现

### 8.2 V2 扩展

1. 无业务改动切换到 OSS/MinIO
2. 保持附件元数据结构不变

---

## 9. 审计与可观测性

### 9.1 审计日志

仅记录落库变更操作：

1. 新增
2. 编辑
3. 删除（软删除）
4. 负责人转移
5. 成员状态变更
6. 角色变更

日志内容：谁、何时、对象、动作、关键字段前后值（可选）。

### 9.2 基础监控建议

1. API 请求量/响应时长
2. 4xx/5xx 错误率
3. SSE 连接数
4. 慢 SQL

---

## 10. 部署与环境

### 10.1 环境策略

1. V1 先部署一套测试环境
2. 后续灰度上线

### 10.2 基础组件

1. `crm-web`（前端）
2. `crm-api`（后端）
3. `mysql`（数据）
4. `redis`（缓存）

### 10.3 上线策略

1. 主链路功能优先打通
2. 关键页面接入 SSE
3. 灰度名单放量

---

## 11. 里程碑与当前状态（开发视角）

| 里程碑 | 目标 | 状态 |
|--------|------|------|
| M1 | 工程搭建 + 登录鉴权 + 基础权限 | ✅ 已完成 |
| M2 | 联系人/项目/跟进 | ✅ 已完成 |
| M3 | 合同/回款 + 阶段联动 | ✅ 已完成（基础 CRUD，阶段联动） |
| M4 | 系统设置 + 审计日志 + SSE 关键页面 | ✅ 已完成 |
| M5 | 联调测试 + 灰度发布 | 🔄 待推进 |

**当前已达成：**
1. 15 个实体全部迁移至 MyBatis-Plus 关系型表
2. 前后端接口全部打通，JWT 鉴权 + 多租户切换可用
3. 密码采用 BCrypt 加密，支持修改密码
4. 测试覆盖：集成测试通过（`mvn test`: 2 tests, 0 failures）
5. 数据迁移：`BootstrapService` 启动时自动从 `state_store` JSON 迁移到关系型表

**V1 已知缺口（待 M5 补齐）：**
1. 合同/回款暂无完整 `PUT /{id}` 和 `DELETE /{id}`（仅有 `PUT /{id}/sign-date`、`PUT /{id}/paid-date`）
2. 附件上传当前为字符串占位（URL/文件路径），未接入实际文件存储服务
3. SSE 已提供 `/api/stream/subscribe`，前端接入程度需联调确认
4. 分页查询目前以全量列表 + 前端过滤为主，大数据量场景需后端分页优化
5. 项目详情进度条里的签约/回款日期当前按“最早业务日期”聚合展示，不等同于最新一笔业务日期

---

## 12. 风险与预案

1. 权限复杂度高
- 预案：统一权限中间层，不在控制器散落判断

2. 软删除联动遗漏
- 预案：统一删除服务入口 + 集成测试覆盖

3. SSE 连接压力
- 预案：仅关键页面实时，非关键页面普通刷新

4. 文件方案后续切换成本
- 预案：先定义存储抽象接口，避免业务层直接依赖本地文件

---

**结论**：该技术方案可直接支撑当前已确认的 V1 需求，并在成员域预留钉钉登录、多部门归属等 V2 扩展空间。
