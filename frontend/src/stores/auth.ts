import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { createApiClient } from '../api/http'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>('')
  const userId = ref<string>('')
  const userName = ref<string>('')
  const tenantId = ref<string>('')

  const isLoggedIn = computed(() => !!token.value)

  const api = createApiClient(() => token.value)

  async function login(phone: string, password: string) {
    const res = await api<{ token: string; uid: string; tid: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password })
    })
    token.value = res.token
    userId.value = res.uid
    tenantId.value = res.tid
    userName.value = phone
  }

  function logout() {
    token.value = ''
    userId.value = ''
    userName.value = ''
    tenantId.value = ''
  }

  function restoreFromStorage() {
    const stored = localStorage.getItem('crm_auth')
    if (stored) {
      try {
        const data = JSON.parse(stored)
        token.value = data.token || ''
        userId.value = data.uid || ''
        tenantId.value = data.tid || ''
        userName.value = data.userName || ''
      } catch {
        // ignore parse errors
      }
    }
  }

  function saveToStorage() {
    localStorage.setItem('crm_auth', JSON.stringify({
      token: token.value,
      uid: userId.value,
      tid: tenantId.value,
      userName: userName.value
    }))
  }

  return {
    token,
    userId,
    userName,
    tenantId,
    isLoggedIn,
    api,
    login,
    logout,
    restoreFromStorage,
    saveToStorage
  }
})