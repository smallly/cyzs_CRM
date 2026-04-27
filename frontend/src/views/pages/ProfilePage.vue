<template>
  <div class="profile-page">
    <el-card class="profile-card">
      <template #header>
        <div class="card-header">
          <span class="header-title">个人中心</span>
        </div>
      </template>

      <div class="profile-section">
        <div class="section-title">基本信息</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="姓名">{{ userInfo.name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ userInfo.phone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="用户ID">{{ userInfo.userId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="业务角色">{{ formatBizRole(userInfo.bizRole) }}</el-descriptions-item>
        </el-descriptions>
        <div class="section-actions">
          <el-button type="primary" @click="openEditProfile">修改姓名</el-button>
          <el-button type="primary" @click="openEditPhone">修改手机号</el-button>
        </div>
      </div>

      <el-divider />

      <div class="profile-section">
        <div class="section-title">账号安全</div>
        <div class="security-item">
          <div class="security-info">
            <div class="security-label">登录密码</div>
            <div class="security-desc">定期修改密码有助于保护账号安全</div>
          </div>
          <el-button type="primary" @click="openChangePassword">修改密码</el-button>
        </div>
      </div>

      <el-divider />

      <div class="profile-section">
        <div class="section-title">操作</div>
        <el-button type="danger" plain @click="handleLogout">
          <el-icon><SwitchButton /></el-icon>
          <span style="margin-left:6px">退出登录</span>
        </el-button>
      </div>
    </el-card>

    <!-- 修改姓名弹窗 -->
    <el-dialog v-model="editProfileVisible" title="修改姓名" width="400px">
      <el-form label-width="70px">
        <el-form-item label="新姓名" required>
          <el-input v-model="editProfileForm.name" placeholder="请输入新姓名" maxlength="20" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editProfileVisible = false">取消</el-button>
        <el-button type="primary" :loading="editProfileLoading" @click="submitEditProfile">保存</el-button>
      </template>
    </el-dialog>

    <!-- 修改手机号弹窗 -->
    <el-dialog v-model="editPhoneVisible" title="修改手机号" width="400px">
      <el-form label-width="80px">
        <el-form-item label="新手机号" required>
          <el-input v-model="editPhoneForm.phone" placeholder="请输入新手机号" maxlength="11" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editPhoneVisible = false">取消</el-button>
        <el-button type="primary" :loading="editPhoneLoading" @click="submitEditPhone">保存</el-button>
      </template>
    </el-dialog>

    <!-- 修改密码弹窗 -->
    <el-dialog v-model="changePasswordVisible" title="修改密码" width="420px">
      <el-form label-width="90px">
        <el-form-item label="旧密码" required>
          <el-input v-model="changePasswordForm.oldPassword" type="password" show-password placeholder="请输入旧密码" />
        </el-form-item>
        <el-form-item label="新密码" required>
          <el-input v-model="changePasswordForm.newPassword" type="password" show-password placeholder="请输入新密码（至少6位）" />
        </el-form-item>
        <el-form-item label="确认密码" required>
          <el-input v-model="changePasswordForm.confirmPassword" type="password" show-password placeholder="请再次输入新密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="changePasswordVisible = false">取消</el-button>
        <el-button type="primary" :loading="changePasswordLoading" @click="submitChangePassword">确认修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { SwitchButton } from '@element-plus/icons-vue'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

interface UserInfo {
  userId: string
  name: string
  phone: string
  tenantId: string
  bizRole: string
  systemAdmin: boolean
  vendorAdmin: boolean
}

const userInfo = reactive<UserInfo>({
  userId: '',
  name: '',
  phone: '',
  tenantId: '',
  bizRole: '',
  systemAdmin: false,
  vendorAdmin: false
})

const loading = ref(false)

// 修改姓名
const editProfileVisible = ref(false)
const editProfileForm = reactive({ name: '' })
const editProfileLoading = ref(false)

// 修改手机号
const editPhoneVisible = ref(false)
const editPhoneForm = reactive({ phone: '' })
const editPhoneLoading = ref(false)

// 修改密码
const changePasswordVisible = ref(false)
const changePasswordForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })
const changePasswordLoading = ref(false)

onMounted(() => {
  loadUserInfo()
})

async function loadUserInfo() {
  loading.value = true
  try {
    const data = await authStore.api<UserInfo>('/api/me')
    Object.assign(userInfo, data)
  } catch (error: any) {
    ElMessage.error(error.message || '获取用户信息失败')
  } finally {
    loading.value = false
  }
}

function formatBizRole(role?: string) {
  if (!role) return '-'
  const map: Record<string, string> = {
    SALES: '销售专员',
    PROJECT_ADMIN: '项目管理员',
    SYSTEM_ADMIN: '系统管理员'
  }
  return map[role] || role
}

function openEditProfile() {
  editProfileForm.name = userInfo.name || ''
  editProfileVisible.value = true
}

async function submitEditProfile() {
  if (!editProfileForm.name.trim()) {
    ElMessage.warning('请输入姓名')
    return
  }
  editProfileLoading.value = true
  try {
    await authStore.api('/api/me/profile', {
      method: 'PUT',
      body: JSON.stringify({ name: editProfileForm.name.trim() })
    })
    ElMessage.success('姓名修改成功')
    editProfileVisible.value = false
    userInfo.name = editProfileForm.name.trim()
    authStore.userName = editProfileForm.name.trim()
    authStore.saveToStorage()
  } catch (error: any) {
    ElMessage.error(error.message || '修改失败')
  } finally {
    editProfileLoading.value = false
  }
}

function openEditPhone() {
  editPhoneForm.phone = userInfo.phone || ''
  editPhoneVisible.value = true
}

async function submitEditPhone() {
  const phone = editPhoneForm.phone.trim()
  if (!phone) {
    ElMessage.warning('请输入手机号')
    return
  }
  if (!/^1\d{10}$/.test(phone)) {
    ElMessage.warning('请输入正确的 11 位手机号')
    return
  }
  editPhoneLoading.value = true
  try {
    await authStore.api('/api/me/phone', {
      method: 'PUT',
      body: JSON.stringify({ newPhone: phone })
    })
    ElMessage.success('手机号修改成功')
    editPhoneVisible.value = false
    userInfo.phone = phone
  } catch (error: any) {
    ElMessage.error(error.message || '修改失败')
  } finally {
    editPhoneLoading.value = false
  }
}

function openChangePassword() {
  changePasswordForm.oldPassword = ''
  changePasswordForm.newPassword = ''
  changePasswordForm.confirmPassword = ''
  changePasswordVisible.value = true
}

async function submitChangePassword() {
  if (!changePasswordForm.oldPassword) {
    ElMessage.warning('请输入旧密码')
    return
  }
  if (!changePasswordForm.newPassword) {
    ElMessage.warning('请输入新密码')
    return
  }
  if (changePasswordForm.newPassword.length < 6) {
    ElMessage.warning('新密码至少 6 位')
    return
  }
  if (changePasswordForm.newPassword !== changePasswordForm.confirmPassword) {
    ElMessage.warning('两次输入的新密码不一致')
    return
  }
  if (changePasswordForm.oldPassword === changePasswordForm.newPassword) {
    ElMessage.warning('新密码不能与旧密码相同')
    return
  }

  changePasswordLoading.value = true
  try {
    await authStore.api('/api/me/password', {
      method: 'PUT',
      body: JSON.stringify({
        oldPassword: changePasswordForm.oldPassword,
        newPassword: changePasswordForm.newPassword
      })
    })
    ElMessage.success('密码修改成功，请使用新密码重新登录')
    changePasswordVisible.value = false
    setTimeout(() => {
      handleLogout()
    }, 1500)
  } catch (error: any) {
    ElMessage.error(error.message || '密码修改失败')
  } finally {
    changePasswordLoading.value = false
  }
}

function handleLogout() {
  authStore.logout()
  authStore.saveToStorage()
  router.push('/login')
}
</script>

<style scoped>
.profile-page {
  max-width: 800px;
  margin: 0 auto;
}

.profile-card {
  border-radius: 12px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.profile-section {
  padding: 8px 0;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 16px;
}

.section-actions {
  margin-top: 16px;
  display: flex;
  gap: 12px;
}

.security-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #f8fafc;
  border-radius: 10px;
}

.security-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.security-label {
  font-size: 14px;
  font-weight: 500;
  color: #334155;
}

.security-desc {
  font-size: 13px;
  color: #64748b;
}
</style>
