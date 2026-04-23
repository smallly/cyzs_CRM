<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>成员管理</span>
        <el-button @click="loadUsers">刷新成员</el-button>
      </div>
    </template>

    <el-alert type="info" :closable="false" show-icon style="margin-bottom: 16px">
      当前数据权限口径：{{ getScopeModeLabel(scopeMode) }}。当口径为"本人及下属的数据"时，下属按"部门负责人"配置自动计算。
    </el-alert>

    <el-table :data="users" v-loading="loading" border stripe>
      <el-table-column prop="id" label="ID" width="180" />
      <el-table-column prop="name" label="姓名" width="120" />
      <el-table-column prop="phone" label="手机号" width="120" />
      <el-table-column label="部门归属" width="150">
        <template #default="{ row }">
          {{ getDeptDisplayName(row.deptId) }}
        </template>
      </el-table-column>
      <el-table-column label="部门负责人" width="150">
        <template #default="{ row }">
          {{ getDeptHeadDisplayName(row.deptId) }}
        </template>
      </el-table-column>
      <el-table-column label="直属上级" width="120">
        <template #default="{ row }">
          {{ getUserDisplayName(row.managerId) }}
        </template>
      </el-table-column>
      <el-table-column label="主部门" width="200">
        <template #default="{ row }">
          <el-select v-model="row.deptId" placeholder="请选择部门" size="small">
            <el-option label="请选择部门" value="" />
            <el-option
              v-for="d in enabledDepartments"
              :key="d.id"
              :label="d.name"
              :value="d.id"
            />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="角色" width="180">
        <template #default="{ row }">
          <el-select v-model="row.roleCode" placeholder="请选择角色" size="small">
            <el-option
              v-for="r in roleOptions"
              :key="r.code"
              :label="r.name"
              :value="r.code"
            />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <el-select v-model="row.status" size="small">
            <el-option label="启用" value="ENABLED" />
            <el-option label="停用" value="DISABLED" />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <el-space>
            <el-button size="small" @click="updateDepartment(row)">保存部门</el-button>
            <el-button size="small" type="primary" @click="updateRole(row)">保存角色</el-button>
            <el-button size="small" @click="updateStatus(row)">保存状态</el-button>
          </el-space>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()

const loading = ref(false)
const users = ref<any[]>([])
const departments = ref<any[]>([])
const roleOptions = ref<any[]>([])
const scopeMode = ref<string>('SELF')

const enabledDepartments = computed(() =>
  departments.value.filter(d => d.status === 'ENABLED')
)

onMounted(async () => {
  await loadAll()
})

async function loadAll() {
  loading.value = true
  try {
    await Promise.all([loadUsers(), loadDepartments(), loadRoles(), loadScopeMode()])
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function loadUsers() {
  users.value = await authStore.api<any[]>('/api/users')
}

async function loadDepartments() {
  departments.value = await authStore.api<any[]>('/api/departments')
}

async function loadRoles() {
  roleOptions.value = await authStore.api<any[]>('/api/roles')
}

async function loadScopeMode() {
  const res = await authStore.api<{ mode: string }>('/api/system/scope-mode')
  scopeMode.value = res.mode
}

async function updateRole(user: any) {
  try {
    await authStore.api(`/api/users/${user.id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ roleCode: user.roleCode })
    })
    ElMessage.success('角色已更新')
  } catch (error: any) {
    ElMessage.error(error.message || '更新失败')
  }
}

async function updateStatus(user: any) {
  try {
    await authStore.api(`/api/users/${user.id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: user.status })
    })
    ElMessage.success('状态已更新')
  } catch (error: any) {
    ElMessage.error(error.message || '更新失败')
  }
}

async function updateDepartment(user: any) {
  try {
    await authStore.api(`/api/users/${user.id}/department`, {
      method: 'PUT',
      body: JSON.stringify({ deptId: user.deptId })
    })
    ElMessage.success('部门已更新')
  } catch (error: any) {
    ElMessage.error(error.message || '更新失败')
  }
}

function getUserDisplayName(userId?: string): string {
  if (!userId) return '-'
  const user = users.value.find(u => u.id === userId)
  return user?.name || userId
}

function getDeptDisplayName(deptId?: string | null): string {
  if (!deptId) return '-'
  const dept = departments.value.find(d => d.id === deptId)
  return dept?.name || deptId
}

function getDeptHeadDisplayName(deptId?: string | null): string {
  if (!deptId) return '-'
  const dept = departments.value.find(d => d.id === deptId)
  return getUserDisplayName(dept?.headUserId)
}

function getScopeModeLabel(mode?: string): string {
  const map: Record<string, string> = {
    'SELF': '仅本人数据',
    'SELF_AND_SUBORDINATES': '本人及下属的数据',
    'DEPT': '本部门数据',
    'DEPT_AND_SUBTREE': '本部门及以下数据',
    'ALL': '全部数据'
  }
  return map[mode || scopeMode.value] || mode || '-'
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>