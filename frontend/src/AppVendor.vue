<template>
  <div v-if="!isLoggedIn" class="vendor-login-page">
    <div class="vendor-login-card">
      <div class="vendor-login-head">
        <div class="vendor-mark large">VP</div>
        <h2>超管平台登录</h2>
        <p>SaaS 运营管理后台</p>
      </div>
      <el-form class="vendor-login-form" label-width="0">
        <el-form-item>
          <el-input v-model="loginForm.phone" placeholder="请输入手机号" :prefix-icon="User" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" show-password :prefix-icon="Lock" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" class="vendor-login-btn" :loading="loginLoading" @click="handleLogin">
            登录
          </el-button>
        </el-form-item>
      </el-form>
      <div class="vendor-login-tip">默认超管账号：admin / admin123</div>
    </div>
  </div>

  <el-container v-else class="vendor-layout">
    <el-aside class="vendor-aside" width="240px">
      <div class="vendor-brand">
        <div class="vendor-mark">VP</div>
        <div>
          <div class="vendor-title">超管平台</div>
          <div class="vendor-sub">SaaS 开通管理</div>
        </div>
      </div>
      <div class="vendor-menu">
        <!-- 组织管理分组 -->
        <div class="menu-group">
          <div class="menu-group-title">组织管理</div>
          <div class="menu-group-items">
            <button
              class="vendor-menu-item"
              :class="{ active: activeMenu === 'tenants' }"
              @click="activeMenu = 'tenants'"
            >
              <el-icon class="menu-icon"><OfficeBuilding /></el-icon>
              <span>组织管理</span>
            </button>
            <button
              class="vendor-menu-item"
              :class="{ active: activeMenu === 'admins' }"
              @click="activeMenu = 'admins'"
            >
              <el-icon class="menu-icon"><UserFilled /></el-icon>
              <span>管理员管理</span>
            </button>
          </div>
        </div>

        <!-- 系统设置分组 -->
        <div class="menu-group">
          <div class="menu-group-title">系统设置</div>
          <div class="menu-group-items">
            <button
              class="vendor-menu-item"
              :class="{ active: activeMenu === 'users' }"
              @click="activeMenu = 'users'"
            >
              <el-icon class="menu-icon"><User /></el-icon>
              <span>用户管理</span>
            </button>
          </div>
        </div>
      </div>
    </el-aside>

    <el-container>
      <el-header class="vendor-header">
        <div>超管平台</div>
        <div class="vendor-header-right">
          <el-tag type="info">Vendor: {{ vendorUrl }}</el-tag>
          <el-tag type="success">SaaS: {{ saasUrl }}</el-tag>
          <el-dropdown trigger="click" @command="handleLogout">
            <div class="vendor-user-trigger">
              <span class="vendor-user-avatar">{{ userAvatarText }}</span>
              <span class="vendor-user-name">{{ authStore.userName || '用户' }}</span>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>
                  <div style="font-size:13px;color:#64748b">{{ authStore.userName || authStore.phone || authStore.userId }}</div>
                </el-dropdown-item>
                <el-dropdown-item divided @click="handleLogout">
                  <el-icon><SwitchButton /></el-icon>
                  <span>退出登录</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="vendor-main">
        <!-- 组织管理 -->
        <el-card v-if="activeMenu === 'tenants'">
          <template #header>
            <div class="card-header">
              <span>组织管理</span>
              <el-space>
                <el-button type="primary" @click="openDialog">开通组织</el-button>
              </el-space>
            </div>
          </template>

          <el-table :data="tenants" v-loading="loading">
            <el-table-column prop="tenantName" label="组织名称" min-width="160" fixed="left" />
            <el-table-column prop="tenantId" label="租户标识" min-width="150" />
            <el-table-column prop="adminName" label="管理员" min-width="100" />
            <el-table-column prop="adminPhone" label="管理员手机号" min-width="130" />
            <el-table-column prop="userCount" label="成员数" width="90" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'danger'">
                  {{ row.status === 'ACTIVE' ? '已启用' : '已停用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="到期" width="90">
              <template #default="{ row }">
                <el-tag :type="row.expired ? 'danger' : 'info'">
                  {{ row.expired ? '已到期' : '正常' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="到期时间" min-width="170">
              <template #default="{ row }">
                {{ formatDateTime(row.expireAt || undefined) }}
              </template>
            </el-table-column>
            <el-table-column label="创建时间" min-width="170">
              <template #default="{ row }">
                {{ formatDateTime(row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="380" fixed="right">
              <template #default="{ row }">
                <el-space>
                  <el-button size="small" @click="openEditDialog(row)">编辑</el-button>
                  <el-button size="small" @click="openChangeAdminDialog(row)">更换管理员</el-button>
                  <el-button size="small" @click="openOrderDialog(row)">订单记录</el-button>
                  <el-button size="small" @click="openRenewDialog(row)">续费</el-button>
                  <el-button
                    size="small"
                    :type="row.status === 'ACTIVE' ? 'danger' : 'primary'"
                    @click="toggleTenantStatus(row)"
                  >
                    {{ row.status === 'ACTIVE' ? '停用' : '启用' }}
                  </el-button>
                </el-space>
              </template>
            </el-table-column>
          </el-table>
          <div class="pagination-wrap">
            <el-pagination
              v-model:current-page="page"
              v-model:page-size="pageSize"
              :background="false"
              :page-sizes="[10, 20, 50, 100]"
              :total="total"
              layout="total, sizes, prev, pager, next, jumper"
              @current-change="handlePageChange"
              @size-change="handleSizeChange"
            />
          </div>
        </el-card>

        <!-- 管理员管理 -->
        <el-card v-if="activeMenu === 'admins'">
          <template #header>
            <div class="card-header">
              <span>管理员管理</span>
              <el-space>
                <el-button type="primary" @click="openAdminDialog">添加管理员</el-button>
              </el-space>
            </div>
          </template>

          <el-table :data="admins" v-loading="adminLoading">
            <el-table-column prop="name" label="姓名" min-width="120" />
            <el-table-column prop="phone" label="手机号" min-width="130" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.status === 'ENABLED' ? 'success' : 'danger'">
                  {{ row.status === 'ENABLED' ? '已启用' : '已停用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="创建时间" min-width="170">
              <template #default="{ row }">
                {{ formatDateTime(row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button
                  size="small"
                  :type="row.status === 'ENABLED' ? 'danger' : 'primary'"
                  @click="toggleAdminStatus(row)"
                >
                  {{ row.status === 'ENABLED' ? '停用' : '启用' }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <!-- 用户管理 -->
        <el-card v-if="activeMenu === 'users'">
          <template #header>
            <div class="card-header">
              <span>用户管理</span>
              <el-space>
                <el-button type="primary" @click="openAdminDialog">添加用户</el-button>
              </el-space>
            </div>
          </template>

          <el-table :data="saasUsers" v-loading="saasUserLoading">
            <el-table-column prop="name" label="姓名" min-width="120" />
            <el-table-column prop="phone" label="手机号" min-width="130" />
            <el-table-column prop="tenantName" label="所属租户" min-width="160" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.status === 'ENABLED' ? 'success' : 'danger'">
                  {{ row.status === 'ENABLED' ? '已启用' : '已停用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="创建时间" min-width="170">
              <template #default="{ row }">
                {{ formatDateTime(row.createdAt) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-main>
    </el-container>
  </el-container>

  <!-- 编辑组织弹窗 -->
  <el-dialog v-model="editDialogVisible" title="编辑组织" width="480px" :close-on-click-modal="false">
    <el-form :model="editForm" label-position="top">
      <el-form-item label="组织名称" required>
        <el-input v-model="editForm.tenantName" placeholder="请输入组织名称" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-space>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="editSubmitting" @click="submitEdit">保存</el-button>
      </el-space>
    </template>
  </el-dialog>

  <!-- 添加管理员弹窗 -->
  <el-dialog v-model="adminDialogVisible" title="添加管理员" width="480px" :close-on-click-modal="false">
    <el-form :model="adminForm" label-width="80px">
      <el-form-item label="姓名" required>
        <el-input v-model="adminForm.name" placeholder="请输入姓名" />
      </el-form-item>
      <el-form-item label="手机号" required>
        <el-input v-model="adminForm.phone" placeholder="请输入手机号" />
      </el-form-item>
      <el-form-item label="密码" required>
        <el-input v-model="adminForm.password" type="password" show-password placeholder="至少6位" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="adminDialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="adminCreating" @click="submitAdmin">保存</el-button>
    </template>
  </el-dialog>

  <!-- 选择管理员弹窗 -->
  <el-dialog
    v-model="adminSelectDialogVisible"
    :title="changeAdminTarget ? '更换管理员' : '选择管理员'"
    width="720px"
    :close-on-click-modal="false"
  >
    <div class="admin-select-header">
      <el-input
        v-model="adminSearchKeyword"
        placeholder="搜索姓名或手机号"
        clearable
        style="width: 280px"
        @keyup.enter="loadAvailableAdmins"
      >
        <template #suffix>
          <el-icon @click="loadAvailableAdmins" style="cursor: pointer"><Search /></el-icon>
        </template>
      </el-input>
      <el-button type="primary" @click="openCreateAdminInDialog">新建用户</el-button>
    </div>

    <el-table :data="availableAdmins" v-loading="adminSelectLoading" style="margin-top: 16px">
      <el-table-column prop="name" label="姓名" min-width="120" />
      <el-table-column prop="phone" label="手机号" min-width="140" />
      <el-table-column prop="tenantName" label="所属租户" min-width="160" />
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" :loading="changeAdminSubmitting" @click="selectAdmin(row)">选择</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 弹窗内新建用户表单 -->
    <el-dialog
      v-model="createAdminInDialogVisible"
      title="新建用户"
      width="480px"
      append-to-body
      :close-on-click-modal="false"
    >
      <el-form :model="createAdminForm" label-width="80px">
        <el-form-item label="姓名" required>
          <el-input v-model="createAdminForm.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="手机号" required>
          <el-input v-model="createAdminForm.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="密码" required>
          <el-input v-model="createAdminForm.password" type="password" show-password placeholder="至少6位" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createAdminInDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="creatingAdminInDialog" @click="submitCreateAdminInDialog">保存</el-button>
      </template>
    </el-dialog>
  </el-dialog>

  <!-- 开通组织弹窗 -->
  <el-dialog
    v-model="openDialogVisible"
    title="开通 SaaS 组织（租户）"
    width="720px"
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-position="top" class="open-form">
      <div class="form-section-title">组织信息</div>
      <el-row :gutter="24">
        <el-col :span="12">
          <el-form-item label="组织名称" required>
            <el-input v-model="form.tenantName" placeholder="例如：华北产业地产" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="租户标识">
            <el-input v-model="form.tenantId" placeholder="可选；留空自动生成" />
          </el-form-item>
        </el-col>
      </el-row>

      <div class="form-section-title">管理员信息</div>
      <el-form-item label="管理员" required>
        <div class="admin-selector" @click="openAdminSelectDialog">
          <span v-if="selectedAdmin" class="admin-selected">
            {{ selectedAdmin.name }} ({{ selectedAdmin.phone }})
          </span>
          <span v-else class="admin-placeholder">请选择管理员</span>
          <el-icon class="admin-selector-icon"><Plus /></el-icon>
        </div>
      </el-form-item>
      <!-- 新建管理员时显示密码字段 -->
      <el-row v-if="isNewAdmin" :gutter="24">
        <el-col :span="12">
          <el-form-item label="密码" required>
            <el-input
              v-model="form.adminPassword"
              show-password
              placeholder="至少 6 位"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <div class="form-section-title">订单信息</div>
      <el-row :gutter="24">
        <el-col :span="12">
          <el-form-item label="开始日期" required>
            <el-date-picker
              v-model="form.openTime"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择开始日期"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="到期日期" required>
            <el-date-picker
              v-model="form.expireTime"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择到期日期"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <template #footer>
      <el-space>
        <el-button @click="openDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="openTenant">保存</el-button>
      </el-space>
    </template>
  </el-dialog>

  <!-- 续费弹窗 -->
  <el-dialog
    v-model="renewDialogVisible"
    title="新建订单"
    width="560px"
    :close-on-click-modal="false"
  >
    <el-form :model="renewForm" label-position="top">
      <el-form-item label="租户">
        <span>{{ renewTarget?.tenantName }}（{{ renewTarget?.tenantId }}）</span>
      </el-form-item>
      <el-row :gutter="24">
        <el-col :span="12">
          <el-form-item label="开始日期" required>
            <el-date-picker
              v-model="renewForm.startTime"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择开始日期"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="到期日期" required>
            <el-date-picker
              v-model="renewForm.expireTime"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择到期日期"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-space>
        <el-button @click="renewDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="renewing" @click="submitRenew">保存</el-button>
      </el-space>
    </template>
  </el-dialog>

  <!-- 订单记录弹窗 -->
  <el-dialog
    v-model="orderDialogVisible"
    title="订单记录"
    width="800px"
    :close-on-click-modal="false"
  >
    <div class="order-header">
      <span>租户：{{ orderTarget?.tenantName }}（{{ orderTarget?.tenantId }}）</span>
    </div>
    <el-table :data="orderRecords" v-loading="orderLoading" border stripe max-height="400">
      <el-table-column prop="startTime" label="开始日期" min-width="140" />
      <el-table-column prop="expireTime" label="到期日期" min-width="140" />
      <el-table-column prop="createdAt" label="创建时间" min-width="180">
        <template #default="{ row }">
          {{ formatDateTime(row.createdAt) }}
        </template>
      </el-table-column>
    </el-table>
  </el-dialog>

  <el-dialog v-model="successDialogVisible" title="开通成功" width="560px">
    <div class="success-lines">
      <div>租户：{{ lastCreated?.tenantName }}（{{ lastCreated?.tenantId }}）</div>
      <div>管理员手机号：{{ lastCreated?.adminPhone }}</div>
      <div>管理员密码：{{ lastCreated?.usedExistingAdminPhone ? '沿用原密码' : (lastCreated?.adminPassword || '-') }}</div>
      <div>SaaS 登录地址：{{ saasUrl }}</div>
    </div>
    <template #footer>
      <el-space>
        <el-button @click="copySuccessInfo">复制</el-button>
        <el-button type="primary" @click="successDialogVisible = false">我知道了</el-button>
      </el-space>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from './stores/auth'
import { Lock, User, SwitchButton, Plus, Search, OfficeBuilding, UserFilled } from '@element-plus/icons-vue'
import { buildPageQuery, normalizePageResult, type PageResult } from './api/page'

interface TenantSummary {
  tenantId: string
  tenantName: string
  adminName: string
  adminPhone: string
  userCount: number
  status: 'ACTIVE' | 'DISABLED'
  expired: boolean
  expireAt?: string | null
  createdAt: string
}

interface TenantOpenResult {
  tenantId: string
  tenantName: string
  adminUserId: string
  adminName: string
  adminPhone: string
  adminPassword?: string | null
  usedExistingAdminPhone: boolean
  openTime: string
  expireTime: string
  status: 'ACTIVE' | 'DISABLED'
  createdAt: string
}

const authStore = useAuthStore()
authStore.restoreFromStorage()

const host = window.location.hostname || 'localhost'
const vendorUrl = computed(() => `http://${host}:5174`)
const saasUrl = computed(() => `http://${host}:5173`)

const isLoggedIn = computed(() => authStore.isLoggedIn && authStore.vendorAdmin)

const loginForm = reactive({ phone: 'admin', password: 'admin123' })
const loginLoading = ref(false)

const userAvatarText = computed(() => {
  const name = (authStore.userName || '').trim()
  return name ? name.charAt(0).toUpperCase() : 'U'
})

const activeMenu = ref<'tenants' | 'admins' | 'users'>('tenants')

const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const creating = ref(false)
const checkingAdminPhone = ref(false)
const adminPhoneExists = ref(false)
const openDialogVisible = ref(false)
const renewDialogVisible = ref(false)
const renewing = ref(false)
const orderDialogVisible = ref(false)
const orderLoading = ref(false)
const successDialogVisible = ref(false)
const tenants = ref<TenantSummary[]>([])
const lastCreated = ref<TenantOpenResult | null>(null)
const renewTarget = ref<TenantSummary | null>(null)
const orderTarget = ref<TenantSummary | null>(null)
const orderRecords = ref<any[]>([])

// Edit tenant
const editDialogVisible = ref(false)
const editSubmitting = ref(false)
const editTarget = ref<TenantSummary | null>(null)
const editForm = reactive({
  tenantName: ''
})

// Admin management
const adminLoading = ref(false)
const adminDialogVisible = ref(false)
const adminCreating = ref(false)
const admins = ref<any[]>([])
const adminForm = reactive({
  name: '',
  phone: '',
  password: ''
})

// SaaS User management (under System Settings)
const saasUserLoading = ref(false)
const saasUsers = ref<any[]>([])

// Admin selector in open tenant dialog
const adminSelectDialogVisible = ref(false)
const adminSelectLoading = ref(false)
const adminSearchKeyword = ref('')
const availableAdmins = ref<any[]>([])
const selectedAdmin = ref<any | null>(null)
const isNewAdmin = ref(false)

// Change admin
const changeAdminTarget = ref<TenantSummary | null>(null)
const changeAdminSubmitting = ref(false)

// Create admin inside selector dialog
const createAdminInDialogVisible = ref(false)
const creatingAdminInDialog = ref(false)
const createAdminForm = reactive({
  name: '',
  phone: '',
  password: ''
})

const form = reactive({
  tenantName: '',
  tenantId: '',
  adminName: '',
  adminPhone: '',
  adminPassword: '',
  openTime: new Date().toISOString().split('T')[0],
  expireTime: ''
})

const renewForm = reactive({
  startTime: '',
  expireTime: ''
})

onMounted(() => {
  if (isLoggedIn.value) {
    void loadTenants()
    void loadAdmins()
    void loadSaasUsers()
  }
})

async function handleLogin() {
  if (!loginForm.phone.trim() || !loginForm.password.trim()) {
    ElMessage.warning('请输入手机号和密码')
    return
  }
  loginLoading.value = true
  try {
    await authStore.loginVendor(loginForm.phone.trim(), loginForm.password.trim())
    authStore.saveToStorage()
    ElMessage.success('登录成功')
    void loadTenants()
    void loadAdmins()
    void loadSaasUsers()
  } catch (error: any) {
    ElMessage.error(error.message || '登录失败')
  } finally {
    loginLoading.value = false
  }
}

function handleLogout() {
  authStore.logout()
  authStore.saveToStorage()
  ElMessage.success('已退出登录')
}

function openDialog() {
  openDialogVisible.value = true
}

async function openOrderDialog(row: TenantSummary) {
  orderTarget.value = row
  orderDialogVisible.value = true
  orderLoading.value = true
  try {
    orderRecords.value = await authStore.api<any[]>(`/api/vendor/tenants/${row.tenantId}/orders`)
  } catch (error: any) {
    ElMessage.error(error?.message || '订单记录加载失败')
    orderRecords.value = []
  } finally {
    orderLoading.value = false
  }
}

function openEditDialog(row: TenantSummary) {
  editTarget.value = row
  editForm.tenantName = row.tenantName
  editDialogVisible.value = true
}

async function submitEdit() {
  if (!editTarget.value) return
  if (!editForm.tenantName.trim()) {
    ElMessage.warning('请输入组织名称')
    return
  }

  editSubmitting.value = true
  try {
    await authStore.api(`/api/vendor/tenants/${editTarget.value.tenantId}`, {
      method: 'PUT',
      body: JSON.stringify({
        tenantName: editForm.tenantName.trim()
      })
    })
    ElMessage.success('组织信息已更新')
    editDialogVisible.value = false
    await loadTenants()
  } catch (error: any) {
    ElMessage.error(error?.message || '更新失败')
  } finally {
    editSubmitting.value = false
  }
}

function openRenewDialog(row: TenantSummary) {
  renewTarget.value = row
  // 开始日期默认为当前到期时间的次日
  const currentExpire = row.expireAt ? new Date(row.expireAt) : new Date()
  currentExpire.setDate(currentExpire.getDate() + 1)
  renewForm.startTime = currentExpire.toISOString().split('T')[0]
  renewForm.expireTime = ''
  renewDialogVisible.value = true
}

async function submitRenew() {
  if (!renewTarget.value) return
  if (!renewForm.startTime) {
    ElMessage.warning('请选择开始日期')
    return
  }
  if (!renewForm.expireTime) {
    ElMessage.warning('请选择到期日期')
    return
  }

  renewing.value = true
  try {
    await authStore.api(`/api/vendor/tenants/${renewTarget.value.tenantId}/renew`, {
      method: 'PUT',
      body: JSON.stringify({
        startTime: renewForm.startTime,
        expireTime: renewForm.expireTime
      })
    })
    ElMessage.success('订单已保存')
    renewDialogVisible.value = false
    await loadTenants()
  } catch (error: any) {
    ElMessage.error(error?.message || '保存失败')
  } finally {
    renewing.value = false
  }
}

function isPhoneFormatValid(phone: string) {
  return /^1\d{10}$/.test((phone || '').trim())
}

async function checkAdminPhoneExists() {
  const phone = form.adminPhone.trim()
  adminPhoneExists.value = false
  if (!isPhoneFormatValid(phone)) {
    return
  }

  checkingAdminPhone.value = true
  try {
    adminPhoneExists.value = await authStore.api<boolean>(`/api/vendor/tenants/admin-phone-exists?phone=${encodeURIComponent(phone)}`)
  } catch (error: any) {
    ElMessage.error(error?.message || '手机号校验失败')
  } finally {
    checkingAdminPhone.value = false
  }
}

async function loadTenants() {
  loading.value = true
  try {
    const query = buildPageQuery(page.value, pageSize.value)
    const res = await authStore.api<PageResult<TenantSummary> | TenantSummary[]>(`/api/vendor/tenants?${query}`)
    const pageData = normalizePageResult<TenantSummary>(res)
    tenants.value = pageData.records
    total.value = pageData.total
  } catch (error: any) {
    ElMessage.error(error?.message || '组织列表加载失败')
  } finally {
    loading.value = false
  }
}

function handlePageChange(nextPage: number) {
  page.value = nextPage
  void loadTenants()
}

function handleSizeChange(nextSize: number) {
  pageSize.value = nextSize
  page.value = 1
  void loadTenants()
}

async function toggleTenantStatus(row: TenantSummary) {
  const target = row.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
  try {
    await authStore.api(`/api/vendor/tenants/${row.tenantId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: target })
    })
    ElMessage.success(target === 'ACTIVE' ? '已启用组织' : '已停用组织')
    await loadTenants()
  } catch (error: any) {
    ElMessage.error(error?.message || '状态更新失败')
  }
}

function openAdminSelectDialog() {
  changeAdminTarget.value = null
  adminSelectDialogVisible.value = true
  adminSearchKeyword.value = ''
  void loadAvailableAdmins()
}

function openChangeAdminDialog(row: TenantSummary) {
  changeAdminTarget.value = row
  adminSelectDialogVisible.value = true
  adminSearchKeyword.value = ''
  void loadAvailableAdmins()
}

async function loadAvailableAdmins() {
  adminSelectLoading.value = true
  try {
    const keyword = adminSearchKeyword.value.trim()
    const url = keyword
      ? `/api/vendor/tenants/available-admins?keyword=${encodeURIComponent(keyword)}`
      : '/api/vendor/tenants/available-admins'
    availableAdmins.value = await authStore.api<any[]>(url)
  } catch (error: any) {
    ElMessage.error(error?.message || '加载用户列表失败')
    availableAdmins.value = []
  } finally {
    adminSelectLoading.value = false
  }
}

async function selectAdmin(row: any) {
  if (changeAdminTarget.value) {
    const tenantId = changeAdminTarget.value.tenantId
    const userId = row.userId || row.id
    changeAdminSubmitting.value = true
    try {
      await authStore.api(`/api/vendor/tenants/${tenantId}/admin`, {
        method: 'PUT',
        body: JSON.stringify({ adminUserId: userId })
      })
      ElMessage.success('管理员已更换')
      adminSelectDialogVisible.value = false
      changeAdminTarget.value = null
      await loadTenants()
    } catch (error: any) {
      ElMessage.error(error?.message || '更换管理员失败')
    } finally {
      changeAdminSubmitting.value = false
    }
    return
  }

  selectedAdmin.value = row
  isNewAdmin.value = false
  form.adminName = row.name
  form.adminPhone = row.phone
  adminSelectDialogVisible.value = false
}

function openCreateAdminInDialog() {
  createAdminForm.name = ''
  createAdminForm.phone = ''
  createAdminForm.password = ''
  createAdminInDialogVisible.value = true
}

async function submitCreateAdminInDialog() {
  if (!createAdminForm.name.trim()) {
    ElMessage.warning('请输入姓名')
    return
  }
  if (!createAdminForm.phone.trim()) {
    ElMessage.warning('请输入手机号')
    return
  }
  if (!isPhoneFormatValid(createAdminForm.phone)) {
    ElMessage.warning('请输入正确的 11 位手机号')
    return
  }
  if (!createAdminForm.password || createAdminForm.password.length < 6) {
    ElMessage.warning('密码至少 6 位')
    return
  }

  creatingAdminInDialog.value = true
  try {
    const created = await authStore.api<any>('/api/vendor/tenants/admins', {
      method: 'POST',
      body: JSON.stringify({
        name: createAdminForm.name.trim(),
        phone: createAdminForm.phone.trim(),
        password: createAdminForm.password
      })
    })
    ElMessage.success('用户已创建')
    createAdminInDialogVisible.value = false
    // Auto select the newly created admin
    selectedAdmin.value = created
    isNewAdmin.value = true
    form.adminName = created.name
    form.adminPhone = created.phone
    adminSelectDialogVisible.value = false
  } catch (error: any) {
    ElMessage.error(error?.message || '创建失败')
  } finally {
    creatingAdminInDialog.value = false
  }
}

async function openTenant() {
  if (!form.tenantName.trim()) return ElMessage.warning('请输入组织名称')
  if (!form.openTime) return ElMessage.warning('请选择开通时间')
  if (!form.expireTime) return ElMessage.warning('请选择到期时间')

  const body: any = {
    tenantName: form.tenantName.trim(),
    tenantId: form.tenantId.trim() || undefined,
    openTime: form.openTime,
    expireTime: form.expireTime
  }

  if (selectedAdmin.value) {
    // Use existing admin
    body.adminUserId = selectedAdmin.value.userId || selectedAdmin.value.id
  } else {
    // Create new admin
    if (!form.adminName.trim()) return ElMessage.warning('请选择或新建管理员')
    if (!form.adminPhone.trim()) return ElMessage.warning('请选择或新建管理员')
    if (!isPhoneFormatValid(form.adminPhone)) return ElMessage.warning('请输入正确的 11 位手机号')
    const password = form.adminPassword.trim()
    if (!password || password.length < 6) return ElMessage.warning('管理员密码至少 6 位')
    body.adminName = form.adminName.trim()
    body.adminPhone = form.adminPhone.trim()
    body.adminPassword = password
  }

  creating.value = true
  try {
    const created = await authStore.api<TenantOpenResult>('/api/vendor/tenants', {
      method: 'POST',
      body: JSON.stringify(body)
    })
    lastCreated.value = created
    successDialogVisible.value = true
    goList()
    await loadTenants()
    resetForm()
  } catch (error: any) {
    ElMessage.error(error?.message || '组织开通失败')
  } finally {
    creating.value = false
  }
}

function goList() {
  openDialogVisible.value = false
}

async function copySuccessInfo() {
  if (!lastCreated.value) return
  const text = [
    `租户：${lastCreated.value.tenantName}（${lastCreated.value.tenantId}）`,
    `管理员手机号：${lastCreated.value.adminPhone}`,
    `管理员密码：${lastCreated.value.usedExistingAdminPhone ? '沿用原密码' : (lastCreated.value.adminPassword || '-')}`,
    `SaaS 登录地址：${saasUrl.value}`
  ].join('\n')

  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制')
  } catch {
    ElMessage.error('复制失败，请手动复制')
  }
}

function resetForm() {
  form.tenantName = ''
  form.tenantId = ''
  form.adminName = ''
  form.adminPhone = ''
  form.adminPassword = ''
  form.openTime = new Date().toISOString().split('T')[0]
  form.expireTime = ''
  adminPhoneExists.value = false
  selectedAdmin.value = null
  isNewAdmin.value = false
}

// Admin management functions
async function loadAdmins() {
  adminLoading.value = true
  try {
    const res = await authStore.api<PageResult<any> | any[]>('/api/vendor/admins')
    const pageData = normalizePageResult<any>(res)
    admins.value = pageData.records
  } catch (error: any) {
    ElMessage.error(error?.message || '管理员列表加载失败')
  } finally {
    adminLoading.value = false
  }
}

async function loadSaasUsers() {
  saasUserLoading.value = true
  try {
    const res = await authStore.api<PageResult<any> | any[]>('/api/vendor/tenants/available-admins')
    const pageData = normalizePageResult<any>(res)
    saasUsers.value = pageData.records
  } catch (error: any) {
    ElMessage.error(error?.message || '用户列表加载失败')
  } finally {
    saasUserLoading.value = false
  }
}

function openAdminDialog() {
  adminForm.name = ''
  adminForm.phone = ''
  adminForm.password = ''
  adminDialogVisible.value = true
}

async function submitAdmin() {
  if (!adminForm.name.trim()) {
    ElMessage.warning('请输入姓名')
    return
  }
  if (!adminForm.phone.trim()) {
    ElMessage.warning('请输入手机号')
    return
  }
  if (!adminForm.password || adminForm.password.length < 6) {
    ElMessage.warning('密码至少6位')
    return
  }
  adminCreating.value = true
  try {
    await authStore.api('/api/vendor/admins', {
      method: 'POST',
      body: JSON.stringify({
        name: adminForm.name.trim(),
        phone: adminForm.phone.trim(),
        password: adminForm.password
      })
    })
    ElMessage.success('管理员已添加')
    adminDialogVisible.value = false
    await loadAdmins()
  } catch (error: any) {
    ElMessage.error(error?.message || '添加失败')
  } finally {
    adminCreating.value = false
  }
}

async function toggleAdminStatus(row: any) {
  const target = row.status === 'ENABLED' ? 'DISABLED' : 'ENABLED'
  try {
    await authStore.api(`/api/vendor/admins/${row.id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: target })
    })
    ElMessage.success(target === 'ENABLED' ? '已启用' : '已停用')
    await loadAdmins()
  } catch (error: any) {
    ElMessage.error(error?.message || '状态更新失败')
  }
}

function formatDateTime(value?: string) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('zh-CN', { hour12: false })
}
</script>

<style scoped>
.vendor-layout {
  height: 100vh;
}

.vendor-aside {
  border-right: 1px solid #e2e8f0;
  background: #f8fafc;
  padding: 16px 12px;
}

.vendor-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 12px;
}

.vendor-mark {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #2f5cf6, #57a0ff);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
}

.vendor-title {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
}

.vendor-sub {
  font-size: 12px;
  color: #64748b;
}

.vendor-menu {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 10px;
}

.menu-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 0;
}

.menu-group-title {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: none;
  letter-spacing: 0;
  padding: 0;
  margin: 0 0 6px 0;
}

.menu-group-items {
  background: rgba(247, 249, 252, 0.6);
  border-radius: 8px;
  padding: 6px 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.vendor-menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #fff;
  background: #ffffff;
  color: #475569;
  border-radius: 8px;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 14px;
  font-weight: 500;
}

.vendor-menu-item:hover {
  border-color: #fff;
  background: #eff4ff;
  color: #1e293b;
}

.vendor-menu-item.active {
  background: linear-gradient(135deg, #2f5cf6, #1d4ed8);
  border-color: #fff;
  color: #fff;
  box-shadow: 0 3px 10px rgba(47, 92, 246, 0.24);
}

.menu-icon {
  font-size: 16px;
  line-height: 1;
  flex-shrink: 0;
  color: currentColor;
}

.vendor-header {
  border-bottom: 1px solid #e2e8f0;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.vendor-header-right {
  display: flex;
  gap: 8px;
}

.vendor-main {
  background: #ffffff;
  padding: 12px;
}

.order-header {
  margin-bottom: 16px;
  font-size: 14px;
  color: #334155;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pagination-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.hint-text {
  margin-top: 6px;
  font-size: 12px;
  color: #64748b;
}

.success-lines {
  line-height: 1.9;
  color: #334155;
}

.hint-text-col {
  margin-top: 4px;
  font-size: 12px;
  color: #64748b;
}

.new-expire-time {
  font-weight: 600;
  color: #2f5cf6;
}

.open-form .form-section-title {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.open-form .el-form-item {
  margin-bottom: 16px;
}

.open-form .el-form-item:last-child {
  margin-bottom: 0;
}

.admin-selector {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  height: 36px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.admin-selector:hover {
  border-color: #2f5cf6;
}

.admin-selected {
  color: #1e293b;
  font-size: 14px;
}

.admin-placeholder {
  color: #a8abb2;
  font-size: 14px;
}

.admin-selector-icon {
  color: #2f5cf6;
  font-size: 16px;
}

.admin-select-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Fix dialog header alignment */
:deep(.el-dialog__header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  margin-right: 0;
}

:deep(.el-dialog__title) {
  line-height: 1;
  font-size: 18px;
  font-weight: 600;
}

:deep(.el-dialog__headerbtn) {
  position: static;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
}

.vendor-login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #eef4ff 0%, #dfe9ff 42%, #d4e2ff 100%);
}

.vendor-login-card {
  width: min(420px, 92%);
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(201, 216, 245, 0.9);
  border-radius: 20px;
  padding: 36px 32px 28px;
  box-shadow: 0 18px 38px rgba(20, 44, 96, 0.13);
}

.vendor-login-head {
  text-align: center;
  margin-bottom: 24px;
}

.vendor-login-head .vendor-mark.large {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  font-size: 20px;
  margin: 0 auto 12px;
}

.vendor-login-head h2 {
  margin: 0 0 6px;
  font-size: 26px;
  color: #122043;
}

.vendor-login-head p {
  margin: 0;
  font-size: 14px;
  color: #6a7897;
}

.vendor-login-form .el-input__wrapper {
  height: 44px;
  border-radius: 10px;
}

.vendor-login-btn {
  width: 100%;
  height: 44px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
}

.vendor-user-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px 4px 4px;
  border-radius: 999px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s ease;
}

.vendor-user-trigger:hover {
  background: #f8fafc;
  border-color: #dbe6fb;
}

.vendor-user-avatar {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  background: linear-gradient(135deg, #2f5cf6, #4f8bff);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.vendor-user-name {
  font-size: 14px;
  color: #334155;
}

.vendor-login-tip {
  margin-top: 12px;
  text-align: center;
  font-size: 13px;
  color: #6a7897;
}
</style>
