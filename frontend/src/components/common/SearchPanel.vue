<template>
  <el-card class="search-panel">
    <el-form :model="modelValue" :inline="inline" :label-width="labelWidth">
      <el-row :gutter="16">
        <el-col
          v-for="field in fields"
          :key="field.prop"
          :span="field.span || (inline ? 6 : 12)"
        >
          <el-form-item :label="field.label">
            <!-- 文本输入 -->
            <el-input
              v-if="field.type === 'input'"
              v-model="modelValue[field.prop]"
              :placeholder="field.placeholder || `请输入${field.label}`"
              :clearable="field.clearable"
              @keyup.enter="handleSearch"
            />

            <!-- 选择器 -->
            <el-select
              v-else-if="field.type === 'select'"
              v-model="modelValue[field.prop]"
              :placeholder="field.placeholder || `请选择${field.label}`"
              :clearable="field.clearable"
              :multiple="field.multiple"
              collapse-tags
              collapse-tags-tooltip
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
              v-model="modelValue[field.prop]"
              :type="field.dateType || 'date'"
              :placeholder="field.placeholder || `请选择${field.label}`"
              :clearable="field.clearable"
              :format="field.format"
              :value-format="field.valueFormat"
            />

            <!-- 日期范围 -->
            <el-date-picker
              v-else-if="field.type === 'daterange'"
              v-model="modelValue[field.prop]"
              type="daterange"
              :start-placeholder="field.startPlaceholder || '开始日期'"
              :end-placeholder="field.endPlaceholder || '结束日期'"
              :clearable="field.clearable"
              :format="field.format"
              :value-format="field.valueFormat"
            />

            <!-- 自定义插槽 -->
            <slot v-else-if="field.type === 'slot'" :name="field.slot" :model="modelValue" />

            <!-- 默认文本输入 -->
            <el-input
              v-else
              v-model="modelValue[field.prop]"
              :placeholder="field.placeholder || `请输入${field.label}`"
              :clearable="field.clearable"
              @keyup.enter="handleSearch"
            />
          </el-form-item>
        </el-col>

        <!-- 操作按钮 -->
        <el-col :span="inline ? 6 : 12" v-if="showActions">
          <el-form-item>
            <el-space>
              <el-button type="primary" @click="handleSearch">
                搜索
              </el-button>
              <el-button @click="handleReset" v-if="showReset">
                重置
              </el-button>
            </el-space>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">

export interface SearchField {
  prop: string
  label: string
  type?: 'input' | 'select' | 'date' | 'daterange' | 'slot'
  span?: number
  placeholder?: string
  clearable?: boolean
  multiple?: boolean
  options?: { label: string; value: any }[]
  dateType?: 'date' | 'datetime' | 'daterange' | 'datetimerange'
  format?: string
  valueFormat?: string
  startPlaceholder?: string
  endPlaceholder?: string
  slot?: string
}

const props = withDefaults(
  defineProps<{
    modelValue: any
    fields: SearchField[]
    inline?: boolean
    labelWidth?: number | string
    showActions?: boolean
    showReset?: boolean
  }>(),
  {
    inline: true,
    labelWidth: '80px',
    showActions: true,
    showReset: true
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: any]
  search: []
  reset: []
}>()

function handleSearch() {
  emit('search')
}

function handleReset() {
  Object.keys(props.modelValue).forEach((key) => {
    props.modelValue[key] = undefined
  })
  emit('reset')
}
</script>

<style scoped>
.search-panel {
  margin-bottom: 16px;
}
</style>
