<template>
  <div class="card">
    <h2>联系人管理</h2>
    <div class="form-grid cols-4">
      <label class="field">
        <span class="field-label">姓名（筛选）</span>
        <input v-model="contactFilterForm.name" placeholder="请输入姓名关键词" />
      </label>
      <label class="field">
        <span class="field-label">企业名称（筛选）</span>
        <input v-model="contactFilterForm.enterpriseName" placeholder="请输入企业关键词" />
      </label>
      <label class="field">
        <span class="field-label">手机号1（筛选）</span>
        <input v-model="contactFilterForm.phone1" placeholder="请输入手机号1关键词" />
      </label>
      <label class="field">
        <span class="field-label">手机号2（筛选）</span>
        <input v-model="contactFilterForm.phone2" placeholder="请输入手机号2关键词" />
      </label>
    </div>
    <div class="row">
      <button @click="applyContactFilters">查询</button>
      <button class="secondary" @click="resetContactFilters">重置</button>
      <button class="secondary" @click="openCreateContactPage">新建联系人</button>
      <button class="secondary" @click="loadContacts">刷新</button>
    </div>
    <table>
      <thead>
        <tr>
          <th>姓名</th>
          <th>企业名称</th>
          <th>职位</th>
          <th>关联项目</th>
          <th>手机号1</th>
          <th>手机号2</th>
          <th>ID</th>
          <th>租户</th>
          <th>负责人</th>
          <th>创建人</th>
          <th>是否删除</th>
          <th>创建时间</th>
          <th>最后编辑时间</th>
          <th>删除时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in filteredContacts" :key="c.id">
          <td><button class="row-link-btn" @click="openContactDetailPage(c.id)">{{ c.name || "-" }}</button></td>
          <td>{{ c.enterpriseName || "-" }}</td>
          <td>{{ c.title || "-" }}</td>
          <td>{{ getContactLinkedProjectNames(c) }}</td>
          <td>{{ c.phone1 }}</td>
          <td>{{ c.phone2 || "-" }}</td>
          <td>{{ c.id }}</td>
          <td>{{ c.tenantId || "-" }}</td>
          <td>{{ getUserDisplayName(c.ownerId) }}</td>
          <td>{{ getUserDisplayName(c.creatorId) }}</td>
          <td>{{ c.deleted ? "是" : "否" }}</td>
          <td>{{ formatDateTime(c.createdAt) }}</td>
          <td>{{ formatDateTime(c.updatedAt) }}</td>
          <td>{{ formatDateTime(c.deletedAt) }}</td>
          <td>
            <div class="row list-action-row">
              <button class="secondary list-action-btn" @click="startContactEdit(c)">编辑</button>
              <button class="secondary list-action-btn" @click="requestDeleteContact(c.id)">删除</button>
            </div>
          </td>
        </tr>
        <tr v-if="filteredContacts.length === 0">
          <td colspan="15" class="muted">暂无符合条件的联系人</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
const {
  contactFilterForm,
  filteredContacts,
  applyContactFilters,
  resetContactFilters,
  openCreateContactPage,
  loadContacts,
  openContactDetailPage,
  getContactLinkedProjectNames,
  getUserDisplayName,
  formatDateTime,
  startContactEdit,
  requestDeleteContact
} = defineProps<{
  contactFilterForm: any;
  filteredContacts: any[];
  applyContactFilters: () => void;
  resetContactFilters: () => void;
  openCreateContactPage: () => void;
  loadContacts: () => void | Promise<void>;
  openContactDetailPage: (id: string) => void;
  getContactLinkedProjectNames: (c: any) => string;
  getUserDisplayName: (userId?: string) => string;
  formatDateTime: (value?: string | null) => string;
  startContactEdit: (c: any) => void;
  requestDeleteContact: (id: string) => void;
}>();
</script>
