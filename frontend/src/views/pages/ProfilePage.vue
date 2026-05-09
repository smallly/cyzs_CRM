<template>
  <div class="profile-page">
    <el-card class="profile-card">
      <template #header>
        <div class="card-header">
          <span class="header-title">个人信息</span>
        </div>
      </template>

      <div class="profile-section">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="姓名">{{ userInfo.name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ userInfo.phone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="用户ID">{{ userInfo.userId || '-' }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../stores/auth'

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

onMounted(() => {
  loadUserInfo()
})

async function loadUserInfo() {
  try {
    const data = await authStore.api<UserInfo>('/api/me')
    Object.assign(userInfo, data)
  } catch (error: any) {
    ElMessage.error(error.message || '获取用户信息失败')
  }
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

</style>
