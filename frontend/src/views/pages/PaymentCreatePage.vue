<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <div class="card-title-wrap">
          <el-button class="back-icon-btn" link :icon="ArrowLeft" @click="handleBack" />
          <span>{{ isEditMode ? '编辑回款' : '新增回款' }}</span>
        </div>
      </div>
    </template>

    <el-form ref="formRef" :model="formData" :rules="formRules" label-width="108px" class="create-form">
      <el-row :gutter="12">
        <el-col :xs="24" :md="12">
          <el-form-item label="所属合同" prop="contractId">
            <el-select v-model="formData.contractId" filterable placeholder="请选择合同">
              <el-option
                v-for="c in contracts"
                :key="c.id"
                :label="`${c.contractNo || '-'} (${getProjectName(c.projectId)})`"
                :value="c.id"
              />
            </el-select>
          </el-form-item>
        </el-col>

        <el-col :xs="24" :md="12">
          <el-form-item label="回款日期" prop="paidDate">
            <el-date-picker v-model="formData.paidDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
          </el-form-item>
        </el-col>

        <el-col :xs="24" :md="12">
          <el-form-item label="回款金额(元)" prop="amount">
            <el-input-number v-model="formData.amount" :min="0" style="width: 100%" />
          </el-form-item>
        </el-col>

        <el-col :xs="24" :md="12">
          <el-form-item label="付款方名称">
            <el-input v-model="formData.payerName" placeholder="请输入付款方名称" />
          </el-form-item>
        </el-col>

        <el-col :xs="24" :md="12">
          <el-form-item label="开票状态">
            <el-select v-model="formData.invoiceStatus">
              <el-option label="未开票" value="UNISSUED" />
              <el-option label="已开票" value="ISSUED" />
              <el-option label="无需开票" value="NOT_REQUIRED" />
            </el-select>
          </el-form-item>
        </el-col>

        <el-col :xs="24" :md="12">
          <el-form-item label="回款凭证">
            <AttachmentUploadField v-model="formData.voucher" hint-text="支持图片、PDF 和常见文档。"/>
          </el-form-item>
        </el-col>

        <el-col :span="24">
          <el-form-item label="备注">
            <el-input v-model="formData.remark" type="textarea" :rows="3" placeholder="请输入备注" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item class="form-actions">
        <el-space>
          <el-button @click="handleCancel">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">
            {{ isEditMode ? '保存' : '提交' }}
          </el-button>
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
import { AttachmentUploadField } from '../../components/common'
import { normalizePageResult, type PageResult } from '../../api/page'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const formRef = ref()
const submitting = ref(false)
const contracts = ref<any[]>([])
const projects = ref<any[]>([])

const editId = computed(() => (typeof route.query.id === 'string' ? route.query.id : ''))
const isEditMode = computed(() => Boolean(editId.value))

const formData = reactive({
  contractId: '',
  paidDate: '',
  amount: 0,
  payerName: '',
  invoiceStatus: 'UNISSUED',
  voucher: '',
  remark: ''
})

const formRules = {
  contractId: [{ required: true, message: '请选择合同', trigger: 'change' }],
  paidDate: [{ required: true, message: '请选择回款日期', trigger: 'change' }],
  amount: [{ required: true, message: '请输入回款金额', trigger: 'blur' }]
}

onMounted(async () => {
  await Promise.all([loadContracts(), loadProjects()])
  if (isEditMode.value) {
    await loadPayment()
    return
  }
  const contractId = typeof route.query.contractId === 'string' ? route.query.contractId : ''
  if (contractId && contracts.value.some((c) => c.id === contractId)) {
    formData.contractId = contractId
  }
})

async function loadContracts() {
  const res = await authStore.api<PageResult<any> | any[]>('/api/contracts')
  contracts.value = normalizePageResult<any>(res).records
}

async function loadProjects() {
  const res = await authStore.api<PageResult<any> | any[]>('/api/projects')
  projects.value = normalizePageResult<any>(res).records
}

async function loadPayment() {
  try {
    const data = await getPaymentDetail()
    formData.contractId = data.contractId || ''
    formData.paidDate = toDateValue(data.paidDate)
    formData.amount = Number(data.amount || 0)
    formData.payerName = data.payerName || ''
    formData.invoiceStatus = data.invoiceStatus || 'UNISSUED'
    formData.voucher = data.voucher || ''
    formData.remark = data.remark || ''
  } catch (error: any) {
    ElMessage.error(error.message || '回款记录加载失败')
    router.push('/payments')
  }
}

async function getPaymentDetail() {
  try {
    return await authStore.api<any>(`/api/payments/${editId.value}`)
  } catch {
    const res = await authStore.api<PageResult<any> | any[]>('/api/payments')
    const row = normalizePageResult<any>(res).records.find((item) => item.id === editId.value)
    if (!row) throw new Error('回款记录不存在')
    return row
  }
}

function getProjectName(projectId?: string): string {
  if (!projectId) return '-'
  const project = projects.value.find((p) => p.id === projectId)
  return project?.name || projectId
}

function toDateValue(value?: string | null): string {
  if (!value) return ''
  return String(value).split('T')[0]
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
    submitting.value = true

    await authStore.api(isEditMode.value ? `/api/payments/${editId.value}` : '/api/payments', {
      method: isEditMode.value ? 'PUT' : 'POST',
      body: JSON.stringify(formData)
    })

    ElMessage.success(isEditMode.value ? '回款已保存' : '回款已创建')
    router.push('/payments')
  } catch (error: any) {
    ElMessage.error(error.message || '创建失败')
  } finally {
    submitting.value = false
  }
}

function handleBack() {
  if (window.history.length > 1) {
    router.back()
    return
  }
  router.push('/payments')
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
