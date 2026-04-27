<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <div class="card-title-wrap">
          <el-button class="back-icon-btn" link :icon="ArrowLeft" @click="handleBack" />
          <span>新增联系人</span>
        </div>
        <el-button @click="router.push('/contacts')">返回联系人列表</el-button>
      </div>
    </template>

    <el-form ref="formRef" :model="formData" :rules="formRules" label-width="108px" class="create-form">
      <el-row :gutter="12">
        <el-col :xs="24" :md="12">
          <el-form-item label="姓名" prop="name">
            <el-input v-model="formData.name" placeholder="请输入姓名" />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :md="12">
          <el-form-item label="企业名称">
            <el-input v-model="formData.enterpriseName" placeholder="请输入企业名称" />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :md="12">
          <el-form-item label="职位">
            <el-input v-model="formData.title" placeholder="请输入职位" />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :md="12">
          <el-form-item label="手机号1" prop="phone1">
            <el-input v-model="formData.phone1" placeholder="请输入手机号1" />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :md="12">
          <el-form-item label="手机号2">
            <el-input v-model="formData.phone2" placeholder="请输入手机号2（可选）" />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :md="12">
          <el-form-item label="微信号">
            <el-input v-model="formData.wechat" placeholder="请输入微信号" />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :md="12">
          <el-form-item label="邮箱">
            <el-input v-model="formData.email" placeholder="请输入邮箱" />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :md="12">
          <el-form-item label="办公电话">
            <el-input v-model="formData.officePhone" placeholder="请输入办公电话" />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :md="12">
          <el-form-item label="性别">
            <el-select v-model="formData.gender" placeholder="请选择性别">
              <el-option label="男" value="MALE" />
              <el-option label="女" value="FEMALE" />
              <el-option label="未知" value="UNKNOWN" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :xs="24" :md="12">
          <el-form-item label="是否决策人">
            <el-select v-model="formData.decisionMaker">
              <el-option label="是" :value="true" />
              <el-option label="否" :value="false" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="关联项目" prop="projectIds">
            <el-select v-model="formData.projectIds" multiple filterable placeholder="请选择关联项目">
              <el-option
                v-for="p in projects"
                :key="p.id"
                :label="`${p.name || '-'} (${p.code || '-'})`"
                :value="p.id"
              />
            </el-select>
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
          <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
          <el-button @click="handleCancel">取消</el-button>
        </el-space>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useAuthStore } from '../../stores/auth'
import { normalizePageResult, type PageResult } from '../../api/page'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const formRef = ref()
const submitting = ref(false)
const projects = ref<any[]>([])

const formData = reactive({
  name: '',
  enterpriseName: '',
  title: '',
  phone1: '',
  phone2: '',
  wechat: '',
  email: '',
  officePhone: '',
  gender: '',
  decisionMaker: false,
  projectIds: [] as string[],
  remark: ''
})

const formRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone1: [{ required: true, message: '请输入手机号1', trigger: 'blur' }],
  projectIds: [{ required: true, message: '请选择关联项目', trigger: 'change' }]
}

onMounted(async () => {
  await loadProjects()
  const projectId = typeof route.query.projectId === 'string' ? route.query.projectId : ''
  if (projectId && projects.value.some((p) => p.id === projectId)) {
    formData.projectIds = [projectId]
  }
})

async function loadProjects() {
  const res = await authStore.api<PageResult<any> | any[]>('/api/projects')
  projects.value = normalizePageResult<any>(res).records
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
    submitting.value = true

    await authStore.api('/api/contacts', {
      method: 'POST',
      body: JSON.stringify(formData)
    })

    ElMessage.success('联系人已创建')
    router.push('/contacts')
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
  router.push('/contacts')
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

.create-form :deep(.el-form-item) {
  margin-bottom: 12px;
}

.create-form :deep(.form-actions .el-form-item__content) {
  justify-content: center;
}

.create-form :deep(.el-input),
.create-form :deep(.el-select),
.create-form :deep(.el-textarea) {
  width: 100%;
}
</style>
