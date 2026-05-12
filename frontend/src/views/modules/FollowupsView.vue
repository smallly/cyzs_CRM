<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>跟进记录</span>
        <el-space>
          <el-select v-model="filterProjectId" clearable placeholder="按项目筛选" style="width: 260px" @change="handleProjectFilterChange">
            <el-option v-for="project in projects" :key="project.id" :label="`${project.name} (${project.code})`" :value="project.id" />
          </el-select>
          <el-button type="primary" @click="goCreate">新增跟进</el-button>
        </el-space>
      </div>
    </template>

    <el-table :data="followups" v-loading="loading" border stripe>
      <el-table-column label="跟进编号" width="170" fixed="left">
        <template #default="{ row }">
          <el-button link @click="goDetail(row.id)">
            {{ row.code || row.id || '-' }}
          </el-button>
        </template>
      </el-table-column>
      <el-table-column label="关联项目" width="240">
        <template #default="{ row }">
          {{ getProjectDisplayName(row.projectId) }}
        </template>
      </el-table-column>
      <el-table-column prop="followupAt" label="跟进时间" width="180">
        <template #default="{ row }">
          {{ formatDateTime(row.followupAt) }}
        </template>
      </el-table-column>
      <el-table-column prop="method" label="跟进方式" width="120" />
      <el-table-column prop="content" label="跟进内容" min-width="280" show-overflow-tooltip />
      <el-table-column label="关联联系人" width="160">
        <template #default="{ row }">
          {{ getContactDisplayName(row.contactId) }}
        </template>
      </el-table-column>
      <el-table-column label="创建人" width="120">
        <template #default="{ row }">
          {{ getUserDisplayName(row.creatorId || row.ownerId) }}
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="180">
        <template #default="{ row }">
          {{ formatDateTime(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="最后编辑时间" width="180">
        <template #default="{ row }">
          {{ formatDateTime(row.updatedAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right" align="center">
        <template #default="{ row }">
          <el-space>
            <el-button size="small" @click="goEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteFollowup(row)">删除</el-button>
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
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '../../stores/auth'
import { buildPageQuery, normalizePageResult, type PageResult } from '../../api/page'

const authStore = useAuthStore()
const router = useRouter()

const loading = ref(false)
const filterProjectId = ref('')
const followups = ref<any[]>([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const projects = ref<any[]>([])
const users = ref<any[]>([])
const contacts = ref<any[]>([])

onMounted(async () => {
  await loadAll()
})

async function loadAll() {
  loading.value = true
  try {
    await Promise.all([loadProjects(), loadUsers(), loadContacts(), loadFollowups()])
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function loadProjects() {
  projects.value = await authStore.api<any[]>('/api/projects')
}

async function loadUsers() {
  users.value = await authStore.api<any[]>('/api/users')
}

async function loadContacts() {
  contacts.value = await authStore.api<any[]>('/api/contacts')
}

async function loadFollowups() {
  const query = buildPageQuery(page.value, pageSize.value, {
    projectId: filterProjectId.value
  })
  const res = await authStore.api<PageResult<any> | any[]>(`/api/followups?${query}`)
  const pageData = normalizePageResult<any>(res)
  followups.value = pageData.records
  total.value = pageData.total
}

function handleProjectFilterChange() {
  page.value = 1
  void loadFollowups()
}

function handlePageChange(nextPage: number) {
  page.value = nextPage
  void loadFollowups()
}

function handleSizeChange(nextSize: number) {
  pageSize.value = nextSize
  page.value = 1
  void loadFollowups()
}

function goCreate() {
  router.push('/followups/create')
}

function goDetail(followupId: string) {
  if (!followupId) return
  router.push(`/followups/${followupId}`)
}

function goEdit(row: any) {
  if (!row?.id) return
  router.push({ path: '/followups/create', query: { id: row.id } })
}

async function deleteFollowup(row: any) {
  if (!row?.id) return
  try {
    await ElMessageBox.confirm(`确认删除跟进记录「${row.code || row.id}」吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await authStore.api(`/api/followups/${row.id}`, { method: 'DELETE' })
    ElMessage.success('跟进记录已删除')
    await loadFollowups()
  } catch (error: any) {
    if (error === 'cancel' || error === 'close') return
    ElMessage.error(error.message || '删除失败')
  }
}

function getProjectDisplayName(projectId?: string): string {
  if (!projectId) return '-'
  const project = projects.value.find((item) => item.id === projectId)
  return project ? `${project.name} (${project.code})` : projectId
}

function getUserDisplayName(userId?: string): string {
  if (!userId) return '-'
  const user = users.value.find((item) => item.id === userId)
  return user?.name || userId
}

function getContactDisplayName(contactId?: string): string {
  if (!contactId) return '-'
  const contact = contacts.value.find((item) => item.id === contactId)
  return contact?.name || contactId
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
