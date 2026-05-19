<template>
  <el-card class="scope-page">
    <template #header>
      <div class="card-header">
        <div>
          <div class="title">Role Data Scope</div>
          <div class="subtitle">Admins are fixed at full access. Sales roles can be configured.</div>
        </div>
        <el-tag type="info">Tenant-level role policy</el-tag>
      </div>
    </template>

    <el-alert
      title="System admins and project admins keep full access. Only sales data scope is editable."
      type="info"
      :closable="false"
      class="hint"
    />

    <el-table :data="roles" v-loading="loading" row-key="code" class="scope-table">
      <el-table-column prop="name" label="Role" min-width="140" />
      <el-table-column label="Biz Role" min-width="140">
        <template #default="{ row }">
          {{ getBizRoleLabel(row.bizRole) }}
        </template>
      </el-table-column>
      <el-table-column label="Current Scope" min-width="280">
        <template #default="{ row }">
          <el-select
            v-model="row.selectedMode"
            placeholder="Select scope"
            class="scope-select"
            :disabled="!row.dataScopeEditable"
          >
            <el-option
              v-for="option in row.dataScopeOptions"
              :key="option"
              :label="getScopeModeLabel(option)"
              :value="option"
            />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="Status" width="140">
        <template #default="{ row }">
          <el-tag v-if="row.dataScopeEditable" type="success">Editable</el-tag>
          <el-tag v-else type="info">Fixed</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Action" width="160" fixed="right">
        <template #default="{ row }">
          <el-button
            type="primary"
            :loading="row.saving"
            :disabled="!row.dataScopeEditable || row.selectedMode === row.originalMode"
            @click="saveRoleScope(row)"
          >
            Save
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../stores/auth'

type ScopeMode = 'ALL' | 'SELF' | 'SELF_AND_SUBORDINATES' | 'DEPT' | 'DEPT_AND_SUBTREE'

interface RoleItem {
  code: string
  name: string
  bizRole: 'SALES' | 'PROJECT_ADMIN'
  systemAdmin: boolean
  description?: string
  dataScopeOptions?: ScopeMode[]
  defaultDataScope?: ScopeMode
  dataScopeEditable?: boolean
}

interface ScopeRow extends RoleItem {
  selectedMode: ScopeMode
  originalMode: ScopeMode
  saving: boolean
}

const authStore = useAuthStore()
const loading = ref(false)
const roles = ref<ScopeRow[]>([])

onMounted(async () => {
  await loadRoles()
})

async function loadRoles() {
  loading.value = true
  try {
    const res = await authStore.api<RoleItem[]>('/api/roles')
    const items = Array.isArray(res) ? res : []
    roles.value = items.map((item) => {
      const currentMode = (item.defaultDataScope || 'DEPT_AND_SUBTREE') as ScopeMode
      return {
        ...item,
        selectedMode: currentMode,
        originalMode: currentMode,
        saving: false,
        dataScopeOptions: item.dataScopeOptions && item.dataScopeOptions.length > 0
          ? item.dataScopeOptions
          : ['ALL', 'SELF', 'SELF_AND_SUBORDINATES', 'DEPT', 'DEPT_AND_SUBTREE']
      }
    })
  } catch (error: any) {
    ElMessage.error(error.message || 'Failed to load role scopes')
  } finally {
    loading.value = false
  }
}

async function saveRoleScope(role: ScopeRow) {
  role.saving = true
  try {
    await authStore.api(`/api/roles/${role.code}/scope`, {
      method: 'PUT',
      body: JSON.stringify({ mode: role.selectedMode })
    })
    role.originalMode = role.selectedMode
    ElMessage.success(`${role.name} scope saved`)
  } catch (error: any) {
    ElMessage.error(error.message || 'Save failed')
  } finally {
    role.saving = false
  }
}

function getBizRoleLabel(bizRole?: string): string {
  const map: Record<string, string> = {
    SALES: 'Sales',
    PROJECT_ADMIN: 'Project Admin'
  }
  return map[bizRole || ''] || bizRole || '-'
}

function getScopeModeLabel(mode: ScopeMode): string {
  const map: Record<ScopeMode, string> = {
    ALL: 'All data',
    SELF: 'Own data only',
    SELF_AND_SUBORDINATES: 'Own data + subordinates',
    DEPT: 'Current department',
    DEPT_AND_SUBTREE: 'Current department + subtree'
  }
  return map[mode]
}
</script>

<style scoped>
.scope-page {
  min-height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.title {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.subtitle {
  margin-top: 6px;
  color: #64748b;
  font-size: 13px;
}

.hint {
  margin-bottom: 16px;
}

.scope-table {
  width: 100%;
}

.scope-select {
  width: 100%;
}
</style>
