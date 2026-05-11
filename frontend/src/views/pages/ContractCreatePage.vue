<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <div class="card-title-wrap">
          <el-button class="back-icon-btn" link :icon="ArrowLeft" @click="handleBack" />
          <span>{{ isEditMode ? '编辑合同' : '新增合同' }}</span>
        </div>
      </div>
    </template>

    <el-form ref="formRef" :model="formData" :rules="formRules" label-width="108px" class="create-form">
      <el-row :gutter="12">
        <el-col :xs="24" :md="12">
          <el-form-item label="所属项目" prop="projectId">
            <el-select v-model="formData.projectId" filterable placeholder="请选择项目">
              <el-option
                v-for="p in projects"
                :key="p.id"
                :label="`${p.name || '-'} (${p.code || '-'})`"
                :value="p.id"
              />
            </el-select>
          </el-form-item>
        </el-col>

        <el-col :xs="24" :md="12">
          <el-form-item label="合同编号" prop="contractNo">
            <el-input v-model="formData.contractNo" placeholder="请输入合同编号" />
          </el-form-item>
        </el-col>

        <el-col :xs="24" :md="12">
          <el-form-item label="合同标题" prop="title">
            <el-input v-model="formData.title" placeholder="请输入合同标题" />
          </el-form-item>
        </el-col>

        <el-col :xs="24" :md="12">
          <el-form-item label="合同金额(元)" prop="amount">
            <el-input-number v-model="formData.amount" :min="0" style="width: 100%" />
          </el-form-item>
        </el-col>

        <el-col :xs="24" :md="12">
          <el-form-item label="预估佣金(元)">
            <el-input-number v-model="formData.estimatedCommission" :min="0" style="width: 100%" />
          </el-form-item>
        </el-col>

        <el-col :xs="24" :md="12">
          <el-form-item label="签约日期" prop="signDate">
            <el-date-picker v-model="formData.signDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
          </el-form-item>
        </el-col>

        <el-col :xs="24" :md="12">
          <el-form-item label="起租日期">
            <el-date-picker v-model="formData.leaseStartDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
          </el-form-item>
        </el-col>

        <el-col :xs="24" :md="12">
          <el-form-item label="到期日期">
            <el-date-picker v-model="formData.leaseEndDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
          </el-form-item>
        </el-col>

        <el-col :xs="24" :md="12">
          <el-form-item label="租赁期限(月)">
            <el-input-number v-model="formData.leaseTermMonths" :min="0" :controls="false" style="width: 100%" />
          </el-form-item>
        </el-col>

        <el-col :xs="24" :md="12">
          <el-form-item label="付款方式">
            <el-select
              v-model="formData.paymentTerms"
              filterable
              allow-create
              default-first-option
              clearable
              placeholder="请选择或输入付款方式"
              style="width: 100%"
            >
              <el-option v-for="option in paymentOptions" :key="option" :label="option" :value="option" />
            </el-select>
          </el-form-item>
        </el-col>

        <el-col :xs="24" :md="12">
          <el-form-item label="合同附件" prop="attachment">
            <el-upload :auto-upload="false" :show-file-list="false" @change="handleFileChange">
              <el-button>选择文件</el-button>
              <template #tip>
                <div v-if="fileName" class="el-upload__tip">{{ fileName }}</div>
              </template>
            </el-upload>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item class="form-actions">
        <el-space>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">{{ submitText }}</el-button>
          <el-button @click="handleCancel">取消</el-button>
        </el-space>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useAuthStore } from '../../stores/auth'
import { normalizePageResult, type PageResult } from '../../api/page'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const formRef = ref()
const submitting = ref(false)
const fileName = ref('')
const attachmentFile = ref<File | null>(null)
const projects = ref<any[]>([])
const editingContractId = ref('')
const isEditMode = computed(() => !!editingContractId.value)
const submitText = computed(() => (isEditMode.value ? '保存' : '提交'))

const formData = reactive({
  projectId: '',
  contractNo: '',
  title: '',
  amount: 0,
  signDate: getTodayDate(),
  estimatedCommission: 0,
  leaseStartDate: '',
  leaseEndDate: '',
  leaseTermMonths: undefined as number | undefined,
  paymentTerms: '',
  attachment: ''
})

const paymentOptions = [
  '银行卡打款',
  '对公转账',
  '现金',
  '支票',
  '微信转账',
  '支付宝转账'
]

const formRules = {
  projectId: [{ required: true, message: '请选择项目', trigger: 'change' }],
  contractNo: [{ required: true, message: '请输入合同编号', trigger: 'blur' }],
  title: [{ required: true, message: '请输入合同标题', trigger: 'blur' }],
  amount: [{ required: true, message: '请输入合同金额', trigger: 'blur' }],
  signDate: [{ required: true, message: '请选择签约日期', trigger: 'change' }],
  attachment: [{ required: true, message: '请上传合同附件', trigger: 'change' }]
}

onMounted(async () => {
  await loadProjects()
  const contractId = typeof route.query.id === 'string' ? route.query.id : ''
  if (contractId) {
    editingContractId.value = contractId
    await loadContract(contractId)
  }
  const projectId = typeof route.query.projectId === 'string' ? route.query.projectId : ''
  if (projectId && projects.value.some((p) => p.id === projectId)) {
    formData.projectId = projectId
  }
})

async function loadProjects() {
  const res = await authStore.api<PageResult<any> | any[]>('/api/projects')
  projects.value = normalizePageResult<any>(res).records
}

async function loadContract(contractId: string) {
  const row = await authStore.api<any>(`/api/contracts/${contractId}`)
  formData.projectId = row.projectId || ''
  formData.contractNo = row.contractNo || ''
  formData.title = row.title || ''
  formData.amount = Number(row.amount || 0)
  formData.signDate = row.signDate || ''
  formData.estimatedCommission = Number(row.estimatedCommission || 0)
  formData.leaseStartDate = row.leaseStartDate || ''
  formData.leaseEndDate = row.leaseEndDate || ''
  formData.leaseTermMonths = row.leaseTermMonths ?? undefined
  formData.paymentTerms = row.paymentTerms || ''
  formData.attachment = row.attachment || ''
  fileName.value = parseAttachmentName(row.attachment) || '已上传附件'
}

function getTodayDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseAttachmentName(value: string): string {
  if (!value) return ''
  try {
    const parsed = JSON.parse(value) as { name?: string }
    return parsed.name || ''
  } catch {
    return value
  }
}

function handleFileChange(file: any) {
  const rawFile = file?.raw as File | undefined
  if (!file?.name) {
    fileName.value = ''
    attachmentFile.value = null
    formData.attachment = ''
    return
  }
  fileName.value = file.name
  attachmentFile.value = rawFile || null
  formData.attachment = JSON.stringify({ name: file.name })
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}

async function ensureAttachmentReady() {
  if (!attachmentFile.value) return
  const current = (formData.attachment || '').trim()
  try {
    const parsed = current ? (JSON.parse(current) as { name?: string; data?: string }) : null
    if (parsed?.data) return
  } catch {
    // fall through and re-encode below
  }
  const dataUrl = await readFileAsDataUrl(attachmentFile.value)
  formData.attachment = JSON.stringify({ name: fileName.value || attachmentFile.value.name, data: dataUrl })
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
    await ensureAttachmentReady()
    submitting.value = true

    if (isEditMode.value) {
      await authStore.api(`/api/contracts/${editingContractId.value}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      })
    } else {
      await authStore.api('/api/contracts', {
        method: 'POST',
        body: JSON.stringify(formData)
      })
    }

    ElMessage.success(isEditMode.value ? '合同已更新' : '合同已创建')
    router.push('/contracts')
  } catch (error: any) {
    ElMessage.error(error.message || (isEditMode.value ? '更新失败' : '创建失败'))
  } finally {
    submitting.value = false
  }
}

function handleBack() {
  if (window.history.length > 1) {
    router.back()
    return
  }
  router.push('/contracts')
}

function handleCancel() {
  handleBack()
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.card-title-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
}

.create-form :deep(.el-form-item) {
  margin-bottom: 12px;
}

.create-form :deep(.form-actions .el-form-item__content) {
  justify-content: center;
}
</style>
