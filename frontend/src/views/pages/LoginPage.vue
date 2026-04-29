<template>
  <div class="login-page">
    <div class="login-bg-orb orb-a"></div>
    <div class="login-bg-orb orb-b"></div>
    <div class="login-bg-orb orb-c"></div>

    <div class="login-shell">
      <section class="login-visual" aria-hidden="true">
        <div class="visual-brand">
          <div class="brand-logo">CRM</div>
          <div class="brand-text">产业地产 CRM 智慧平台</div>
        </div>

        <div class="visual-stage">
          <div class="stage-glow"></div>
          <div class="stage-card">
            <div class="stage-toolbar">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div class="stage-body"></div>
            <div class="stage-badge">AI</div>
          </div>
        </div>
      </section>

      <section class="login-panel">
        <div class="panel-card">
          <div class="panel-head">
            <h2>SaaS 平台登录</h2>
            <p>欢迎回来，请输入账号密码继续</p>
          </div>

          <el-form :model="form" :rules="rules" ref="formRef" label-width="0px" class="panel-form">
            <el-form-item prop="phone">
              <el-input v-model="form.phone" placeholder="请输入手机号">
                <template #prefix>
                  <el-icon><User /></el-icon>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item prop="password">
              <el-input
                v-model="form.password"
                type="password"
                placeholder="请输入密码"
                show-password
              >
                <template #prefix>
                  <el-icon><Lock /></el-icon>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item class="submit-row">
              <el-button type="primary" class="submit-btn" @click="handleLogin" :loading="loading">
                登录
              </el-button>
            </el-form-item>
          </el-form>

          <div class="login-tip">默认管理员：13800000000 / admin123</div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Lock, User } from '@element-plus/icons-vue'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const formRef = ref()
const loading = ref(false)

const form = reactive({
  phone: '13800000000',
  password: 'admin123'
})

const rules = {
  phone: [{ required: true, message: '请输入手机号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

async function handleLogin() {
  try {
    await formRef.value.validate()
    loading.value = true

    await authStore.login(form.phone, form.password)
    await authStore.syncUserNameFromUsers()
    authStore.saveToStorage()

    ElMessage.success('登录成功')
    router.push('/')
  } catch (error: any) {
    ElMessage.error(error.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background: linear-gradient(135deg, #eef4ff 0%, #dfe9ff 42%, #d4e2ff 100%);
}

.login-bg-orb {
  position: absolute;
  border-radius: 999px;
  filter: blur(2px);
  pointer-events: none;
}

.orb-a {
  width: 680px;
  height: 680px;
  left: -240px;
  top: -220px;
  background: radial-gradient(circle at 35% 35%, rgba(96, 157, 255, 0.24), rgba(96, 157, 255, 0));
}

.orb-b {
  width: 900px;
  height: 900px;
  right: -360px;
  bottom: -380px;
  background: radial-gradient(circle at 30% 30%, rgba(78, 121, 255, 0.2), rgba(78, 121, 255, 0));
}

.orb-c {
  width: 480px;
  height: 480px;
  left: 38%;
  top: 56%;
  background: radial-gradient(circle at 45% 45%, rgba(255, 255, 255, 0.58), rgba(255, 255, 255, 0));
}

.login-shell {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr 480px;
  align-items: center;
  gap: 40px;
  padding: 40px clamp(20px, 4vw, 56px);
}

.login-visual {
  min-height: 600px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.visual-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-logo {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: linear-gradient(140deg, #2563eb, #4f8bff);
  color: #fff;
  font-weight: 700;
  font-size: 20px;
  display: grid;
  place-items: center;
}

.brand-text {
  font-size: 36px;
  line-height: 1.2;
  letter-spacing: 0.2px;
  font-weight: 700;
  color: #122043;
}

.visual-stage {
  position: relative;
  width: min(760px, 95%);
  height: 430px;
}

.stage-glow {
  position: absolute;
  inset: 18% 4% -4% 8%;
  background: radial-gradient(circle at 50% 0%, rgba(63, 121, 255, 0.3), rgba(63, 121, 255, 0));
}

.stage-card {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 360px;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.65);
  box-shadow: 0 24px 52px rgba(31, 64, 152, 0.16);
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.86), rgba(236, 244, 255, 0.76));
  backdrop-filter: blur(4px);
  overflow: hidden;
}

.stage-toolbar {
  height: 48px;
  padding: 0 18px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #2f5cf6, #5aa0ff);
}

.stage-toolbar span {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.8);
}

.stage-body {
  height: calc(100% - 48px);
  background: linear-gradient(180deg, rgba(238, 245, 255, 0.92), rgba(231, 240, 255, 0.72));
}

.stage-badge {
  position: absolute;
  left: 50%;
  top: 56%;
  transform: translate(-50%, -50%);
  width: 170px;
  height: 140px;
  border-radius: 20px;
  background: linear-gradient(145deg, #1d64ff, #4f9cff);
  color: #fff;
  font-size: 54px;
  font-weight: 700;
  display: grid;
  place-items: center;
  box-shadow: 0 14px 30px rgba(37, 99, 235, 0.34);
}

.login-panel {
  display: flex;
  justify-content: center;
}

.panel-card {
  width: min(440px, 100%);
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(201, 216, 245, 0.9);
  border-radius: 20px;
  padding: 34px 34px 28px;
  box-shadow: 0 18px 38px rgba(20, 44, 96, 0.13);
}

.panel-head {
  margin-bottom: 20px;
}

.panel-head h2 {
  margin: 0 0 8px;
  text-align: center;
  font-size: 34px;
  color: #122043;
}

.panel-head p {
  margin: 0;
  text-align: center;
  color: #6a7897;
  font-size: 14px;
}

.panel-form {
  margin-top: 6px;
}

:deep(.panel-form .el-form-item) {
  margin-bottom: 16px;
}

:deep(.panel-form .el-input__wrapper) {
  height: 46px;
  border-radius: 10px;
}

:deep(.panel-form .el-input__prefix-inner) {
  color: #8ea0c6;
}

:deep(.panel-form .el-input__inner) {
  font-size: 15px;
}

:deep(.submit-row .el-form-item__content) {
  margin-left: 0 !important;
}

.submit-btn {
  width: 100%;
  height: 44px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
}

.login-tip {
  margin-top: 10px;
  text-align: center;
  font-size: 13px;
  color: #6a7897;
}

@media (max-width: 1024px) {
  .login-shell {
    grid-template-columns: 1fr;
    padding: 28px 16px;
    gap: 18px;
  }

  .login-visual {
    min-height: auto;
    gap: 14px;
  }

  .visual-stage {
    width: 100%;
    height: 220px;
  }

  .stage-card {
    height: 190px;
  }

  .stage-badge {
    width: 120px;
    height: 90px;
    font-size: 36px;
  }

  .brand-text {
    font-size: 22px;
  }

  .panel-card {
    width: min(520px, 100%);
    padding: 26px 18px 20px;
  }

  .panel-head h2 {
    font-size: 28px;
  }
}
</style>
