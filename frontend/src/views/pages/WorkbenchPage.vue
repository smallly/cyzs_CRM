<template>
  <div class="workbench-page">
    <el-row :gutter="16">
      <el-col :span="6">
        <el-card>
          <el-statistic title="联系人" :value="stats.contacts" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <el-statistic title="项目" :value="stats.projects" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <el-statistic title="合同" :value="stats.contracts" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <el-statistic title="回款记录" :value="stats.payments" />
        </el-card>
      </el-col>
    </el-row>

    <el-card class="quick-actions">
      <template #header>
        <span>快捷入口</span>
      </template>
      <el-space wrap>
        <el-button @click="$router.push('/contacts')">联系人</el-button>
        <el-button @click="$router.push('/projects')">项目列表</el-button>
        <el-button type="primary" @click="$router.push('/projects/create')">
          新增项目
        </el-button>
        <el-button @click="$router.push('/contracts')">合同</el-button>
        <el-button @click="$router.push('/payments')">回款</el-button>
      </el-space>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const stats = ref({
  contacts: 0,
  projects: 0,
  contracts: 0,
  payments: 0
})

onMounted(async () => {
  try {
    const contacts = await authStore.api<any[]>('/api/contacts')
    const projects = await authStore.api<any[]>('/api/projects')
    const contracts = await authStore.api<any[]>('/api/contracts')
    const payments = await authStore.api<any[]>('/api/payments')

    stats.value = {
      contacts: contacts.length,
      projects: projects.length,
      contracts: contracts.length,
      payments: payments.length
    }
  } catch (error) {
    console.error('Load stats failed', error)
  }
})
</script>

<style scoped>
.workbench-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.quick-actions {
  margin-top: 16px;
}
</style>