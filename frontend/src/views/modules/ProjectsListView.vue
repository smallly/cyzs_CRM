<template>
  <div>
    <CrudTable
      title="项目列表"
      :data="projects"
      :columns="columns"
      :loading="loading"
      :show-add="true"
      :show-refresh="true"
      @add="router.push('/projects/create')"
      @refresh="loadProjects"
    >
      <template #name="{ row }">
        <el-button link @click="router.push(`/projects/${row.id}`)">
          {{ row.name }}
        </el-button>
      </template>

      <template #contacts="{ row }">
        {{ getContactsDisplay(row) }}
      </template>

      <template #ownerId="{ row }">
        {{ getUserDisplayName(row.ownerId) }}
      </template>

      <template #dealType="{ row }">
        {{ dealTypeLabelMap[row.dealType] || '-' }}
      </template>

      <template #stage="{ row }">
        <el-tag :type="getStageType(row.stage)">
          {{ stageLabelMap[row.stage] || row.stage }}
        </el-tag>
      </template>

      <template #actions="{ row }">
        <el-space>
          <el-button size="small" @click="changeStage(row)">改阶段</el-button>
          <el-button size="small" @click="changeOwner(row)">转负责人</el-button>
          <el-button size="small" type="danger" @click="deleteProject(row.id)">删除</el-button>
        </el-space>
      </template>
    </CrudTable>

    <el-dialog v-model="stageDialogVisible" title="修改项目阶段" width="400">
      <el-form>
        <el-form-item label="项目阶段">
          <el-select v-model="newStage">
            <el-option v-for="s in stageOptions" :key="s" :label="stageLabelMap[s]" :value="s" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="stageDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitStage">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="ownerDialogVisible" title="转移负责人" width="400">
      <el-form>
        <el-form-item label="新负责人">
          <el-select v-model="newOwnerId">
            <el-option v-for="u in users" :key="u.id" :label="u.name" :value="u.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="ownerDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitOwner">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '../../stores/auth'
import CrudTable from '../../components/common/CrudTable.vue'
import type { TableColumn } from '../../components/common/CrudTable.vue'
const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const projects = ref<any[]>([])
const users = ref<any[]>([])
const contacts = ref<any[]>([])

const stageDialogVisible = ref(false)
const ownerDialogVisible = ref(false)
const newStage = ref('')
const newOwnerId = ref('')
const currentProject = ref<any>(null)

const dealTypeLabelMap: Record<string, string> = {
  'RENT': '租赁',
  'PURCHASE': '购买',
  'RENT_OR_PURCHASE': '租购皆可'
}

const stageLabelMap: Record<string, string> = {
  'PROSPECTING': '约客',
  'VISITING': '带看',
  'NEGOTIATING': '谈判',
  'SIGNING': '签约',
  'COLLECTING': '回款',
  'MOVED_IN': '入驻'
}

const stageOptions = ['PROSPECTING', 'VISITING', 'NEGOTIATING', 'SIGNING', 'COLLECTING', 'MOVED_IN']

const columns: TableColumn[] = [
  { prop: 'name', label: '项目名称', width: 150, slot: 'name', fixed: 'left' },
  { prop: 'code', label: '项目编号', width: 150 },
  { prop: 'contacts', label: '联系人', width: 150, slot: 'contacts' },
  { prop: 'ownerId', label: '负责人', width: 120, slot: 'ownerId' },
  { prop: 'dealType', label: '租购类型', width: 120, slot: 'dealType' },
  { prop: 'source', label: '项目来源', width: 120 },
  { prop: 'intendedRegion', label: '意向区域', width: 120 },
  { prop: 'stage', label: '项目阶段', width: 100, slot: 'stage' }
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
  projects.value = await authStore.api<any[]>('/api/projects')
}

async function loadUsers() {
  users.value = await authStore.api<any[]>('/api/users')
}

async function loadContacts() {
  contacts.value = await authStore.api<any[]>('/api/contacts')
}

function getUserDisplayName(userId?: string): string {
  if (!userId) return '-'
  const user = users.value.find(u => u.id === userId)
  return user?.name || userId
}

function getContactsDisplay(project: any): string {
  const linkedContacts = contacts.value.filter(c =>
    project.contactIds?.includes(c.id) || project.contactId === c.id
  )
  return linkedContacts.map(c => c.name).join(', ') || '-'
}

function getStageType(stage: string): string {
  const map: Record<string, string> = {
    'PROSPECTING': 'info',
    'VISITING': 'primary',
    'NEGOTIATING': 'warning',
    'SIGNING': 'success',
    'COLLECTING': 'success',
    'MOVED_IN': 'success'
  }
  return map[stage] || 'info'
}

function changeStage(project: any) {
  currentProject.value = project
  newStage.value = project.stage
  stageDialogVisible.value = true
}

async function submitStage() {
  if (!currentProject.value) return
  try {
    await authStore.api(`/api/projects/${currentProject.value.id}/stage`, {
      method: 'PUT',
      body: JSON.stringify({ stage: newStage.value })
    })
    ElMessage.success('阶段已修改')
    await loadProjects()
    stageDialogVisible.value = false
  } catch (error: any) {
    ElMessage.error(error.message || '修改失败')
  }
}

function changeOwner(project: any) {
  currentProject.value = project
  newOwnerId.value = project.ownerId
  ownerDialogVisible.value = true
}

async function submitOwner() {
  if (!currentProject.value) return
  try {
    await authStore.api(`/api/projects/${currentProject.value.id}/owner`, {
      method: 'PUT',
      body: JSON.stringify({ ownerId: newOwnerId.value })
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
</script>
