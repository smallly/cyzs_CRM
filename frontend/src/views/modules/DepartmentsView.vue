<template>
  <div class="card">
    <h2>部门管理</h2>
    <div class="form-grid cols-4">
      <label class="field">
        <span class="field-label required">部门名称</span>
        <input v-model="departmentForm.name" placeholder="请输入部门名称" />
      </label>
      <label class="field">
        <span class="field-label">上级部门</span>
        <select v-model="departmentForm.parentId">
          <option value="">无（顶级部门）</option>
          <option
            v-for="d in departments.filter((item) => item.status === 'ENABLED' && item.id !== departmentEditingId)"
            :key="d.id"
            :value="d.id"
          >
            {{ d.name }}
          </option>
        </select>
      </label>
      <label class="field">
        <span class="field-label">部门负责人</span>
        <select v-model="departmentForm.headUserId">
          <option value="">未设置</option>
          <option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }}</option>
        </select>
      </label>
    </div>
    <div class="row">
      <button @click="saveDepartment">{{ departmentEditingId ? "保存部门" : "新增部门" }}</button>
      <button class="secondary" @click="resetDepartmentForm">重置</button>
      <button class="secondary" @click="loadDepartments">刷新</button>
    </div>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>部门名称</th>
          <th>上级部门</th>
          <th>部门负责人</th>
          <th>状态</th>
          <th>创建时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="d in departments" :key="d.id">
          <td>{{ d.id }}</td>
          <td>{{ d.name }}</td>
          <td>{{ getDeptDisplayName(d.parentId) }}</td>
          <td>{{ getUserDisplayName(d.headUserId || undefined) }}</td>
          <td>{{ d.status === "ENABLED" ? "启用" : "停用" }}</td>
          <td>{{ formatDateTime(d.createdAt) }}</td>
          <td>
            <div class="row list-action-row">
              <button class="secondary list-action-btn" @click="editDepartment(d)">编辑</button>
              <button class="secondary list-action-btn" @click="toggleDepartmentStatus(d)">
                {{ d.status === "ENABLED" ? "停用" : "启用" }}
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
const {
  users,
  departments,
  departmentEditingId,
  departmentForm,
  saveDepartment,
  resetDepartmentForm,
  loadDepartments,
  editDepartment,
  toggleDepartmentStatus,
  getDeptDisplayName,
  getUserDisplayName,
  formatDateTime
} = defineProps<{
  users: any[];
  departments: any[];
  departmentEditingId: string;
  departmentForm: any;
  saveDepartment: () => void | Promise<void>;
  resetDepartmentForm: () => void;
  loadDepartments: () => void | Promise<void>;
  editDepartment: (d: any) => void;
  toggleDepartmentStatus: (d: any) => void | Promise<void>;
  getDeptDisplayName: (deptId?: string | null) => string;
  getUserDisplayName: (userId?: string) => string;
  formatDateTime: (value?: string | null) => string;
}>();
</script>
