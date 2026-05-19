<template>
  <div class="role-settings-page">
    <aside class="role-sidebar">
      <div class="role-sidebar-header">
        <span class="role-sidebar-title">默认角色</span>
        <span class="role-sidebar-note">选择角色后配置数据范围</span>
      </div>
      <div class="role-list">
        <button
          v-for="role in roles"
          :key="role.code"
          type="button"
          class="role-item"
          :class="{ active: selectedRole?.code === role.code }"
          @click="selectRole(role)"
        >
          <div class="role-item-main">
            <span class="role-item-name">{{ role.name }}</span>
            <el-tag v-if="role.systemAdmin" type="success" size="small">固定</el-tag>
            <el-tag v-else-if="role.dataScopeEditable" type="warning" size="small">可编辑</el-tag>
            <el-tag v-else type="info" size="small">只读</el-tag>
          </div>
          <div class="role-item-meta">{{ getBizRoleLabel(role.bizRole) }}</div>
        </button>
      </div>
    </aside>

    <main class="role-main" v-loading="loading">
      <template v-if="selectedRole">
        <el-card class="role-detail-card">
          <template #header>
            <div class="detail-header">
              <div>
                <div class="detail-title">{{ selectedRole.name }}</div>
                <div class="detail-subtitle">{{ selectedRole.description || '角色详情' }}</div>
              </div>
              <div class="detail-badges">
                <el-tag v-if="selectedRole.systemAdmin" type="success">系统管理员</el-tag>
                <el-tag v-else-if="selectedRole.dataScopeEditable" type="warning">招商人员可编辑</el-tag>
                <el-tag v-else type="info">固定配置</el-tag>
              </div>
            </div>
          </template>

          <div class="info-grid">
            <div class="info-cell">
              <span class="info-label">角色编码</span>
              <span class="info-value">{{ selectedRole.code }}</span>
            </div>
            <div class="info-cell">
              <span class="info-label">业务角色</span>
              <span class="info-value">{{ getBizRoleLabel(selectedRole.bizRole) }}</span>
            </div>
            <div class="info-cell">
              <span class="info-label">默认数据范围</span>
              <span class="info-value">{{ getScopeLabel(selectedRole.defaultDataScope) }}</span>
            </div>
            <div class="info-cell wide">
              <span class="info-label">说明</span>
              <span class="info-value">{{ selectedRole.description || '-' }}</span>
            </div>
          </div>

          <el-tabs v-model="activeTab" class="role-tabs">
            <el-tab-pane label="菜单访问权限" name="menu">
              <div class="perm-hint">
                这里只展示角色可访问的菜单范围，数据范围配置请切换到下方的“数据权限范围”。
              </div>
              <div class="perm-group" v-for="group in menuGroups" :key="group.name">
                <div class="perm-group-title">{{ group.name }}</div>
                <div class="perm-table">
                  <div class="perm-table-header">
                    <div class="perm-col perm-col-module">模块</div>
                    <div class="perm-col perm-col-access">菜单访问</div>
                    <div class="perm-col perm-col-function">功能查看</div>
                  </div>
                  <div v-for="menu in group.menus" :key="menu.key" class="perm-table-row">
                    <div class="perm-col perm-col-module">{{ menu.label }}</div>
                    <div class="perm-col perm-col-access">
                      <el-checkbox :model-value="hasMenu(menu.key)" disabled>
                        {{ hasMenu(menu.key) ? '可访问' : '不可访问' }}
                      </el-checkbox>
                    </div>
                    <div class="perm-col perm-col-function">
                      <el-checkbox :model-value="hasMenu(menu.key)" disabled>
                        查看
                      </el-checkbox>
                    </div>
                  </div>
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane label="数据权限范围" name="data">
              <div class="scope-panel">
                <div class="scope-panel-header">
                  <div>
                    <div class="scope-title">角色数据范围</div>
                    <div class="scope-subtitle">
                      招商人员默认可编辑，系统管理员和项目管理员固定为全部数据。
                    </div>
                  </div>
                  <el-tag v-if="selectedRole.dataScopeEditable" type="warning">可编辑</el-tag>
                  <el-tag v-else type="info">固定</el-tag>
                </div>

                <div class="scope-form">
                  <div class="scope-field">
                    <span class="scope-field-label">当前范围</span>
                    <el-select
                      v-model="selectedScope"
                      class="scope-select"
                      placeholder="请选择数据范围"
                      :disabled="!selectedRole.dataScopeEditable"
                    >
                      <el-option
                        v-for="option in availableScopeOptions"
                        :key="option.value"
                        :label="option.label"
                        :value="option.value"
                      />
                    </el-select>
                    <div class="scope-field-help">
                      <template v-if="selectedRole.dataScopeEditable">
                        默认值为“本人及下属”，修改后点击保存立即生效。
                      </template>
                      <template v-else>
                        该角色范围固定为全部数据，不允许修改。
                      </template>
                    </div>
                  </div>

                  <div class="scope-actions">
                    <el-button
                      type="primary"
                      :loading="saving"
                      :disabled="!selectedRole.dataScopeEditable || !scopeDirty"
                      @click="saveScope"
                    >
                      保存范围
                    </el-button>
                  </div>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </template>

      <template v-else>
        <el-empty description="暂无角色数据" />
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../stores/auth'

type ScopeMode = 'ALL' | 'SELF' | 'SELF_AND_SUBORDINATES' | 'DEPT' | 'DEPT_AND_SUBTREE'

interface RoleItem {
  code: string
  name: string
  bizRole: 'SALES' | 'PROJECT_ADMIN'
  systemAdmin: boolean
  description?: string
  menuPermissions?: string[]
  dataScopeOptions?: ScopeMode[]
  defaultDataScope?: ScopeMode
  dataScopeEditable?: boolean
}

const DEFAULT_SALES_SCOPE: ScopeMode = 'SELF_AND_SUBORDINATES'
const DEFAULT_SCOPE_OPTIONS: { value: ScopeMode; label: string }[] = [
  { value: 'ALL', label: '全部数据' },
  { value: 'SELF', label: '仅本人' },
  { value: 'SELF_AND_SUBORDINATES', label: '本人及下属' },
  { value: 'DEPT', label: '本部门' },
  { value: 'DEPT_AND_SUBTREE', label: '本部门及以下' }
]

const menuGroups = [
  {
    name: '业务模块',
    menus: [
      { key: 'workbench', label: '工作台' },
      { key: 'contacts', label: '联系人' },
      { key: 'projects', label: '项目' },
      { key: 'followups', label: '跟进记录' },
      { key: 'contracts', label: '合同' },
      { key: 'payments', label: '回款' }
    ]
  },
  {
    name: '系统模块',
    menus: [
      { key: 'users', label: '成员管理' },
      { key: 'departments', label: '部门管理' },
      { key: 'roles', label: '角色管理' },
      { key: 'dicts', label: '数据字典' },
      { key: 'audit', label: '审计日志' },
      { key: 'events', label: '实时事件' }
    ]
  }
]

const authStore = useAuthStore()
const loading = ref(false)
const saving = ref(false)
const roles = ref<RoleItem[]>([])
const selectedRole = ref<RoleItem | null>(null)
const selectedScope = ref<ScopeMode>(DEFAULT_SALES_SCOPE)
const activeTab = ref('data')

const availableScopeOptions = computed(() => {
  if (!selectedRole.value) {
    return DEFAULT_SCOPE_OPTIONS
  }
  const options = selectedRole.value.dataScopeOptions && selectedRole.value.dataScopeOptions.length > 0
    ? selectedRole.value.dataScopeOptions
    : DEFAULT_SCOPE_OPTIONS.map((item) => item.value)
  return options.map((value) => ({
    value,
    label: getScopeLabel(value)
  }))
})

const scopeDirty = computed(() => {
  if (!selectedRole.value || !selectedRole.value.dataScopeEditable) {
    return false
  }
  return selectedScope.value !== getPersistedScope(selectedRole.value)
})

onMounted(async () => {
  await loadRoles()
})

async function loadRoles() {
  loading.value = true
  try {
    const res = await authStore.api<RoleItem[]>('/api/roles')
    const items = Array.isArray(res) ? res : []
    roles.value = items
    const initialRole = items.find((item) => item.code === 'SALES') || items[0] || null
    if (initialRole) {
      selectRole(initialRole)
    }
  } catch (error: any) {
    ElMessage.error(error.message || '加载角色失败')
  } finally {
    loading.value = false
  }
}

function selectRole(role: RoleItem) {
  selectedRole.value = role
  selectedScope.value = getPersistedScope(role)
  activeTab.value = 'data'
}

function getPersistedScope(role: RoleItem): ScopeMode {
  if (role.systemAdmin) {
    return 'ALL'
  }
  if (role.defaultDataScope) {
    return role.defaultDataScope
  }
  if (role.dataScopeEditable) {
    return DEFAULT_SALES_SCOPE
  }
  return 'ALL'
}

async function saveScope() {
  if (!selectedRole.value || !selectedRole.value.dataScopeEditable) {
    return
  }
  saving.value = true
  try {
    await authStore.api(`/api/roles/${selectedRole.value.code}/scope`, {
      method: 'PUT',
      body: JSON.stringify({ mode: selectedScope.value })
    })
    selectedRole.value.defaultDataScope = selectedScope.value
    roles.value = roles.value.map((role) =>
      role.code === selectedRole.value?.code
        ? { ...role, defaultDataScope: selectedScope.value }
        : role
    )
    ElMessage.success('数据范围已保存')
  } catch (error: any) {
    ElMessage.error(error.message || '保存数据范围失败')
  } finally {
    saving.value = false
  }
}

function hasMenu(key: string): boolean {
  return selectedRole.value?.menuPermissions?.includes(key) ?? false
}

function getBizRoleLabel(bizRole?: string): string {
  const map: Record<string, string> = {
    SALES: '招商人员',
    PROJECT_ADMIN: '项目管理员'
  }
  return map[bizRole || ''] || bizRole || '-'
}

function getScopeLabel(scope?: ScopeMode): string {
  const map: Record<ScopeMode, string> = {
    ALL: '全部数据',
    SELF: '仅本人',
    SELF_AND_SUBORDINATES: '本人及下属',
    DEPT: '本部门',
    DEPT_AND_SUBTREE: '本部门及以下'
  }
  return map[scope || 'ALL']
}
</script>

<style scoped>
.role-settings-page {
  display: flex;
  gap: 16px;
  height: 100%;
  min-height: 0;
}

.role-sidebar {
  width: 260px;
  flex-shrink: 0;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.role-sidebar-header {
  padding: 16px 16px 12px;
  border-bottom: 1px solid #f1f5f9;
}

.role-sidebar-title {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.role-sidebar-note {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #64748b;
}

.role-list {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}

.role-item {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
}

.role-item:hover {
  background: #f8fafc;
}

.role-item.active {
  background: #eff4ff;
  border-color: #c7d2fe;
}

.role-item-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.role-item-name {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.role-item-meta {
  margin-top: 6px;
  font-size: 12px;
  color: #64748b;
}

.role-main {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
}

.role-detail-card :deep(.el-card__header) {
  padding: 16px 20px;
}

.role-detail-card :deep(.el-card__body) {
  padding: 20px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.detail-title {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
}

.detail-subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: #64748b;
}

.detail-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px 24px;
  margin-bottom: 20px;
}

.info-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-cell.wide {
  grid-column: 1 / -1;
}

.info-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.info-value {
  font-size: 14px;
  color: #1e293b;
  word-break: break-all;
}

.role-tabs {
  margin-top: 4px;
}

.perm-hint {
  padding: 12px 14px;
  border: 1px solid #dbeafe;
  border-radius: 10px;
  background: #f8fbff;
  color: #475569;
  font-size: 13px;
  margin-bottom: 16px;
}

.perm-group {
  margin-bottom: 20px;
}

.perm-group-title {
  margin-bottom: 10px;
  padding-left: 8px;
  border-left: 3px solid #2f5cf6;
  font-size: 13px;
  font-weight: 700;
  color: #334155;
}

.perm-table {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
}

.perm-table-header,
.perm-table-row {
  display: grid;
  grid-template-columns: 180px 1fr 1fr;
  align-items: center;
}

.perm-table-header {
  background: #f8fafc;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.perm-table-row {
  border-top: 1px solid #f1f5f9;
  font-size: 13px;
  color: #334155;
}

.perm-col {
  padding: 12px 16px;
}

.perm-col-module {
  font-weight: 600;
}

.scope-panel {
  padding: 4px 0 0;
}

.scope-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 0 0 16px;
}

.scope-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.scope-subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: #64748b;
}

.scope-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 720px;
}

.scope-field {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.scope-field-label {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.scope-select {
  width: 100%;
}

.scope-field-help {
  font-size: 12px;
  color: #64748b;
}

.scope-actions {
  display: flex;
  justify-content: flex-start;
}

@media (max-width: 1280px) {
  .info-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1024px) {
  .role-settings-page {
    flex-direction: column;
  }

  .role-sidebar {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: 1fr;
  }

  .perm-table-header,
  .perm-table-row {
    grid-template-columns: 1fr;
  }
}
</style>
