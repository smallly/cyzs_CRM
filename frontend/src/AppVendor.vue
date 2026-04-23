<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="logo">
        <div class="logo-icon">VP</div>
        <div>
          <div class="logo-title">厂商平台</div>
          <div class="logo-sub">SaaS 开通管理</div>
        </div>
      </div>
      <nav class="menu">
        <button class="menu-item active">组织开通</button>
        <button class="menu-item">组织列表</button>
      </nav>
    </aside>
    <main class="main">
      <header class="topbar">
        <div class="crumb">厂商平台</div>
        <div class="user">{{ currentTime }}</div>
      </header>
      <section class="content">
        <div class="card">
          <h2>厂商平台入口已独立</h2>
          <p>当前地址为独立厂商入口，可与 SaaS 前台分开部署与访问。</p>
          <div class="row">
            <span class="badge">厂商平台 URL：{{ vendorUrl }}</span>
            <span class="badge">SaaS 前台 URL：{{ saasUrl }}</span>
          </div>
          <div class="row" style="margin-top: 12px">
            <span class="muted">说明：V1 的厂商业务页面将在后续任务中继续补齐。</span>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const host = window.location.hostname || "localhost";
const vendorUrl = computed(() => `http://${host}:5174`);
const saasUrl = computed(() => `http://${host}:5173`);
const currentTime = computed(() => new Date().toLocaleString("zh-CN"));
</script>
