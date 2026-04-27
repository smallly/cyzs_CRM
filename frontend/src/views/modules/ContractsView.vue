<template>
  <div>
    <CrudTable
      title="合同管理"
      :data="contracts"
      :columns="columns"
      :loading="loading"
      :show-add="true"
      :show-pagination="true"
      :total="total"
      :default-current-page="page"
      :default-page-size="pageSize"
      @add="goCreate"
      @refresh="loadContracts"
      @page-change="handlePageChange"
    >
      <template #projectId="{ row }">
        {{ getProjectName(row.projectId) }}
      </template>
      <template #creatorId="{ row }">
        {{ getUserDisplayName(row.creatorId || row.ownerId) }}
      </template>
      <template #createdAt="{ row }">
        {{ formatDateTime(row.createdAt) }}
      </template>

      <template #attachment="{ row }">
        <el-button v-if="row.attachment" link @click="downloadAttachment(row)">
          {{ row.attachment }}
        </el-button>
        <span v-else>-</span>
      </template>
    </CrudTable>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../stores/auth'
import CrudTable from '../../components/common/CrudTable.vue'
import type { TableColumn } from '../../components/common/CrudTable.vue'
import { buildPageQuery, normalizePageResult, type PageResult } from '../../api/page'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const contracts = ref<any[]>([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const projects = ref<any[]>([])
const users = ref<any[]>([])

const columns: TableColumn[] = [
  { prop: 'projectId', label: '所属项目', width: 200, slot: 'projectId' },
  { prop: 'contractNo', label: '合同编号', width: 150 },
  { prop: 'title', label: '合同标题', width: 180 },
  { prop: 'amount', label: '合同金额(元)', width: 140 },
  { prop: 'estimatedCommission', label: '预估佣金(元)', width: 150 },
  { prop: 'signDate', label: '签约日期', width: 120 },
  { prop: 'attachment', label: '合同附件', width: 200, slot: 'attachment' },
  { prop: 'id', label: 'ID', width: 220 },
  { prop: 'creatorId', label: '创建人', width: 120, slot: 'creatorId' },
  { prop: 'createdAt', label: '创建时间', width: 180, slot: 'createdAt' }
]

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([loadContracts(), loadProjects(), loadUsers()])
  } finally {
    loading.value = false
  }
})

async function loadContracts() {
  const query = buildPageQuery(page.value, pageSize.value)
  const res = await authStore.api<PageResult<any> | any[]>(`/api/contracts?${query}`)
  const pageData = normalizePageResult<any>(res)
  contracts.value = pageData.records
  total.value = pageData.total
}

async function loadProjects() {
  const res = await authStore.api<PageResult<any> | any[]>('/api/projects')
  projects.value = normalizePageResult<any>(res).records
}

async function loadUsers() {
  const res = await authStore.api<PageResult<any> | any[]>('/api/users')
  users.value = normalizePageResult<any>(res).records
}

function goCreate() {
  router.push('/contracts/create')
}

function getProjectName(projectId: string): string {
  const project = projects.value.find((p) => p.id === projectId)
  return project?.name || projectId
}

function getUserDisplayName(userId?: string): string {
  if (!userId) return '-'
  const user = users.value.find((u) => u.id === userId)
  return user?.name || userId
}

function formatDateTime(value?: string | null): string {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('zh-CN')
  } catch {
    return value
  }
}

function downloadAttachment(row: any) {
  ElMessage.info(`下载附件: ${row.attachment}`)
}

async function handlePageChange(nextPage: number, nextSize: number) {
  page.value = nextPage
  pageSize.value = nextSize
  await loadContracts()
}
</script>
