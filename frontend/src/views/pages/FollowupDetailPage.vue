<template>
  <div class="followup-detail-page">
    <el-card class="detail-card" v-loading="loading">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-button class="back-icon-btn" link :icon="ArrowLeft" @click="handleBack" />
            <div>
              <div class="header-title">{{ followup.code || followup.id || '-' }}</div>
              <div class="header-subtitle">{{ projectName }}</div>
            </div>
          </div>
        </div>
      </template>

      <el-empty v-if="!loading && !followup.id" description="跟进记录不存在" />
      <template v-else>
        <div class="section-title">跟进信息</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="跟进编号">{{ followup.code || '-' }}</el-descriptions-item>
          <el-descriptions-item label="跟进时间">{{ formatDateTime(followup.followupAt) }}</el-descriptions-item>
          <el-descriptions-item label="跟进方式">{{ followup.method || '-' }}</el-descriptions-item>
          <el-descriptions-item label="关联联系人">
            <el-button v-if="followup.contactId" link @click="goContact">
              {{ contactName }}
            </el-button>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="关联项目" :span="2">
            <el-button v-if="followup.projectId" link @click="goProject">
              {{ projectName }}
            </el-button>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="跟进内容" :span="2">
            <div class="multiline-text">{{ followup.content || '-' }}</div>
          </el-descriptions-item>
          <el-descriptions-item label="附件" :span="2">
            <div v-if="attachmentItems.length" class="attachment-inline-list">
              <button
                v-for="(item, index) in attachmentItems"
                :key="`${item.name}-${index}`"
                type="button"
                class="attachment-inline-chip"
                @click="handleAttachmentPreview(item)"
              >
                {{ item.name }}
              </button>
            </div>
            <span v-else>-</span>
          </el-descriptions-item>
        </el-descriptions>

        <div class="section-title">系统信息</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="ID">{{ followup.id || '-' }}</el-descriptions-item>
          <el-descriptions-item label="创建人">{{ getUserDisplayName(followup.creatorId || followup.ownerId) }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(followup.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ followup.deleted ? '已删除' : '正常' }}</el-descriptions-item>
        </el-descriptions>
      </template>
    </el-card>

    <el-dialog v-model="attachmentPreviewVisible" title="附件预览" width="760px" destroy-on-close>
      <div class="attachment-preview-modal">
        <img
          v-if="attachmentPreviewKind === 'image' && attachmentPreviewSrc"
          class="attachment-preview-image"
          :src="attachmentPreviewSrc"
          alt="附件预览"
        />
        <iframe
          v-else-if="attachmentPreviewKind === 'pdf' && attachmentPreviewSrc"
          class="attachment-preview-frame"
          :src="attachmentPreviewSrc"
        />
        <div v-else class="attachment-preview-empty">当前附件没有可直接展示的预览内容</div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../stores/auth'
import { normalizePageResult, type PageResult } from '../../api/page'
import { getStoredAttachmentData, getStoredAttachmentKind, getStoredAttachmentList } from '../../utils/attachment'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const followup = reactive<any>({})
const projects = ref<any[]>([])
const contacts = ref<any[]>([])
const users = ref<any[]>([])
const attachmentPreviewVisible = ref(false)
const attachmentPreviewSrc = ref('')
const attachmentPreviewKind = ref<'image' | 'pdf' | 'other'>('other')

const followupId = computed(() => String(route.params.id || ''))
const attachmentItems = computed(() => getStoredAttachmentList(followup.attachment))
const projectName = computed(() => {
  if (!followup.projectId) return '-'
  const project = projects.value.find((p) => p.id === followup.projectId)
  return project ? `${project.name || '-'} (${project.code || '-'})` : followup.projectId
})
const contactName = computed(() => {
  if (!followup.contactId) return '-'
  const contact = contacts.value.find((c) => c.id === followup.contactId)
  return contact ? `${contact.name || '-'} (${contact.phone1 || '-'})` : followup.contactId
})

onMounted(async () => {
  await Promise.allSettled([loadProjects(), loadContacts(), loadUsers()])
  await loadFollowup()
})

async function loadFollowup() {
  if (!followupId.value) return
  loading.value = true
  try {
    const data = await getFollowupDetail()
    Object.assign(followup, data)
  } catch (error: any) {
    ElMessage.error(error.message || '跟进详情加载失败')
  } finally {
    loading.value = false
  }
}

async function getFollowupDetail() {
  try {
    return await authStore.api<any>(`/api/followups/${followupId.value}`)
  } catch {
    const res = await authStore.api<PageResult<any> | any[]>('/api/followups')
    const row = normalizePageResult<any>(res).records.find((item) => item.id === followupId.value)
    if (!row) throw new Error('跟进记录不存在')
    return row
  }
}

async function loadProjects() {
  try {
    const res = await authStore.api<PageResult<any> | any[]>('/api/projects')
    projects.value = normalizePageResult<any>(res).records
  } catch {
    projects.value = []
  }
}

async function loadContacts() {
  try {
    const res = await authStore.api<PageResult<any> | any[]>('/api/contacts')
    contacts.value = normalizePageResult<any>(res).records
  } catch {
    contacts.value = []
  }
}

async function loadUsers() {
  try {
    const res = await authStore.api<PageResult<any> | any[]>('/api/users')
    users.value = normalizePageResult<any>(res).records
  } catch {
    users.value = []
  }
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
    return String(value)
  }
}

function handleAttachmentPreview(item: { name: string; data: string }) {
  const raw = JSON.stringify(item)
  const kind = getStoredAttachmentKind(raw)
  const src = getStoredAttachmentData(raw)
  if (!src || kind === 'other') {
    ElMessage.info(`当前附件仅能查看名称：${item.name}`)
    return
  }
  attachmentPreviewKind.value = kind
  attachmentPreviewSrc.value = src
  attachmentPreviewVisible.value = true
}

function goProject() {
  if (!followup.projectId) return
  router.push(`/projects/${followup.projectId}`)
}

function goContact() {
  if (!followup.contactId) return
  router.push(`/contacts/${followup.contactId}`)
}

function handleBack() {
  if (window.history.length > 1) {
    router.back()
    return
  }
  router.push('/followups')
}
</script>

<style scoped>
.followup-detail-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-card {
  border-radius: 8px;
  overflow: visible;
}

.detail-card :deep(.el-card__header) {
  position: sticky;
  top: 12px;
  z-index: 30;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
}

.card-header,
.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-header {
  justify-content: space-between;
}

.header-title {
  font-size: 20px;
  font-weight: 700;
  color: #1f2d3d;
}

.header-subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: #64748b;
}

.section-title {
  margin: 24px 0 12px;
  font-size: 15px;
  font-weight: 700;
  color: #1f2d3d;
}

.section-title:first-child {
  margin-top: 0;
}

.multiline-text {
  white-space: pre-wrap;
  word-break: break-word;
}

.attachment-inline-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.attachment-inline-chip {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  color: #3b82f6;
  cursor: pointer;
}

.attachment-preview-modal {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 360px;
  background: #f8fafc;
  border-radius: 8px;
  overflow: hidden;
}

.attachment-preview-image {
  max-width: 100%;
  max-height: 72vh;
  object-fit: contain;
}

.attachment-preview-frame {
  width: 100%;
  height: 72vh;
  border: none;
}

.attachment-preview-empty {
  padding: 32px;
  color: #64748b;
}
</style>
