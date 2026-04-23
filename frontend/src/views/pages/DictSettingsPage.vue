<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>数据字典配置</span>
        <el-space>
          <el-button @click="loadDicts">刷新</el-button>
          <el-button type="primary" :loading="saving" @click="saveDicts">保存</el-button>
        </el-space>
      </div>
    </template>

    <el-form label-width="140px">
      <el-form-item label="项目级别">
        <el-select
          v-model="projectLevels"
          multiple
          allow-create
          filterable
          default-first-option
          placeholder="请输入并回车创建项目级别"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="项目来源">
        <el-select
          v-model="projectSources"
          multiple
          allow-create
          filterable
          default-first-option
          placeholder="请输入并回车创建项目来源"
          style="width: 100%"
        />
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const saving = ref(false)
const projectLevels = ref<string[]>([])
const projectSources = ref<string[]>([])

onMounted(async () => {
  await loadDicts()
})

async function loadDicts() {
  try {
    const res = await authStore.api<{ projectLevels: string[]; projectSources: string[] }>('/api/system/dicts')
    projectLevels.value = res.projectLevels || []
    projectSources.value = res.projectSources || []
  } catch (error: any) {
    ElMessage.error(error.message || '加载字典失败')
  }
}

async function saveDicts() {
  saving.value = true
  try {
    await authStore.api('/api/system/dicts', {
      method: 'PUT',
      body: JSON.stringify({
        projectLevels: projectLevels.value,
        projectSources: projectSources.value
      })
    })
    ElMessage.success('字典已保存')
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
</style>
