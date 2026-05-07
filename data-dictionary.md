# 数据字段字典

本文档用于记录业务表字段定义，字段真值以数据库建表和后端实体映射为准：

- `backend/src/main/resources/schema.sql`
- `backend/src/main/java/com/indcrm/crm/domain/*.java`

## contacts（联系人表）

| 字段名 | 中文名 | 类型 | 必填 | 说明 |
|---|---|---|---|---|
| `id` | 联系人ID | `VARCHAR(64)` | 是 | 主键，UUID |
| `tenant_id` | 租户ID | `VARCHAR(64)` | 是 | 多租户隔离字段 |
| `name` | 联系人姓名 | `VARCHAR(100)` | 是 | 联系人名称 |
| `enterprise_name` | 企业名称 | `VARCHAR(200)` | 否 | 所属企业 |
| `title` | 职位 | `VARCHAR(100)` | 否 | 职务/岗位 |
| `phone1` | 手机号1 | `VARCHAR(20)` | 否 | 主手机号 |
| `phone2` | 手机号2 | `VARCHAR(20)` | 否 | 备用手机号 |
| `wechat` | 微信号 | `VARCHAR(64)` | 否 | 微信联系方式 |
| `email` | 邮箱 | `VARCHAR(128)` | 否 | 电子邮箱 |
| `office_phone` | 办公电话 | `VARCHAR(32)` | 否 | 固话/座机 |
| `gender` | 性别 | `VARCHAR(10)` | 否 | 性别枚举文本 |
| `decision_maker` | 是否决策人 | `TINYINT(1)` | 是 | `0` 否，`1` 是 |
| `remark` | 备注 | `TEXT` | 否 | 备注说明 |
| `owner_id` | 负责人ID | `VARCHAR(64)` | 否 | 当前负责人 |
| `creator_id` | 创建人ID | `VARCHAR(64)` | 否 | 创建人 |
| `deleted` | 是否已删除 | `TINYINT(1)` | 是 | 软删除标记，`0` 未删，`1` 已删 |
| `created_at` | 创建时间 | `DATETIME` | 是 | 默认当前时间 |
| `updated_at` | 更新时间 | `DATETIME` | 是 | 默认当前时间，更新自动刷新 |
| `deleted_at` | 删除时间 | `DATETIME` | 否 | 软删除时间 |
| `project_ids_json` | 关联项目ID列表 | `TEXT` | 否 | JSON 数组，映射为 `List<String>` |

