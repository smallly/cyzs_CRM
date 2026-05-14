<template>
  <div class="payment-detail-page">
    <el-card class="detail-card" v-loading="loading">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-button class="back-icon-btn" link :icon="ArrowLeft" @click="handleBack" />
            <div class="header-title">{{ payment.code || payment.id || '-' }}</div>
          </div>
          <div class="header-actions">
            <el-button @click="handleEdit">编辑</el-button>
            <el-button type="danger" @click="handleDelete">删除</el-button>
          </div>
        </div>
      </template>

      <el-empty v-if="!loading && !payment.id" description="回款记录不存在" />
      <template v-else>
        <div class="section-title">回款信息</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="回款编号">{{ payment.code || '-' }}</el-descriptions-item>
          <el-descriptions-item label="回款日期">{{ formatDate(payment.paidDate) }}</el-descriptions-item>
          <el-descriptions-item label="回款金额(元)">{{ formatAmount(payment.amount) }}</el-descriptions-item>
          <el-descriptions-item label="付款方">{{ payment.payerName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="开票状态">
            <el-tag :type="getInvoiceStatusType(payment.invoiceStatus)">
              {{ getInvoiceStatusLabel(payment.invoiceStatus) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="所属合同">
            <el-button v-if="payment.contractId" link @click="goContract">
              {{ contractName }}
            </el-button>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="所属项目" :span="2">
            <el-button v-if="projectId" link @click="goProject">
              {{ projectName }}
            </el-button>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="回款凭证" :span="2">
            <div v-if="voucherItems.length" class="attachment-inline-list">
              <button
                v-for="(item, index) in voucherItems"
                :key="`${item.name}-${index}`"
                type="button"
                class="attachment-inline-chip"
                @click="handleVoucherPreview(item)"
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
          <el-descriptions-item label="备注" :span="2">
            <div class="multiline-text">{{ payment.remark || '-' }}</div>
          </el-descriptions-item>
        </el-descriptions>

        <div class="section-title">系统信息</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="创建人">{{ getUserDisplayName(payment.creatorId || payment.ownerId) }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(payment.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="ID">{{ payment.id || '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ payment.deleted ? '已删除' : '正常' }}</el-descriptions-item>
        </el-descriptions>
      </template>
    </el-card>

    <el-dialog v-model="voucherPreviewVisible" title="回款凭证预览" width="760px" destroy-on-close>
      <div class="attachment-preview-modal">
        <img
          v-if="voucherPreviewKind === 'image' && voucherPreviewSrc"
          class="attachment-preview-image"
          :src="voucherPreviewSrc"
          alt="回款凭证预览"
        />
        <iframe
          v-else-if="voucherPreviewKind === 'pdf' && voucherPreviewSrc"
          class="attachment-preview-frame"
          :src="voucherPreviewSrc"
        />
        <div v-else class="attachment-preview-empty">当前凭证没有可直接展示的预览内容</div>
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
import { downloadStoredAttachment, getStoredAttachmentData, getStoredAttachmentKind, getStoredAttachmentList } from '../../utils/attachment'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const payment = reactive<any>({})
const contracts = ref<any[]>([])
const projects = ref<any[]>([])
const users = ref<any[]>([])
const voucherPreviewVisible = ref(false)
const voucherPreviewSrc = ref('')
const voucherPreviewKind = ref<'image' | 'pdf' | 'other'>('other')

const paymentId = computed(() => String(route.params.id || ''))
const voucherItems = computed(() => getStoredAttachmentList(payment.voucher))
const contract = computed(() => contracts.value.find((item) => item.id === payment.contractId))
const projectId = computed(() => contract.value?.projectId || '')
const contractName = computed(() => {
  if (!payment.contractId) return '-'
  return contract.value?.contractNo || payment.contractId
})
const projectName = computed(() => {
  if (!projectId.value) return '-'
  const project = projects.value.find((item) => item.id === projectId.value)
  return project ? `${project.name || '-'} (${project.code || '-'})` : projectId.value
})

onMounted(async () => {
  await Promise.allSettled([loadContracts(), loadProjects(), loadUsers()])
  await loadPayment()
})

async function loadPayment() {
  if (!paymentId.value) return
  loading.value = true
  try {
    const data = await getPaymentDetail()
    Object.assign(payment, data)
  } catch (error: any) {
    ElMessage.error(error.message || '回款详情加载失败')
  } finally {
    loading.value = false
  }
}

async function getPaymentDetail() {
  try {
    return await authStore.api<any>(`/api/payments/${paymentId.value}`)
  } catch {
    const res = await authStore.api<PageResult<any> | any[]>('/api/payments')
    const row = normalizePageResult<any>(res).records.find((item) => item.id === paymentId.value)
    if (!row) throw new Error('回款记录不存在')
    return row
  }
}

async function loadContracts() {
  try {
    const res = await authStore.api<PageResult<any> | any[]>('/api/contracts')
    contracts.value = normalizePageResult<any>(res).records
  } catch {
    contracts.value = []
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

function getInvoiceStatusType(status?: string): 'warning' | 'success' | 'info' {
  const map: Record<string, 'warning' | 'success' | 'info'> = {
    UNISSUED: 'warning',
    ISSUED: 'success',
    NOT_REQUIRED: 'info'
  }
  return status ? (map[status] || 'info') : 'info'
}

function getInvoiceStatusLabel(status?: string): string {
  const map: Record<string, string> = {
    UNISSUED: '未开票',
    ISSUED: '已开票',
    NOT_REQUIRED: '无需开票'
  }
  return status ? (map[status] || status) : '-'
}

function handleVoucherPreview(item: { name: string; data: string }) {
  const raw = JSON.stringify(item)
  const kind = getStoredAttachmentKind(raw)
  const src = getStoredAttachmentData(raw)
  if (!src) {
    ElMessage.info(`当前凭证仅能查看名称：${item.name}`)
    return
  }
  if (kind === 'other') {
    downloadStoredAttachment(item)
    return
  }
  voucherPreviewKind.value = kind
  voucherPreviewSrc.value = src
  voucherPreviewVisible.value = true
}

function goContract() {
  if (!payment.contractId) return
  router.push(`/contracts/${payment.contractId}`)
}

function goProject() {
  if (!projectId.value) return
  router.push(`/projects/${projectId.value}`)
}

function handleEdit() {
  if (!paymentId.value) return
  router.push({ path: '/payments/create', query: { id: paymentId.value } })
}

async function handleDelete() {
  if (!paymentId.value) return
  try {
    await ElMessageBox.confirm('确定删除该回款记录吗？删除后不可恢复。', '确认删除', { type: 'warning' })
    await authStore.api(`/api/payments/${paymentId.value}`, { method: 'DELETE' })
    ElMessage.success('回款记录已删除')
    router.push('/payments')
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

function handleBack() {
  if (window.history.length > 1) {
    router.back()
    return
  }
  router.push('/payments')
}
</script>

<style scoped>
.payment-detail-page {
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

.multiline-text {
  white-space: pre-wrap;
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
