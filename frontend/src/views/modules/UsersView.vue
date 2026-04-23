<template>
  <div class="card">
    <h2>成员管理</h2>
    <p class="muted" style="margin: 6px 0 0">
      当前数据权限口径：{{ getScopeModeLabel(scopeMode) }}。当口径为“本人及下属的数据”时，下属按“部门负责人”配置自动计算。
    </p>
    <div class="row">
      <button @click="loadUsers">刷新成员</button>
    </div>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>姓名</th>
          <th>手机号</th>
          <th>部门归属</th>
          <th>部门负责人</th>
          <th>直属上级</th>
          <th>主部门（可调整）</th>
          <th>角色</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in users" :key="u.id">
          <td>{{ u.id }}</td>
          <td>{{ u.name }}</td>
          <td>{{ u.phone }}</td>
          <td>{{ getDeptDisplayName(u.deptId) }}</td>
          <td>{{ getDeptHeadDisplayName(u.deptId) }}</td>
          <td>{{ getUserDisplayName(u.managerId) }}</td>
          <td>
            <select v-model="u.deptId">
              <option value="">请选择部门</option>
              <option v-for="d in departments.filter((item) => item.status === 'ENABLED')" :key="d.id" :value="d.id">{{ d.name }}</option>
            </select>
          </td>
          <td>
            <select v-model="u.roleCode">
              <option v-for="r in roleOptions" :key="r.code" :value="r.code">{{ r.name }}</option>
            </select>
          </td>
          <td>
            <select v-model="u.status">
              <option value="ENABLED">启用</option>
              <option value="DISABLED">停用</option>
            </select>
          </td>
          <td>
            <div class="row list-action-row">
              <button class="secondary list-action-btn" @click="updateDepartment(u)">保存部门</button>
              <button class="list-action-btn" @click="updateRole(u)">保存角色</button>
              <button class="secondary list-action-btn" @click="updateStatus(u)">保存状态</button>
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
  roleOptions,
  scopeMode,
  loadUsers,
  updateRole,
  updateStatus,
  updateDepartment,
  getUserDisplayName,
  getDeptDisplayName,
  getDeptHeadDisplayName,
  getScopeModeLabel
} = defineProps<{
  users: any[];
  departments: any[];
  roleOptions: any[];
  scopeMode: string;
  loadUsers: () => void | Promise<void>;
  updateRole: (u: any) => void | Promise<void>;
  updateStatus: (u: any) => void | Promise<void>;
  updateDepartment: (u: any) => void | Promise<void>;
  getUserDisplayName: (userId?: string) => string;
  getDeptDisplayName: (deptId?: string | null) => string;
  getDeptHeadDisplayName: (deptId?: string | null) => string;
  getScopeModeLabel: (mode?: string) => string;
}>();
</script>
