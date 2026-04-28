import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { createApiClient } from '../api/http'
import { router } from '../router'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>('')
  const userId = ref<string>('')
  const userName = ref<string>('')
  const phoneRef = ref<string>('')
  const tenantId = ref<string>('')
  const tenantName = ref<string>('')
  const vendorAdmin = ref<boolean>(false)
  const tenants = ref<Array<{ tenantId: string; tenantName: string; isDefault: boolean }>>([])

  const isLoggedIn = computed(() => !!token.value)
  const hasMultipleTenants = computed(() => !vendorAdmin.value && tenants.value.length > 1)

  // Restore auth state immediately on store creation
  restoreFromStorage()

  const api = createApiClient(() => token.value, () => {
    const wasVendor = vendorAdmin.value
    logout()
    localStorage.removeItem('crm_auth')
    if (wasVendor) {
      window.location.reload()
    } else {
      router.replace('/login').catch(() => {})
    }
  })

  async function login(phone: string, password: string) {
    const res = await api<{
      token: string
      uid?: string
      tid?: string
      userId?: string
      userName?: string
      username?: string
      realName?: string
      name?: string
      tenantId?: string
      tenantName?: string
      orgName?: string
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password })
    })
    token.value = res.token
    userId.value = res.userId || res.uid || ''
    userName.value = res.name || res.userName || res.username || res.realName || ''
    phoneRef.value = (res as any).phone || ''
    tenantId.value = res.tenantId || res.tid || ''
    tenantName.value = res.tenantName || res.orgName || tenantId.value
    vendorAdmin.value = false
    tenants.value = (res as any).tenants || []
  }

  async function loginVendor(phone: string, password: string) {
    const res = await api<{
      token: string
      userId?: string
      name?: string
      tenantId?: string
      vendorAdmin?: boolean
    }>('/api/auth/login/vendor', {
      method: 'POST',
      body: JSON.stringify({ phone, password })
    })
    token.value = res.token
    userId.value = res.userId || ''
    userName.value = res.name || ''
    phoneRef.value = phone
    tenantId.value = res.tenantId || 'vendor-default'
    tenantName.value = '超管平台'
    vendorAdmin.value = true
  }

  function logout() {
    token.value = ''
    userId.value = ''
    userName.value = ''
    phoneRef.value = ''
    tenantId.value = ''
    tenantName.value = ''
    vendorAdmin.value = false
    tenants.value = []
  }

  function restoreFromStorage() {
    const stored = localStorage.getItem('crm_auth')
    if (stored) {
      try {
        const data = JSON.parse(stored)
        token.value = data.token || ''
        userId.value = data.uid || ''
        if (!userId.value && data.userId) {
          userId.value = data.userId
        }
        tenantId.value = data.tid || ''
        if (!tenantId.value && data.tenantId) {
          tenantId.value = data.tenantId
        }
        userName.value = data.userName || data.name || data.userRealName || ''
        phoneRef.value = data.phone || ''
        tenantName.value = data.tenantName || tenantId.value || ''
        vendorAdmin.value = !!data.vendorAdmin
        tenants.value = data.tenants || []
      } catch {
        // ignore parse errors
      }
    }
  }

  async function syncUserNameFromUsers() {
    if (!token.value || !userId.value) return
    try {
      const users = await api<Array<{ id?: string; userId?: string; phone?: string; name?: string }>>('/api/users')
      const me = users.find((u) =>
        (u.id || u.userId) === userId.value || u.phone === userId.value
      )
      if (me?.name && me.name.trim()) {
        userName.value = me.name.trim()
        saveToStorage()
      }
    } catch {
      // ignore profile sync errors
    }
  }

  async function switchTenant(targetTenantId: string) {
    const res = await api<{
      token: string
      tenantId: string
      tenantName: string
      defaultTenantId: string
    }>('/api/auth/current-tenant', {
      method: 'PUT',
      body: JSON.stringify({ tenantId: targetTenantId })
    })
    token.value = res.token
    tenantId.value = res.tenantId || res.defaultTenantId || targetTenantId
    tenantName.value = res.tenantName || targetTenantId
    tenants.value = tenants.value.map((t) => ({
      ...t,
      isDefault: t.tenantId === targetTenantId
    }))
    saveToStorage()
    window.location.reload()
  }

  function saveToStorage() {
    localStorage.setItem('crm_auth', JSON.stringify({
      token: token.value,
      uid: userId.value,
      tid: tenantId.value,
      userName: userName.value,
      phone: phoneRef.value,
      tenantName: tenantName.value,
      vendorAdmin: vendorAdmin.value,
      tenants: tenants.value
    }))
  }

  return {
    token,
    userId,
    userName,
    phone: phoneRef,
    tenantId,
    tenantName,
    vendorAdmin,
    tenants,
    isLoggedIn,
    hasMultipleTenants,
    api,
    login,
    loginVendor,
    logout,
    restoreFromStorage,
    syncUserNameFromUsers,
    saveToStorage,
    switchTenant
  }
})
