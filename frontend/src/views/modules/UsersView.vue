<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>成员管理</span>
        <el-button type="primary" @click="openCreateDialog">新增成员</el-button>
      </div>
    </template>

    <div class="users-layout">
      <div class="dept-sidebar">
        <el-tree
          ref="deptTreeRef"
          class="dept-tree"
          :data="deptTreeData"
          :props="{ label: 'name', children: 'children' }"
          node-key="id"
          highlight-current
          default-expand-all
          :indent="28"
          :default-expanded-keys="deptExpandedKeys"
          :expand-on-click-node="false"
          @current-change="handleDeptCurrentChange"
        >
          <template #default="{ data }">
            <span class="dept-tree-label">{{ data.name }}</span>
          </template>
        </el-tree>
      </div>

      <div class="users-table-wrap">
        <div class="users-table-scroll">
          <el-table :data="userRows" v-loading="loading" border stripe height="100%">
          <el-table-column prop="name" label="姓名" min-width="140" />
          <el-table-column prop="phone" label="手机号" min-width="150" />
          <el-table-column label="所属部门" min-width="150">
            <template #default="{ row }">
              {{ getDeptDisplayName(row.deptId) }}
            </template>
          </el-table-column>
          <el-table-column label="直属上级" min-width="150">
            <template #default="{ row }">
              {{ getUserDisplayName(row.managerId) }}
            </template>
          </el-table-column>
          <el-table-column label="角色" min-width="140">
            <template #default="{ row }">
              {{ getRoleDisplay(row) }}
            </template>
          </el-table-column>
          <el-table-column label="状态" min-width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 'ENABLED' ? 'success' : 'danger'">
                {{ row.status === 'ENABLED' ? '启用' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <el-space>
                <el-button size="small" @click="openEditDialog(row)">编辑</el-button>
                <el-button
                  size="small"
                  :type="row.status === 'ENABLED' ? 'warning' : 'success'"
                  @click="toggleStatus(row)"
                >
                  {{ row.status === 'ENABLED' ? '停用' : '启用' }}
                </el-button>
              </el-space>
            </template>
          </el-table-column>
          </el-table>
        </div>
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
      </div>
    </div>
  </el-card>

  <el-dialog v-model="dialogVisible" :title="editingUserId ? '编辑成员' : '新增成员'" width="560px">
    <el-form :model="memberForm" label-width="90px">
      <el-form-item label="姓名" required>
        <el-input v-model="memberForm.name" placeholder="请输入姓名" />
      </el-form-item>
      <el-form-item label="手机号" required>
        <el-input v-model="memberForm.phone" placeholder="请输入手机号" />
      </el-form-item>
      <el-form-item v-if="!editingUserId" label="密码" required>
        <el-input v-model="memberForm.password" show-password placeholder="请输入登录密码" />
      </el-form-item>
      <el-form-item label="部门" required>
        <el-select v-model="memberForm.deptId" placeholder="请选择部门">
          <el-option v-for="d in deptSelectOptions" :key="d.id" :label="d.name" :value="d.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="角色" required>
        <el-select v-model="memberForm.roleCode" placeholder="请选择角色">
          <el-option v-for="r in roleOptions" :key="r.code" :label="r.name" :value="r.code" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="submitMember">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '../../stores/auth'
import { buildPageQuery, normalizePageResult, type PageResult } from '../../api/page'
import { getUserDisplayName as resolveUserDisplayName } from '../../utils/userDisplay'

const authStore = useAuthStore()

const loading = ref(false)
const saving = ref(false)
const userRows = ref<any[]>([])
const users = ref<any[]>([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const departments = ref<any[]>([])
const roleOptions = ref<any[]>([])
const selectedDeptId = ref<string>('')
const deptTreeRef = ref<any>(null)

const dialogVisible = ref(false)
const editingUserId = ref<string>('')
const memberForm = reactive({
  name: '',
  phone: '',
  password: '',
  deptId: '',
  roleCode: ''
})

const enabledDepartments = computed(() =>
  departments.value.filter((d) => d.status === 'ENABLED')
)

const deptSelectOptions = computed(() => {
  const list = [...enabledDepartments.value]
  if (memberForm.deptId && !list.some((d) => d.id === memberForm.deptId)) {
    const current = departments.value.find((d) => d.id === memberForm.deptId)
    if (current) list.unshift(current)
  }
  return list
})

const deptTreeData = computed(() => {
  const list = departments.value.map((d) => ({ ...d, children: [] as any[] }))
  const map = new Map<string, any>()
  list.forEach((item) => map.set(item.id, item))
  const roots: any[] = []
  list.forEach((item) => {
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)!.children.push(item)
    } else {
      roots.push(item)
    }
  })
  return roots
})

const deptExpandedKeys = computed(() => departments.value.map((d) => d.id))

onMounted(async () => {
  await loadAll()
})

async function loadAll() {
  loading.value = true
  await Promise.allSettled([loadUsersPage(), loadUsers(), loadDepartments(), loadRoles()])
  loading.value = false
}

async function loadUsers() {
  users.value = await authStore.api<any[]>('/api/users')
}

async function loadUsersPage() {
  const extra: Record<string, string> = {}
  if (selectedDeptId.value) {
    extra.deptId = selectedDeptId.value
  }
  const query = buildPageQuery(page.value, pageSize.value, extra)
  const res = await authStore.api<PageResult<any> | any[]>(`/api/users?${query}`)
  const pageData = normalizePageResult<any>(res)
  userRows.value = pageData.records
  total.value = pageData.total
}

async function loadDepartments() {
  departments.value = await authStore.api<any[]>('/api/departments')
  if (selectedDeptId.value && !departments.value.some((dept) => dept.id === selectedDeptId.value)) {
    selectedDeptId.value = ''
    page.value = 1
    await loadUsersPage()
  }
  await nextTick()
  deptTreeRef.value?.setCurrentKey(selectedDeptId.value || undefined)
}

async function loadRoles() {
  roleOptions.value = await authStore.api<any[]>('/api/roles')
}

function handleDeptCurrentChange(data: any) {
  selectedDeptId.value = data?.id || ''
  page.value = 1
  void loadUsersPage()
}

function getRoleConfigByCode(code?: string) {
  return roleOptions.value.find((r) => r.code === code)
}

function getRoleConfigForUser(user: any) {
  return roleOptions.value.find((r) => r.bizRole === user.bizRole && !!r.systemAdmin === !!user.systemAdmin)
}

function getRoleDisplay(user: any): string {
  const role = getRoleConfigForUser(user)
  return role?.name || user.bizRole || '-'
}

function openCreateDialog() {
  editingUserId.value = ''
  memberForm.name = ''
  memberForm.phone = ''
  memberForm.password = ''
  memberForm.deptId = ''
  memberForm.roleCode = ''
  dialogVisible.value = true
}

function openEditDialog(user: any) {
  editingUserId.value = user.id
  memberForm.name = user.name || ''
  memberForm.phone = user.phone || ''
  memberForm.password = ''
  memberForm.deptId = user.deptId || ''
  memberForm.roleCode = getRoleConfigForUser(user)?.code || ''
  dialogVisible.value = true
}

async function submitMember() {
  if (!memberForm.name.trim()) return ElMessage.warning('请输入姓名')
  if (!memberForm.phone.trim()) return ElMessage.warning('请输入手机号')
  if (!editingUserId.value && !memberForm.password.trim()) return ElMessage.warning('请输入密码')
  if (!memberForm.deptId) return ElMessage.warning('请选择部门')
  if (!memberForm.roleCode) return ElMessage.warning('请选择角色')

  const role = getRoleConfigByCode(memberForm.roleCode)
  if (!role) return ElMessage.warning('角色无效')

  saving.value = true
  try {
    if (!editingUserId.value) {
      await authStore.api('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: memberForm.name.trim(),
          phone: memberForm.phone.trim(),
          password: memberForm.password.trim(),
          deptId: memberForm.deptId,
          bizRole: role.bizRole,
          systemAdmin: !!role.systemAdmin
        })
      })
      ElMessage.success('成员已新增')
    } else {
      await Promise.all([
        authStore.api(`/api/users/${editingUserId.value}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: memberForm.name.trim(),
            phone: memberForm.phone.trim()
          })
        }),
        authStore.api(`/api/users/${editingUserId.value}/department`, {
          method: 'PUT',
          body: JSON.stringify({ deptId: memberForm.deptId })
        }),
        authStore.api(`/api/users/${editingUserId.value}/role`, {
          method: 'PUT',
          body: JSON.stringify({ bizRole: role.bizRole, systemAdmin: !!role.systemAdmin })
        })
      ])
      ElMessage.success('成员已更新')
    }
    dialogVisible.value = false
    await Promise.all([loadUsersPage(), loadUsers()])
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function toggleStatus(user: any) {
  const target = user.status === 'ENABLED' ? 'DISABLED' : 'ENABLED'
  const actionText = target === 'ENABLED' ? '启用' : '停用'
  try {
    await ElMessageBox.confirm(`确认${actionText}成员“${user.name}”吗？`, '确认操作', {
      confirmButtonText: actionText,
      cancelButtonText: '取消',
      type: 'warning'
    })
    await authStore.api(`/api/users/${user.id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: target })
    })
    ElMessage.success(`成员已${actionText}`)
    await Promise.all([loadUsersPage(), loadUsers()])
  } catch (error: any) {
    if (error !== 'cancel') ElMessage.error(error.message || '操作失败')
  }
}

function handlePageChange(nextPage: number) {
  page.value = nextPage
  void loadUsersPage()
}

function handleSizeChange(nextSize: number) {
  pageSize.value = nextSize
  page.value = 1
  void loadUsersPage()
}

function getUserDisplayName(userId?: string): string {
  return resolveUserDisplayName(users.value, userId)
}

function getDeptDisplayName(deptId?: string | null): string {
  if (!deptId) return '-'
  const dept = departments.value.find((d) => d.id === deptId)
  return dept?.name || deptId
}

async function refreshDepartments() {
  await loadDepartments()
}

defineExpose({
  refreshDepartments
})
</script>

<style scoped>
.users-layout {
  display: flex;
  gap: 16px;
  height: 560px;
  overflow: hidden;
}

.dept-sidebar {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid #e4e7ed;
  padding-right: 12px;
  max-height: 100%;
  overflow-y: auto;
}

.dept-tree :deep(.el-tree-node__content) {
  height: 34px;
  color: #334155;
  font-size: 14px;
  border-radius: 4px;
  background-color: transparent;
}

.dept-tree :deep(.el-tree-node__content:hover) {
  background-color: transparent;
}

.dept-tree :deep(.el-tree-node.is-current > .el-tree-node__content) {
  background-color: transparent;
}

.dept-tree :deep(.dept-tree-label) {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: transparent;
  color: #334155;
  font-weight: 500;
}

.dept-tree :deep(.el-tree-node.is-current > .el-tree-node__content .dept-tree-label) {
  background-color: #f5f7fa;
  color: #1f2937;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}

.dept-tree :deep(.el-tree-node__expand-icon) {
  font-size: 12px;
  color: #94a3b8;
  margin-right: 4px;
}

.users-table-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.users-table-scroll {
  flex: 1;
  min-height: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}
</style>
