<template>
  <div class="contract-detail-page">
    <el-card class="detail-card" v-loading="loading">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-button class="back-icon-btn" link :icon="ArrowLeft" @click="handleBack" />
            <div class="header-title">{{ contract.title || '-' }}</div>
          </div>
          <div class="header-actions">
            <el-button @click="handleEdit">编辑</el-button>
            <el-button type="danger" @click="handleDelete">删除</el-button>
          </div>
        </div>
      </template>

      <el-empty v-if="!loading && !contract.id" description="合同不存在" />
      <template v-else>
        <div class="section-title">合同信息</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="所属项目">{{ projectName }}</el-descriptions-item>
          <el-descriptions-item label="合同标题">{{ contract.title || '-' }}</el-descriptions-item>
          <el-descriptions-item label="合同编号">{{ contract.contractNo || '-' }}</el-descriptions-item>
          <el-descriptions-item label="合同金额(元)">{{ formatAmount(contract.amount) }}</el-descriptions-item>
          <el-descriptions-item label="预计佣金(元)">{{ formatAmount(contract.estimatedCommission) }}</el-descriptions-item>
          <el-descriptions-item label="租赁开始日期">{{ formatDate(contract.leaseStartDate) }}</el-descriptions-item>
          <el-descriptions-item label="租赁结束日期">{{ formatDate(contract.leaseEndDate) }}</el-descriptions-item>
          <el-descriptions-item label="签约日期">{{ formatDate(contract.signDate) }}</el-descriptions-item>
          <el-descriptions-item label="租赁期限(月)">{{ contract.leaseTermMonths ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="付款方式" :span="2">{{ contract.paymentTerms || '-' }}</el-descriptions-item>
          <el-descriptions-item label="附件" :span="2">
            <div v-if="attachmentItems.length" class="attachment-inline-list">
              <button
                v-for="(item, index) in attachmentItems"
                :key="`${item.name}-${index}`"
                type="button"
                class="attachment-inline-chip"
                @click="handleAttachmentPreview(item)"
              >
                <span class="attachment-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                    <polyline points="13 2 13 9 20 9"/>
                  </svg>
                </span>
                <span class="attachment-name">{{ item.name }}</span>
              </button>
            </div>
            <span v-else>-</span>
          </el-descriptions-item>
        </el-descriptions>

        <div class="section-title">系统信息</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="创建人">{{ getUserDisplayName(contract.creatorId || contract.ownerId) }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(contract.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="最后编辑人">{{ getUserDisplayName(contract.updatedBy || contract.creatorId || contract.ownerId) }}</el-descriptions-item>
          <el-descriptions-item label="最后编辑时间">{{ formatDateTime(contract.updatedAt) }}</el-descriptions-item>
        </el-descriptions>
      </template>
    </el-card>

    <el-dialog v-model="attachmentPreviewVisible" :title="attachmentPreviewTitle" width="760px" destroy-on-close>
      <div class="attachment-preview-modal">
        <img
          v-if="attachmentPreviewKind === 'image' && attachmentPreviewSrc"
          class="attachment-preview-image"
          :src="attachmentPreviewSrc"
          :alt="attachmentPreviewTitle"
        />
        <iframe
          v-else-if="attachmentPreviewKind === 'pdf' && attachmentPreviewSrc"
          class="attachment-preview-frame"
          :src="attachmentPreviewSrc"
        />
        <div v-else class="attachment-preview-empty">
          当前附件没有可直接展示的预览内容
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '../../stores/auth'
import { normalizePageResult, type PageResult } from '../../api/page'
import { downloadStoredAttachment, getStoredAttachmentData, getStoredAttachmentKind, getStoredAttachmentList, openInNewTab } from '../../utils/attachment'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const contract = reactive<any>({})
const projects = ref<any[]>([])
const users = ref<any[]>([])
const attachmentPreviewVisible = ref(false)
const attachmentPreviewSrc = ref('')
const attachmentPreviewKind = ref<'image' | 'pdf' | 'other'>('other')

const contractId = computed(() => String(route.params.id || ''))
const attachmentItems = computed(() => getStoredAttachmentList(contract.attachment))
const attachmentPreviewTitle = computed(() => '附件预览')
const projectName = computed(() => {
  if (!contract.projectId) return '-'
  const project = projects.value.find((p) => p.id === contract.projectId)
  return project?.name || contract.projectId
})

onMounted(async () => {
  await Promise.allSettled([loadUsers(), loadProjects()])
  await loadContract()
})

async function loadContract() {
  if (!contractId.value) return
  loading.value = true
  try {
    let row: any = null
    try {
      row = await authStore.api<any>(`/api/contracts/${contractId.value}`)
    } catch {
      const res = await authStore.api<PageResult<any> | any[]>('/api/contracts')
      const records = normalizePageResult<any>(res).records
      row = records.find((item) => item.id === contractId.value) || null
    }
    if (!row?.id) {
      ElMessage.warning('合同不存在')
      return
    }
    Object.assign(contract, row)
  } catch (error: any) {
    ElMessage.error(error.message || '合同详情加载失败')
  } finally {
    loading.value = false
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

function formatAmount(value?: number | string | null): string {
  if (value === null || value === undefined || value === '') return '-'
  const num = Number(value)
  return Number.isFinite(num) ? String(num) : String(value)
}

function formatDate(value?: string | null): string {
  if (!value) return '-'
  const text = String(value)
  return text.includes('T') ? text.split('T')[0] : text
}

function formatDateTime(value?: string | null): string {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('zh-CN')
  } catch {
    return String(value)
  }
}

function handleBack() {
  router.back()
}

function handleEdit() {
  if (!contractId.value) return
  router.push({ path: '/contracts/create', query: { id: contractId.value, from: 'detail' } })
}

function handleAttachmentPreview(item: { name: string; data: string }) {
  const raw = JSON.stringify(item)
  const kind = getStoredAttachmentKind(raw)
  const src = getStoredAttachmentData(raw)
  if (!src) {
    ElMessage.info(`当前附件仅能查看名称：${item.name}`)
    return
  }
  if (kind === 'other') {
    downloadStoredAttachment(item)
    return
  }
  if (kind === 'pdf') {
    openInNewTab(src)
    return
  }
  attachmentPreviewKind.value = kind
  attachmentPreviewSrc.value = src
  attachmentPreviewVisible.value = true
}

async function handleDelete() {
  if (!contractId.value) return
  try {
    await ElMessageBox.confirm(`确认删除合同「${contract.title || contract.contractNo || contractId.value}」吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await authStore.api(`/api/contracts/${contractId.value}`, { method: 'DELETE' })
    ElMessage.success('合同已删除')
    router.push('/contracts')
  } catch (error: any) {
    if (error === 'cancel' || error === 'close') return
    ElMessage.error(error.message || '删除失败')
  }
}
</script>

<style scoped>
.contract-detail-page {
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

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-title {
  font-size: 20px;
  font-weight: 700;
  color: #1f2d3d;
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

.detail-card :deep(.el-descriptions__table) {
  table-layout: fixed;
  width: 100%;
}

.detail-card :deep(.el-descriptions__label) {
  width: 120px;
  min-width: 120px;
  white-space: normal;
  word-break: break-word;
}

.detail-card :deep(.el-descriptions__content) {
  min-width: 0;
  word-break: break-word;
}

.attachment-inline-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attachment-inline-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  color: #3b82f6;
  cursor: pointer;
}

.attachment-inline-chip .attachment-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: #94a3b8;
}

.attachment-inline-chip .attachment-icon svg {
  width: 100%;
  height: 100%;
}

.attachment-inline-chip .attachment-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-preview-modal {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 360px;
  background: #f8fafc;
  border-radius: 12px;
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
