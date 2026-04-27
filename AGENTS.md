# Agent 工作规范

## 1. 版本管理（强制）

**每次改动代码后，必须执行 Git 版本管理并推送到远程仓库。**

具体流程：
1. 工作完成后，执行 `git add -A`
2. 执行 `git commit`，commit message 用英文，遵循 `<type>: <subject>` 格式
   - `feat`: 新功能
   - `fix`: 修复 bug
   - `refactor`: 重构
   - `docs`: 文档更新
   - `chore`: 构建/工具改动
3. 执行 `git push origin <current-branch>`
4. 如果推送失败（网络问题），记录失败原因，在后续每次交互开始时优先重试推送

> 为什么强制？多人协作和回滚依赖完整的历史记录。不推送的本地提交等于没做。

## 2. 代码变更原则

- **最小改动**：只改必要文件，不批量格式化无关代码
- **编译优先**：任何 Java 改动后必须 `mvn clean compile` 通过
- **测试优先**：如果项目有测试，改动后必须 `mvn test` 通过（或标记 @Disabled 并注明原因）
- **不回退功能**：修复 bug 时确保不破坏已有接口契约

## 3. 项目特定约定

### 后端（Spring Boot 3.2 + MyBatis-Plus 3.5.9）
- 实体类用 `public` 字段（非 private + getter），配合 `@TableField` 映射
- QueryWrapper 用字符串列名（`Wrappers.<Entity>query().eq("column", value)`），不用 lambda 方法引用（因无 getter）
- 新增实体必须同步：实体类 → Mapper 接口 → schema.sql → Service 改写
- `InMemoryStore` 仅保留 `dailySeq`，所有业务数据走数据库

### 前端（Vue3 + TS + Vite）
- 遵循现有目录结构：`views/modules/`（业务模块）、`views/pages/`（独立页面）
- API 调用统一走 `src/api/http.ts`，HTTP 200 但 `code != 0` 会抛 Error

### 数据库
- 主键统一 `VARCHAR(64)`，用 UUID
- `List<String>` 字段用 JSON 类型列 + `JsonListTypeHandler`
- 软删除统一用 `deleted TINYINT(1)` + `deleted_at DATETIME`

## 4. 文档同步

修改以下文件时，必须同步更新对应文档：
- `schema.sql` → 检查技术方案说明书数据库章节
- `application.yml` → 更新 README 环境配置说明
- 新增/删除实体 → 更新技术方案说明书领域模型章节
- 接口路径变更 → 更新 `api-conventions.md`
