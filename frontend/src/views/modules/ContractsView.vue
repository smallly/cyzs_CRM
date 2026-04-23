<template>
  <div class="card">
    <h2>合同管理</h2>
    <div class="form-grid cols-5">
      <label class="field">
        <span class="field-label">所属项目</span>
        <select v-model="contractForm.projectId">
          <option value="">请选择项目</option>
          <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }} / {{ p.id }}</option>
        </select>
      </label>
      <label class="field">
        <span class="field-label">合同编号</span>
        <input v-model="contractForm.contractNo" placeholder="请输入合同编号" />
      </label>
      <label class="field">
        <span class="field-label">合同标题</span>
        <input v-model="contractForm.title" placeholder="请输入合同标题" />
      </label>
      <label class="field">
        <span class="field-label">合同金额（元）</span>
        <input v-model="contractForm.amount" placeholder="请输入合同金额（元）" />
      </label>
      <label class="field">
        <span class="field-label">签约日期</span>
        <input v-model="contractForm.signDate" type="date" />
      </label>
      <label class="field" style="grid-column: span 2">
        <span class="field-label required">合同附件</span>
        <div class="row" style="margin-bottom: 0; align-items: center">
          <input ref="fileInputRef" type="file" style="display: none" @change="onContractAttachmentChange" />
          <button type="button" class="secondary" @click="pickFile">选择本地文件</button>
          <span v-if="contractAttachmentName" class="muted">{{ contractAttachmentName }}</span>
        </div>
      </label>
    </div>
    <div class="row">
      <button @click="createContract">新增合同</button>
      <button class="secondary" @click="loadContracts">刷新</button>
    </div>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>合同编号</th>
          <th>项目</th>
          <th>金额（元）</th>
          <th>签约日期</th>
          <th>合同附件</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in contracts" :key="c.id">
          <td>{{ c.id }}</td>
          <td>{{ c.contractNo }}</td>
          <td>{{ c.projectId }}</td>
          <td>{{ c.amount }}</td>
          <td>{{ c.signDate }}</td>
          <td>
            <a v-if="getContractAttachmentHref(c)" class="row-link-btn" :href="getContractAttachmentHref(c)" target="_blank" rel="noopener">
              {{ getContractAttachmentName(c) }}
            </a>
            <span v-else>{{ hasContractAttachment(c) ? getContractAttachmentName(c) : "-" }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{
  contractForm: any;
  projects: any[];
  contracts: any[];
  contractAttachmentName: string;
  createContract: () => void | Promise<void>;
  loadContracts: () => void | Promise<void>;
  onContractAttachmentChange: (event: Event) => void;
  getContractAttachmentHref: (row: any) => string;
  getContractAttachmentName: (row: any) => string;
  hasContractAttachment: (row: any) => boolean;
}>();

const fileInputRef = ref<HTMLInputElement | null>(null);

function pickFile() {
  fileInputRef.value?.click();
}

const {
  contractForm,
  projects,
  contracts,
  contractAttachmentName,
  createContract,
  loadContracts,
  onContractAttachmentChange,
  getContractAttachmentHref,
  getContractAttachmentName,
  hasContractAttachment
} = props;
</script>
