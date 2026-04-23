import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './styles/element-override.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import App from './App.vue'
import AppVendor from './AppVendor.vue'
import { router } from './router'
import './style.css'

const portalType = import.meta.env.VITE_PORTAL_TYPE || 'saas'
const app = createApp(portalType === 'vendor' ? AppVendor : App)

const pinia = createPinia()

// Register Element Plus and icons
app.use(ElementPlus)
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// Register Pinia and Router
app.use(pinia)
app.use(router)

app.mount('#app')
