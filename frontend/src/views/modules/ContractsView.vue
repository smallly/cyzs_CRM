<template>
  <div>
    <CrudTable
      title="合同管理"
      :data="contracts"
      :columns="columns"
      :loading="loading"
      :show-add="true"
      @add="openDrawer"
      @refresh="loadContracts"
    >
      <template #projectId="{ row }">
        {{ getProjectName(row.projectId) }}
      </template>

      <template #attachment="{ row }">
        <el-button v-if="row.attachment" link @click="downloadAttachment(row)">
          {{ getAttachmentName(row.attachment) }}
        </el-button>
        <span v-else>-</span>
      </template>
    </CrudTable>

    <FormDrawer
      v-model:visible="drawerVisible"
      title="新增合同"
      :fields="formFields"
      v-model="formData"
      :rules="formRules"
      :submitting="submitting"
      @submit="handleSubmit"
      size="60%"
    >
      <template #attachment>
        <el-upload
          :auto-upload="false"
          :show-file-list="false"
          @change="handleFileChange"
        >
          <el-button>选择文件</el-button>
          <template #tip>
            <div v-if="fileName" class="el-upload__tip">{{ fileName }}</div>
          </template>
        </el-upload>
      </template>
    </FormDrawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../stores/auth'
import CrudTable from '../../components/common/CrudTable.vue'
import FormDrawer from '../../components/common/FormDrawer.vue'
import type { TableColumn } from '../../components/common/CrudTable.vue'
import type { FormField } from '../../components/common/FormDrawer.vue'

const authStore = useAuthStore()

const loading = ref(false)
const contracts = ref<any[]>([])
const projects = ref<any[]>([])
const drawerVisible = ref(false)
const submitting = ref(false)
const fileName = ref('')
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

const columns: TableColumn[] = [
  { prop: 'id', label: 'ID', width: 180 },
  { prop: 'projectId', label: '所属项目', width: 200, slot: 'projectId' },
  { prop: 'contractNo', label: '合同编号', width: 150 },
  { prop: 'title', label: '合同标题', width: 180 },
  { prop: 'amount', label: '合同金额(元)', width: 140 },
  { prop: 'estimatedCommission', label: '预估佣金(元)', width: 150 },
  { prop: 'signDate', label: '签约日期', width: 120 },
  { prop: 'attachment', label: '合同附件', width: 200, slot: 'attachment' }
]

const formFields: FormField[] = [
  {
    prop: 'projectId',
    label: '所属项目',
    type: 'select',
    span: 12,
    required: true,
    options: []
  },
  { prop: 'contractNo', label: '合同编号', type: 'input', span: 12, required: true },
  { prop: 'title', label: '合同标题', type: 'input', span: 12 },
  { prop: 'amount', label: '合同金额(元)', type: 'number', span: 12, required: true },
  { prop: 'estimatedCommission', label: '预估佣金(元)', type: 'number', span: 12 },
  { prop: 'signDate', label: '签约日期', type: 'date', span: 12, required: true, valueFormat: 'YYYY-MM-DD' },
  { prop: 'leaseStartDate', label: '起租日期', type: 'date', span: 12, valueFormat: 'YYYY-MM-DD' },
  { prop: 'leaseEndDate', label: '到期日期', type: 'date', span: 12, valueFormat: 'YYYY-MM-DD' },
  { prop: 'leaseTermMonths', label: '租赁期限(月)', type: 'number', span: 12 },
  { prop: 'paymentTerms', label: '付款方式', type: 'textarea', span: 24 },
  { prop: 'attachment', label: '合同附件', type: 'slot', span: 24, slot: 'attachment', required: true }
]

const formRules = {
  projectId: [{ required: true, message: '请选择项目', trigger: 'change' }],
  contractNo: [{ required: true, message: '请输入合同编号', trigger: 'blur' }],
  amount: [{ required: true, message: '请输入合同金额', trigger: 'blur' }],
  signDate: [{ required: true, message: '请选择签约日期', trigger: 'change' }],
  attachment: [{ required: true, message: '请上传合同附件', trigger: 'change' }]
}

onMounted(async () => {
  await loadAll()
})

async function loadAll() {
  loading.value = true
  try {
    await Promise.all([loadContracts(), loadProjects()])
  } finally {
    loading.value = false
  }
}

async function loadContracts() {
  contracts.value = await authStore.api<any[]>('/api/contracts')
}

async function loadProjects() {
  projects.value = await authStore.api<any[]>('/api/projects')
  const projectField = formFields.find((f) => f.prop === 'projectId')
  if (projectField) {
    projectField.options = projects.value.map((p) => ({ label: p.name, value: p.id }))
  }
}

function openDrawer() {
  Object.assign(formData, {
    projectId: '',
    contractNo: '',
    title: '',
    amount: 0,
    signDate: '',
    estimatedCommission: 0,
    leaseStartDate: '',
    leaseEndDate: '',
    leaseTermMonths: undefined,
    paymentTerms: '',
    attachment: ''
  })
  fileName.value = ''
  drawerVisible.value = true
}

function handleFileChange(file: any) {
  fileName.value = file.name
  formData.attachment = file.name
}

async function handleSubmit() {
  submitting.value = true
  try {
    await authStore.api('/api/contracts', {
      method: 'POST',
      body: JSON.stringify(formData)
    })
    ElMessage.success('合同已创建')
    await loadContracts()
    drawerVisible.value = false
  } catch (error: any) {
    ElMessage.error(error.message || '创建失败')
  } finally {
    submitting.value = false
  }
}

function getProjectName(projectId: string): string {
  const project = projects.value.find((p) => p.id === projectId)
  return project?.name || projectId
}

function getAttachmentName(attachment: string): string {
  return attachment || '-'
}

function downloadAttachment(row: any) {
  ElMessage.info(`下载附件: ${row.attachment}`)
}
</script>
