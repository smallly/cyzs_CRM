<template>
  <div>
    <CrudTable
      title="联系人管理"
      :data="contacts"
      :columns="columns"
      :loading="loading"
      :show-add="false"
      :show-edit="true"
      :show-delete="true"
      :show-pagination="true"
      :total="total"
      :default-current-page="page"
      :default-page-size="pageSize"
      @add="goCreate"
      @edit="editContact"
      @delete="deleteContact"
      @refresh="loadContacts"
      @page-change="handlePageChange"
    >
      <template #header>
        <div class="contact-table-header">
          <div class="contact-table-title">联系人管理</div>
          <div class="contact-table-toolbar">
            <div class="contact-search-fields">
              <label class="contact-search-field">
                <span>姓名</span>
                <el-input
                  v-model="searchForm.name"
                  clearable
                  placeholder="请输入姓名"
                  @keyup.enter="handleSearch"
                  @clear="handleSearch"
                />
              </label>
              <label class="contact-search-field">
                <span>企业名称</span>
                <el-input
                  v-model="searchForm.enterpriseName"
                  clearable
                  placeholder="请输入企业名称"
                  @keyup.enter="handleSearch"
                  @clear="handleSearch"
                />
              </label>
              <label class="contact-search-field">
                <span>手机号1</span>
                <el-input
                  v-model="searchForm.phone1"
                  clearable
                  placeholder="请输入手机号1"
                  @keyup.enter="handleSearch"
                  @clear="handleSearch"
                />
              </label>
              <label class="contact-search-field">
                <span>手机号2</span>
                <el-input
                  v-model="searchForm.phone2"
                  clearable
                  placeholder="请输入手机号2"
                  @keyup.enter="handleSearch"
                  @clear="handleSearch"
                />
              </label>
              <el-button class="contact-reset-button" @click="resetSearch">重置</el-button>
            </div>
            <el-button type="primary" @click="goCreate">新增</el-button>
          </div>
        </div>
      </template>

      <template #name="{ row }">
        <el-button link @click="goDetail(row)">{{ row.name || '-' }}</el-button>
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

      <template #createdAt="{ row }">{{ formatDateTime(row.createdAt) }}</template>
      <template #updatedAt="{ row }">{{ formatDateTime(row.updatedAt) }}</template>


    </CrudTable>

    <FormDialog
      v-model:visible="drawerVisible"
      :title="editingContactId ? '编辑联系人' : '新增联系人'"
      :fields="formFields"
      v-model="formData"
      :rules="formRules"
      :submitting="submitting"
      @submit="handleSubmit"
      @cancel="closeDrawer"
      width="860px"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '../../stores/auth'
import CrudTable from '../../components/common/CrudTable.vue'
import FormDialog from '../../components/common/FormDialog.vue'
import type { TableColumn } from '../../components/common/CrudTable.vue'
import type { FormField } from '../../components/common/FormDialog.vue'
import { buildPageQuery, normalizePageResult, type PageResult } from '../../api/page'
import { getUserDisplayName as resolveUserDisplayName } from '../../utils/userDisplay'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const loading = ref(false)
const contacts = ref<any[]>([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const users = ref<any[]>([])
const projects = ref<any[]>([])
let contactRequestSeq = 0

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

const columns: TableColumn[] = [
  { prop: 'name', label: '姓名', width: 120, slot: 'name', fixed: 'left' },
  { prop: 'enterpriseName', label: '企业名称', width: 200 },
  { prop: 'title', label: '职位', width: 120 },
  { prop: 'linkedProjects', label: '关联项目', width: 220, slot: 'linkedProjects' },
  { prop: 'phone1', label: '手机号1', width: 140 },
  { prop: 'phone2', label: '手机号2', width: 140 },
  { prop: 'wechat', label: '微信号', width: 140 },
  { prop: 'email', label: '邮箱', width: 200 },
  { prop: 'ownerId', label: '负责人', width: 120, slot: 'ownerId' },
  { prop: 'deleted', label: '状态', width: 100, slot: 'deleted' },
  { prop: 'creatorId', label: '创建人', width: 120, slot: 'creatorId' },
  { prop: 'createdAt', label: '创建时间', width: 180, slot: 'createdAt' },
  { prop: 'updatedAt', label: '最后编辑时间', width: 180, slot: 'updatedAt' }
]

const formFields: FormField[] = [
  { prop: 'name', label: '姓名', type: 'input', span: 12, required: true, placeholder: '请输入姓名' },
  { prop: 'enterpriseName', label: '企业名称', type: 'input', span: 12, placeholder: '请输入企业名称' },
  { prop: 'title', label: '职位', type: 'input', span: 12, placeholder: '请输入职位' },
  { prop: 'phone1', label: '手机号1', type: 'input', span: 12, required: true, placeholder: '请输入手机号1' },
  { prop: 'phone2', label: '手机号2', type: 'input', span: 12, placeholder: '请输入手机号2（可选）' },
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
  projectIds: []
}

onMounted(async () => {
  await loadContacts()
  void loadUsers()
  void loadProjects()

  const editId = route.query.editId
  if (typeof editId === 'string' && editId) {
    await ensureFormDependencies()
    const contact = await getContactForEdit(editId)
    if (contact) await editContact(contact)
  }
})

async function loadContacts() {
  const requestSeq = ++contactRequestSeq
  loading.value = true
  try {
    const query = buildPageQuery(page.value, pageSize.value, {
      name: searchForm.name,
      enterpriseName: searchForm.enterpriseName,
      phone1: searchForm.phone1,
      phone2: searchForm.phone2
    })
    const res = await authStore.api<PageResult<any> | any[]>(`/api/contacts?${query}`)
    if (requestSeq !== contactRequestSeq) return
    const pageData = normalizePageResult<any>(res)
    contacts.value = pageData.records
    total.value = pageData.total
  } catch (error: any) {
    ElMessage.error(error.message || '加载联系人失败')
  } finally {
    loading.value = false
  }
}

async function loadUsers() {
  try {
    const res = await authStore.api<PageResult<any> | any[]>('/api/users')
    users.value = normalizePageResult<any>(res).records
  } catch {
    users.value = []
  }
}

async function loadProjects() {
  try {
    const res = await authStore.api<PageResult<any> | any[]>('/api/projects')
    projects.value = normalizePageResult<any>(res).records
  } catch {
    projects.value = []
  }

  const projectField = formFields.find((f) => f.prop === 'projectIds')
  if (projectField) {
    projectField.options = projects.value.map((p) => ({
      label: `${p.name || '-'} (${p.code || '-'})`,
      value: p.id
    }))
  }
}

async function ensureFormDependencies() {
  await Promise.allSettled([loadUsers(), loadProjects()])
}

function resetSearch() {
  Object.assign(searchForm, {
    name: undefined,
    enterpriseName: undefined,
    phone1: undefined,
    phone2: undefined
  })
  page.value = 1
  void loadContacts()
}

function handleSearch() {
  page.value = 1
  void loadContacts()
}

async function handlePageChange(nextPage: number, nextSize: number) {
  page.value = nextPage
  pageSize.value = nextSize
  await loadContacts()
}

async function openDrawer() {
  await ensureFormDependencies()
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

function goCreate() {
  router.push('/contacts/create')
}

function goDetail(contact: any) {
  if (!contact?.id) return
  router.push(`/contacts/${contact.id}`)
}

async function editContact(contact: any) {
  await ensureFormDependencies()
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

async function getContactForEdit(id: string) {
  const existing = contacts.value.find((c) => c.id === id)
  if (existing) return existing
  try {
    return await authStore.api<any>(`/api/contacts/${id}`)
  } catch (error: any) {
    ElMessage.error(error.message || '联系人详情加载失败')
    return null
  }
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
  return resolveUserDisplayName(users.value, userId)
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
.contact-table-header {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.contact-table-title {
  color: #111827;
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
}

.contact-table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.contact-search-fields {
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
  min-width: 0;
}

.contact-search-field {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #334155;
  font-size: 14px;
  font-weight: 500;
}

.contact-search-field span {
  flex: 0 0 auto;
  white-space: nowrap;
}

.contact-search-field :deep(.el-input) {
  width: 180px;
}

.contact-search-field :deep(.el-input__inner::placeholder) {
  color: #94a3b8;
}

.contact-reset-button {
  flex: 0 0 auto;
}

@media (max-width: 960px) {
  .contact-table-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .contact-search-fields {
    align-items: stretch;
    flex-direction: column;
  }

  .contact-search-field {
    align-items: flex-start;
    flex-direction: column;
  }

  .contact-search-field :deep(.el-input) {
    width: 100%;
  }
}
</style>
