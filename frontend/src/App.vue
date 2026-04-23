<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'

const router = useRouter()
const authStore = useAuthStore()

onMounted(() => {
  authStore.restoreFromStorage()
  if (!authStore.isLoggedIn && router.currentRoute.value.path !== '/login') {
    router.push('/login')
  }
})
</script>
