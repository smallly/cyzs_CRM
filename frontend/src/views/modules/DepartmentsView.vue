<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>部门管理</span>
        <el-button @click="loadDepartments">刷新</el-button>
      </div>
    </template>

    <el-form :model="departmentForm" label-width="100px" style="margin-bottom: 16px">
      <el-row :gutter="16">
        <el-col :span="6">
          <el-form-item label="部门名称" required>
            <el-input v-model="departmentForm.name" placeholder="请输入部门名称" />
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item label="上级部门">
            <el-select v-model="departmentForm.parentId" placeholder="无（顶级部门）" clearable>
              <el-option label="无（顶级部门）" value="" />
              <el-option
                v-for="d in enabledDepartmentsExceptSelf"
                :key="d.id"
                :label="d.name"
                :value="d.id"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item label="部门负责人">
            <el-select v-model="departmentForm.headUserId" placeholder="未设置" clearable>
              <el-option label="未设置" value="" />
              <el-option v-for="u in users" :key="u.id" :label="u.name" :value="u.id" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item>
            <el-space>
              <el-button type="primary" @click="saveDepartment">
                {{ departmentEditingId ? '保存部门' : '新增部门' }}
              </el-button>
              <el-button @click="resetDepartmentForm">重置</el-button>
            </el-space>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <el-table :data="departments" v-loading="loading" border stripe>
      <el-table-column prop="id" label="ID" width="180" />
      <el-table-column prop="name" label="部门名称" width="200" />
      <el-table-column label="上级部门" width="200">
        <template #default="{ row }">
          {{ getDeptDisplayName(row.parentId) }}
        </template>
      </el-table-column>
      <el-table-column label="部门负责人" width="150">
        <template #default="{ row }">
          {{ getUserDisplayName(row.headUserId) }}
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'ENABLED' ? 'success' : 'danger'">
            {{ row.status === 'ENABLED' ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="180">
        <template #default="{ row }">
          {{ formatDateTime(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-space>
            <el-button size="small" @click="editDepartment(row)">编辑</el-button>
            <el-button
              size="small"
              :type="row.status === 'ENABLED' ? 'warning' : 'success'"
              @click="toggleDepartmentStatus(row)"
            >
              {{ row.status === 'ENABLED' ? '停用' : '启用' }}
            </el-button>
          </el-space>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()

const loading = ref(false)
const users = ref<any[]>([])
const departments = ref<any[]>([])
const departmentEditingId = ref<string>('')
const departmentForm = reactive({
  name: '',
  parentId: '',
  headUserId: ''
})

const enabledDepartmentsExceptSelf = computed(() =>
  departments.value.filter(d => d.status === 'ENABLED' && d.id !== departmentEditingId.value)
)

onMounted(async () => {
  await loadAll()
})

async function loadAll() {
  loading.value = true
  try {
    await Promise.all([loadDepartments(), loadUsers()])
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function loadDepartments() {
  departments.value = await authStore.api<any[]>('/api/departments')
}

async function loadUsers() {
  users.value = await authStore.api<any[]>('/api/users')
}

async function saveDepartment() {
  if (!departmentForm.name) {
    ElMessage.warning('请输入部门名称')
    return
  }

  try {
    if (departmentEditingId.value) {
      await authStore.api(`/api/departments/${departmentEditingId.value}`, {
        method: 'PUT',
        body: JSON.stringify(departmentForm)
      })
      ElMessage.success('部门已更新')
    } else {
      await authStore.api('/api/departments', {
        method: 'POST',
        body: JSON.stringify(departmentForm)
      })
      ElMessage.success('部门已创建')
    }
    await loadDepartments()
    resetDepartmentForm()
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败')
  }
}

function editDepartment(dept: any) {
  departmentEditingId.value = dept.id
  departmentForm.name = dept.name
  departmentForm.parentId = dept.parentId || ''
  departmentForm.headUserId = dept.headUserId || ''
}

function resetDepartmentForm() {
  departmentEditingId.value = ''
  departmentForm.name = ''
  departmentForm.parentId = ''
  departmentForm.headUserId = ''
}

async function toggleDepartmentStatus(dept: any) {
  const newStatus = dept.status === 'ENABLED' ? 'DISABLED' : 'ENABLED'
  const actionText = newStatus === 'ENABLED' ? '启用' : '停用'

  try {
    await ElMessageBox.confirm(`确认${actionText}部门"${dept.name}"吗?`, '确认操作', {
      confirmButtonText: actionText,
      cancelButtonText: '取消',
      type: 'warning'
    })

    await authStore.api(`/api/departments/${dept.id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus })
    })
    ElMessage.success(`部门已${actionText}`)
    await loadDepartments()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '操作失败')
    }
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

function formatDateTime(value?: string | null): string {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('zh-CN')
  } catch {
    return value
  }
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>