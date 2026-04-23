<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>角色管理（默认角色）</span>
        <el-button @click="loadRoles">刷新</el-button>
      </div>
    </template>

    <el-table :data="roles" v-loading="loading" border stripe>
      <el-table-column prop="code" label="角色编码" width="160" />
      <el-table-column prop="name" label="角色名称" width="150" />
      <el-table-column label="业务角色" width="140">
        <template #default="{ row }">{{ row.bizRole }}</template>
      </el-table-column>
      <el-table-column label="系统管理员" width="120">
        <template #default="{ row }">
          <el-tag :type="row.systemAdmin ? 'success' : 'info'">{{ row.systemAdmin ? '是' : '否' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="默认数据范围" width="170">
        <template #default="{ row }">{{ getScopeLabel(row.defaultDataScope) }}</template>
      </el-table-column>
      <el-table-column prop="description" label="说明" min-width="260" />
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const loading = ref(false)
const roles = ref<any[]>([])

onMounted(async () => {
  await loadRoles()
})

async function loadRoles() {
  loading.value = true
  try {
    roles.value = await authStore.api<any[]>('/api/roles')
  } catch (error: any) {
    ElMessage.error(error.message || '加载角色失败')
  } finally {
    loading.value = false
  }
}

function getScopeLabel(scope?: string): string {
  const map: Record<string, string> = {
    ALL: '全部数据',
    SELF: '仅本人',
    SELF_AND_SUBORDINATES: '本人及下属',
    DEPT: '本部门',
    DEPT_AND_SUBTREE: '本部门及以下'
  }
  return map[scope || ''] || scope || '-'
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
