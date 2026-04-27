<template>
  <div v-if="!isLoggedIn" class="vendor-login-page">
    <div class="vendor-login-card">
      <div class="vendor-login-head">
        <div class="vendor-mark large">VP</div>
        <h2>厂商平台登录</h2>
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
          <div class="vendor-title">厂商平台</div>
          <div class="vendor-sub">SaaS 开通管理</div>
        </div>
      </div>
      <div class="vendor-menu">
        <button class="vendor-menu-item active">组织管理</button>
      </div>
    </el-aside>

    <el-container>
      <el-header class="vendor-header">
        <div>厂商平台</div>
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
        <el-card>
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
            <el-table-column label="操作" width="280" fixed="right">
              <template #default="{ row }">
                <el-space>
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
      </el-main>
    </el-container>
  </el-container>

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
      <el-row :gutter="24">
        <el-col :span="12">
          <el-form-item label="姓名" required>
            <el-input v-model="form.adminName" placeholder="例如：张三" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="手机号" required>
            <el-input
              v-model="form.adminPhone"
              placeholder="例如：13800001234"
              @blur="checkAdminPhoneExists"
              @change="checkAdminPhoneExists"
            />
            <div v-if="checkingAdminPhone" class="hint-text-col">正在检查手机号...</div>
            <div v-else-if="adminPhoneExists" class="hint-text-col">该手机号已存在，将沿用原密码</div>
            <div v-else-if="isPhoneFormatValid(form.adminPhone)" class="hint-text-col">该手机号未注册，需设置密码</div>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="密码" :required="!adminPhoneExists">
            <el-input
              v-model="form.adminPassword"
              show-password
              :placeholder="adminPhoneExists ? '可留空沿用原密码' : '至少 6 位'"
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
        <el-button @click="resetForm">重置</el-button>
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
      <div>开始日期：{{ lastCreated?.openTime || '-' }}</div>
      <div>到期日期：{{ lastCreated?.expireTime || '-' }}</div>
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
import { Lock, User, SwitchButton } from '@element-plus/icons-vue'
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
  }
})

async function handleLogin() {
  if (!loginForm.phone.trim() || !loginForm.password.trim()) {
    ElMessage.warning('请输入手机号和密码')
    return
  }
  loginLoading.value = true
  try {
    await authStore.login(loginForm.phone.trim(), loginForm.password.trim())
    authStore.saveToStorage()
    if (!authStore.vendorAdmin) {
      ElMessage.error('您没有厂商平台访问权限')
      authStore.logout()
      return
    }
    ElMessage.success('登录成功')
    void loadTenants()
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

async function openTenant() {
  if (!form.tenantName.trim()) return ElMessage.warning('请输入组织名称')
  if (!form.adminName.trim()) return ElMessage.warning('请输入管理员姓名')
  if (!form.adminPhone.trim()) return ElMessage.warning('请输入管理员手机号')
  if (!isPhoneFormatValid(form.adminPhone)) return ElMessage.warning('请输入正确的 11 位手机号')
  if (!form.openTime) return ElMessage.warning('请选择开通时间')
  if (!form.expireTime) return ElMessage.warning('请选择到期时间')

  await checkAdminPhoneExists()
  if (!adminPhoneExists.value) {
    const password = form.adminPassword.trim()
    if (!password || password.length < 6) return ElMessage.warning('管理员密码至少 6 位')
  }

  creating.value = true
  try {
    const created = await authStore.api<TenantOpenResult>('/api/vendor/tenants', {
      method: 'POST',
      body: JSON.stringify({
        tenantName: form.tenantName.trim(),
        tenantId: form.tenantId.trim() || undefined,
        adminName: form.adminName.trim(),
        adminPhone: form.adminPhone.trim(),
        adminPassword: form.adminPassword.trim() || undefined,
        openTime: form.openTime,
        expireTime: form.expireTime
      })
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
    `开通时间：${lastCreated.value.openTime || '-'}`,
    `到期时间：${lastCreated.value.expireTime || '-'}`,
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
  gap: 8px;
}

.vendor-menu-item {
  border: 1px solid transparent;
  background: #ffffff;
  color: #334155;
  border-radius: 8px;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
}

.vendor-menu-item.active {
  color: #fff;
  border-color: #2f5cf6;
  background: linear-gradient(135deg, #2f5cf6, #1d4ed8);
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
