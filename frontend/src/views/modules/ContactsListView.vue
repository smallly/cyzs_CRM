<template>
  <div>
    <SearchPanel
      v-model="searchForm"
      :fields="searchFields"
      @search="loadContacts"
      @reset="resetSearch"
    />

    <CrudTable
      title="联系人管理"
      :data="contacts"
      :columns="columns"
      :loading="loading"
      :show-add="true"
      @add="openDrawer"
      @refresh="loadContacts"
    >
      <template #name="{ row }">
        <el-button link @click="editContact(row)">
          {{ row.name || '-' }}
        </el-button>
      </template>

      <template #linkedProjects="{ row }">
        {{ getLinkedProjectNames(row) }}
      </template>

      <template #ownerId="{ row }">
        {{ getUserDisplayName(row.ownerId) }}
      </template>

      <template #creatorId="{ row }">
        {{ getUserDisplayName(row.creatorId) }}
      </template>

      <template #deleted="{ row }">
        <el-tag :type="row.deleted ? 'danger' : 'success'" size="small">
          {{ row.deleted ? '已删除' : '正常' }}
        </el-tag>
      </template>

      <template #createdAt="{ row }">
        {{ formatDateTime(row.createdAt) }}
      </template>

      <template #updatedAt="{ row }">
        {{ formatDateTime(row.updatedAt) }}
      </template>

      <template #actions="{ row }">
        <el-space>
          <el-button size="small" @click="editContact(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="deleteContact(row.id)">删除</el-button>
        </el-space>
      </template>
    </CrudTable>

    <FormDrawer
      v-model:visible="drawerVisible"
      :title="editingContactId ? '编辑联系人' : '新增联系人'"
      :fields="formFields"
      v-model="formData"
      :rules="formRules"
      :submitting="submitting"
      @submit="handleSubmit"
      @cancel="closeDrawer"
      size="60%"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '../../stores/auth'
import CrudTable from '../../components/common/CrudTable.vue'
import FormDrawer from '../../components/common/FormDrawer.vue'
import SearchPanel from '../../components/common/SearchPanel.vue'
import type { SearchField } from '../../components/common/SearchPanel.vue'
import type { TableColumn } from '../../components/common/CrudTable.vue'
import type { FormField } from '../../components/common/FormDrawer.vue'

const authStore = useAuthStore()
const route = useRoute()

const loading = ref(false)
const contacts = ref<any[]>([])
const users = ref<any[]>([])
const projects = ref<any[]>([])

const searchForm = reactive({
  name: undefined as string | undefined,
  enterpriseName: undefined as string | undefined,
  phone1: undefined as string | undefined,
  phone2: undefined as string | undefined
})

const drawerVisible = ref(false)
const editingContactId = ref('')
const submitting = ref(false)
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

const searchFields: SearchField[] = [
  { prop: 'name', label: '姓名', span: 6 },
  { prop: 'enterpriseName', label: '企业名称', span: 6 },
  { prop: 'phone1', label: '手机号1', span: 6 },
  { prop: 'phone2', label: '手机号2', span: 6 }
]

const columns: TableColumn[] = [
  { prop: 'name', label: '姓名', width: 120, slot: 'name', fixed: 'left' },
  { prop: 'enterpriseName', label: '企业名称', width: 200 },
  { prop: 'title', label: '职位', width: 150 },
  { prop: 'linkedProjects', label: '关联项目', width: 200, slot: 'linkedProjects' },
  { prop: 'phone1', label: '手机号1', width: 130 },
  { prop: 'phone2', label: '手机号2', width: 130 },
  { prop: 'wechat', label: '微信号', width: 140 },
  { prop: 'email', label: '邮箱', width: 200 },
  { prop: 'id', label: 'ID', width: 180 },
  { prop: 'ownerId', label: '负责人', width: 120, slot: 'ownerId' },
  { prop: 'creatorId', label: '创建人', width: 120, slot: 'creatorId' },
  { prop: 'deleted', label: '状态', width: 100, slot: 'deleted' },
  { prop: 'createdAt', label: '创建时间', width: 180, slot: 'createdAt' },
  { prop: 'updatedAt', label: '最后编辑时间', width: 180, slot: 'updatedAt' }
]

const formFields: FormField[] = [
  { prop: 'name', label: '姓名', type: 'input', span: 12, required: true, placeholder: '请输入姓名' },
  { prop: 'enterpriseName', label: '企业名称', type: 'input', span: 12, placeholder: '请输入企业名称' },
  { prop: 'title', label: '职位', type: 'input', span: 12, placeholder: '请输入职位' },
  { prop: 'phone1', label: '手机号1', type: 'input', span: 12, required: true, placeholder: '请输入手机号1' },
  { prop: 'phone2', label: '手机号2', type: 'input', span: 12, placeholder: '请输入手机号2(可选)' },
  { prop: 'wechat', label: '微信号', type: 'input', span: 12, placeholder: '请输入微信号' },
  { prop: 'email', label: '邮箱', type: 'input', span: 12, placeholder: '请输入邮箱' },
  { prop: 'officePhone', label: '办公电话', type: 'input', span: 12, placeholder: '请输入办公电话' },
  {
    prop: 'gender',
    label: '性别',
    type: 'select',
    span: 12,
    placeholder: '请选择性别',
    options: [
      { label: '男', value: 'MALE' },
      { label: '女', value: 'FEMALE' },
      { label: '未知', value: 'UNKNOWN' }
    ]
  },
  {
    prop: 'decisionMaker',
    label: '是否决策人',
    type: 'select',
    span: 12,
    options: [
      { label: '是', value: true },
      { label: '否', value: false }
    ]
  },
  {
    prop: 'projectIds',
    label: '关联项目',
    type: 'select',
    span: 24,
    placeholder: '请选择关联项目',
    required: true,
    multiple: true,
    options: []
  },
  { prop: 'remark', label: '备注', type: 'textarea', span: 24, placeholder: '请输入备注' }
]

const formRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone1: [{ required: true, message: '请输入手机号1', trigger: 'blur' }],
  projectIds: [{ required: true, message: '请选择关联项目', trigger: 'change' }]
}

onMounted(async () => {
  await loadAll()
  const editId = route.query.editId
  if (typeof editId === 'string' && editId) {
    const contact = contacts.value.find((c) => c.id === editId)
    if (contact) {
      editContact(contact)
    }
  }
})

async function loadAll() {
  loading.value = true
  try {
    await Promise.all([loadContacts(), loadUsers(), loadProjects()])
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function loadContacts() {
  try {
    const data = await authStore.api<any[]>('/api/contacts')
    contacts.value = data.filter((c) => {
      if (searchForm.name && !c.name?.includes(searchForm.name)) return false
      if (searchForm.enterpriseName && !c.enterpriseName?.includes(searchForm.enterpriseName)) return false
      if (searchForm.phone1 && !c.phone1?.includes(searchForm.phone1)) return false
      if (searchForm.phone2 && !c.phone2?.includes(searchForm.phone2)) return false
      return true
    })
  } catch (error: any) {
    ElMessage.error(error.message || '加载联系人失败')
  }
}

async function loadUsers() {
  users.value = await authStore.api<any[]>('/api/users')
}

async function loadProjects() {
  projects.value = await authStore.api<any[]>('/api/projects')
  const projectField = formFields.find((f) => f.prop === 'projectIds')
  if (projectField) {
    projectField.options = projects.value.map((p) => ({ label: `${p.name} (${p.code})`, value: p.id }))
  }
}

function resetSearch() {
  Object.assign(searchForm, {
    name: undefined,
    enterpriseName: undefined,
    phone1: undefined,
    phone2: undefined
  })
  loadContacts()
}

function openDrawer() {
  editingContactId.value = ''
  Object.assign(formData, {
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
    projectIds: [],
    remark: ''
  })
  drawerVisible.value = true
}

function editContact(contact: any) {
  const linkedProjectIds = projects.value
    .filter((p) => p.contactId === contact.id || p.contactIds?.includes(contact.id))
    .map((p) => p.id)
  editingContactId.value = contact.id
  Object.assign(formData, {
    name: contact.name || '',
    enterpriseName: contact.enterpriseName || '',
    title: contact.title || '',
    phone1: contact.phone1 || '',
    phone2: contact.phone2 || '',
    wechat: contact.wechat || '',
    email: contact.email || '',
    officePhone: contact.officePhone || '',
    gender: contact.gender || '',
    decisionMaker: !!contact.decisionMaker,
    projectIds: linkedProjectIds,
    remark: contact.remark || ''
  })
  drawerVisible.value = true
}

function closeDrawer() {
  drawerVisible.value = false
  editingContactId.value = ''
}

async function handleSubmit() {
  submitting.value = true
  try {
    if (editingContactId.value) {
      await authStore.api(`/api/contacts/${editingContactId.value}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      })
      ElMessage.success('联系人已更新')
    } else {
      await authStore.api('/api/contacts', {
        method: 'POST',
        body: JSON.stringify(formData)
      })
      ElMessage.success('联系人已创建')
    }
    await loadContacts()
    closeDrawer()
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

async function deleteContact(id: string) {
  try {
    await ElMessageBox.confirm('确认删除该联系人吗?', '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await authStore.api(`/api/contacts/${id}`, { method: 'DELETE' })
    ElMessage.success('联系人已删除')
    await loadContacts()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

function getUserDisplayName(userId?: string): string {
  if (!userId) return '-'
  const user = users.value.find((u) => u.id === userId)
  return user?.name || userId
}

function getLinkedProjectNames(contact: any): string {
  const linkedProjects = projects.value.filter(
    (p) => p.contactIds?.includes(contact.id) || p.contactId === contact.id
  )
  return linkedProjects.map((p) => p.name).join(', ') || '-'
}

function formatDateTime(value?: string | null): string {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('zh-CN')
  } catch {
    return value
  }
}
</script>

<style scoped>
</style>
