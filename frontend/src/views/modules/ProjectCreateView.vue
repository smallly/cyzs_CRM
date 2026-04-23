<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>新建项目</span>
        <el-button @click="router.push('/projects')">返回项目列表</el-button>
      </div>
    </template>

    <el-alert
      v-if="contacts.length === 0"
      type="warning"
      :closable="false"
      show-icon
      style="margin-bottom: 16px"
    >
      当前没有联系人，创建项目前请先新增联系人。
      <el-button size="small" @click="router.push('/contacts')">去新增联系人</el-button>
    </el-alert>

    <el-form :model="formData" :rules="formRules" ref="formRef" label-width="120px">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="项目名称" prop="name">
            <el-input v-model="formData.name" placeholder="请输入项目名称" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="联系人" prop="contactId">
            <el-select v-model="formData.contactId" placeholder="请选择联系人">
              <el-option v-for="c in contacts" :key="c.id" :label="`${c.name} (${c.phone1})`" :value="c.id" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="项目负责人" prop="ownerId">
            <el-select v-model="formData.ownerId" placeholder="请选择项目负责人">
              <el-option v-for="u in users" :key="u.id" :label="u.name" :value="u.id" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="租购类型">
            <el-select v-model="formData.dealType">
              <el-option label="租赁" value="RENT" />
              <el-option label="购买" value="PURCHASE" />
              <el-option label="租购皆可" value="RENT_OR_PURCHASE" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="项目级别">
            <el-select v-model="formData.level">
              <el-option label="A类" value="A类" />
              <el-option label="B类" value="B类" />
              <el-option label="C类" value="C类" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="项目来源">
            <el-select v-model="formData.source">
              <el-option label="电话来访" value="电话来访" />
              <el-option label="网络咨询" value="网络咨询" />
              <el-option label="客户介绍" value="客户介绍" />
              <el-option label="其他" value="其他" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="意向区域">
            <el-input v-model="formData.intendedRegion" placeholder="请输入意向区域" />
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item label="意向面积(㎡)">
            <el-input-number v-model="formData.intendedAreaMin" :min="0" placeholder="最小" />
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item label="至">
            <el-input-number v-model="formData.intendedAreaMax" :min="0" placeholder="最大" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="备注">
            <el-input v-model="formData.remark" type="textarea" :rows="3" placeholder="请输入备注" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item>
        <el-space>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">
            保存项目
          </el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-space>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const formRef = ref()
const loading = ref(false)
const submitting = ref(false)
const contacts = ref<any[]>([])
const users = ref<any[]>([])

const formData = reactive({
  name: '',
  contactId: '',
  ownerId: '',
  dealType: 'RENT',
  level: 'B类',
  source: '电话来访',
  intendedRegion: '',
  intendedAreaMin: 0,
  intendedAreaMax: 0,
  remark: ''
})

const formRules = {
  name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  contactId: [{ required: true, message: '请选择联系人', trigger: 'change' }],
  ownerId: [{ required: true, message: '请选择项目负责人', trigger: 'change' }]
}

onMounted(async () => {
  await loadAll()
})

async function loadAll() {
  loading.value = true
  try {
    await Promise.all([loadContacts(), loadUsers()])
  } finally {
    loading.value = false
  }
}

async function loadContacts() {
  contacts.value = await authStore.api<any[]>('/api/contacts')
}

async function loadUsers() {
  users.value = await authStore.api<any[]>('/api/users')
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
    submitting.value = true

    const created = await authStore.api<{ id: string }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(formData)
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
    level: 'B类',
    source: '电话来访',
    intendedRegion: '',
    intendedAreaMin: 0,
    intendedAreaMax: 0,
    remark: ''
  })
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
