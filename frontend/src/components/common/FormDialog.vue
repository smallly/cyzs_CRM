<template>
  <el-dialog
    :model-value="visibleProxy"
    @update:model-value="visibleProxy = $event"
    :title="title"
    :width="width"
    :before-close="handleBeforeClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      :label-width="labelWidth"
      :label-position="labelPosition"
    >
      <el-row :gutter="16">
        <el-col
          v-for="field in fields"
          :key="field.prop"
          :span="field.span || 24"
        >
          <el-form-item :label="field.label" :prop="field.prop">
            <!-- 文本输入 -->
            <el-input
              v-if="field.type === 'input'"
              v-model="form[field.prop]"
              :placeholder="field.placeholder"
              :disabled="field.disabled"
              :maxlength="field.maxlength"
              :show-word-limit="field.showWordLimit"
            />

            <!-- 数字输入 -->
            <el-input-number
              v-else-if="field.type === 'number'"
              v-model="form[field.prop]"
              :placeholder="field.placeholder"
              :disabled="field.disabled"
              :min="field.min"
              :max="field.max"
              :precision="field.precision"
              :controls="field.controls"
            />

            <!-- 选择器 -->
            <el-select
              v-else-if="field.type === 'select'"
              v-model="form[field.prop]"
              :placeholder="field.placeholder"
              :disabled="field.disabled"
              :clearable="field.clearable"
              :multiple="field.multiple"
            >
              <el-option
                v-for="opt in field.options || []"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>

            <!-- 日期选择 -->
            <el-date-picker
              v-else-if="field.type === 'date'"
              v-model="form[field.prop]"
              :type="field.dateType || 'date'"
              :placeholder="field.placeholder"
              :disabled="field.disabled"
              :clearable="field.clearable"
              :format="field.format"
              :value-format="field.valueFormat"
            />

            <!-- 时间选择 -->
            <el-time-picker
              v-else-if="field.type === 'time'"
              v-model="form[field.prop]"
              :placeholder="field.placeholder"
              :disabled="field.disabled"
              :clearable="field.clearable"
              :format="field.format"
              :value-format="field.valueFormat"
            />

            <!-- 开关 -->
            <el-switch
              v-else-if="field.type === 'switch'"
              v-model="form[field.prop]"
              :disabled="field.disabled"
            />

            <!-- 文本域 -->
            <el-input
              v-else-if="field.type === 'textarea'"
              v-model="form[field.prop]"
              type="textarea"
              :placeholder="field.placeholder"
              :disabled="field.disabled"
              :rows="field.rows || 3"
              :maxlength="field.maxlength"
              :show-word-limit="field.showWordLimit"
            />

            <!-- 自定义插槽 -->
            <slot v-else-if="field.type === 'slot'" :name="field.slot" :form="form" />

            <!-- 默认文本输入 -->
            <el-input
              v-else
              v-model="form[field.prop]"
              :placeholder="field.placeholder"
              :disabled="field.disabled"
            />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <template #footer>
      <el-space>
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          {{ submitText }}
        </el-button>
      </el-space>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'

export interface FormField {
  prop: string
  label: string
  type?: 'input' | 'number' | 'select' | 'date' | 'time' | 'switch' | 'textarea' | 'slot'
  span?: number
  placeholder?: string
  disabled?: boolean
  required?: boolean
  maxlength?: number
  showWordLimit?: boolean
  min?: number
  max?: number
  precision?: number
  controls?: boolean
  clearable?: boolean
  multiple?: boolean
  options?: { label: string; value: any }[]
  dateType?: 'date' | 'datetime' | 'daterange' | 'datetimerange'
  format?: string
  valueFormat?: string
  rows?: number
  slot?: string
  rules?: any[]
}

const props = withDefaults(
  defineProps<{
    visible: boolean
    title?: string
    width?: number | string
    labelWidth?: number | string
    labelPosition?: 'left' | 'right' | 'top'
    fields: FormField[]
    modelValue?: any
    rules?: FormRules
    submitText?: string
    submitting?: boolean
  }>(),
  {
    title: '表单',
    width: '680px',
    labelWidth: '100px',
    labelPosition: 'right',
    modelValue: () => ({}),
    rules: () => ({}),
    submitText: '提交',
    submitting: false
  }
)

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'update:modelValue': [value: any]
  submit: [form: any]
  cancel: []
}>()

const formRef = ref<FormInstance>()
const form = reactive<any>({})
const visibleProxy = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value)
})

// 监听外部传入的 modelValue，同步到内部 form
watch(
  () => props.modelValue,
  (newVal) => {
    Object.keys(form).forEach((key) => delete form[key])
    if (newVal) {
      Object.assign(form, newVal)
    }
  },
  { immediate: true, deep: true }
)

// 监听内部 form，同步到外部
watch(
  form,
  (newVal) => {
    emit('update:modelValue', newVal)
  },
  { deep: true }
)

// 监听 visible
watch(
  () => props.visible,
  (newVal) => {
    if (newVal && props.modelValue) {
      Object.assign(form, props.modelValue)
    }
  }
)

async function handleBeforeClose(done: () => void) {
  try {
    await handleCancel()
    done()
  } catch {
    // 取消关闭
  }
}

async function handleCancel() {
  formRef.value?.resetFields()
  emit('update:visible', false)
  emit('cancel')
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
    emit('submit', { ...form })
  } catch {
    // 表单验证失败
  }
}
</script>

<style scoped>
/* Select多选模式下选中的标签样式 - 去掉背景色和边框 */
.el-form :deep(.el-select__tags .el-tag) {
  background: transparent !important;
  background-color: transparent !important;
  border: none !important;
  border-color: transparent !important;
  color: #334155 !important;
  padding: 0 4px 0 0 !important;
  margin: 0 2px !important;
  font-size: 13px;
  font-weight: 400;
  box-shadow: none !important;
}

.el-form :deep(.el-select__tags .el-tag .el-tag__close) {
  background: transparent !important;
  background-color: transparent !important;
  color: #64748b !important;
  margin-left: 2px;
}

.el-form :deep(.el-select__tags .el-tag .el-tag__close:hover) {
  background: transparent !important;
  background-color: transparent !important;
  color: #ef4444 !important;
}
</style>