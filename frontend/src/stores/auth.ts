import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { createApiClient } from '../api/http'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>('')
  const userId = ref<string>('')
  const userName = ref<string>('')
  const phoneRef = ref<string>('')
  const tenantId = ref<string>('')
  const tenantName = ref<string>('')
  const vendorAdmin = ref<boolean>(false)

  const isLoggedIn = computed(() => !!token.value)

  const api = createApiClient(() => token.value, () => logout())

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

  function saveToStorage() {
    localStorage.setItem('crm_auth', JSON.stringify({
      token: token.value,
      uid: userId.value,
      tid: tenantId.value,
      userName: userName.value,
      phone: phoneRef.value,
      tenantName: tenantName.value,
      vendorAdmin: vendorAdmin.value
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
    isLoggedIn,
    api,
    login,
    loginVendor,
    logout,
    restoreFromStorage,
    syncUserNameFromUsers,
    saveToStorage
  }
})
