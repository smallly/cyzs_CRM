<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <div class="card-title-wrap">
          <el-button class="back-icon-btn" link :icon="ArrowLeft" @click="handleBack" />
          <span>新增回款</span>
        </div>
        <el-button @click="router.push('/payments')">返回回款列表</el-button>
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
            <el-upload :auto-upload="false" :show-file-list="false" @change="handleFileChange">
              <el-button>选择文件</el-button>
              <template #tip>
                <div v-if="fileName" class="el-upload__tip">{{ fileName }}</div>
              </template>
            </el-upload>
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
          <el-button type="primary" :loading="submitting" @click="handleSubmit">提交</el-button>
          <el-button @click="handleCancel">取消</el-button>
        </el-space>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
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
const contracts = ref<any[]>([])
const projects = ref<any[]>([])

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

function getProjectName(projectId?: string): string {
  if (!projectId) return '-'
  const project = projects.value.find((p) => p.id === projectId)
  return project?.name || projectId
}

function handleFileChange(file: any) {
  fileName.value = file.name
  formData.voucher = file.name
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
    submitting.value = true

    await authStore.api('/api/payments', {
      method: 'POST',
      body: JSON.stringify(formData)
    })

    ElMessage.success('回款已创建')
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

.back-icon-btn {
  font-size: 16px;
  padding: 0;
}

.create-form :deep(.el-form-item) {
  margin-bottom: 12px;
}

.create-form :deep(.form-actions .el-form-item__content) {
  justify-content: center;
}
</style>
