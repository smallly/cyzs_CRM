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

    <el-card class="quick-actions-card" :body-style="{ padding: '12px 14px 14px' }">
      <template #header>
        <div class="quick-actions-header">
          <div class="quick-actions-heading">
            <span class="quick-actions-title">快捷入口</span>
            <span class="quick-actions-subtitle">常用业务快速跳转</span>
          </div>
          <span class="quick-actions-badge">高频</span>
        </div>
      </template>
      <div class="quick-actions-grid">
        <button
          v-for="item in shortcutItems"
          :key="item.label"
          type="button"
          class="shortcut-tile"
          @click="$router.push(item.path)"
        >
          <div class="shortcut-icon-wrap">
            <el-icon class="shortcut-icon">
              <component :is="item.icon" />
            </el-icon>
          </div>
          <div class="shortcut-content">
            <span class="shortcut-label">{{ item.label }}</span>
            <span class="shortcut-desc">{{ item.desc }}</span>
          </div>
        </button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Coin, Document, FolderOpened, Plus, User } from '@element-plus/icons-vue'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const shortcutItems = [
  {
    label: '联系人',
    desc: '查看和维护客户资料',
    path: '/contacts',
    icon: User
  },
  {
    label: '项目列表',
    desc: '进入项目管理页面',
    path: '/projects',
    icon: FolderOpened
  },
  {
    label: '新增项目',
    desc: '快速创建新项目',
    path: '/projects/create',
    icon: Plus
  },
  {
    label: '合同',
    desc: '查看合同记录',
    path: '/contracts',
    icon: Document
  },
  {
    label: '回款',
    desc: '跟踪回款进度',
    path: '/payments',
    icon: Coin
  }
] as const
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

.quick-actions-card {
  margin-top: 4px;
  border-color: #dbe6fb;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
}

.quick-actions-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.quick-actions-heading {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.quick-actions-title {
  font-size: 15px;
  line-height: 1.2;
  font-weight: 700;
  color: #0f172a;
}

.quick-actions-subtitle {
  font-size: 12px;
  color: #64748b;
}

.quick-actions-badge {
  flex: 0 0 auto;
  padding: 4px 8px;
  border-radius: 999px;
  background: #eff4ff;
  border: 1px solid #dbe6fb;
  color: #35558f;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.shortcut-tile {
  appearance: none;
  border: 1px solid #dbe6fb;
  border-radius: 12px;
  background: #fff;
  min-height: 82px;
  padding: 12px 12px 10px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
  text-align: left;
  color: inherit;
  transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease,
    background 0.16s ease;
}

.shortcut-tile:hover {
  transform: translateY(-1px);
  border-color: #bfd1f7;
  background: linear-gradient(180deg, #ffffff 0%, #f7faff 100%);
  box-shadow: 0 8px 18px rgba(47, 92, 246, 0.08);
}

.shortcut-tile:focus-visible {
  outline: none;
  border-color: #9cb8f9;
  box-shadow: 0 0 0 3px rgba(47, 92, 246, 0.14);
}

.shortcut-icon-wrap {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: #eff4ff;
  border: 1px solid #dbe6fb;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}

.shortcut-icon {
  font-size: 18px;
  color: #2f5cf6;
}

.shortcut-content {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 1px;
}

.shortcut-label {
  font-size: 14px;
  line-height: 1.2;
  font-weight: 700;
  color: #0f172a;
}

.shortcut-desc {
  font-size: 12px;
  line-height: 1.35;
  color: #64748b;
}

@media (max-width: 1200px) {
  .quick-actions-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .quick-actions-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .quick-actions-grid {
    grid-template-columns: 1fr;
  }
}
</style>
