<template>
  <el-card class="users-departments-page">
    <template #header>
      <div class="card-header">
        <span>成员与部门</span>
      </div>
    </template>

    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <el-tab-pane label="成员" name="users" lazy>
        <UsersView ref="usersViewRef" />
      </el-tab-pane>
      <el-tab-pane label="部门" name="departments" lazy>
        <DepartmentsView />
      </el-tab-pane>
    </el-tabs>
  </el-card>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UsersView from '../modules/UsersView.vue'
import DepartmentsView from '../modules/DepartmentsView.vue'

type TabKey = 'users' | 'departments'

const route = useRoute()
const router = useRouter()

const activeTab = ref<TabKey>(getTabFromQuery(route.query.tab))
const usersViewRef = ref<InstanceType<typeof UsersView> | null>(null)

watch(
  () => route.query.tab,
  (tab) => {
    const nextTab = getTabFromQuery(tab)
    if (nextTab !== activeTab.value) activeTab.value = nextTab
  }
)

function getTabFromQuery(tab: unknown): TabKey {
  return tab === 'departments' ? 'departments' : 'users'
}

function handleTabChange(tab: string | number) {
  const nextTab: TabKey = tab === 'departments' ? 'departments' : 'users'
  router.replace({ path: '/settings/org', query: { tab: nextTab } })
  if (nextTab === 'users') {
    void nextTick(() => usersViewRef.value?.refreshDepartments())
  }
}
</script>

<style scoped>
.users-departments-page :deep(.el-card) {
  border: none;
  box-shadow: none;
}

.users-departments-page :deep(.el-card__body) {
  padding: 0;
}

.users-departments-page :deep(.el-tabs__content) {
  padding-top: 8px;
}

.users-departments-page :deep(.el-tabs__header) {
  padding-left: 12px;
}
</style>
