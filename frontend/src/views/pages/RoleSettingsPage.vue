<template>
  <div class="role-settings-page">
    <aside class="role-sidebar">
      <div class="role-sidebar-header">
        <span class="role-sidebar-title">默认角色</span>
      </div>
      <div class="role-list">
        <div
          v-for="role in roles"
          :key="role.code"
          class="role-item"
          :class="{ active: selectedRole?.code === role.code }"
          @click="selectRole(role)"
        >
          <div class="role-item-name">{{ role.name }}</div>
        </div>
      </div>
    </aside>

    <main class="role-main" v-loading="loading">
      <template v-if="selectedRole">
        <el-card class="role-detail-card">
          <template #header>
            <div class="detail-header">
              <span class="detail-title">{{ selectedRole.name }}</span>
              <el-tag v-if="selectedRole.systemAdmin" type="success">系统管理员</el-tag>
              <el-tag v-else type="info">普通角色</el-tag>
            </div>
          </template>

          <div class="info-section">
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
          </div>

          <el-divider />

          <el-tabs v-model="activeTab" class="role-tabs">
            <el-tab-pane label="菜单访问权限" name="menu">
              <div class="perm-section">
                <div class="perm-group" v-for="group in menuGroups" :key="group.name">
                  <div class="perm-group-title">{{ group.name }}</div>
                  <div class="perm-table">
                    <div class="perm-table-header">
                      <div class="perm-col perm-col-module">模块</div>
                      <div class="perm-col perm-col-access">访问权限</div>
                      <div class="perm-col perm-col-function">功能权限</div>
                    </div>
                    <div v-for="menu in group.menus" :key="menu.key" class="perm-table-row">
                      <div class="perm-col perm-col-module">{{ menu.label }}</div>
                      <div class="perm-col perm-col-access">
                        <el-checkbox :model-value="hasMenu(menu.key)" disabled>
                          {{ menu.label }}
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
              </div>
            </el-tab-pane>

            <el-tab-pane label="数据权限范围" name="data">
              <div class="perm-section scope-panel">
                <div class="scope-box">
                  <div v-if="canEditScope" class="scope-editor">
                    <div class="scope-row">
                      <span class="scope-label">当前范围</span>
                      <el-select v-model="selectedScope" class="scope-select" placeholder="请选择数据范围">
                        <el-option
                          v-for="scope in scopeOptions"
                          :key="scope.value"
                          :label="scope.label"
                          :value="scope.value"
                        />
                      </el-select>
                    </div>
                    <div class="scope-actions">
                      <el-button :disabled="!scopeDirty" @click="resetScope">恢复默认</el-button>
                      <el-button
                        type="primary"
                        :loading="saving"
                        :disabled="!scopeDirty"
                        @click="saveScope"
                      >
                        保存配置
                      </el-button>
                    </div>
                  </div>
                  <div v-else class="scope-fixed">
                    <el-checkbox :model-value="true" disabled>
                      {{ getScopeLabel(selectedRole.defaultDataScope) }}
                    </el-checkbox>
                  </div>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </el-card>
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

const authStore = useAuthStore()
const loading = ref(false)
const saving = ref(false)
const roles = ref<RoleItem[]>([])
const selectedRole = ref<RoleItem | null>(null)
const selectedScope = ref<ScopeMode>(DEFAULT_SALES_SCOPE)
const activeTab = ref<'menu' | 'data'>('menu')

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

const scopeOptions = computed(() => {
  const values = selectedRole.value?.dataScopeOptions?.length
    ? selectedRole.value.dataScopeOptions
    : (['ALL', 'SELF', 'SELF_AND_SUBORDINATES', 'DEPT', 'DEPT_AND_SUBTREE'] as ScopeMode[])
  return values.map((value) => ({ value, label: getScopeLabel(value) }))
})

const scopeDirty = computed(() => {
  if (!selectedRole.value) {
    return false
  }
  return selectedScope.value !== getInitialScope(selectedRole.value)
})

const canEditScope = computed(() => selectedRole.value?.code === 'SALES')

onMounted(async () => {
  await loadRoles()
})

async function loadRoles() {
  loading.value = true
  try {
    const res = await authStore.api<RoleItem[]>('/api/roles')
    roles.value = Array.isArray(res) ? res : []
    if (roles.value.length > 0 && !selectedRole.value) {
      selectRole(roles.value.find((role) => role.code === 'SALES') || roles.value[0])
    }
  } catch (error: any) {
    ElMessage.error(error.message || '加载角色失败')
  } finally {
    loading.value = false
  }
}

function selectRole(role: RoleItem) {
  selectedRole.value = role
  selectedScope.value = getInitialScope(role)
  activeTab.value = 'menu'
}

function getInitialScope(role: RoleItem): ScopeMode {
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

function resetScope() {
  if (!selectedRole.value) {
    return
  }
  selectedScope.value = getInitialScope(selectedRole.value)
}

async function saveScope() {
  if (!selectedRole.value || !canEditScope.value) {
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
    ElMessage.success('数据权限范围已保存')
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
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
  width: 240px;
  flex-shrink: 0;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.role-sidebar-header {
  padding: 16px 16px 8px;
  border-bottom: 1px solid #f1f5f9;
}

.role-sidebar-title {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.role-list {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
}

.role-item {
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: all 0.15s ease;
}

.role-item:hover {
  background: #f8fafc;
}

.role-item.active {
  background: #eff4ff;
  border-left-color: #2f5cf6;
}

.role-item-name {
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
  line-height: 1.4;
}

.role-item.active .role-item-name {
  color: #2f5cf6;
}

.role-main {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
}

.role-detail-card :deep(.el-card__header) {
  padding: 14px 20px;
}

.role-detail-card :deep(.el-card__body) {
  padding: 20px;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.detail-title {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}

.info-section {
  margin-bottom: 8px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px 24px;
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

.perm-section {
  margin-bottom: 8px;
}


.scope-panel {
  max-width: 560px;
}

.scope-box {
  width: 100%;
  max-width: 520px;
}

.scope-editor,
.scope-fixed {
  border: none;
  border-radius: 0;
  background: transparent;
  padding: 0;
}

.scope-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.scope-label {
  flex: 0 0 auto;
  width: 84px;
  font-size: 13px;
  color: #334155;
  font-weight: 500;
}

.scope-select {
  flex: 1;
  min-width: 0;
}

.scope-actions {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}

.scope-hint {
  margin-top: 10px;
  font-size: 12px;
  color: #64748b;
}

.perm-group {
  margin-bottom: 20px;
}

.perm-group:last-child {
  margin-bottom: 0;
}

.perm-group-title {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 10px;
  padding-left: 8px;
  border-left: 3px solid #2f5cf6;
}

.perm-table {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.perm-table-header {
  display: grid;
  grid-template-columns: 160px 1fr 1fr;
  background: #f8fafc;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.perm-table-row {
  display: grid;
  grid-template-columns: 160px 1fr 1fr;
  border-top: 1px solid #f1f5f9;
  font-size: 13px;
  color: #334155;
  align-items: center;
}

.perm-col {
  padding: 10px 16px;
}

.perm-col-module {
  font-weight: 500;
}

.scope-fixed :deep(.el-checkbox__label) {
  font-size: 13px;
}

@media (max-width: 1280px) {
  .info-grid {
    grid-template-columns: repeat(2, 1fr);
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
