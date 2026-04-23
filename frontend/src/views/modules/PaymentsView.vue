<template>
  <div>
    <CrudTable
      title="回款记录"
      :data="payments"
      :columns="columns"
      :loading="loading"
      :show-add="true"
      @add="openDrawer"
      @refresh="loadPayments"
    >
      <template #contractId="{ row }">
        {{ getContractNo(row.contractId) }}
      </template>

      <template #invoiceStatus="{ row }">
        <el-tag :type="getInvoiceStatusType(row.invoiceStatus)">
          {{ getInvoiceStatusLabel(row.invoiceStatus) }}
        </el-tag>
      </template>

      <template #voucher="{ row }">
        <el-button v-if="row.voucher" link @click="downloadVoucher(row)">
          {{ getVoucherName(row.voucher) }}
        </el-button>
        <span v-else>-</span>
      </template>
    </CrudTable>

    <FormDrawer
      v-model:visible="drawerVisible"
      title="新增回款"
      :fields="formFields"
      v-model="formData"
      :rules="formRules"
      :submitting="submitting"
      @submit="handleSubmit"
      size="60%"
    >
      <template #voucher>
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
const payments = ref<any[]>([])
const contracts = ref<any[]>([])
const drawerVisible = ref(false)
const submitting = ref(false)
const fileName = ref('')
const formData = reactive({
  contractId: '',
  paidDate: '',
  amount: 0,
  payerName: '',
  invoiceStatus: 'UNISSUED',
  voucher: '',
  remark: ''
})

const columns: TableColumn[] = [
  { prop: 'id', label: 'ID', width: 180 },
  { prop: 'code', label: '编号', width: 150 },
  { prop: 'contractId', label: '合同', width: 200, slot: 'contractId' },
  { prop: 'paidDate', label: '回款日期', width: 120 },
  { prop: 'amount', label: '金额(元)', width: 120 },
  { prop: 'payerName', label: '付款方', width: 160 },
  { prop: 'invoiceStatus', label: '开票状态', width: 120, slot: 'invoiceStatus' },
  { prop: 'voucher', label: '回款凭证', width: 200, slot: 'voucher' }
]

const formFields: FormField[] = [
  {
    prop: 'contractId',
    label: '所属合同',
    type: 'select',
    span: 12,
    required: true,
    options: []
  },
  { prop: 'paidDate', label: '回款日期', type: 'date', span: 12, required: true, valueFormat: 'YYYY-MM-DD' },
  { prop: 'amount', label: '回款金额(元)', type: 'number', span: 12, required: true },
  { prop: 'payerName', label: '付款方名称', type: 'input', span: 12 },
  {
    prop: 'invoiceStatus',
    label: '开票状态',
    type: 'select',
    span: 12,
    options: [
      { label: '未开票', value: 'UNISSUED' },
      { label: '已开票', value: 'ISSUED' },
      { label: '无需开票', value: 'NOT_REQUIRED' }
    ]
  },
  { prop: 'voucher', label: '回款凭证', type: 'slot', span: 24, slot: 'voucher' },
  { prop: 'remark', label: '备注', type: 'textarea', span: 24 }
]

const formRules = {
  contractId: [{ required: true, message: '请选择合同', trigger: 'change' }],
  paidDate: [{ required: true, message: '请选择回款日期', trigger: 'change' }],
  amount: [{ required: true, message: '请输入回款金额', trigger: 'blur' }]
}

onMounted(async () => {
  await loadAll()
})

async function loadAll() {
  loading.value = true
  try {
    await Promise.all([loadPayments(), loadContracts()])
  } finally {
    loading.value = false
  }
}

async function loadPayments() {
  payments.value = await authStore.api<any[]>('/api/payments')
}

async function loadContracts() {
  contracts.value = await authStore.api<any[]>('/api/contracts')
  const contractField = formFields.find((f) => f.prop === 'contractId')
  if (contractField) {
    contractField.options = contracts.value.map((c) => ({ label: c.contractNo, value: c.id }))
  }
}

function openDrawer() {
  Object.assign(formData, {
    contractId: '',
    paidDate: '',
    amount: 0,
    payerName: '',
    invoiceStatus: 'UNISSUED',
    voucher: '',
    remark: ''
  })
  fileName.value = ''
  drawerVisible.value = true
}

function handleFileChange(file: any) {
  fileName.value = file.name
  formData.voucher = file.name
}

async function handleSubmit() {
  submitting.value = true
  try {
    await authStore.api('/api/payments', {
      method: 'POST',
      body: JSON.stringify(formData)
    })
    ElMessage.success('回款已创建')
    await loadPayments()
    drawerVisible.value = false
  } catch (error: any) {
    ElMessage.error(error.message || '创建失败')
  } finally {
    submitting.value = false
  }
}

function getContractNo(contractId: string): string {
  const contract = contracts.value.find((c) => c.id === contractId)
  return contract?.contractNo || contractId
}

function getInvoiceStatusType(status: string): 'warning' | 'success' | 'info' {
  const map: Record<string, 'warning' | 'success' | 'info'> = {
    UNISSUED: 'warning',
    ISSUED: 'success',
    NOT_REQUIRED: 'info'
  }
  return map[status] || 'info'
}

function getInvoiceStatusLabel(status: string): string {
  const map: Record<string, string> = {
    UNISSUED: '未开票',
    ISSUED: '已开票',
    NOT_REQUIRED: '无需开票'
  }
  return map[status] || status
}

function getVoucherName(voucher: string): string {
  return voucher || '-'
}

function downloadVoucher(row: any) {
  ElMessage.info(`下载凭证: ${row.voucher}`)
}
</script>
