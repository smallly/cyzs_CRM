<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <div class="card-title-wrap">
          <el-button class="back-icon-btn" link :icon="ArrowLeft" @click="handleBack" />
          <span>新建项目</span>
        </div>
      </div>
    </template>

    <el-form ref="formRef" :model="formData" :rules="formRules" label-width="108px" class="project-create-form">
      <el-row :gutter="12">
        <el-col :xs="24" :sm="24" :md="12">
          <el-form-item label="项目名称" prop="name">
            <el-input v-model="formData.name" placeholder="请输入项目名称" />
          </el-form-item>
        </el-col>

        <el-col :xs="24" :sm="24" :md="12">
          <el-form-item label="联系人" prop="contactId">
            <div class="contact-selector">
              <el-tooltip
                :content="selectedContactLabel"
                :disabled="!selectedContactLabel"
                placement="top-start"
                effect="dark"
              >
                <el-input
                  :model-value="selectedContactDisplayLabel"
                  readonly
                  placeholder="请选择联系人"
                  class="contact-input"
                  @click="openContactDialog"
                />
              </el-tooltip>
              <el-button class="contact-add-btn" @click="openContactDialog">
                <el-icon><Plus /></el-icon>
              </el-button>
            </div>
          </el-form-item>
        </el-col>

        <!-- 选择联系人弹窗 -->
        <el-dialog
          v-model="contactDialogVisible"
          title="选择联系人"
          width="720px"
          :close-on-click-modal="false"
        >
          <div class="contact-dialog-header">
            <el-input
              v-model="contactSearchKeyword"
              placeholder="搜索姓名或手机号"
              clearable
              style="width: 280px"
              @keyup.enter="filterContacts"
            >
              <template #suffix>
                <el-icon @click="filterContacts" style="cursor: pointer"><Search /></el-icon>
              </template>
            </el-input>
            <el-button type="primary" @click="openCreateContactDialog">新建联系人</el-button>
          </div>

          <el-table
            ref="contactTableRef"
            :data="filteredContacts"
            row-key="id"
            style="margin-top: 16px"
            @selection-change="handleContactSelectionChange"
          >
            <el-table-column type="selection" width="55" reserve-selection />
            <el-table-column prop="name" label="姓名" width="120" />
            <el-table-column prop="phone1" label="手机号" width="140" />
            <el-table-column prop="enterpriseName" label="企业" />
            <el-table-column prop="title" label="职位" width="120" />
          </el-table>

          <template #footer>
            <el-space>
              <el-button @click="contactDialogVisible = false">取消</el-button>
              <el-button type="primary" @click="confirmContactSelect">确定</el-button>
            </el-space>
          </template>
        </el-dialog>

        <el-dialog
          v-model="createContactDialogVisible"
          title="新建联系人"
          width="860px"
          :close-on-click-modal="false"
          destroy-on-close
        >
          <el-form
            ref="createContactFormRef"
            :model="createContactFormData"
            :rules="createContactFormRules"
            label-width="100px"
            class="create-contact-form"
          >
            <el-row :gutter="12">
              <el-col :xs="24" :md="12">
                <el-form-item label="姓名" prop="name">
                  <el-input v-model="createContactFormData.name" placeholder="请输入姓名" />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :md="12">
                <el-form-item label="企业名称">
                  <el-input v-model="createContactFormData.enterpriseName" placeholder="请输入企业名称" />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :md="12">
                <el-form-item label="职位">
                  <el-input v-model="createContactFormData.title" placeholder="请输入职位" />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :md="12">
                <el-form-item label="手机号1" prop="phone1">
                  <el-input v-model="createContactFormData.phone1" placeholder="请输入手机号1" />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :md="12">
                <el-form-item label="手机号2">
                  <el-input v-model="createContactFormData.phone2" placeholder="请输入手机号2（可选）" />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :md="12">
                <el-form-item label="微信号">
                  <el-input v-model="createContactFormData.wechat" placeholder="请输入微信号" />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :md="12">
                <el-form-item label="邮箱">
                  <el-input v-model="createContactFormData.email" placeholder="请输入邮箱" />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :md="12">
                <el-form-item label="办公电话">
                  <el-input v-model="createContactFormData.officePhone" placeholder="请输入办公电话" />
                </el-form-item>
              </el-col>
              <el-col :xs="24" :md="12">
                <el-form-item label="性别">
                  <el-select v-model="createContactFormData.gender" placeholder="请选择性别">
                    <el-option label="男" value="MALE" />
                    <el-option label="女" value="FEMALE" />
                    <el-option label="未知" value="UNKNOWN" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :xs="24" :md="12">
                <el-form-item label="是否决策人">
                  <el-select v-model="createContactFormData.decisionMaker">
                    <el-option label="是" :value="true" />
                    <el-option label="否" :value="false" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item label="备注">
                  <el-input v-model="createContactFormData.remark" type="textarea" :rows="3" placeholder="请输入备注" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>

          <template #footer>
            <el-space>
              <el-button @click="createContactDialogVisible = false">取消</el-button>
              <el-button type="primary" :loading="createContactSubmitting" @click="submitCreateContact">保存联系人</el-button>
            </el-space>
          </template>
        </el-dialog>

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
          <el-form-item label="意向面积">
            <div class="area-range-inputs">
              <el-input v-model="formData.intendedAreaMinInput" placeholder="最小面积" />
              <span class="area-range-separator">-</span>
              <el-input v-model="formData.intendedAreaMaxInput" placeholder="最大面积" />
            </div>
          </el-form-item>
        </el-col>

        <el-col :xs="24" :sm="24" :md="12">
          <el-form-item label="意向价格">
            <el-input v-model="formData.intendedPrice" placeholder="请输入意向价格，如 5000元/月" />
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
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Plus, Search } from '@element-plus/icons-vue'
import { useAuthStore } from '../../stores/auth'
import { normalizePageResult, type PageResult } from '../../api/page'

interface DictRes {
  projectLevels: string[]
  projectSources: string[]
}

const router = useRouter()
const authStore = useAuthStore()

const formRef = ref()
const contactTableRef = ref()
const submitting = ref(false)
const createContactSubmitting = ref(false)
const contacts = ref<any[]>([])
const users = ref<any[]>([])
const levelOptions = ref<string[]>([])
const sourceOptions = ref<string[]>([])

// Contact selector dialog
const contactDialogVisible = ref(false)
const createContactDialogVisible = ref(false)
const contactSearchKeyword = ref('')
const selectedContactIds = ref<string[]>([])
const createContactFormRef = ref()

const selectedContactLabel = computed(() => {
  const selected = contacts.value.filter((c) => formData.contactIds.includes(c.id))
  return selected.map((c) => `${c.name || '-'} (${c.phone1 || '-'})`).join('，')
})

const MAX_CONTACT_LABEL_LENGTH = 90
const selectedContactDisplayLabel = computed(() => {
  const full = selectedContactLabel.value
  if (!full) return ''
  if (full.length <= MAX_CONTACT_LABEL_LENGTH) return full
  const count = formData.contactIds.length
  return `${full.slice(0, MAX_CONTACT_LABEL_LENGTH)}...（共${count}位）`
})

const filteredContacts = computed(() => {
  const kw = contactSearchKeyword.value.trim()
  if (!kw) return contacts.value
  return contacts.value.filter((c) => {
    const name = (c.name || '').toLowerCase()
    const phone = (c.phone1 || '').toLowerCase()
    return name.includes(kw.toLowerCase()) || phone.includes(kw.toLowerCase())
  })
})



const formData = reactive({
  name: '',
  contactId: '',
  contactIds: [] as string[],
  ownerId: '',
  dealType: '',
  level: '',
  source: '',
  intendedRegion: '',
  intendedAreaMinInput: '',
  intendedAreaMaxInput: '',
  intendedAreaMin: undefined as number | undefined,
  intendedAreaMax: undefined as number | undefined,
  intendedPrice: '',
  remark: ''
})

const formRules = {
  name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  contactId: [{ required: true, message: '请选择联系人', trigger: 'change' }],
  ownerId: [{ required: true, message: '请选择项目负责人', trigger: 'change' }]
}

const createContactFormData = reactive({
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

const createContactFormRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone1: [{ required: true, message: '请输入手机号1', trigger: 'blur' }]
}

onMounted(async () => {
  await Promise.all([loadContacts(), loadUsers(), loadDicts()])
})

async function loadContacts() {
  contacts.value = await authStore.api<any[]>('/api/contacts')
}

async function loadUsers() {
  const res = await authStore.api<PageResult<any> | any[]>('/api/users')
  users.value = normalizePageResult<any>(res).records
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

    const intendedAreaMin = parseIntegerArea(formData.intendedAreaMinInput, '最小面积')
    const intendedAreaMax = parseIntegerArea(formData.intendedAreaMaxInput, '最大面积')
    if (intendedAreaMin != null && intendedAreaMax != null && intendedAreaMin > intendedAreaMax) {
      ElMessage.warning('意向面积区间不合法：最小值不能大于最大值')
      return
    }

    const payload: Record<string, any> = {
      name: formData.name,
      contactId: formData.contactId,
      contactIds: formData.contactIds,
      ownerId: formData.ownerId,
      dealType: formData.dealType,
      intendedRegion: formData.intendedRegion || undefined,
      intendedAreaMin,
      intendedAreaMax,
      intendedPrice: formData.intendedPrice || undefined,
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
    ElMessage.error(toZhMessage(error?.message, '创建失败'))
  } finally {
    submitting.value = false
  }
}

function resetForm() {
  Object.assign(formData, {
    name: '',
    contactId: '',
    contactIds: [],
    ownerId: '',
    dealType: '',
    level: '',
    source: '',
    intendedRegion: '',
    intendedAreaMinInput: '',
    intendedAreaMaxInput: '',
    intendedAreaMin: undefined,
    intendedAreaMax: undefined,
    intendedPrice: '',
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

function openContactDialog() {
  contactDialogVisible.value = true
  contactSearchKeyword.value = ''
  selectedContactIds.value = [...formData.contactIds]
  void nextTick(syncContactTableSelection)
}

function openCreateContactDialog() {
  resetCreateContactForm()
  createContactDialogVisible.value = true
}

function handleContactSelectionChange(selection: any[]) {
  selectedContactIds.value = selection.map((row) => row.id)
}

function confirmContactSelect() {
  formData.contactIds = [...selectedContactIds.value]
  if (formData.contactIds.length > 0) {
    formData.contactId = formData.contactIds[0]
  } else {
    formData.contactId = ''
  }
  contactDialogVisible.value = false
}

function filterContacts() {
  // filteredContacts is computed, no-op needed
}

function syncContactTableSelection() {
  const table = contactTableRef.value
  if (!table) return
  table.clearSelection()
  for (const contact of filteredContacts.value) {
    table.toggleRowSelection(contact, selectedContactIds.value.includes(contact.id))
  }
}

function handleCancel() {
  handleBack()
}

function resetCreateContactForm() {
  Object.assign(createContactFormData, {
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
}

async function submitCreateContact() {
  try {
    await createContactFormRef.value?.validate()
    createContactSubmitting.value = true
    const created = await authStore.api<{ id: string }>('/api/contacts', {
      method: 'POST',
      body: JSON.stringify(createContactFormData)
    })
    createContactDialogVisible.value = false
    await loadContacts()
    if (!selectedContactIds.value.includes(created.id)) {
      selectedContactIds.value = [...selectedContactIds.value, created.id]
    }
    void nextTick(syncContactTableSelection)
    ElMessage.success('联系人已创建并加入勾选')
  } catch (error: any) {
    ElMessage.error(toZhMessage(error?.message, '联系人创建失败'))
  } finally {
    createContactSubmitting.value = false
  }
}

function toZhMessage(message?: string, fallback = '操作失败') {
  const raw = (message || '').trim()
  if (!raw) return fallback
  const lower = raw.toLowerCase()
  if (lower.includes('phone already exists')) return '手机号已存在，请更换后重试'
  if (lower.includes('already exists in tenant')) return '当前租户下已存在相同数据'
  if (lower.includes('duplicate')) return '数据重复，请检查后重试'
  return raw
}

function parseIntegerArea(input: string, fieldLabel: string): number | undefined {
  const normalized = (input || '').trim()
  if (!normalized) return undefined
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${fieldLabel}格式不正确，请输入整数`)
  }
  return Number(normalized)
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

.contact-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.contact-input {
  flex: 1;
  min-width: 0;
  max-width: calc(100% - 52px);
}

.contact-add-btn {
  padding: 8px 12px;
}

.contact-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.create-contact-form :deep(.el-form-item) {
  margin-bottom: 12px;
}

.area-range-inputs {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
}

.area-range-separator {
  color: #909399;
  flex: 0 0 auto;
}

</style>
