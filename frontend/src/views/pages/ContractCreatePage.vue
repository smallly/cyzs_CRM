<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <div class="card-title-wrap">
          <el-button class="back-icon-btn" link :icon="ArrowLeft" @click="handleBack" />
          <span>新增合同</span>
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
          <el-form-item label="合同标题">
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

        <el-col :span="24">
          <el-form-item label="付款方式">
            <el-input v-model="formData.paymentTerms" type="textarea" :rows="3" placeholder="请输入付款方式" />
          </el-form-item>
        </el-col>

        <el-col :span="24">
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
const projects = ref<any[]>([])

const formData = reactive({
  projectId: '',
  contractNo: '',
  title: '',
  amount: 0,
  signDate: '',
  estimatedCommission: 0,
  leaseStartDate: '',
  leaseEndDate: '',
  leaseTermMonths: undefined as number | undefined,
  paymentTerms: '',
  attachment: ''
})

const formRules = {
  projectId: [{ required: true, message: '请选择项目', trigger: 'change' }],
  contractNo: [{ required: true, message: '请输入合同编号', trigger: 'blur' }],
  amount: [{ required: true, message: '请输入合同金额', trigger: 'blur' }],
  signDate: [{ required: true, message: '请选择签约日期', trigger: 'change' }],
  attachment: [{ required: true, message: '请上传合同附件', trigger: 'change' }]
}

onMounted(async () => {
  await loadProjects()
  const projectId = typeof route.query.projectId === 'string' ? route.query.projectId : ''
  if (projectId && projects.value.some((p) => p.id === projectId)) {
    formData.projectId = projectId
  }
})

async function loadProjects() {
  const res = await authStore.api<PageResult<any> | any[]>('/api/projects')
  projects.value = normalizePageResult<any>(res).records
}

function handleFileChange(file: any) {
  const rawFile = file?.raw as File | undefined
  if (!file?.name) {
    fileName.value = ''
    formData.attachment = ''
    return
  }
  fileName.value = file.name
  formData.attachment = JSON.stringify({ name: file.name })
  const reader = new FileReader()
  reader.onload = () => {
    const dataUrl = typeof reader.result === 'string' ? reader.result : ''
    formData.attachment = JSON.stringify({ name: file.name, data: dataUrl })
  }
  if (rawFile) {
    reader.readAsDataURL(rawFile)
  }
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
    submitting.value = true

    await authStore.api('/api/contracts', {
      method: 'POST',
      body: JSON.stringify(formData)
    })

    ElMessage.success('合同已创建')
    router.push('/contracts')
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
