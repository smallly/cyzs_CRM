import { createApp } from 'vue';
import App from './App.vue';
import AppVendor from './AppVendor.vue';
import './style.css';
const portalType = import.meta.env.VITE_PORTAL_TYPE || 'saas';
createApp(portalType === 'vendor' ? AppVendor : App).mount('#app');
