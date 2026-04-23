<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>项目数据范围配置</span>
        <el-button @click="loadScopeMode">刷新</el-button>
      </div>
    </template>

    <el-form label-width="120px" class="scope-form">
      <el-form-item label="当前模式">
        <el-select v-model="scopeMode" placeholder="请选择数据范围模式" style="width: 320px">
          <el-option label="仅本人数据" value="SELF" />
          <el-option label="本人及下属数据" value="SELF_AND_SUBORDINATES" />
          <el-option label="本部门数据" value="DEPT" />
          <el-option label="本部门及以下数据" value="DEPT_AND_SUBTREE" />
          <el-option label="全部数据" value="ALL" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="saving" @click="saveScopeMode">保存配置</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()

const scopeMode = ref('SELF_AND_SUBORDINATES')
const loading = ref(false)
const saving = ref(false)

onMounted(async () => {
  await loadScopeMode()
})

async function loadScopeMode() {
  loading.value = true
  try {
    const res = await authStore.api<{ mode: string }>('/api/system/scope-mode')
    scopeMode.value = res.mode
  } catch (error: any) {
    ElMessage.error(error.message || '加载配置失败')
  } finally {
    loading.value = false
  }
}

async function saveScopeMode() {
  saving.value = true
  try {
    await authStore.api('/api/system/scope-mode', {
      method: 'PUT',
      body: JSON.stringify({ mode: scopeMode.value })
    })
    ElMessage.success('配置已保存')
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.scope-form {
  max-width: 640px;
}
</style>
