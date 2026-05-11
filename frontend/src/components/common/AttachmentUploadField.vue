<template>
  <div class="attachment-upload-field">
    <el-upload
      ref="uploadRef"
      :auto-upload="false"
      :show-file-list="false"
      :accept="accept"
      :multiple="multiple"
      :disabled="disabled"
      @change="handleFileChange"
    >
      <el-button :disabled="disabled">{{ buttonText }}</el-button>
    </el-upload>

    <div v-if="attachments.length" class="attachment-list">
      <div
        v-for="(item, index) in attachments"
        :key="`${item.name}-${index}`"
        class="attachment-chip"
        :title="item.name"
      >
        <span class="attachment-chip-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M7 2h7l5 5v15a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#94a3b8" />
            <path d="M14 2v5h5" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M9 14h6M9 17h6" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </span>
        <span class="attachment-chip-name" :title="item.name">{{ item.name }}</span>
        <button
          type="button"
          class="attachment-chip-remove"
          :disabled="disabled"
          aria-label="删除附件"
          @click.stop="handleRemove(index)"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>

    <div v-if="hintText" class="attachment-upload-hint">{{ hintText }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  encodeStoredAttachments,
  parseStoredAttachmentList,
} from '../../utils/attachment'

const props = withDefaults(defineProps<{
  modelValue: string
  buttonText?: string
  accept?: string
  disabled?: boolean
  hintText?: string
  multiple?: boolean
}>(), {
  modelValue: '',
  buttonText: '选择文件',
  accept: '',
  disabled: false,
  hintText: '',
  multiple: true
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'change', value: File[] | null): void
}>()

const uploadRef = ref()

const attachments = computed(() => parseStoredAttachmentList(props.modelValue))

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}

async function handleFileChange(file: any, fileList: File[] = []) {
  const rawFile = file?.raw as File | undefined
  if (!rawFile || !file?.name) {
    emit('change', fileList.length ? fileList : null)
    return
  }

  const dataUrl = await readFileAsDataUrl(rawFile)
  const next = props.multiple ? [...attachments.value, { name: file.name, data: dataUrl }] : [{ name: file.name, data: dataUrl }]
  emit('update:modelValue', encodeStoredAttachments(next))
  emit('change', fileList as File[])
}

function handleRemove(index: number) {
  const next = attachments.value.filter((_, idx) => idx !== index)
  uploadRef.value?.clearFiles?.()
  emit('update:modelValue', next.length ? encodeStoredAttachments(next) : '')
  emit('change', null)
}

</script>

<style scoped>
.attachment-upload-field {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.attachment-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
}

.attachment-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  max-width: 100%;
  min-height: 40px;
  padding: 7px 10px;
  border: 1px solid #d9e0ea;
  border-radius: 8px;
  background: #fff;
  color: #1f2937;
  cursor: default;
  transition: all 0.18s ease;
}

.attachment-chip:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}

.attachment-chip-icon {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
}

.attachment-chip-icon svg {
  display: block;
  width: 16px;
  height: 16px;
}

.attachment-chip-name {
  min-width: 0;
  max-width: 360px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-chip-remove {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  margin-left: 2px;
  border: none;
  border-radius: 999px;
  background: transparent !important;
  box-shadow: none;
  color: #64748b;
  opacity: 1;
  transition: color 0.15s ease;
}

.attachment-chip-remove:hover {
  background: transparent !important;
  color: #ef4444;
}

.attachment-chip-remove:focus,
.attachment-chip-remove:active {
  background: transparent !important;
  box-shadow: none;
  outline: none;
}

.attachment-chip-remove:disabled {
  color: #cbd5e1;
  cursor: not-allowed;
}

.attachment-chip-remove svg {
  width: 16px;
  height: 16px;
}

.attachment-upload-hint {
  width: 100%;
  margin-top: 2px;
  font-size: 12px;
  color: #94a3b8;
}
</style>
