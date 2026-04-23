<template>
  <el-container class="app-layout">
    <el-aside width="240px" :class="{ collapsed: isCollapsed }">
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
                :class="{ active: currentRoute === item.route }"
                :title="item.label"
                @click="router.push(item.route)"
              >
                <span class="menu-dot"></span>
                <span v-if="!isCollapsed">{{ item.label }}</span>
              </button>
            </div>
          </div>

          <div class="menu-group">
            <div v-if="!isCollapsed" class="menu-group-title">组织</div>
            <div class="menu-group-items">
              <button
                v-for="item in orgMenuItems"
                :key="item.key"
                class="menu-item"
                :class="{ active: currentRoute === item.route }"
                :title="item.label"
                @click="router.push(item.route)"
              >
                <span class="menu-dot"></span>
                <span v-if="!isCollapsed">{{ item.label }}</span>
              </button>
            </div>
          </div>

          <div class="menu-group">
            <div v-if="!isCollapsed" class="menu-group-title">系统</div>
            <div class="menu-group-items">
              <button
                v-for="item in systemMenuItems"
                :key="item.key"
                class="menu-item"
                :class="{ active: currentRoute === item.route }"
                :title="item.label"
                @click="router.push(item.route)"
              >
                <span class="menu-dot"></span>
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
          <el-button
            :icon="isCollapsed ? Expand : Fold"
            @click="isCollapsed = !isCollapsed"
          />
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ routeTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <div class="header-right">
          <span class="user-info">{{ authStore.userName }} / {{ authStore.userId }}</span>
          <el-button @click="handleRefresh">刷新数据</el-button>
          <el-button type="danger" @click="handleLogout">退出</el-button>
        </div>
      </el-header>

      <el-main class="app-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import {
  Expand,
  Fold
} from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const isCollapsed = ref(false)

const currentRoute = computed(() => route.path)
const routeTitle = computed(() => {
  const name = route.name as string
  return name || ''
})

const businessMenuItems = [
  { key: 'contacts', label: '联系人', route: '/contacts' },
  { key: 'projects', label: '项目', route: '/projects' },
  { key: 'followups', label: '跟进记录', route: '/followups' },
  { key: 'contracts', label: '合同', route: '/contracts' },
  { key: 'payments', label: '回款', route: '/payments' }
]

const orgMenuItems = [
  { key: 'users', label: '成员', route: '/users' },
  { key: 'departments', label: '部门', route: '/departments' }
]

const systemMenuItems = [
  { key: 'roles', label: '角色管理', route: '/settings/roles' },
  { key: 'scope', label: '数据范围', route: '/settings/scope' },
  { key: 'dicts', label: '数据字典', route: '/settings/dicts' }
]

function handleRefresh() {
  // TODO: 触发全局数据刷新事件
  console.log('Refresh data')
}

function handleLogout() {
  authStore.logout()
  localStorage.removeItem('crm_auth')
  router.push('/login')
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
  width: 74px;
  padding: 12px 10px;
}

/* 侧边栏大底块容器 */
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

/* 菜单样式 - 参考设计图的分类卡片风格 */
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

.menu-dot {
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.7;
  flex-shrink: 0;
}

.menu-item.active .menu-dot {
  opacity: 1;
}

/* 折叠状态下的侧边栏 */
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

.el-aside.collapsed .menu-dot {
  width: 5px;
  height: 5px;
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

.user-info {
  color: #64748b;
  font-size: 13px;
}

.app-main {
  background: radial-gradient(circle at 0 0, #ecf4ff 0%, #f7f9fc 35%, #f3f5f9 100%);
  padding: 14px;
  overflow-y: auto;
}
</style>
