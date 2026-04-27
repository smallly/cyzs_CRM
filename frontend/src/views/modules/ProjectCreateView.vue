<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <div class="card-title-wrap">
          <el-button class="back-icon-btn" link :icon="ArrowLeft" @click="handleBack" />
          <span>新建项目</span>
        </div>
        <el-button @click="router.push('/projects')">返回项目列表</el-button>
      </div>
    </template>

    <el-alert v-if="contacts.length === 0" type="warning" :closable="false" show-icon style="margin-bottom: 16px">
      当前没有联系人，创建项目前请先新增联系人。
      <el-button size="small" @click="router.push('/contacts')">去新增联系人</el-button>
    </el-alert>

    <el-form ref="formRef" :model="formData" :rules="formRules" label-width="108px" class="project-create-form">
      <el-row :gutter="12">
        <el-col :xs="24" :sm="24" :md="12">
          <el-form-item label="项目名称" prop="name">
            <el-input v-model="formData.name" placeholder="请输入项目名称" />
          </el-form-item>
        </el-col>

        <el-col :xs="24" :sm="24" :md="12">
          <el-form-item label="联系人" prop="contactId">
            <el-select v-model="formData.contactId" filterable placeholder="请选择联系人">
              <el-option
                v-for="c in contacts"
                :key="c.id"
                :label="`${c.name || '-'} (${c.phone1 || '-'})`"
                :value="c.id"
              />
            </el-select>
          </el-form-item>
        </el-col>

        <el-col :xs="24" :sm="24" :md="12">
          <el-form-item label="项目负责人" prop="ownerId">
            <el-select v-model="formData.ownerId" filterable placeholder="请选择项目负责人">
              <el-option v-for="u in users" :key="u.id" :label="u.name" :value="u.id" />
            </el-select>
          </el-form-item>
        </el-col>

        <el-col :xs="24" :sm="24" :md="12">
          <el-form-item label="租购类型">
            <el-select v-model="formData.dealType">
              <el-option label="租赁" value="RENT" />
              <el-option label="购买" value="BUY" />
              <el-option label="租购皆可" value="BOTH" />
            </el-select>
          </el-form-item>
        </el-col>

        <el-col :xs="24" :sm="24" :md="12">
          <el-form-item label="项目级别">
            <el-select v-model="formData.level" filterable placeholder="请选择项目级别">
              <el-option v-for="item in levelOptions" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>
        </el-col>

        <el-col :xs="24" :sm="24" :md="12">
          <el-form-item label="项目来源">
            <el-select v-model="formData.source" filterable placeholder="请选择项目来源">
              <el-option v-for="item in sourceOptions" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>
        </el-col>

        <el-col :xs="24" :sm="24" :md="12">
          <el-form-item label="意向区域">
            <el-input v-model="formData.intendedRegion" placeholder="请输入意向区域" />
          </el-form-item>
        </el-col>

        <el-col :xs="24" :sm="24" :md="12">
          <el-form-item label="面积最小(m²)">
            <el-input v-model.number="formData.intendedAreaMin" type="number" min="0" placeholder="请输入最小面积" />
          </el-form-item>
        </el-col>

        <el-col :xs="24" :sm="24" :md="12">
          <el-form-item label="面积最大(m²)">
            <el-input v-model.number="formData.intendedAreaMax" type="number" min="0" placeholder="请输入最大面积" />
          </el-form-item>
        </el-col>

        <el-col :span="24">
          <el-form-item label="备注">
            <el-input v-model="formData.remark" type="textarea" :rows="3" placeholder="请输入备注" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item class="form-actions">
        <el-space>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">保存</el-button>
          <el-button @click="handleCancel">取消</el-button>
        </el-space>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useAuthStore } from '../../stores/auth'

interface DictRes {
  projectLevels: string[]
  projectSources: string[]
}

const router = useRouter()
const authStore = useAuthStore()

const formRef = ref()
const submitting = ref(false)
const contacts = ref<any[]>([])
const users = ref<any[]>([])
const levelOptions = ref<string[]>([])
const sourceOptions = ref<string[]>([])

const formData = reactive({
  name: '',
  contactId: '',
  ownerId: '',
  dealType: 'RENT',
  level: '',
  source: '',
  intendedRegion: '',
  intendedAreaMin: undefined as number | undefined,
  intendedAreaMax: undefined as number | undefined,
  remark: ''
})

const formRules = {
  name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  contactId: [{ required: true, message: '请选择联系人', trigger: 'change' }],
  ownerId: [{ required: true, message: '请选择项目负责人', trigger: 'change' }]
}

onMounted(async () => {
  await Promise.all([loadContacts(), loadUsers(), loadDicts()])
})

async function loadContacts() {
  contacts.value = await authStore.api<any[]>('/api/contacts')
}

async function loadUsers() {
  users.value = await authStore.api<any[]>('/api/users')
}

async function loadDicts() {
  try {
    const res = await authStore.api<DictRes>('/api/system/dicts')
    if (Array.isArray(res.projectLevels) && res.projectLevels.length) {
      levelOptions.value = res.projectLevels
    }
    if (Array.isArray(res.projectSources) && res.projectSources.length) {
      sourceOptions.value = res.projectSources
    }
  } catch {
    // ignore, will validate again before submit
  }

  if (!formData.level && levelOptions.value.length) {
    formData.level = levelOptions.value[0]
  }
  if (!formData.source && sourceOptions.value.length) {
    formData.source = sourceOptions.value[0]
  }
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
    submitting.value = true

    // Always align with backend dictionary right before submit.
    await loadDicts()

    const levelValid = !formData.level || levelOptions.value.includes(formData.level)
    const sourceValid = !formData.source || sourceOptions.value.includes(formData.source)
    if (!levelValid) {
      ElMessage.warning('项目级别已变更，请重新选择')
      formData.level = ''
      return
    }
    if (!sourceValid) {
      ElMessage.warning('项目来源已变更，请重新选择')
      formData.source = ''
      return
    }

    if (
      formData.intendedAreaMin != null &&
      formData.intendedAreaMax != null &&
      formData.intendedAreaMin > formData.intendedAreaMax
    ) {
      ElMessage.warning('面积区间不合法：最小值不能大于最大值')
      return
    }

    const payload: Record<string, any> = {
      name: formData.name,
      contactId: formData.contactId,
      ownerId: formData.ownerId,
      dealType: formData.dealType,
      intendedRegion: formData.intendedRegion || undefined,
      intendedAreaMin: formData.intendedAreaMin,
      intendedAreaMax: formData.intendedAreaMax,
      remark: formData.remark || undefined
    }
    if (formData.level) payload.level = formData.level
    if (formData.source) payload.source = formData.source

    const created = await authStore.api<{ id: string }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(payload)
    })

    ElMessage.success('项目已创建')
    router.push(`/projects/${created.id}`)
  } catch (error: any) {
    ElMessage.error(error.message || '创建失败')
  } finally {
    submitting.value = false
  }
}

function resetForm() {
  Object.assign(formData, {
    name: '',
    contactId: '',
    ownerId: '',
    dealType: 'RENT',
    level: '',
    source: '',
    intendedRegion: '',
    intendedAreaMin: undefined,
    intendedAreaMax: undefined,
    remark: ''
  })
}

function handleBack() {
  if (window.history.length > 1) {
    router.back()
    return
  }
  router.push('/projects')
}

function handleCancel() {
  handleBack()
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.card-title-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
}

.back-icon-btn {
  font-size: 16px;
  padding: 0;
}

.project-create-form :deep(.el-form-item) {
  margin-bottom: 12px;
}

.project-create-form :deep(.form-actions .el-form-item__content) {
  justify-content: center;
}

.project-create-form :deep(.el-input),
.project-create-form :deep(.el-select),
.project-create-form :deep(.el-textarea) {
  width: 100%;
}
</style>
