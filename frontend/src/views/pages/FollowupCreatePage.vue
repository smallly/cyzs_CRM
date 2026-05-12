<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <div class="card-title-wrap">
          <el-button class="back-icon-btn" link :icon="ArrowLeft" @click="handleBack" />
          <span>{{ isEditMode ? '编辑跟进记录' : '新增跟进记录' }}</span>
        </div>
      </div>
    </template>

    <el-form ref="formRef" :model="formData" :rules="formRules" label-width="108px" class="create-form">
      <el-row :gutter="12">
        <el-col :xs="24" :md="12">
          <el-form-item label="所属项目" prop="projectId">
            <el-select v-model="formData.projectId" :disabled="isEditMode" filterable placeholder="请选择项目" @change="handleProjectChange">
              <el-option
                v-for="p in projects"
                :key="p.id"
                :label="`${p.name || '-'} (${p.code || '-'})`"
                :value="p.id"
              />
            </el-select>
          </el-form-item>
        </el-col>

        <el-col :xs="24" :md="12">
          <el-form-item label="跟进时间" prop="followupAt">
            <el-date-picker v-model="formData.followupAt" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
          </el-form-item>
        </el-col>

        <el-col :xs="24" :md="12">
          <el-form-item label="跟进方式">
            <el-input v-model="formData.method" placeholder="如：电话、面谈、微信" />
          </el-form-item>
        </el-col>

        <el-col :xs="24" :md="12">
          <el-form-item label="关联联系人">
            <el-select v-model="formData.contactId" clearable filterable placeholder="请选择联系人">
              <el-option
                v-for="c in availableContacts"
                :key="c.id"
                :label="`${c.name || '-'} (${c.phone1 || '-'})`"
                :value="c.id"
              />
            </el-select>
          </el-form-item>
        </el-col>

        <el-col :span="24">
          <el-form-item label="跟进内容" prop="content">
            <el-input v-model="formData.content" type="textarea" :rows="4" placeholder="请输入跟进内容" />
          </el-form-item>
        </el-col>

        <el-col :span="24">
          <el-form-item label="附件">
            <AttachmentUploadField v-model="formData.attachment" hint-text="支持图片、PDF 和常见文档。"/>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item class="form-actions">
        <el-space>
          <el-button @click="handleCancel">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">
            {{ isEditMode ? '保存' : '提交' }}
          </el-button>
        </el-space>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useAuthStore } from '../../stores/auth'
import { AttachmentUploadField } from '../../components/common'
import { normalizePageResult, type PageResult } from '../../api/page'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const formRef = ref()
const submitting = ref(false)
const projects = ref<any[]>([])
const contacts = ref<any[]>([])

const editId = computed(() => (typeof route.query.id === 'string' ? route.query.id : ''))
const isEditMode = computed(() => Boolean(editId.value))

const formData = reactive({
  projectId: '',
  content: '',
  followupAt: new Date().toISOString().split('T')[0],
  method: '',
  contactId: '',
  attachment: ''
})

const formRules = {
  projectId: [{ required: true, message: '请选择项目', trigger: 'change' }],
  content: [{ required: true, message: '请输入跟进内容', trigger: 'blur' }],
  followupAt: [{ required: true, message: '请选择跟进时间', trigger: 'change' }]
}

const availableContacts = computed(() => {
  if (!formData.projectId) return contacts.value
  const project = projects.value.find((p) => p.id === formData.projectId)
  if (!project) return []
  return contacts.value.filter((c) =>
    project.contactId === c.id ||
    project.contactIds?.includes(c.id) ||
    c.projectIds?.includes(project.id)
  )
})

onMounted(async () => {
  await Promise.all([loadProjects(), loadContacts()])

  if (isEditMode.value) {
    await loadFollowup()
    return
  }

  const projectId = typeof route.query.projectId === 'string' ? route.query.projectId : ''
  if (projectId && projects.value.some((p) => p.id === projectId)) {
    formData.projectId = projectId
    handleProjectChange()
  }
})

async function loadProjects() {
  const res = await authStore.api<PageResult<any> | any[]>('/api/projects')
  projects.value = normalizePageResult<any>(res).records
}

async function loadContacts() {
  const res = await authStore.api<PageResult<any> | any[]>('/api/contacts')
  contacts.value = normalizePageResult<any>(res).records
}

async function loadFollowup() {
  try {
    const data = await authStore.api<any>(`/api/followups/${editId.value}`)
    formData.projectId = data.projectId || ''
    formData.content = data.content || ''
    formData.followupAt = toDateValue(data.followupAt) || new Date().toISOString().split('T')[0]
    formData.method = data.method || ''
    formData.contactId = data.contactId || ''
    formData.attachment = data.attachment || ''
  } catch (error: any) {
    ElMessage.error(error.message || '跟进记录加载失败')
    router.push('/followups')
  }
}

function handleProjectChange() {
  const project = projects.value.find((p) => p.id === formData.projectId)
  if (!project) {
    formData.contactId = ''
    return
  }
  if (!availableContacts.value.some((c) => c.id === formData.contactId)) {
    formData.contactId = project.contactId || availableContacts.value[0]?.id || ''
  }
}

function toDateTimeValue(date: string): string {
  return `${date}T00:00:00`
}

function toDateValue(value?: string | null): string {
  if (!value) return ''
  return String(value).split('T')[0]
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
    submitting.value = true

    await authStore.api(isEditMode.value ? `/api/followups/${editId.value}` : '/api/followups', {
      method: isEditMode.value ? 'PUT' : 'POST',
      body: JSON.stringify({
        projectId: formData.projectId,
        content: formData.content,
        followupAt: toDateTimeValue(formData.followupAt),
        method: formData.method || null,
        contactId: formData.contactId || null,
        attachment: formData.attachment || null
      })
    })

    ElMessage.success(isEditMode.value ? '跟进记录已保存' : '跟进记录已创建')
    router.push('/followups')
  } catch (error: any) {
    ElMessage.error(error.message || '创建失败')
  } finally {
    submitting.value = false
  }
}

function handleBack() {
  if (window.history.length > 1) {
    router.back()
    return
  }
  router.push('/followups')
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

.create-form :deep(.el-form-item) {
  margin-bottom: 12px;
}

.create-form :deep(.form-actions .el-form-item__content) {
  justify-content: center;
}
</style>
