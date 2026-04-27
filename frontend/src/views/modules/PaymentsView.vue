<template>
  <div>
    <CrudTable
      title="回款记录"
      :data="payments"
      :columns="columns"
      :loading="loading"
      :show-add="true"
      :show-pagination="true"
      :total="total"
      :default-current-page="page"
      :default-page-size="pageSize"
      @add="goCreate"
      @refresh="loadPayments"
      @page-change="handlePageChange"
    >
      <template #contractId="{ row }">
        {{ getContractNo(row.contractId) }}
      </template>
      <template #creatorId="{ row }">
        {{ getUserDisplayName(row.creatorId || row.ownerId) }}
      </template>
      <template #createdAt="{ row }">
        {{ formatDateTime(row.createdAt) }}
      </template>

      <template #invoiceStatus="{ row }">
        <el-tag :type="getInvoiceStatusType(row.invoiceStatus)">
          {{ getInvoiceStatusLabel(row.invoiceStatus) }}
        </el-tag>
      </template>

      <template #voucher="{ row }">
        <el-button v-if="row.voucher" link @click="downloadVoucher(row)">
          {{ row.voucher }}
        </el-button>
        <span v-else>-</span>
      </template>
    </CrudTable>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../stores/auth'
import CrudTable from '../../components/common/CrudTable.vue'
import type { TableColumn } from '../../components/common/CrudTable.vue'
import { buildPageQuery, normalizePageResult, type PageResult } from '../../api/page'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const payments = ref<any[]>([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const contracts = ref<any[]>([])
const users = ref<any[]>([])

const columns: TableColumn[] = [
  { prop: 'code', label: '编号', width: 150 },
  { prop: 'contractId', label: '合同', width: 200, slot: 'contractId' },
  { prop: 'paidDate', label: '回款日期', width: 120 },
  { prop: 'amount', label: '金额(元)', width: 120 },
  { prop: 'payerName', label: '付款方', width: 160 },
  { prop: 'invoiceStatus', label: '开票状态', width: 120, slot: 'invoiceStatus' },
  { prop: 'voucher', label: '回款凭证', width: 200, slot: 'voucher' },
  { prop: 'id', label: 'ID', width: 220 },
  { prop: 'creatorId', label: '创建人', width: 120, slot: 'creatorId' },
  { prop: 'createdAt', label: '创建时间', width: 180, slot: 'createdAt' }
]

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([loadPayments(), loadContracts(), loadUsers()])
  } finally {
    loading.value = false
  }
})

async function loadPayments() {
  const query = buildPageQuery(page.value, pageSize.value)
  const res = await authStore.api<PageResult<any> | any[]>(`/api/payments?${query}`)
  const pageData = normalizePageResult<any>(res)
  payments.value = pageData.records
  total.value = pageData.total
}

async function loadContracts() {
  const res = await authStore.api<PageResult<any> | any[]>('/api/contracts')
  contracts.value = normalizePageResult<any>(res).records
}

async function loadUsers() {
  const res = await authStore.api<PageResult<any> | any[]>('/api/users')
  users.value = normalizePageResult<any>(res).records
}

function goCreate() {
  router.push('/payments/create')
}

function getContractNo(contractId: string): string {
  const contract = contracts.value.find((c) => c.id === contractId)
  return contract?.contractNo || contractId
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
    return value
  }
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

function downloadVoucher(row: any) {
  ElMessage.info(`下载凭证: ${row.voucher}`)
}

async function handlePageChange(nextPage: number, nextSize: number) {
  page.value = nextPage
  pageSize.value = nextSize
  await loadPayments()
}
</script>
