<template>
  <div>
    <CrudTable
      title="项目列表"
      :data="projects"
      :columns="columns"
      :loading="loading"
      :show-add="true"
      :show-refresh="true"
      :show-pagination="true"
      :total="total"
      :default-current-page="page"
      :default-page-size="pageSize"
      @add="router.push('/projects/create')"
      @refresh="loadProjects"
      @page-change="handlePageChange"
    >
      <template #name="{ row }">
        <el-button link @click="router.push(`/projects/${row.id}`)">{{ row.name }}</el-button>
      </template>

      <template #contacts="{ row }">
        {{ getContactsDisplay(row) }}
      </template>

      <template #ownerId="{ row }">
        {{ getUserDisplayName(row.ownerId, row.ownerName) }}
      </template>

      <template #creatorId="{ row }">
        {{ getUserDisplayName(row.creatorId || row.ownerId, row.creatorName) }}
      </template>

      <template #createdAt="{ row }">
        {{ formatDateTime(row.createdAt) }}
      </template>

      <template #dealType="{ row }">
        {{ dealTypeLabelMap[row.dealType] || '-' }}
      </template>

      <template #stage="{ row }">
        <el-tag :type="getStageType(row.stage)">{{ stageLabelMap[row.stage] || row.stage }}</el-tag>
      </template>

      <template #actions="{ row }">
        <el-space>
          <el-button size="small" @click="changeOwner(row)">更换负责人</el-button>
          <el-button size="small" type="danger" @click="deleteProject(row.id)">删除</el-button>
        </el-space>
      </template>
    </CrudTable>

    <el-dialog v-model="ownerDialogVisible" title="更换负责人" width="400">
      <el-form :model="ownerForm" label-width="100px">
        <el-form-item label="新负责人" required>
          <el-select v-model="ownerForm.ownerId">
            <el-option v-for="u in ownerOptions" :key="u.id" :label="u.name" :value="u.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="ownerForm.remark" placeholder="可填写更换原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="ownerDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitOwner">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '../../stores/auth'
import CrudTable from '../../components/common/CrudTable.vue'
import type { TableColumn } from '../../components/common/CrudTable.vue'
import { buildPageQuery, normalizePageResult, type PageResult } from '../../api/page'
import { getUserDisplayName as resolveUserDisplayName } from '../../utils/userDisplay'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const projects = ref<any[]>([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const users = ref<any[]>([])
const contacts = ref<any[]>([])

const ownerDialogVisible = ref(false)
const currentProject = ref<any>(null)
const ownerForm = ref({
  ownerId: '',
  remark: ''
})
const ownerOptions = computed(() => {
  const options = users.value.map((u) => ({ id: u.id, name: u.name }))
  const ownerId = currentProject.value?.ownerId
  if (ownerId && !options.some((u) => u.id === ownerId)) {
    options.unshift({
      id: ownerId,
      name: getUserDisplayName(ownerId, currentProject.value?.ownerName)
    })
  }
  return options
})

const dealTypeLabelMap: Record<string, string> = {
  RENT: '租赁',
  BUY: '购买',
  BOTH: '可租可售',
  PURCHASE: '购买',
  RENT_OR_PURCHASE: '可租可售'
}

const stageLabelMap: Record<string, string> = {
  PROSPECTING: '约客',
  VISITING: '带看',
  NEGOTIATING: '谈判',
  SIGNING: '签约',
  COLLECTING: '回款',
  MOVED_IN: '入驻'
}

const columns: TableColumn[] = [
  { prop: 'name', label: '项目名称', width: 150, slot: 'name', fixed: 'left' },
  { prop: 'code', label: '项目编号', width: 150 },
  { prop: 'contacts', label: '联系人', width: 150, slot: 'contacts' },
  { prop: 'ownerId', label: '负责人', width: 120, slot: 'ownerId' },
  { prop: 'dealType', label: '租购类型', width: 120, slot: 'dealType' },
  { prop: 'source', label: '项目来源', width: 120 },
  { prop: 'intendedRegion', label: '意向区域', width: 120 },
  { prop: 'stage', label: '项目阶段', width: 100, slot: 'stage' },
  { prop: 'id', label: 'ID', width: 220 },
  { prop: 'creatorId', label: '创建人', width: 120, slot: 'creatorId' },
  { prop: 'createdAt', label: '创建时间', width: 180, slot: 'createdAt' }
]

onMounted(async () => {
  await loadAll()
})

async function loadAll() {
  loading.value = true
  try {
    await Promise.all([loadProjects(), loadUsers(), loadContacts()])
  } finally {
    loading.value = false
  }
}

async function loadProjects() {
  const query = buildPageQuery(page.value, pageSize.value)
  const res = await authStore.api<PageResult<any> | any[]>(`/api/projects?${query}`)
  const pageData = normalizePageResult<any>(res)
  projects.value = pageData.records
  total.value = pageData.total
}

async function loadUsers() {
  const res = await authStore.api<PageResult<any> | any[]>('/api/users')
  users.value = normalizePageResult<any>(res).records
}

async function loadContacts() {
  const res = await authStore.api<PageResult<any> | any[]>('/api/contacts')
  contacts.value = normalizePageResult<any>(res).records
}

function getUserDisplayName(userId?: string, ownerName?: string): string {
  return resolveUserDisplayName(users.value, userId, ownerName)
}

function getContactsDisplay(project: any): string {
  const linkedContacts = contacts.value.filter(
    (c) => project.contactIds?.includes(c.id) || project.contactId === c.id
  )
  return linkedContacts.map((c) => c.name).join(', ') || '-'
}

function getStageType(stage: string): string {
  void stage
  return 'primary'
}

function formatDateTime(value?: string | null): string {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('zh-CN')
  } catch {
    return value
  }
}

function changeOwner(project: any) {
  currentProject.value = project
  ownerForm.value.ownerId = project.ownerId || ''
  ownerForm.value.remark = ''
  ownerDialogVisible.value = true
}

async function submitOwner() {
  if (!currentProject.value) return
  try {
    await authStore.api(`/api/projects/${currentProject.value.id}/owner`, {
      method: 'PUT',
      body: JSON.stringify(ownerForm.value)
    })
    ElMessage.success('负责人已转移')
    await loadProjects()
    ownerDialogVisible.value = false
  } catch (error: any) {
    ElMessage.error(error.message || '转移失败')
  }
}

async function deleteProject(id: string) {
  try {
    await ElMessageBox.confirm('确认删除该项目吗?', '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await authStore.api(`/api/projects/${id}`, { method: 'DELETE' })
    ElMessage.success('项目已删除')
    await loadProjects()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

async function handlePageChange(nextPage: number, nextSize: number) {
  page.value = nextPage
  pageSize.value = nextSize
  await loadProjects()
}
</script>
