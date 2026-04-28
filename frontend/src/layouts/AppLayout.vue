<template>
  <el-container class="app-layout">
    <el-aside :width="isCollapsed ? '74px' : '220px'" :class="{ collapsed: isCollapsed }">
      <div class="sidebar-container">
        <div class="brand">
          <div class="brand-mark">CRM</div>
          <div v-if="!isCollapsed" class="brand-text">
            <div class="brand-title">产业地产 CRM</div>
            <div class="brand-sub">业务验证台</div>
          </div>
        </div>

        <nav class="menu">
          <div class="menu-group">
            <div v-if="!isCollapsed" class="menu-group-title">业务</div>
            <div class="menu-group-items">
              <button
                v-for="item in businessMenuItems"
                :key="item.key"
                class="menu-item"
                :class="{ active: isMenuActive(item.route) }"
                :title="item.label"
                @click="router.push(item.route)"
              >
                <el-icon class="menu-icon"><component :is="item.icon" /></el-icon>
                <span v-if="!isCollapsed">{{ item.label }}</span>
              </button>
            </div>
          </div><div class="menu-group">
            <div v-if="!isCollapsed" class="menu-group-title">系统</div>
            <div class="menu-group-items">
              <button
                v-for="item in systemMenuItems"
                :key="item.key"
                class="menu-item"
                :class="{ active: isMenuActive(item.route) }"
                :title="item.label"
                @click="router.push(item.route)"
              >
                <el-icon class="menu-icon"><component :is="item.icon" /></el-icon>
                <span v-if="!isCollapsed">{{ item.label }}</span>
              </button>
            </div>
          </div>
        </nav>
      </div>
    </el-aside>

    <el-container>
      <el-header class="app-header">
        <div class="header-left">
          <el-button v-if="isProjectDetailPage" @click="handleLeadingAction">
            <el-icon><ArrowLeftBold /></el-icon>
          </el-button>
          <el-button
            v-else
            :icon="leadingIcon"
            @click="handleLeadingAction"
          />
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ routeTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <div class="header-right">
          <el-dropdown
            class="user-center"
            trigger="click"
            placement="bottom-end"
            popper-class="user-center-popper"
            @command="handleUserCommand"
          >
            <div class="user-trigger">
              <span class="user-avatar">{{ userAvatarText }}</span>
              <div class="user-meta">
                <span class="user-name">{{ authStore.userName || '用户' }}</span>
              </div>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item class="user-center-head" disabled>
                  <div class="user-center-head-wrap">
                    <span class="user-avatar large">{{ userAvatarText }}</span>
                    <div class="user-center-head-meta">
                      <div class="user-center-name">{{ authStore.userName || '用户' }}</div>
                      <div class="user-center-org">组织：{{ organizationName }}</div>
                    </div>
                  </div>
                </el-dropdown-item>
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon>
                  <span>个人中心</span>
                </el-dropdown-item>
                <el-dropdown-item command="change-password">
                  <el-icon><Lock /></el-icon>
                  <span>修改密码</span>
                </el-dropdown-item>
                <el-dropdown-item command="logout">
                  <el-icon><SwitchButton /></el-icon>
                  <span>退出登录</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="app-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>

  <el-dialog v-model="changePasswordVisible" title="修改密码" width="420px">
    <el-form :model="changePasswordForm" label-width="90px">
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
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'
import {
  Expand,
  Fold,
  ArrowLeftBold,
  User,
  Files,
  ChatLineRound,
  Document,
  Coin,
  UserFilled,
  Avatar,
  Key,
  CollectionTag,
  Lock,
  SwitchButton
} from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const isCollapsed = ref(false)

const currentRoute = computed(() => route.path)
const isProjectDetailPage = computed(() => route.name === 'ProjectDetail')
const leadingIcon = computed(() => (isProjectDetailPage.value ? ArrowLeftBold : (isCollapsed.value ? Expand : Fold)))

const routeTitle = computed(() => {
  const title = route.meta?.title as string | undefined
  if (title) return title
  const name = route.name as string
  return name || ''
})

const userAvatarText = computed(() => {
  const name = (authStore.userName || '').trim()
  return name ? name.charAt(0).toUpperCase() : 'U'
})

const organizationName = computed(() => authStore.tenantName || authStore.tenantId || '-')

const businessMenuItems = [
  { key: 'projects', label: '项目', route: '/projects', icon: Files },
  { key: 'contracts', label: '合同', route: '/contracts', icon: Document },
  { key: 'payments', label: '回款', route: '/payments', icon: Coin },
  { key: 'followups', label: '跟进记录', route: '/followups', icon: ChatLineRound },
  { key: 'contacts', label: '联系人', route: '/contacts', icon: User }
]

const systemMenuItems = [
  { key: 'users-departments', label: '成员与部门', route: '/settings/org', icon: UserFilled },
  { key: 'roles', label: '角色管理', route: '/settings/roles', icon: Avatar },
  { key: 'scope', label: '数据范围', route: '/settings/scope', icon: Key },
  { key: 'dicts', label: '数据字典', route: '/settings/dicts', icon: CollectionTag }
]

function handleLeadingAction() {
  if (isProjectDetailPage.value) {
    router.push('/projects')
    return
  }
  isCollapsed.value = !isCollapsed.value
}

function handleLogout() {
  authStore.logout()
  localStorage.removeItem('crm_auth')
  router.push('/login')
}

const changePasswordVisible = ref(false)
const changePasswordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})
const changePasswordLoading = ref(false)

function openChangePasswordDialog() {
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
    // 修改密码后强制重新登录
    setTimeout(() => {
      handleLogout()
    }, 1500)
  } catch (error: any) {
    ElMessage.error(error.message || '密码修改失败')
  } finally {
    changePasswordLoading.value = false
  }
}

function handleUserCommand(command: string | number | object) {
  if (command === 'logout') {
    handleLogout()
    return
  }
  if (command === 'change-password') {
    openChangePasswordDialog()
    return
  }
  if (command === 'profile') {
    router.push('/profile')
  }
}

function isMenuActive(menuRoute: string): boolean {
  return currentRoute.value === menuRoute || currentRoute.value.startsWith(menuRoute + '/')
}
</script>

<style scoped>
.app-layout {
  height: 100vh;
}

.el-aside {
  background: #f7f9fc;
  border-right: 1px solid #e2e8f0;
  transition: width 0.2s ease;
  padding: 12px 10px;
  overflow-y: auto;
}

.el-aside.collapsed {
  padding: 12px 10px;
}

/* 娓氀嗙珶閺嶅繐銇囨惔鏇炴健鐎圭懓娅?*/
.sidebar-container {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px 10px;
  border-bottom: 1px solid #e5eaf3;
}

.brand-mark {
  width: 27px;
  height: 27px;
  border-radius: 8px;
  background: linear-gradient(135deg, #2f5cf6, #57a0ff);
  display: grid;
  place-items: center;
  font-weight: 500;
  color: #fff;
  font-size: 12px;
}

.brand-text {
  flex: 1;
}

.brand-title {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.brand-sub {
  font-size: 11px;
  color: #64748b;
}

/* 閼挎粌宕熼弽宄扮础 - 閸欏倽鈧啳顔曠拋鈥虫禈閻ㄥ嫬鍨庣猾璇插幢閻楀洭顥撻弽?*/
.menu {
  padding-top: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.menu-group {
  margin-bottom: 0;
}

.menu-group-title {
  font-size: 12px;
  letter-spacing: 0;
  text-transform: none;
  color: #64748b;
  margin: 0 0 6px 0;
  font-weight: 600;
  padding: 0;
}

.menu-group-items {
  background: rgba(247, 249, 252, 0.6);
  border-radius: 8px;
  padding: 6px 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: #334155;
  text-align: left;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.15s ease;
}

.menu-item:hover {
  border-color: #dbe6fb;
  background: #eff4ff;
  color: #1e293b;
}

.menu-item.active {
  background: linear-gradient(135deg, #2f5cf6, #1d4ed8);
  border-color: #2f5cf6;
  color: #fff;
  box-shadow: 0 3px 10px rgba(47, 92, 246, 0.24);
}

.menu-icon {
  font-size: 16px;
  line-height: 1;
  flex-shrink: 0;
  color: currentColor;
}

/* 閹舵ê褰旈悩鑸碘偓浣风瑓閻ㄥ嫪鏅舵潏瑙勭埉 */
.el-aside.collapsed .sidebar-container {
  padding: 6px;
  background: transparent;
  border: none;
}

.el-aside.collapsed .brand {
  padding: 6px;
  border-bottom: none;
}

.el-aside.collapsed .menu-group-items {
  padding: 4px;
  background: rgba(255, 255, 255, 0.5);
}

.el-aside.collapsed .menu-item {
  padding: 8px 10px;
  justify-content: center;
}

.el-aside.collapsed .menu-icon {
  margin: 0;
}

.app-header {
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(6px);
  border-bottom: 1px solid #e2e8f0;
  height: 62px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
}

.header-left,
.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-trigger {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 4px 10px 4px 4px;
  border-radius: 999px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s ease;
}

.user-trigger:hover {
  background: #f8fafc;
  border-color: #dbe6fb;
}

.user-avatar {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: linear-gradient(135deg, #2f5cf6, #4f8bff);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.user-avatar.large {
  width: 42px;
  height: 42px;
  font-size: 18px;
}

.user-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.user-name {
  color: #1f2937;
  font-size: 17px;
  line-height: 1.1;
  font-weight: 400;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.user-center-popper) {
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  min-width: 260px;
  padding: 6px 0;
}

:deep(.user-center-popper .el-dropdown-menu__item) {
  height: 40px;
  line-height: 40px;
  color: #334155;
}

:deep(.user-center-popper .el-dropdown-menu__item .el-icon) {
  margin-right: 8px;
}

:deep(.user-center-popper .user-center-head) {
  height: auto;
  line-height: normal;
  cursor: default;
  padding: 10px 14px;
}

:deep(.user-center-popper .user-center-head:hover) {
  background: transparent;
  color: inherit;
}

.user-center-head-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-center-head-meta {
  min-width: 0;
}

.user-center-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.2;
}

.user-center-org {
  margin-top: 4px;
  font-size: 12px;
  color: #64748b;
  line-height: 1.2;
}

.app-main {
  background: radial-gradient(circle at 0 0, #ecf4ff 0%, #f7f9fc 35%, #f3f5f9 100%);
  padding: 12px;
  overflow-y: auto;
  overflow-x: hidden;
  min-width: 0;
  min-height: calc(100vh - 62px);
}

.app-main > * {
  max-width: 100%;
  min-width: 0;
}
</style>


