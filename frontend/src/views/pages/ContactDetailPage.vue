<template>
  <div class="contact-detail-page">
    <el-card class="detail-card" v-loading="loading">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-button class="back-icon-btn" link :icon="ArrowLeft" @click="router.push('/contacts')" />
            <div>
              <div class="header-title">{{ contact.name || '-' }}</div>
              <div class="header-subtitle">{{ contact.enterpriseName || '未填写企业名称' }}</div>
            </div>
          </div>
          <el-button type="primary" @click="editContact">编辑</el-button>
        </div>
      </template>

      <el-empty v-if="!loading && !contact.id" description="联系人不存在" />
      <template v-else>
        <div class="section-title">基本信息</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="姓名">{{ contact.name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="企业名称">{{ contact.enterpriseName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="职位">{{ contact.title || '-' }}</el-descriptions-item>
          <el-descriptions-item label="性别">{{ formatGender(contact.gender) }}</el-descriptions-item>
          <el-descriptions-item label="是否决策人">{{ contact.decisionMaker ? '是' : '否' }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ contact.deleted ? '已删除' : '正常' }}</el-descriptions-item>
        </el-descriptions>

        <div class="section-title">联系方式</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="手机号1">{{ contact.phone1 || '-' }}</el-descriptions-item>
          <el-descriptions-item label="手机号2">{{ contact.phone2 || '-' }}</el-descriptions-item>
          <el-descriptions-item label="微信号">{{ contact.wechat || '-' }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ contact.email || '-' }}</el-descriptions-item>
          <el-descriptions-item label="办公电话">{{ contact.officePhone || '-' }}</el-descriptions-item>
        </el-descriptions>

        <div class="section-title">关联项目</div>
        <el-table v-if="linkedProjects.length" :data="linkedProjects" border>
          <el-table-column prop="code" label="项目编号" width="140" />
          <el-table-column prop="name" label="项目名称" min-width="220" />
          <el-table-column prop="stage" label="阶段" width="140" />
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button link @click="router.push(`/projects/${row.id}`)">查看项目</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-else description="暂无关联项目" class="compact-empty" />

        <div class="section-title">系统信息</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="负责人">{{ getUserDisplayName(contact.ownerId) }}</el-descriptions-item>
          <el-descriptions-item label="创建人">{{ getUserDisplayName(contact.creatorId) }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(contact.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="最后编辑时间">{{ formatDateTime(contact.updatedAt) }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ contact.remark || '-' }}</el-descriptions-item>
        </el-descriptions>
      </template>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useAuthStore } from '../../stores/auth'
import { normalizePageResult, type PageResult } from '../../api/page'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const contact = reactive<any>({})
const users = ref<any[]>([])
const projects = ref<any[]>([])

const contactId = computed(() => String(route.params.id || ''))
const linkedProjects = computed(() =>
  projects.value.filter((p) => p.contactId === contact.id || p.contactIds?.includes(contact.id))
)

onMounted(async () => {
  await Promise.allSettled([loadUsers(), loadProjects()])
  await loadContact()
})

async function loadContact() {
  if (!contactId.value) return
  loading.value = true
  try {
    const data = await authStore.api<any>(`/api/contacts/${contactId.value}`)
    Object.assign(contact, data)
  } catch (error: any) {
    ElMessage.error(error.message || '联系人详情加载失败')
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
}

function editContact() {
  router.push({ path: '/contacts', query: { editId: contact.id } })
}

function getUserDisplayName(userId?: string): string {
  if (!userId) return '-'
  const user = users.value.find((u) => u.id === userId)
  return user?.name || userId
}

function formatGender(value?: string): string {
  const map: Record<string, string> = {
    MALE: '男',
    FEMALE: '女',
    UNKNOWN: '未知'
  }
  return value ? (map[value] || value) : '-'
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
.contact-detail-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-title {
  font-size: 20px;
  font-weight: 700;
  color: #1f2d3d;
}

.header-subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: #64748b;
}

.section-title {
  margin: 24px 0 12px;
  font-size: 15px;
  font-weight: 700;
  color: #1f2d3d;
}

.section-title:first-child {
  margin-top: 0;
}

.compact-empty {
  padding: 16px 0;
}

.compact-empty :deep(.el-empty__image) {
  width: 60px;
}

.compact-empty :deep(.el-empty__description) {
  margin-top: 8px;
}
</style>
