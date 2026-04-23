<template>
  <div class="form-grid cols-4">
    <label class="field">
      <span class="field-label required">姓名</span>
      <input v-model="contactForm.name" placeholder="请输入姓名" />
    </label>
    <label class="field">
      <span class="field-label">企业名称</span>
      <input v-model="contactForm.enterpriseName" placeholder="请输入企业名称" />
    </label>
    <label class="field">
      <span class="field-label">职位</span>
      <input v-model="contactForm.title" placeholder="请输入职位" />
    </label>
    <label class="field">
      <span class="field-label required">手机号1</span>
      <input v-model="contactForm.phone1" placeholder="请输入手机号1" />
    </label>
    <label class="field">
      <span class="field-label">手机号2</span>
      <input v-model="contactForm.phone2" placeholder="请输入手机号2" />
    </label>
    <label class="field">
      <span class="field-label">微信号</span>
      <input v-model="contactForm.wechat" placeholder="请输入微信号" />
    </label>
    <label class="field">
      <span class="field-label">邮箱</span>
      <input v-model="contactForm.email" placeholder="请输入邮箱" />
    </label>
    <label class="field">
      <span class="field-label">办公电话</span>
      <input v-model="contactForm.officePhone" placeholder="请输入办公电话" />
    </label>
    <label class="field">
      <span class="field-label">性别</span>
      <select v-model="contactForm.gender">
        <option value="未知">未知</option>
        <option value="男">男</option>
        <option value="女">女</option>
      </select>
    </label>
    <label class="field" style="grid-column: span 2">
      <span class="field-label required">关联项目（多选）</span>
      <div ref="projectMultiSelectRef" class="multi-select" :class="{ disabled: !!fixedProjectId }">
        <button type="button" class="multi-select-trigger" :disabled="!!fixedProjectId" @click="toggleProjectMultiSelect">
          <span>{{ getProjectMultiSelectText() }}</span>
          <span class="multi-select-caret">▾</span>
        </button>
        <div v-if="projectMultiSelectOpen && !fixedProjectId" class="multi-select-menu">
          <label v-for="p in projects" :key="p.id" class="multi-select-option">
            <input type="checkbox" :checked="isProjectChecked(p.id)" @change="toggleProjectInContact(p.id)" />
            <span>{{ p.name || "-" }} / {{ p.code || p.id }}</span>
          </label>
        </div>
      </div>
      <span v-if="fixedProjectId" class="muted">已从项目详情进入，关联项目固定为当前项目</span>
    </label>
    <label class="field">
      <span class="field-label">是否决策人</span>
      <select v-model="contactForm.decisionMaker">
        <option :value="false">否</option>
        <option :value="true">是</option>
      </select>
    </label>
    <label class="field" style="grid-column: span 2">
      <span class="field-label">备注</span>
      <input v-model="contactForm.remark" placeholder="请输入备注" />
    </label>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

const {
  contactForm,
  projects,
  fixedProjectId,
  projectMultiSelectOpen,
  toggleProjectMultiSelect,
  closeProjectMultiSelect,
  getProjectMultiSelectText,
  isProjectChecked,
  toggleProjectInContact
} = defineProps<{
  contactForm: any;
  projects: any[];
  fixedProjectId?: string;
  projectMultiSelectOpen: boolean;
  toggleProjectMultiSelect: () => void;
  closeProjectMultiSelect: () => void;
  getProjectMultiSelectText: () => string;
  isProjectChecked: (projectId: string) => boolean;
  toggleProjectInContact: (projectId: string) => void;
}>();

const projectMultiSelectRef = ref<HTMLElement | null>(null);

function onPointerDown(event: MouseEvent) {
  const target = event.target as Node | null;
  if (target && projectMultiSelectRef.value && !projectMultiSelectRef.value.contains(target)) {
    closeProjectMultiSelect();
  }
}

onMounted(() => window.addEventListener("pointerdown", onPointerDown));
onBeforeUnmount(() => window.removeEventListener("pointerdown", onPointerDown));
</script>
