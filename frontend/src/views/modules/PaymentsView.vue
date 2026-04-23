<template>
  <div class="card">
    <h2>回款记录</h2>
    <div class="form-grid cols-4">
      <label class="field">
        <span class="field-label">所属合同</span>
        <select v-model="paymentForm.contractId">
          <option value="">请选择合同</option>
          <option v-for="c in contracts" :key="c.id" :value="c.id">{{ c.contractNo }} / {{ c.id }}</option>
        </select>
      </label>
      <label class="field">
        <span class="field-label">回款日期</span>
        <input v-model="paymentForm.paidDate" type="date" />
      </label>
      <label class="field">
        <span class="field-label">回款金额（元）</span>
        <input v-model="paymentForm.amount" placeholder="请输入回款金额（元）" />
      </label>
      <label class="field">
        <span class="field-label">开票状态</span>
        <select v-model="paymentForm.invoiceStatus">
          <option value="UNISSUED">未开票</option>
          <option value="ISSUED">已开票</option>
          <option value="NOT_REQUIRED">无需开票</option>
        </select>
      </label>
      <label class="field" style="grid-column: span 2">
        <span class="field-label">回款凭证</span>
        <div class="row" style="margin-bottom: 0; align-items: center">
          <input ref="fileInputRef" type="file" style="display: none" @change="onPaymentVoucherChange" />
          <button type="button" class="secondary" @click="pickFile">选择本地文件</button>
          <span v-if="paymentVoucherName" class="muted">{{ paymentVoucherName }}</span>
        </div>
      </label>
    </div>
    <div class="row">
      <button @click="createPayment">新增回款</button>
      <button class="secondary" @click="loadPayments">刷新</button>
    </div>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>编号</th>
          <th>合同</th>
          <th>回款日期</th>
          <th>金额（元）</th>
          <th>开票状态</th>
          <th>回款凭证</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in payments" :key="p.id">
          <td>{{ p.id }}</td>
          <td>{{ p.code }}</td>
          <td>{{ p.contractId }}</td>
          <td>{{ p.paidDate }}</td>
          <td>{{ p.amount }}</td>
          <td>{{ invoiceStatusLabelMap[p.invoiceStatus] || p.invoiceStatus }}</td>
          <td>
            <a v-if="getPaymentVoucherHref(p)" class="row-link-btn" :href="getPaymentVoucherHref(p)" target="_blank" rel="noopener">
              {{ getPaymentVoucherName(p) }}
            </a>
            <span v-else>{{ hasPaymentVoucher(p) ? getPaymentVoucherName(p) : "-" }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{
  paymentForm: any;
  contracts: any[];
  payments: any[];
  paymentVoucherName: string;
  invoiceStatusLabelMap: Record<string, string>;
  createPayment: () => void | Promise<void>;
  loadPayments: () => void | Promise<void>;
  onPaymentVoucherChange: (event: Event) => void;
  getPaymentVoucherHref: (row: any) => string;
  getPaymentVoucherName: (row: any) => string;
  hasPaymentVoucher: (row: any) => boolean;
}>();

const fileInputRef = ref<HTMLInputElement | null>(null);

function pickFile() {
  fileInputRef.value?.click();
}

const {
  paymentForm,
  contracts,
  payments,
  paymentVoucherName,
  invoiceStatusLabelMap,
  createPayment,
  loadPayments,
  onPaymentVoucherChange,
  getPaymentVoucherHref,
  getPaymentVoucherName,
  hasPaymentVoucher
} = props;
</script>
