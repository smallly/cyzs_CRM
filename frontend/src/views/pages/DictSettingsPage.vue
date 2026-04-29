<template>
  <div class="dict-page">
    <el-card class="dict-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>数据字典配置</span>
          <el-button type="primary" :loading="saving" @click="saveDicts">保存</el-button>
        </div>
      </template>

      <div class="dict-workspace" v-loading="loading">
        <aside class="dict-sidebar">
          <el-input v-model="categoryKeyword" placeholder="请输入筛选项" clearable>
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <div class="category-tree">
            <div class="category-group">
              <div class="category-group-title">
                <el-icon><ArrowDown /></el-icon>
                <span>项目</span>
              </div>
              <button
                v-for="item in filteredCategories"
                :key="item.key"
                class="category-item"
                :class="{ active: activeCategoryKey === item.key }"
                @click="selectCategory(item.key)"
              >
                {{ item.label }}
              </button>
            </div>
          </div>
        </aside>

        <main class="dict-content">
          <div class="content-title">{{ activeCategory.label }}</div>
          <el-button type="primary" class="add-button" @click="addOption">+ 添加选项</el-button>

          <div class="option-list">
            <div v-for="(option, index) in activeOptions" :key="option.id" class="option-row">
              <span class="option-label">选项{{ index + 1 }}：</span>
              <el-input
                v-if="option.editing"
                v-model="option.draft"
                class="option-input"
                placeholder="请输入"
                @keyup.enter="saveOption(option)"
              />
              <span v-else class="option-value">{{ option.value }}</span>

              <div class="option-actions">
                <template v-if="option.editing">
                  <el-button link type="primary" @click="saveOption(option)">保存</el-button>
                  <el-button link @click="cancelEdit(option)">取消</el-button>
                </template>
                <template v-else>
                  <el-button link type="primary" @click="editOption(option)">编辑</el-button>
                  <el-button link type="primary" :disabled="index === 0" @click="moveOption(index, -1)">上移</el-button>
                  <el-button
                    link
                    type="primary"
                    :disabled="index === activeOptions.length - 1"
                    @click="moveOption(index, 1)"
                  >
                    下移
                  </el-button>
                  <el-button link type="danger" @click="removeOption(index)">删除</el-button>
                </template>
              </div>
            </div>
          </div>

          <el-empty v-if="!activeOptions.length" description="暂无选项" />
        </main>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDown, Search } from '@element-plus/icons-vue'
import { useAuthStore } from '../../stores/auth'

type DictKey = 'projectLevels' | 'projectSources'

interface DictCategory {
  key: DictKey
  label: string
}

interface DictOption {
  id: string
  value: string
  draft: string
  editing: boolean
  isNew: boolean
}

const categories: DictCategory[] = [
  { key: 'projectLevels', label: '项目级别' },
  { key: 'projectSources', label: '项目来源' }
]

const authStore = useAuthStore()
const loading = ref(false)
const saving = ref(false)
const categoryKeyword = ref('')
const activeCategoryKey = ref<DictKey>('projectLevels')
const dicts = reactive<Record<DictKey, DictOption[]>>({
  projectLevels: [],
  projectSources: []
})

const filteredCategories = computed(() => {
  const keyword = categoryKeyword.value.trim()
  if (!keyword) return categories
  return categories.filter((item) => item.label.includes(keyword))
})

const activeCategory = computed(() => categories.find((item) => item.key === activeCategoryKey.value) || categories[0])
const activeOptions = computed(() => dicts[activeCategoryKey.value])

onMounted(async () => {
  await loadDicts()
})

async function loadDicts() {
  loading.value = true
  try {
    const res = await authStore.api<{ projectLevels: string[]; projectSources: string[] }>('/api/system/dicts')
    dicts.projectLevels = toOptions(res.projectLevels || [])
    dicts.projectSources = toOptions(res.projectSources || [])
  } catch (error: any) {
    ElMessage.error(error.message || '加载字典失败')
  } finally {
    loading.value = false
  }
}

function toOptions(values: string[]): DictOption[] {
  return values.map((value, index) => ({
    id: `${Date.now()}-${index}-${value}`,
    value,
    draft: value,
    editing: false,
    isNew: false
  }))
}

function selectCategory(key: DictKey) {
  activeCategoryKey.value = key
}

function addOption() {
  activeOptions.value.push({
    id: `${Date.now()}-${Math.random()}`,
    value: '',
    draft: '',
    editing: true,
    isNew: true
  })
}

function editOption(option: DictOption) {
  option.draft = option.value
  option.editing = true
}

function saveOption(option: DictOption) {
  const next = option.draft.trim()
  if (!next) {
    ElMessage.warning('请输入选项名称')
    return
  }
  const duplicate = activeOptions.value.some((item) => item !== option && item.value === next)
  if (duplicate) {
    ElMessage.warning('选项名称不能重复')
    return
  }
  option.value = next
  option.draft = next
  option.editing = false
  option.isNew = false
}

function cancelEdit(option: DictOption) {
  if (option.isNew) {
    const index = activeOptions.value.indexOf(option)
    if (index >= 0) activeOptions.value.splice(index, 1)
    return
  }
  option.draft = option.value
  option.editing = false
}

function moveOption(index: number, offset: -1 | 1) {
  const targetIndex = index + offset
  if (targetIndex < 0 || targetIndex >= activeOptions.value.length) return
  const [item] = activeOptions.value.splice(index, 1)
  activeOptions.value.splice(targetIndex, 0, item)
}

async function removeOption(index: number) {
  const option = activeOptions.value[index]
  if (!option) return
  try {
    await ElMessageBox.confirm(`确认删除选项「${option.value || option.draft || '-'}」？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
    activeOptions.value.splice(index, 1)
  } catch (error) {
    if (error === 'cancel' || error === 'close') return
  }
}

async function saveDicts() {
  const editing = categories.some((category) => dicts[category.key].some((option) => option.editing))
  if (editing) {
    ElMessage.warning('请先保存或取消正在编辑的选项')
    return
  }

  const projectLevels = dicts.projectLevels.map((item) => item.value.trim()).filter(Boolean)
  const projectSources = dicts.projectSources.map((item) => item.value.trim()).filter(Boolean)
  if (!projectLevels.length || !projectSources.length) {
    ElMessage.warning('项目级别和项目来源至少保留一个选项')
    return
  }

  saving.value = true
  try {
    await authStore.api('/api/system/dicts', {
      method: 'PUT',
      body: JSON.stringify({
        projectLevels,
        projectSources
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
.dict-page {
  height: 100%;
}

.dict-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.dict-workspace {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  min-height: calc(100vh - 210px);
}

.dict-sidebar {
  padding: 18px 22px 24px 8px;
  border-right: 1px solid #e2e8f0;
}

.category-tree {
  margin-top: 24px;
}

.category-group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  color: #64748b;
  font-size: 14px;
}

.category-item {
  display: block;
  width: 100%;
  height: 40px;
  padding: 0 18px 0 30px;
  border: 0;
  border-right: 3px solid transparent;
  background: transparent;
  color: #334155;
  text-align: left;
  font-size: 14px;
  cursor: pointer;
}

.category-item:hover {
  background: #f6f8fb;
}

.category-item.active {
  border-right-color: #2f5cf6;
  background: #f6f8fb;
  color: #1f2937;
  font-weight: 600;
}

.dict-content {
  padding: 26px 32px;
  min-width: 0;
}

.content-title {
  color: #1e293b;
  font-size: 18px;
  font-weight: 700;
}

.add-button {
  margin-top: 24px;
}

.option-list {
  margin-top: 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.option-row {
  display: grid;
  grid-template-columns: auto minmax(180px, 420px) 1fr;
  align-items: center;
  gap: 12px;
  min-height: 58px;
  padding: 14px 22px;
  background: #f7f8fb;
}

.option-label {
  color: #334155;
  white-space: nowrap;
}

.option-value {
  color: #1f2937;
}

.option-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: flex-start;
}

.option-input {
  width: 100%;
}

@media (max-width: 960px) {
  .dict-workspace {
    grid-template-columns: 1fr;
  }

  .dict-sidebar {
    border-right: 0;
    border-bottom: 1px solid #e2e8f0;
    padding-right: 8px;
  }

  .option-row {
    grid-template-columns: 1fr;
  }
}
</style>
