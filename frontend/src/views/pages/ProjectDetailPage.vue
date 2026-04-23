<template>
  <div>
    <!-- 项目Hero区域 + 阶段进度条 -->
    <el-card class="project-hero-card">
      <div class="project-hero-top">
        <div class="project-hero-left">
          <div class="project-avatar">{{ getProjectAvatarText(project?.name) }}</div>
          <div class="project-hero-main">
            <div class="project-title-row">
              <h2 class="project-title">{{ project?.name || "-" }}</h2>
              <el-tag :type="getStageType(project?.stage)" size="large">
                {{ getStageLabel(project?.stage) }}
              </el-tag>
            </div>
            <div class="project-meta-row">
              <span class="project-meta-item">
                <span class="meta-label">项目编号：</span>
                <span class="meta-value">{{ project?.code || "-" }}</span>
              </span>
            </div>
          </div>
        </div>
        <div class="project-hero-actions">
          <el-button @click="openStageUpdateDialog">更新阶段</el-button>
          <el-button @click="openProjectEdit">编辑</el-button>
          <el-button @click="openOwnerTransferDialog">更换负责人</el-button>
        </div>
      </div>

      <!-- 阶段进度条 -->
      <div class="project-stage-progress">
        <div class="stage-progress">
          <div class="stage-progress-item" v-for="(stageCode, idx) in stageOptions" :key="stageCode">
            <div class="stage-head">
              <div class="stage-dot" :class="{ done: idx <= projectStageCurrentIndex, current: idx === projectStageCurrentIndex }"></div>
              <div class="stage-text" :class="{ done: idx <= projectStageCurrentIndex, current: idx === projectStageCurrentIndex }">
                {{ stageLabelMap[stageCode] }}
              </div>
              <div v-if="idx < stageOptions.length - 1" class="stage-line" :class="{ done: idx < projectStageCurrentIndex }"></div>
            </div>
            <div class="stage-field-item">
              <div class="stage-field-label">{{ getStageFieldLabel(stageCode) }}</div>
              <div class="stage-field-value">{{ getStageFieldValue(stageCode) }}</div>
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 基本信息卡片 -->
    <el-card class="project-base-card">
      <template #header>
        <div class="card-header">
          <span>基本信息</span>
        </div>
      </template>
      <div class="project-base-grid">
        <div class="project-base-item">
          <span class="base-label">项目负责人</span>
          <span class="base-value">{{ getUserDisplayName(project?.ownerId) }}</span>
        </div>
        <div class="project-base-item">
          <span class="base-label">项目级别</span>
          <span class="base-value">{{ project?.level || "-" }}</span>
        </div>
        <div class="project-base-item">
          <span class="base-label">租购类型</span>
          <span class="base-value">{{ project?.dealType ? dealTypeLabelMap[project.dealType] : "-" }}</span>
        </div>
        <div class="project-base-item">
          <span class="base-label">意向区域</span>
          <span class="base-value">{{ project?.intendedRegion || "-" }}</span>
        </div>
        <div class="project-base-item">
          <span class="base-label">意向面积区间(㎡)</span>
          <span class="base-value">{{ formatAreaRange(project) }}</span>
        </div>
        <div class="project-base-item">
          <span class="base-label">项目来源</span>
          <span class="base-value">{{ project?.source || "-" }}</span>
        </div>
        <div class="project-base-item">
          <span class="base-label">备注</span>
          <span class="base-value">{{ project?.remark || "-" }}</span>
        </div>
        <div class="project-base-item">
          <span class="base-label">最后跟进时间</span>
          <span class="base-value">{{ formatDateTime(project?.lastFollowupAt) }}</span>
        </div>
      </div>
    </el-card>

    <!-- Tabs详情卡片 -->
    <el-card>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="联系人" name="contact">
          <div class="detail-list-toolbar">
            <span class="detail-list-title">联系人({{ contacts.length }})</span>
            <el-button size="small" @click="$router.push('/contacts')">新建联系人</el-button>
          </div>
          <el-table :data="contacts" v-if="contacts.length" border stripe size="small">
            <el-table-column label="姓名" width="150">
              <template #default="{ row }">
                <el-button link @click="goContact(row.id)">
                  {{ row.name || '-' }}
                </el-button>
              </template>
            </el-table-column>
            <el-table-column prop="phone1" label="手机号1" width="130" />
            <el-table-column prop="phone2" label="手机号2" width="130" />
            <el-table-column prop="id" label="联系人ID" width="180" />
          </el-table>
          <el-empty v-else description="当前项目未关联联系人" />
        </el-tab-pane>

        <el-tab-pane label="跟进记录" name="followups">
          <div class="detail-list-toolbar">
            <span class="detail-list-title">跟进记录({{ followups.length }})</span>
            <el-button size="small" @click="openFollowupDrawer">新增跟进</el-button>
          </div>
          <div class="followup-feed" v-if="followups.length">
            <el-card v-for="f in followups" :key="f.id" class="followup-card" shadow="never">
              <div class="followup-card-head">
                <el-avatar :size="40">{{ getUserAvatarText(f.creatorId || f.ownerId) }}</el-avatar>
                <div class="followup-head-main">
                  <div class="followup-user">{{ getUserDisplayName(f.creatorId || f.ownerId) }}</div>
                  <div class="followup-time">{{ formatDateTime(f.createdAt || f.followupAt) }}</div>
                </div>
                <el-space>
                  <el-button size="small" @click="editFollowup(f)">编辑</el-button>
                  <el-button size="small" type="danger" @click="deleteFollowup(f)">删除</el-button>
                </el-space>
              </div>
              <div class="followup-body">{{ f.content || '-' }}</div>
              <div class="followup-foot">
                <span>跟进时间：{{ formatDate(f.followupAt) }}</span>
                <span>跟进方式：{{ f.method || '-' }}</span>
                <span>关联联系人：{{ getContactDisplayName(f.contactId) }}</span>
              </div>
            </el-card>
          </div>
          <el-empty v-else description="暂无跟进记录" />
        </el-tab-pane>

        <el-tab-pane label="合同" name="contracts">
          <div class="detail-list-toolbar">
            <span class="detail-list-title">合同({{ contracts.length }})</span>
            <el-button size="small" @click="$router.push('/contracts')">新增合同</el-button>
          </div>
          <el-table :data="contracts" v-if="contracts.length" border stripe size="small">
            <el-table-column prop="contractNo" label="合同编号" width="150" />
            <el-table-column prop="title" label="合同标题" width="200" />
            <el-table-column prop="signDate" label="签约日期" width="120" />
            <el-table-column prop="amount" label="合同金额(元)" width="120" />
            <el-table-column label="创建人" width="120">
              <template #default="{ row }">
                {{ getUserDisplayName(row.creatorId || row.ownerId) }}
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建时间" width="180">
              <template #default="{ row }">
                {{ formatDateTime(row.createdAt) }}
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-else description="暂无合同" />
        </el-tab-pane>

        <el-tab-pane label="回款" name="payments">
          <div class="detail-list-toolbar">
            <span class="detail-list-title">回款({{ payments.length }})</span>
            <el-button size="small" @click="$router.push('/payments')">登记回款</el-button>
          </div>
          <el-table :data="payments" v-if="payments.length" border stripe size="small">
            <el-table-column prop="code" label="回款编号" width="150" />
            <el-table-column label="关联合同" width="200">
              <template #default="{ row }">
                {{ getContractDisplayName(row.contractId) }}
              </template>
            </el-table-column>
            <el-table-column prop="paidDate" label="回款日期" width="120" />
            <el-table-column prop="amount" label="回款金额(元)" width="120" />
            <el-table-column label="开票状态" width="120">
              <template #default="{ row }">
                <el-tag :type="getInvoiceStatusType(row.invoiceStatus)" size="small">
                  {{ invoiceStatusLabelMap[row.invoiceStatus] || row.invoiceStatus }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="创建人" width="120">
              <template #default="{ row }">
                {{ getUserDisplayName(row.creatorId || row.ownerId) }}
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-else description="暂无回款" />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 更新阶段Dialog -->
    <el-dialog v-model="stageDialogVisible" title="更新阶段" width="600">
      <el-form :model="stageForm" label-width="120px">
        <el-form-item label="更新阶段至" required>
          <el-select v-model="stageForm.stage" @change="onStageChange">
            <el-option v-for="s in stageOptions" :key="s" :label="stageLabelMap[s]" :value="s" />
          </el-select>
        </el-form-item>

        <!-- 签约阶段表单 -->
        <template v-if="stageForm.stage === 'SIGNING'">
          <el-alert type="info" :closable="false" style="margin-bottom: 16px">
            已选择"签约"，请填写合同信息，保存后将自动更新为签约阶段。
          </el-alert>
          <el-form-item label="合同编号" required>
            <el-input v-model="contractForm.contractNo" placeholder="请输入合同编号" />
          </el-form-item>
          <el-form-item label="合同标题" required>
            <el-input v-model="contractForm.title" placeholder="请输入合同标题" />
          </el-form-item>
          <el-form-item label="合同金额(元)" required>
            <el-input-number v-model="contractForm.amount" :min="0" />
          </el-form-item>
          <el-form-item label="签约日期" required>
            <el-date-picker v-model="contractForm.signDate" type="date" value-format="YYYY-MM-DD" />
          </el-form-item>
          <el-form-item label="合同附件" required>
            <el-input v-model="contractForm.attachment" placeholder="请输入附件名称或URL" />
          </el-form-item>
        </template>

        <!-- 回款阶段表单 -->
        <template v-if="stageForm.stage === 'COLLECTING'">
          <el-alert type="info" :closable="false" style="margin-bottom: 16px">
            已选择"回款"，请填写回款信息，保存后将自动更新为回款阶段。
          </el-alert>
          <el-form-item label="关联合同" required>
            <el-select v-model="paymentForm.contractId">
              <el-option v-for="c in contracts" :key="c.id" :label="c.contractNo" :value="c.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="回款日期" required>
            <el-date-picker v-model="paymentForm.paidDate" type="date" value-format="YYYY-MM-DD" />
          </el-form-item>
          <el-form-item label="回款金额(元)" required>
            <el-input-number v-model="paymentForm.amount" :min="0" />
          </el-form-item>
          <el-form-item label="开票状态">
            <el-select v-model="paymentForm.invoiceStatus">
              <el-option label="未开票" value="UNISSUED" />
              <el-option label="已开票" value="ISSUED" />
              <el-option label="无需开票" value="NOT_REQUIRED" />
            </el-select>
          </el-form-item>
        </template>

        <!-- 其他阶段字段 -->
        <el-form-item v-if="stageForm.stage === 'PROSPECTING'" label="首次建联时间" required>
          <el-date-picker v-model="stageForm.firstContactAt" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item v-if="stageForm.stage === 'VISITING'" label="首次带看日期" required>
          <el-date-picker v-model="stageForm.firstVisitDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item v-if="stageForm.stage === 'NEGOTIATING'" label="首次谈判日期" required>
          <el-date-picker v-model="stageForm.firstNegotiationDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item v-if="stageForm.stage === 'MOVED_IN'" label="入驻日期" required>
          <el-date-picker v-model="stageForm.movedInDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="stageDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitStageUpdate" :loading="submitting">保存</el-button>
      </template>
    </el-dialog>

    <!-- 更换负责人Dialog -->
    <el-dialog v-model="ownerDialogVisible" title="更换负责人" width="400">
      <el-form :model="ownerForm" label-width="100px">
        <el-form-item label="新负责人" required>
          <el-select v-model="ownerForm.ownerId">
            <el-option v-for="u in users" :key="u.id" :label="u.name" :value="u.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="ownerForm.remark" placeholder="可填写更换原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="ownerDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitOwnerTransfer" :loading="submitting">保存</el-button>
      </template>
    </el-dialog>

    <!-- 项目编辑Dialog -->
    <el-dialog v-model="projectEditDialogVisible" title="编辑项目" width="680">
      <el-form :model="projectEditForm" label-width="110px">
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="项目名称" required>
              <el-input v-model="projectEditForm.name" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="租购类型">
              <el-select v-model="projectEditForm.dealType">
                <el-option label="租赁" value="RENT" />
                <el-option label="购买" value="PURCHASE" />
                <el-option label="租购皆可" value="RENT_OR_PURCHASE" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="项目级别">
              <el-input v-model="projectEditForm.level" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="项目来源">
              <el-input v-model="projectEditForm.source" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="意向区域">
              <el-input v-model="projectEditForm.intendedRegion" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="面积最小">
              <el-input-number v-model="projectEditForm.intendedAreaMin" :min="0" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="面积最大">
              <el-input-number v-model="projectEditForm.intendedAreaMax" :min="0" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="projectEditForm.remark" type="textarea" :rows="4" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="projectEditDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitProjectEdit" :loading="submitting">保存</el-button>
      </template>
    </el-dialog>

    <!-- 新增跟进Drawer -->
    <el-drawer v-model="followupDrawerVisible" :title="editingFollowupId ? '编辑跟进' : '新增跟进'" size="50%">
      <el-form :model="followupForm" label-width="100px">
        <el-form-item label="关联项目">
          <el-input :value="project?.name" disabled />
        </el-form-item>
        <el-form-item label="跟进时间" required>
          <el-date-picker v-model="followupForm.followupAt" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="跟进方式">
          <el-select v-model="followupForm.method">
            <el-option v-for="m in followupMethodOptions" :key="m" :label="m" :value="m" />
          </el-select>
        </el-form-item>
        <el-form-item label="关联联系人">
          <el-select v-model="followupForm.contactId">
            <el-option v-for="c in contacts" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="跟进内容" required>
          <el-input v-model="followupForm.content" type="textarea" :rows="5" placeholder="请输入跟进内容" />
        </el-form-item>
        <el-form-item label="附件">
          <el-input v-model="followupForm.attachment" placeholder="请输入附件名称或URL" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="followupDrawerVisible = false">取消</el-button>
        <el-button type="primary" @click="submitFollowup" :loading="submitting">{{ editingFollowupId ? '更新' : '保存' }}</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const projectId = ref(route.params.id as string)
const project = ref<any>(null)
const users = ref<any[]>([])
const contacts = ref<any[]>([])
const followups = ref<any[]>([])
const contracts = ref<any[]>([])
const payments = ref<any[]>([])

const loading = ref(false)
const submitting = ref(false)
const activeTab = ref('contact')

const stageDialogVisible = ref(false)
const ownerDialogVisible = ref(false)
const followupDrawerVisible = ref(false)
const projectEditDialogVisible = ref(false)
const editingFollowupId = ref('')

const stageOptions = ['PROSPECTING', 'VISITING', 'NEGOTIATING', 'SIGNING', 'COLLECTING', 'MOVED_IN']
const stageLabelMap: Record<string, string> = {
  PROSPECTING: '约客',
  VISITING: '带看',
  NEGOTIATING: '谈判',
  SIGNING: '签约',
  COLLECTING: '回款',
  MOVED_IN: '入驻'
}
const dealTypeLabelMap: Record<string, string> = {
  RENT: '租赁',
  PURCHASE: '购买',
  BOTH: '可租可买'
}
const invoiceStatusLabelMap: Record<string, string> = {
  UNISSUED: '未开票',
  ISSUED: '已开票',
  NOT_REQUIRED: '无需开票'
}
const followupMethodOptions = ['电话', '微信', '面谈', '邮件', '其他']

const stageForm = reactive({
  stage: '',
  firstContactAt: '',
  firstVisitDate: '',
  firstNegotiationDate: '',
  movedInDate: ''
})

const contractForm = reactive({
  contractNo: '',
  title: '',
  amount: 0,
  signDate: '',
  attachment: ''
})

const paymentForm = reactive({
  contractId: '',
  paidDate: '',
  amount: 0,
  invoiceStatus: 'UNISSUED'
})

const ownerForm = reactive({
  ownerId: '',
  remark: ''
})

const followupForm = reactive({
  followupAt: new Date().toISOString().split('T')[0],
  method: '',
  contactId: '',
  content: '',
  attachment: ''
})

const projectEditForm = reactive({
  name: '',
  dealType: 'RENT',
  level: '',
  source: '',
  intendedRegion: '',
  intendedAreaMin: undefined as number | undefined,
  intendedAreaMax: undefined as number | undefined,
  remark: ''
})

const projectStageCurrentIndex = computed(() => {
  if (!project.value?.stage) return 0
  return stageOptions.indexOf(project.value.stage)
})

onMounted(async () => {
  await loadAll()
})

async function loadAll() {
  loading.value = true
  try {
    await Promise.all([
      loadProject(),
      loadUsers(),
      loadContacts(),
      loadFollowups(),
      loadContracts(),
      loadPayments()
    ])
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function loadProject() {
  project.value = await authStore.api<any>(`/api/projects/${projectId.value}`)
}

async function loadUsers() {
  users.value = await authStore.api<any[]>('/api/users')
}

async function loadContacts() {
  const allContacts = await authStore.api<any[]>('/api/contacts')
  contacts.value = allContacts.filter(c => project.value?.contactIds?.includes(c.id) || project.value?.contactId === c.id)
}

async function loadFollowups() {
  const allFollowups = await authStore.api<any[]>(`/api/followups?projectId=${projectId.value}`)
  followups.value = allFollowups
}

async function loadContracts() {
  const allContracts = await authStore.api<any[]>('/api/contracts')
  contracts.value = allContracts.filter(c => c.projectId === projectId.value)
}

async function loadPayments() {
  const allPayments = await authStore.api<any[]>('/api/payments')
  payments.value = allPayments.filter(p => contracts.value.some(c => c.id === p.contractId))
}

function getProjectAvatarText(name?: string): string {
  if (!name) return 'P'
  return name.charAt(0).toUpperCase()
}

function getUserAvatarText(userId?: string): string {
  const user = users.value.find(u => u.id === userId)
  return user?.name?.charAt(0).toUpperCase() || 'U'
}

function getUserDisplayName(userId?: string): string {
  if (!userId) return '-'
  const user = users.value.find(u => u.id === userId)
  return user?.name || userId
}

function getContactDisplayName(contactId?: string): string {
  if (!contactId) return '-'
  const contact = contacts.value.find(c => c.id === contactId)
  return contact?.name || contactId
}

function getContractDisplayName(contractId?: string): string {
  if (!contractId) return '-'
  const contract = contracts.value.find(c => c.id === contractId)
  return contract?.contractNo || contractId
}

function getStageLabel(stage?: string): string {
  return stageLabelMap[stage || 'PROSPECTING'] || '-'
}

function getStageType(stage?: string): string {
  const map: Record<string, string> = {
    PROSPECTING: 'info',
    VISITING: 'primary',
    NEGOTIATING: 'warning',
    SIGNING: 'success',
    COLLECTING: 'success',
    MOVED_IN: 'success'
  }
  return map[stage || 'PROSPECTING'] || 'info'
}

function getInvoiceStatusType(status?: string): string {
  const map: Record<string, string> = {
    UNISSUED: 'warning',
    ISSUED: 'success',
    NOT_REQUIRED: 'info'
  }
  return map[status || 'UNISSUED'] || 'info'
}

function getStageFieldLabel(stageCode: string): string {
  const map: Record<string, string> = {
    PROSPECTING: '首次建联',
    VISITING: '首次带看',
    NEGOTIATING: '首次谈判',
    SIGNING: '签约日期',
    COLLECTING: '回款日期',
    MOVED_IN: '入驻日期'
  }
  return map[stageCode] || '-'
}

function getStageFieldValue(stageCode: string): string {
  if (!project.value) return '-'
  const map: Record<string, any> = {
    PROSPECTING: project.value.firstContactAt,
    VISITING: project.value.firstVisitDate,
    NEGOTIATING: project.value.firstNegotiationDate,
    SIGNING: contracts.value[0]?.signDate,
    COLLECTING: payments.value[0]?.paidDate,
    MOVED_IN: project.value.movedInDate
  }
  return formatDate(map[stageCode])
}

function formatAreaRange(proj?: any): string {
  if (!proj) return '-'
  if (proj.intendedAreaMin && proj.intendedAreaMax) {
    return `${proj.intendedAreaMin} ~ ${proj.intendedAreaMax}`
  }
  if (proj.intendedAreaMin) return `${proj.intendedAreaMin}+`
  if (proj.intendedAreaMax) return `≤${proj.intendedAreaMax}`
  return proj.intendedArea || '-'
}

function formatDate(value?: string | null): string {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleDateString('zh-CN')
  } catch {
    return value
  }
}

function formatDateTime(value?: string | null): string {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('zh-CN')
  } catch {
    return value
  }
}

function openStageUpdateDialog() {
  stageForm.stage = project.value?.stage || 'PROSPECTING'
  stageForm.firstContactAt = project.value?.firstContactAt || ''
  stageForm.firstVisitDate = project.value?.firstVisitDate || ''
  stageForm.firstNegotiationDate = project.value?.firstNegotiationDate || ''
  stageForm.movedInDate = project.value?.movedInDate || ''
  contractForm.contractNo = ''
  contractForm.title = ''
  contractForm.amount = 0
  contractForm.signDate = ''
  contractForm.attachment = ''
  paymentForm.contractId = ''
  paymentForm.paidDate = ''
  paymentForm.amount = 0
  paymentForm.invoiceStatus = 'UNISSUED'
  stageDialogVisible.value = true
}

function onStageChange() {
  // Reset forms when stage changes
  if (stageForm.stage !== 'SIGNING') {
    contractForm.contractNo = ''
    contractForm.title = ''
    contractForm.amount = 0
    contractForm.signDate = ''
  }
  if (stageForm.stage !== 'COLLECTING') {
    paymentForm.contractId = ''
    paymentForm.paidDate = ''
    paymentForm.amount = 0
    paymentForm.invoiceStatus = 'UNISSUED'
  }
}

async function submitStageUpdate() {
  submitting.value = true
  try {
    // 签约阶段：先创建合同，再更新阶段
    if (stageForm.stage === 'SIGNING') {
      if (!contractForm.contractNo || !contractForm.title || !contractForm.signDate || !contractForm.attachment) {
        ElMessage.warning('请完整填写签约表单（含合同附件）')
        return
      }
      await authStore.api('/api/contracts', {
        method: 'POST',
        body: JSON.stringify({
          projectId: projectId.value,
          ...contractForm
        })
      })
      await authStore.api(`/api/projects/${projectId.value}/stage`, {
        method: 'PUT',
        body: JSON.stringify({ stage: 'SIGNING' })
      })
      ElMessage.success('合同已创建，项目阶段已更新为签约')
    }
    // 回款阶段：先创建回款，再更新阶段
    else if (stageForm.stage === 'COLLECTING') {
      if (!paymentForm.contractId || !paymentForm.paidDate || !paymentForm.amount) {
        ElMessage.warning('请完整填写回款表单')
        return
      }
      await authStore.api('/api/payments', {
        method: 'POST',
        body: JSON.stringify(paymentForm)
      })
      await authStore.api(`/api/projects/${projectId.value}/stage`, {
        method: 'PUT',
        body: JSON.stringify({ stage: 'COLLECTING' })
      })
      ElMessage.success('回款已登记，项目阶段已更新为回款')
    }
    // 其他阶段：直接更新阶段
    else {
      await authStore.api(`/api/projects/${projectId.value}/stage`, {
        method: 'PUT',
        body: JSON.stringify({
          stage: stageForm.stage,
          firstContactAt: stageForm.firstContactAt || undefined,
          firstVisitDate: stageForm.firstVisitDate || undefined,
          firstNegotiationDate: stageForm.firstNegotiationDate || undefined,
          movedInDate: stageForm.movedInDate || undefined
        })
      })
      ElMessage.success('项目阶段已更新')
    }

    await loadAll()
    stageDialogVisible.value = false
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

function openProjectEdit() {
  if (!project.value) {
    return
  }
  Object.assign(projectEditForm, {
    name: project.value.name || '',
    dealType: project.value.dealType || 'RENT',
    level: project.value.level || '',
    source: project.value.source || '',
    intendedRegion: project.value.intendedRegion || '',
    intendedAreaMin: project.value.intendedAreaMin,
    intendedAreaMax: project.value.intendedAreaMax,
    remark: project.value.remark || ''
  })
  projectEditDialogVisible.value = true
}

async function submitProjectEdit() {
  if (!projectEditForm.name.trim()) {
    ElMessage.warning('项目名称不能为空')
    return
  }
  submitting.value = true
  try {
    await authStore.api(`/api/projects/${projectId.value}`, {
      method: 'PUT',
      body: JSON.stringify(projectEditForm)
    })
    ElMessage.success('项目已更新')
    await loadProject()
    projectEditDialogVisible.value = false
  } catch (error: any) {
    ElMessage.error(error.message || '项目更新失败')
  } finally {
    submitting.value = false
  }
}

function openOwnerTransferDialog() {
  ownerForm.ownerId = project.value?.ownerId || ''
  ownerForm.remark = ''
  ownerDialogVisible.value = true
}

async function submitOwnerTransfer() {
  submitting.value = true
  try {
    await authStore.api(`/api/projects/${projectId.value}/owner`, {
      method: 'PUT',
      body: JSON.stringify(ownerForm)
    })
    ElMessage.success('负责人已转移')
    await loadAll()
    ownerDialogVisible.value = false
  } catch (error: any) {
    ElMessage.error(error.message || '转移失败')
  } finally {
    submitting.value = false
  }
}

function openFollowupDrawer() {
  editingFollowupId.value = ''
  followupForm.followupAt = new Date().toISOString().split('T')[0]
  followupForm.method = ''
  followupForm.contactId = ''
  followupForm.content = ''
  followupForm.attachment = ''
  followupDrawerVisible.value = true
}

async function submitFollowup() {
  submitting.value = true
  try {
    if (editingFollowupId.value) {
      await authStore.api(`/api/followups/${editingFollowupId.value}`, {
        method: 'PUT',
        body: JSON.stringify({
          content: followupForm.content,
          followupAt: toDateTimeValue(followupForm.followupAt),
          method: followupForm.method,
          contactId: followupForm.contactId,
          attachment: followupForm.attachment
        })
      })
      ElMessage.success('跟进已更新')
    } else {
      await authStore.api('/api/followups', {
        method: 'POST',
        body: JSON.stringify({
          projectId: projectId.value,
          content: followupForm.content,
          followupAt: toDateTimeValue(followupForm.followupAt),
          method: followupForm.method,
          contactId: followupForm.contactId,
          attachment: followupForm.attachment
        })
      })
      ElMessage.success('跟进已添加')
    }
    await loadFollowups()
    await loadProject()
    followupDrawerVisible.value = false
    editingFollowupId.value = ''
  } catch (error: any) {
    ElMessage.error(error.message || '添加失败')
  } finally {
    submitting.value = false
  }
}

async function editFollowup(f: any) {
  editingFollowupId.value = f.id
  followupForm.followupAt = toDateValue(f.followupAt)
  followupForm.method = f.method || ''
  followupForm.contactId = f.contactId || ''
  followupForm.content = f.content || ''
  followupForm.attachment = f.attachment || ''
  followupDrawerVisible.value = true
}

async function deleteFollowup(f: any) {
  try {
    await ElMessageBox.confirm('确认删除该跟进记录吗?', '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await authStore.api(`/api/followups/${f.id}`, { method: 'DELETE' })
    ElMessage.success('跟进已删除')
    await loadFollowups()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

function toDateValue(value?: string | null): string {
  if (!value) {
    return new Date().toISOString().split('T')[0]
  }
  return value.split('T')[0]
}

function toDateTimeValue(value?: string | null): string | null {
  if (!value) return null
  if (value.includes('T')) return value
  return `${value}T00:00:00`
}

function goContact(contactId: string) {
  router.push({ path: '/contacts', query: { editId: contactId } })
}
</script>

<style scoped>
.project-hero-card {
  margin-bottom: 12px;
}

.project-hero-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.project-hero-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.project-avatar {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #2f5cf6, #57a0ff);
  color: #fff;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 600;
}

.project-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.project-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
}

.project-meta-row {
  color: #64748b;
  font-size: 13px;
}

.project-hero-actions {
  display: flex;
  gap: 8px;
}

/* 阶段进度条 */
.project-stage-progress {
  border-top: 1px solid #e2e8f0;
  padding-top: 16px;
}

.stage-progress {
  display: flex;
  gap: 24px;
}

.stage-progress-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stage-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stage-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #e2e8f0;
  transition: all 0.2s;
}

.stage-dot.done {
  background: #2f5cf6;
}

.stage-dot.current {
  background: #2f5cf6;
  box-shadow: 0 0 0 3px rgba(47, 92, 246, 0.2);
}

.stage-text {
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
}

.stage-text.done {
  color: #2f5cf6;
}

.stage-text.current {
  color: #2f5cf6;
  font-weight: 600;
}

.stage-line {
  flex: 1;
  height: 2px;
  background: #e2e8f0;
}

.stage-line.done {
  background: #2f5cf6;
}

.stage-field-item {
  font-size: 12px;
}

.stage-field-label {
  color: #94a3b8;
  margin-bottom: 4px;
}

.stage-field-value {
  color: #334155;
}

/* 基本信息grid */
.project-base-card {
  margin-bottom: 12px;
}

.project-base-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.project-base-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.base-label {
  font-size: 13px;
  color: #64748b;
}

.base-value {
  font-size: 14px;
  color: #1f2937;
}

/* 详情列表toolbar */
.detail-list-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.detail-list-title {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

/* 跟进记录卡片 */
.followup-card {
  margin-bottom: 12px;
  border: 1px solid #e2e8f0;
}

.followup-card-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.followup-head-main {
  flex: 1;
}

.followup-user {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.followup-time {
  font-size: 12px;
  color: #94a3b8;
}

.followup-body {
  margin-bottom: 12px;
  color: #334155;
  line-height: 1.6;
}

.followup-foot {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #64748b;
}
</style>
