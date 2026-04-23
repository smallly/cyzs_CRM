<template>
  <div class="card">
    <div class="row" style="justify-content: space-between; align-items: center">
      <h2 style="margin: 0">新建项目</h2>
      <button class="secondary" @click="backToProjects">返回项目列表</button>
    </div>
    <div v-if="contacts.length === 0" class="inline-tip" style="margin-bottom: 10px">
      当前没有联系人，创建项目前请先新增联系人。
      <button class="secondary" style="margin-left: 8px" @click="goToContacts">去新增联系人</button>
    </div>

    <div class="form-grid cols-4">
      <label class="field">
        <span class="field-label required">项目名称</span>
        <input v-model="projectForm.name" placeholder="请输入项目名称" />
      </label>
      <label class="field">
        <span class="field-label required">联系人</span>
        <select v-model="projectForm.contactId">
          <option value="">请选择联系人</option>
          <option v-for="c in contacts" :key="c.id" :value="c.id">{{ getContactOptionLabel(c) }}</option>
        </select>
      </label>
      <label class="field">
        <span class="field-label required">项目负责人</span>
        <select v-model="projectForm.ownerId">
          <option value="">请选择项目负责人</option>
          <option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }} / {{ u.id }}</option>
        </select>
      </label>
      <label class="field">
        <span class="field-label">租购类型</span>
        <select v-model="projectForm.dealType">
          <option v-for="x in dealTypeOptions" :key="x" :value="x">{{ dealTypeLabelMap[x] }}</option>
        </select>
      </label>
      <label class="field">
        <span class="field-label">项目级别</span>
        <div class="radio-group">
          <label v-for="level in projectLevelOptions" :key="level" class="radio-item">
            <input v-model="projectForm.level" type="radio" :value="level" />
            <span>{{ level }}</span>
          </label>
        </div>
      </label>
      <label class="field">
        <span class="field-label">项目来源</span>
        <div class="radio-group">
          <label v-for="sourceOption in projectSourceOptions" :key="sourceOption" class="radio-item">
            <input v-model="projectForm.source" type="radio" :value="sourceOption" />
            <span>{{ sourceOption }}</span>
          </label>
        </div>
      </label>
      <label class="field">
        <span class="field-label">意向区域</span>
        <input v-model="projectForm.intendedRegion" placeholder="请输入意向区域" />
      </label>
      <label class="field">
        <span class="field-label">意向面积最小值(㎡)</span>
        <input v-model="projectForm.intendedAreaMin" type="number" min="0" placeholder="例如 1000" />
      </label>
      <label class="field">
        <span class="field-label">意向面积最大值(㎡)</span>
        <input v-model="projectForm.intendedAreaMax" type="number" min="0" placeholder="例如 3000" />
      </label>
      <label class="field">
        <span class="field-label">备注</span>
        <input v-model="projectForm.remark" placeholder="请输入备注" />
      </label>
    </div>
    <div class="row">
      <button @click="createProject">保存项目</button>
      <button class="secondary" @click="resetProjectForm">重置</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const {
  projectForm,
  contacts,
  users,
  dealTypeOptions,
  dealTypeLabelMap,
  projectLevelOptions,
  projectSourceOptions,
  getContactOptionLabel,
  createProject,
  resetProjectForm,
  backToProjects,
  goToContacts
} = defineProps<{
  projectForm: any;
  contacts: any[];
  users: any[];
  dealTypeOptions: readonly string[];
  dealTypeLabelMap: Record<string, string>;
  projectLevelOptions: string[];
  projectSourceOptions: string[];
  getContactOptionLabel: (contact: any) => string;
  createProject: () => void | Promise<void>;
  resetProjectForm: () => void;
  backToProjects: () => void;
  goToContacts: () => void;
}>();
</script>
