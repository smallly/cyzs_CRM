<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>部门管理</span>
        <el-button type="primary" @click="openCreateDialog">新增部门</el-button>
      </div>
    </template>

    <el-table :data="departmentRows" v-loading="loading" border stripe>
      <el-table-column prop="name" label="部门名称" min-width="160" />
      <el-table-column label="上级部门" min-width="150">
        <template #default="{ row }">
          {{ getDeptDisplayName(row.parentId) }}
        </template>
      </el-table-column>
      <el-table-column label="部门负责人" min-width="140">
        <template #default="{ row }">
          {{ getUserDisplayName(row.headUserId) }}
        </template>
      </el-table-column>
      <el-table-column label="状态" min-width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'ENABLED' ? 'success' : 'danger'">
            {{ row.status === 'ENABLED' ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" min-width="180">
        <template #default="{ row }">
          {{ formatDateTime(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-space>
            <el-button size="small" @click="openEditDialog(row)">编辑</el-button>
            <el-button
              v-if="!isRootDepartment(row)"
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
    <div class="pagination-wrap">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :background="false"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>
  </el-card>

  <el-dialog v-model="dialogVisible" :title="departmentEditingId ? '编辑部门' : '新增部门'" width="520px">
    <el-form :model="departmentForm" label-width="100px">
      <el-form-item label="部门名称" required>
        <el-input v-model="departmentForm.name" placeholder="请输入部门名称" />
      </el-form-item>
      <el-form-item v-if="!isEditingRootDepartment" label="上级部门" required>
        <el-select v-model="departmentForm.parentId" placeholder="请选择上级部门">
          <el-option
            v-for="d in enabledDepartmentsExceptSelf"
            :key="d.id"
            :label="d.name"
            :value="d.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item v-if="!isEditingRootDepartment" label="部门负责人">
        <el-select v-model="departmentForm.headUserId" placeholder="未设置" clearable>
          <el-option label="未设置" value="" />
          <el-option v-for="u in users" :key="u.id" :label="u.name" :value="u.id" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="saveDepartment">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '../../stores/auth'
import { buildPageQuery, normalizePageResult, type PageResult } from '../../api/page'

const authStore = useAuthStore()

const loading = ref(false)
const saving = ref(false)
const users = ref<any[]>([])
const departmentRows = ref<any[]>([])
const departments = ref<any[]>([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const departmentEditingId = ref<string>('')
const dialogVisible = ref(false)

const departmentForm = reactive({
  name: '',
  parentId: '',
  headUserId: ''
})

const enabledDepartmentsExceptSelf = computed(() =>
  departments.value.filter((d) => d.status === 'ENABLED' && d.id !== departmentEditingId.value)
)

const isEditingRootDepartment = computed(() => {
  const dept = [...departments.value, ...departmentRows.value].find((d) => d.id === departmentEditingId.value)
  return !!dept && isRootDepartment(dept)
})

onMounted(async () => {
  await loadAll()
})

async function loadAll() {
  loading.value = true
  try {
    await Promise.all([loadDepartmentsPage(), loadDepartments(), loadUsers()])
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function loadDepartments() {
  departments.value = await authStore.api<any[]>('/api/departments')
}

async function loadDepartmentsPage() {
  const query = buildPageQuery(page.value, pageSize.value)
  const res = await authStore.api<PageResult<any> | any[]>(`/api/departments?${query}`)
  const pageData = normalizePageResult<any>(res)
  departmentRows.value = pageData.records
  total.value = pageData.total
}

async function loadUsers() {
  users.value = await authStore.api<any[]>('/api/users')
}

function openCreateDialog() {
  departmentEditingId.value = ''
  departmentForm.name = ''
  departmentForm.parentId = ''
  departmentForm.headUserId = ''
  dialogVisible.value = true
}

function openEditDialog(dept: any) {
  departmentEditingId.value = dept.id
  departmentForm.name = dept.name || ''
  departmentForm.parentId = dept.parentId || ''
  departmentForm.headUserId = dept.headUserId || ''
  dialogVisible.value = true
}

async function saveDepartment() {
  if (!departmentForm.name.trim()) return ElMessage.warning('请输入部门名称')
  if (!isEditingRootDepartment.value && !departmentForm.parentId) return ElMessage.warning('请选择上级部门')

  const payload = isEditingRootDepartment.value
    ? { name: departmentForm.name.trim() }
    : {
        name: departmentForm.name.trim(),
        parentId: departmentForm.parentId,
        headUserId: departmentForm.headUserId
      }

  saving.value = true
  try {
    if (departmentEditingId.value) {
      await authStore.api(`/api/departments/${departmentEditingId.value}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      })
      ElMessage.success('部门已更新')
    } else {
      await authStore.api('/api/departments', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      ElMessage.success('部门已创建')
    }
    dialogVisible.value = false
    await Promise.all([loadDepartmentsPage(), loadDepartments()])
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    saving.value = false
  }
}

async function toggleDepartmentStatus(dept: any) {
  const newStatus = dept.status === 'ENABLED' ? 'DISABLED' : 'ENABLED'
  const actionText = newStatus === 'ENABLED' ? '启用' : '停用'
  try {
    await ElMessageBox.confirm(`确认${actionText}部门“${dept.name}”吗？`, '确认操作', {
      confirmButtonText: actionText,
      cancelButtonText: '取消',
      type: 'warning'
    })
    await authStore.api(`/api/departments/${dept.id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus })
    })
    ElMessage.success(`部门已${actionText}`)
    await Promise.all([loadDepartmentsPage(), loadDepartments()])
  } catch (error: any) {
    if (error !== 'cancel') ElMessage.error(error.message || '操作失败')
  }
}

function handlePageChange(nextPage: number) {
  page.value = nextPage
  void loadDepartmentsPage()
}

function handleSizeChange(nextSize: number) {
  pageSize.value = nextSize
  page.value = 1
  void loadDepartmentsPage()
}

function getUserDisplayName(userId?: string): string {
  if (!userId) return '-'
  const user = users.value.find((u) => u.id === userId)
  return user?.name || userId
}

function getDeptDisplayName(deptId?: string | null): string {
  if (!deptId) return '-'
  const dept = departments.value.find((d) => d.id === deptId)
  return dept?.name || deptId
}

function isRootDepartment(dept: any): boolean {
  return !dept?.parentId
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

.pagination-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
