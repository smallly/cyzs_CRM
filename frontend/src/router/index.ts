import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/pages/LoginPage.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('../layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Workbench',
        component: () => import('../views/pages/WorkbenchPage.vue')
      },
      {
        path: 'contacts',
        name: 'Contacts',
        component: () => import('../views/modules/ContactsListView.vue')
      },
      {
        path: 'projects',
        name: 'Projects',
        component: () => import('../views/modules/ProjectsListView.vue')
      },
      {
        path: 'followups',
        name: 'Followups',
        component: () => import('../views/modules/FollowupsView.vue')
      },
      {
        path: 'projects/create',
        name: 'ProjectCreate',
        component: () => import('../views/modules/ProjectCreateView.vue')
      },
      {
        path: 'projects/:id',
        name: 'ProjectDetail',
        component: () => import('../views/pages/ProjectDetailPage.vue')
      },
      {
        path: 'contracts',
        name: 'Contracts',
        component: () => import('../views/modules/ContractsView.vue')
      },
      {
        path: 'payments',
        name: 'Payments',
        component: () => import('../views/modules/PaymentsView.vue')
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('../views/modules/UsersView.vue')
      },
      {
        path: 'departments',
        name: 'Departments',
        component: () => import('../views/modules/DepartmentsView.vue')
      },
      {
        path: 'settings/roles',
        name: 'RoleSettings',
        component: () => import('../views/pages/RoleSettingsPage.vue')
      },
      {
        path: 'settings/scope',
        name: 'ScopeModeSettings',
        component: () => import('../views/pages/ScopeModePage.vue')
      },
      {
        path: 'settings/dicts',
        name: 'DictSettings',
        component: () => import('../views/pages/DictSettingsPage.vue')
      }
    ]
  }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('crm_auth')
  const requiresAuth = to.meta.requiresAuth !== false

  if (requiresAuth && !token) {
    next('/login')
  } else if (to.path === '/login' && token) {
    next('/')
  } else {
    next()
  }
})
