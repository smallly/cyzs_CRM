import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/pages/LoginPage.vue'),
    meta: { requiresAuth: false, title: '登录' }
  },
  {
    path: '/',
    component: () => import('../layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Workbench',
        component: () => import('../views/pages/WorkbenchPage.vue'),
        meta: { title: '工作台' }
      },
      {
        path: 'contacts',
        name: 'Contacts',
        component: () => import('../views/modules/ContactsListView.vue'),
        meta: { title: '联系人' }
      },
      {
        path: 'contacts/create',
        name: 'ContactCreate',
        component: () => import('../views/pages/ContactCreatePage.vue'),
        meta: { title: '新增联系人' }
      },
      {
        path: 'projects',
        name: 'Projects',
        component: () => import('../views/modules/ProjectsListView.vue'),
        meta: { title: '项目' }
      },
      {
        path: 'followups',
        name: 'Followups',
        component: () => import('../views/modules/FollowupsView.vue'),
        meta: { title: '跟进记录' }
      },
      {
        path: 'followups/create',
        name: 'FollowupCreate',
        component: () => import('../views/pages/FollowupCreatePage.vue'),
        meta: { title: '新增跟进记录' }
      },
      {
        path: 'projects/create',
        name: 'ProjectCreate',
        component: () => import('../views/modules/ProjectCreateView.vue'),
        meta: { title: '新建项目' }
      },
      {
        path: 'projects/:id',
        name: 'ProjectDetail',
        component: () => import('../views/pages/ProjectDetailPage.vue'),
        meta: { title: '项目详情' }
      },
      {
        path: 'contracts',
        name: 'Contracts',
        component: () => import('../views/modules/ContractsView.vue'),
        meta: { title: '合同' }
      },
      {
        path: 'contracts/create',
        name: 'ContractCreate',
        component: () => import('../views/pages/ContractCreatePage.vue'),
        meta: { title: '新增合同' }
      },
      {
        path: 'payments',
        name: 'Payments',
        component: () => import('../views/modules/PaymentsView.vue'),
        meta: { title: '回款' }
      },
      {
        path: 'payments/create',
        name: 'PaymentCreate',
        component: () => import('../views/pages/PaymentCreatePage.vue'),
        meta: { title: '新增回款' }
      },
      {
        path: 'settings/org',
        name: 'UsersDepartments',
        component: () => import('../views/pages/UsersDepartmentsPage.vue'),
        meta: { title: '成员与部门' }
      },
      {
        path: 'users',
        redirect: { path: '/settings/org', query: { tab: 'users' } }
      },
      {
        path: 'departments',
        redirect: { path: '/settings/org', query: { tab: 'departments' } }
      },
      {
        path: 'settings/roles',
        name: 'RoleSettings',
        component: () => import('../views/pages/RoleSettingsPage.vue'),
        meta: { title: '角色管理' }
      },
      {
        path: 'settings/scope',
        name: 'ScopeModeSettings',
        component: () => import('../views/pages/ScopeModePage.vue'),
        meta: { title: '数据范围' }
      },
      {
        path: 'settings/dicts',
        name: 'DictSettings',
        component: () => import('../views/pages/DictSettingsPage.vue'),
        meta: { title: '数据字典' }
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('../views/pages/ProfilePage.vue'),
        meta: { title: '个人中心' }
      }
    ]
  }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const stored = localStorage.getItem('crm_auth')
  let token = ''
  if (stored) {
    try {
      token = JSON.parse(stored)?.token || ''
    } catch {
      token = ''
    }
  }
  const requiresAuth = to.meta.requiresAuth !== false

  if (requiresAuth && !token) {
    next('/login')
  } else if (to.path === '/login' && token) {
    next('/')
  } else {
    next()
  }
})
