<template>
  <div>
    <CrudTable
      title="跟进记录"
      :data="followups"
      :columns="columns"
      :loading="loading"
      :show-add="false"
      :show-edit="true"
      :show-delete="true"
      :show-pagination="true"
      :total="total"
      :default-current-page="page"
      :default-page-size="pageSize"
      @add="goCreate"
      @edit="goEdit"
      @delete="deleteFollowup"
      @refresh="loadFollowups"
      @page-change="handlePageChange"
    >
      <template #header>
        <div class="followup-table-header">
          <div class="followup-table-title">跟进记录</div>
          <div class="followup-table-toolbar">
            <div class="followup-table-search" @keyup.enter="submitProjectFilter">
              <el-select
                v-model="filterProjectId"
                clearable
                filterable
                default-first-option
                placeholder="按项目筛选"
                class="followup-project-filter"
                @keyup.enter="submitProjectFilter"
                @change="handleProjectFilterChange"
                @clear="handleProjectFilterChange"
              >
                <el-option
                  v-for="project in projects"
                  :key="project.id"
                  :label="`${project.name} (${project.code})`"
                  :value="project.id"
                />
              </el-select>
            </div>
            <el-button type="primary" @click="goCreate">新增</el-button>
          </div>
        </div>
      </template>

      <template #code="{ row }">
        <el-button link @click="goDetail(row.id)">
          {{ row.code || row.id || '-' }}
        </el-button>
      </template>

      <template #projectId="{ row }">
        {{ getProjectDisplayName(row.projectId) }}
      </template>

      <template #followupAt="{ row }">
        {{ formatDateTime(row.followupAt) }}
      </template>

      <template #contactId="{ row }">
        {{ getContactDisplayName(row.contactId) }}
      </template>

      <template #creatorId="{ row }">
        {{ getUserDisplayName(row.creatorId || row.ownerId) }}
      </template>

      <template #createdAt="{ row }">
        {{ formatDateTime(row.createdAt) }}
      </template>

      <template #updatedAt="{ row }">
        {{ formatDateTime(row.updatedAt) }}
      </template>
    </CrudTable>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '../../stores/auth'
import CrudTable from '../../components/common/CrudTable.vue'
import type { TableColumn } from '../../components/common/CrudTable.vue'
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
let followupRequestSeq = 0

const columns: TableColumn[] = [
  { prop: 'code', label: '跟进编号', width: 170, fixed: 'left', slot: 'code' },
  { prop: 'projectId', label: '关联项目', width: 240, slot: 'projectId' },
  { prop: 'followupAt', label: '跟进时间', width: 180, slot: 'followupAt' },
  { prop: 'method', label: '跟进方式', width: 120 },
  { prop: 'content', label: '跟进内容', minWidth: 280, showOverflowTooltip: true },
  { prop: 'contactId', label: '关联联系人', width: 160, slot: 'contactId' },
  { prop: 'creatorId', label: '创建人', width: 120, slot: 'creatorId' },
  { prop: 'createdAt', label: '创建时间', width: 180, slot: 'createdAt' },
  { prop: 'updatedAt', label: '最后编辑时间', width: 180, slot: 'updatedAt' }
]

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
  const requestSeq = ++followupRequestSeq
  const query = buildPageQuery(page.value, pageSize.value, {
    projectId: filterProjectId.value
  })
  const res = await authStore.api<PageResult<any> | any[]>(`/api/followups?${query}`)
  if (requestSeq !== followupRequestSeq) return
  const pageData = normalizePageResult<any>(res)
  followups.value = pageData.records
  total.value = pageData.total
}

function handleProjectFilterChange() {
  page.value = 1
  void loadFollowups()
}

function submitProjectFilter() {
  page.value = 1
  void loadFollowups()
}

function handlePageChange(nextPage: number, nextSize: number) {
  page.value = nextPage
  pageSize.value = nextSize
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
.followup-table-header {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.followup-table-title {
  color: #111827;
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
}

.followup-table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.followup-table-search {
  flex: 1 1 auto;
  min-width: 0;
}

.followup-project-filter {
  width: min(300px, 100%);
}

@media (max-width: 720px) {
  .followup-table-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .followup-project-filter {
    width: 100%;
  }
}
</style>
