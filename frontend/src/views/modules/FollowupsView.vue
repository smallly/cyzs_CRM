<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>跟进记录</span>
        <el-space>
          <el-select v-model="filterProjectId" clearable placeholder="按项目筛选" style="width: 260px" @change="loadFollowups">
            <el-option v-for="project in projects" :key="project.id" :label="`${project.name} (${project.code})`" :value="project.id" />
          </el-select>
          <el-button @click="loadFollowups">刷新</el-button>
        </el-space>
      </div>
    </template>

    <el-table :data="followups" v-loading="loading" border stripe>
      <el-table-column prop="code" label="跟进编号" width="150" />
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
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()

const loading = ref(false)
const filterProjectId = ref('')
const followups = ref<any[]>([])
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
  const query = filterProjectId.value ? `?projectId=${encodeURIComponent(filterProjectId.value)}` : ''
  followups.value = await authStore.api<any[]>(`/api/followups${query}`)
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
</style>
