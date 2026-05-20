# 项目复盘日志

> 记录开发过程中反复踩坑的问题、根因分析、以及正确做法�?> 目的：避免同类型问题重复犯错，新功能开发前先看日志�?
---

## 2026-05-12 | 附件（PDF）预览打开空白

### 现象
合同详情页点�?PDF 附件，新标签页打开为空白页（`about:blank#blocked` 或纯白页）�?
### 迭代过程（三次才做对�?
**第一次尝试（错误�?*
```ts
window.open(dataUrl, '_blank', 'noopener,noreferrer')
```
- **结果**：`about:blank#blocked`
- **原因**：Chrome 弹窗拦截器把 `window.open(dataUrl)` 视为非用户主动弹窗，直接拦截�?
**第二次尝试（错误�?*
```ts
const a = document.createElement('a')
a.href = dataUrl
a.target = '_blank'
a.click()
```
- **结果**：新标签页打开但显示空�?- **原因**：base64 data URL 通常非常长（�?MB 文件编码后可达数 MB 字符），超出浏览器地址�?导航 URL 的长度限制，导致链接被截断或拒绝加载�?
**第三次尝试（正确�?*
```ts
export async function openInNewTab(url: string): Promise<void> {
  let targetUrl = url
  if (url.startsWith('data:')) {
    const blob = await fetch(url).then((r) => r.blob())
    targetUrl = URL.createObjectURL(blob)   // 生成短链�?blob:http://...
  }
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
- **结果**：正常打开 PDF
- **原理**�?  1. data URL �?Blob，绕过长 URL 限制
  2. Blob �?Object URL，URL 极短（几十个字符�?  3. `<a>` 标签模拟点击，浏览器视为用户主动导航，不触发弹窗拦截
  4. 用完立即 `revokeObjectURL` 释放内存

### 经验教训

| 误区 | 真相 |
|---|---|
| click 事件里调 `window.open` 不会被拦�?| 如果参数�?data URL，Chrome 仍然会拦�?|
| `<a href="data:...">` 可以打开任意大的文件 | 浏览器对导航 URL 有长度限制，大文件会截断 |
| 前端直接展示 base64 就行 | 大附件必须走 Blob/Object URL，或者后端提供文件访�?URL |

### 正确做法（以后任何附件预�?下载都遵循）

1. **小文件（< 100KB）且必须内联展示**：可以继续用 base64 data URL（如图片缩略图）
2. **大文件或需要新标签页打开**：统一�?`openInNewTab`（已封装�?`utils/attachment.ts`�?3. **最佳长期方�?*：后端提供文件上传接口，返回可访问的 URL（如 `/api/files/{id}`），前端直接用普�?URL 打开，完全规�?base64 的一切问�?
### 相关文件
- `frontend/src/utils/attachment.ts` —�?`openInNewTab`
- `docs/attachment-upload-spec.md` —�?附件规范文档

---

## 2026-05-12 | 项目级别字典修改后老数据显示不匹配

### 现象
管理员把项目级别字典�?`["A","B","C"]` 改为 `["A�?,"B�?,"C�?]` 后，已有项目�?`level` 字段仍显示旧值（�?`"A"`），下拉框选项却是新值（`"A�?`），导致 Select 组件无法匹配，直接回退显示原始�?`"A"`�?
### 根因分析

后端 `SystemConfigService.setDictOptions` 在修改字典时，会调用 `migrateProjectDictValues` 迁移已有项目数据�?
```java
List<String> previousLevels = existing == null ? null : existing.projectLevels;
// ...
migrateProjectDictValues(tenantId, previousLevels, levels, "level");
```

�?`migrateProjectDictValues` 的防护逻辑�?
```java
if (previousValues == null || currentValues == null || previousValues.size() != currentValues.size()) {
    return;
}
```

**当租户从未自定义过字典时，`existing == null`，`previousLevels == null`，迁移直�?return�?*
这意味着所有使用默认字典期间创建的项目，在管理员第一次修改字典时，数据完全不会被迁移�?
### 修复方案

�?`SystemConfigService.setDictOptions` 中，�?`previousLevels` / `previousSources` �?null 时，应使用默认值作�?previousValues�?
```java
List<String> previousLevels = existing == null ? DEFAULT_PROJECT_LEVELS : existing.projectLevels;
List<String> previousSources = existing == null ? DEFAULT_PROJECT_SOURCES : existing.projectSources;
```

### 经验教训

- **迁移逻辑必须覆盖"首次修改"场景**：默认值阶段产生的数据同样属于"旧数�?，迁移时不能假设 `previousValues` 一定非空�?- **数据库注�?vs 代码逻辑不一�?*：`schema.sql` 中合�?`attachment` 注释�?附件路径"，但实际存的�?JSON；字段注释要及时更新，避免后人误解�?
### 相关文件
- `backend/src/main/java/com/indcrm/crm/service/SystemConfigService.java`

---

## 2026-05-12 | 文案替换遗漏

### 现象
"租购皆可" 改为 "可租可售"，需要全局搜索替换�?
### 经验教训

- 不要只看当前页面，要�?`grep` 全项目搜索，确保所有展示位（列表映射、创建页 option、详情页 option）同步修改�?- 后端存储值（`BOTH`）不变，只改前端 label，不影响已有数据�?
### 相关文件
- `frontend/src/views/modules/ProjectsListView.vue`
- `frontend/src/views/modules/ProjectCreateView.vue`
- `frontend/src/views/pages/ProjectDetailPage.vue`

---

## 通用原则（持续补充）

1. **浏览器行为有�?*：`window.open`、iframe、`<a>` 标签对不�?URL 类型（data URL、blob URL、http URL）的行为差异很大，大文件/新标签页场景务必测试 Chrome、Edge、Firefox�?2. **base64 不是银弹**：前�?base64 适合小图标、缩略图；大文件�? 100KB）一律走 Blob URL 或后端文件接口�?3. **迁移逻辑要考虑 null 默认�?*：任何涉及“旧�?�?新值”迁移的代码，都要考虑用户从未配置过（使用默认值）的场景�?4. **改完要全局验证**：一个功能在 A 页面改了，要�?B、C、D 页面确认是否也需要同步改（如附件预览涉及合同详情、跟进详情、项目详情等多个页面）�?
---

## 2026-05-18 | 人员字段反复显示 UUID 而不是中文名

### 现象
项目列表“负责人”、合同列表“创建人”等人员字段偶发显示 UUID，例�?`96c27a60-...`，而不是成员中文名称�?
### 迭代过程
此前只在单个页面局部修�?`getUserDisplayName` 或给项目接口补过 `ownerName/creatorName`，但合同、回款、跟进、详情页仍各自保留一�?`users.find(...) || userId` 的兜底逻辑。后续页面重构或接口字段不完整时，同类问题又会从其他入口出现�?
### 根因分析
1. 前端把业务存储字�?`ownerId/creatorId/updatedBy` 同时当作展示字段使用，名称解析失败后直接兜底�?ID�?2. 人员名称解析逻辑分散在多�?Vue 文件里，没有统一规则�?3. 后端只给部分实体补充�?`ownerName/creatorName`，合同等实体仍依赖前端再�?`/api/users`�?4. UUID �?UI 上不应该作为人员字段兜底。即使名称暂时无法解析，也应显示“未知用户”或 `-`，避免把内部 ID 暴露给业务用户�?
### 正确做法
1. 人员字段展示必须走统一工具 `frontend/src/utils/userDisplay.ts`�?2. 展示优先级固定为：接口返回的显式名称（如 `creatorName`）→ 当前用户列表解析出的名称 �?`未知用户`（UUID�? 原始�?UUID 文本�?3. 新增业务列表或详情页时，禁止�?`return user?.name || userId`�?4. 后端业务 DTO/实体如果返回人员 ID，应同步返回对应名称字段，尤其是列表页字段�?
### 相关文件
- `frontend/src/utils/userDisplay.ts`
- `frontend/src/views/modules/ProjectsListView.vue`
- `frontend/src/views/modules/ContractsView.vue`
- `backend/src/main/java/com/indcrm/crm/service/ContractService.java`
- `backend/src/main/java/com/indcrm/crm/domain/Contract.java`

## 2026-05-19 | ��ɫ����ҳ����Ȩ�޷�Χ�����������

### ����
��ɫ����ҳ�ġ�����Ȩ�޷�Χ��Tab �����ʾ���⡰����Ȩ�޷�Χ���͹̶�̬˵���İ����û�Ҫ��������Щ����ȫ��ȥ����ֻ���������ɲ����Ŀؼ���

### ��������
1. ��ȷ������ֻ��ǰ��չʾ�㣬���漰���Ȩ���߼���
2. ��ɾ�� Tab �ڵı���飬��ɾ���̶�̬˵���顣
3. ������֤ͨ���󣬱����༭�ؼ��͹̶���ѡ���塣

### �������
ǰһ���޸�ʱ���ѡ��༭�������͡�˵���İ���һ�����ˣ������Ӿ�����Ȼռ�ݴ�����򣬺��û�Ҫ��ġ�ֻչʾ�ؼ�����һ�¡�

### ��ȷ����
����ҳ���տ�ʱ��Ҫ����ȷ�������Ƿ������͡��İ��Ƿ������������������ߣ�
- ���Ƴ����⡢��ʾ��˵�����ı�
- ��������ؼ���Tab���߿����С��Ҫ����
- �޸ĺ����̺˶Խ�ͼ������ֻɾ��һ��

### ����ļ�
- `frontend/src/views/pages/RoleSettingsPage.vue`

## 2026-05-20 | ��Ա�����޸ĺ��б�����ʾ�ɲ���

### ����
��Ա����ҳ�޸ĳ�Ա���ź󣬱���ɹ����б���ġ��������š�û�б仯������ʾ�ɲ��š�

### ��������
1. ��һ���޸��ѳ�Ա�༭����ĳɴ��У����Ƴ��˻�����Ϣ������Բ��Ź����Ļ�д��
2. ����������Ȼ���ڣ�˵�����ⲻֻ��ǰ�˲����������б���ȡԴ�ͱ���Դ��Ȼ��һ�¡�
3. �����Ų���֣���Ա�б����ȶ� `organization_memberships` �������ţ��������޸�ͬʱҲд�� `users.dept_id`��������һ�಻ͬ��ʱ���б��ͻ������ʾ��ֵ��
4. ͬʱ�������½���Ա����Ϊȥ���˴���ʱ�Ĺ�����ʼ����ȱ�������ż�¼����һ���Ŵ��˲�һ�·��ա�

### �������
����ı����ǡ�չʾԴ���͡�д��Դ��û��ͳһ��
- ���沿��ʱд�� `users.dept_id`��Ҳ����ͬ����������
- �б���Ⱦʱֻ����������
- һ����������û��ͬ���������б��Ͳ��ᷴӳ������

��һ���޸�ֻ����˲������ǣ�û�д�����дԴ��һ�£����Կ���������û��Ч��

### ��ȷ����
�Ժ��������ơ�����ɹ����б����䡱�����⣬��ȷ�ϣ�
1. ����ӿ�����д�����ļ��ű���
2. �б��ӿ�ʵ�ʴ����ű���չʾ�ֶΡ�
3. �������˫д�ṹ��չʾ�˱�������ȷ���ײ��ԣ�����ͳһ�ɵ�һ��Դ��

��εĴ�����ʽ�ǣ�
- ��Ա����ʱ����������/����ɫ��ʼ��
- ��Ա�б�����ʹ������������ȱʧʱ���˵� `users.dept_id`
- ������Ϣ�༭���ٴ������Ź����������ٴθ���

### ����ļ�
- `backend/src/main/java/com/indcrm/crm/service/UserService.java`
- `frontend/src/views/modules/UsersView.vue`