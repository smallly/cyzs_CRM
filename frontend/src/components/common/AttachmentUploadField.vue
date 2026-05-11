<template>
  <div class="attachment-upload-field">
    <el-upload
      ref="uploadRef"
      :auto-upload="false"
      :show-file-list="false"
      :accept="accept"
      :disabled="disabled"
      @change="handleFileChange"
    >
      <el-button :disabled="disabled">{{ buttonText }}</el-button>
    </el-upload>

    <div
      v-if="fileName"
      class="attachment-chip"
      :class="{ 'is-previewable': canPreview }"
      :title="canPreview ? '点击预览' : fileName"
      @click="handlePreview"
      @keydown.enter.prevent="handlePreview"
      @keydown.space.prevent="handlePreview"
      tabindex="0"
      role="button"
    >
      <span class="attachment-chip-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M7 2h7l5 5v15a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#3b82f6" />
          <path d="M14 2v5h5" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M9 14h6M9 17h6" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" />
        </svg>
      </span>
      <span class="attachment-chip-name">{{ fileName }}</span>
      <span class="attachment-chip-preview" v-if="canPreview">预览</span>
      <button
        type="button"
        class="attachment-chip-remove"
        :disabled="disabled"
        aria-label="删除附件"
        @click.stop="handleRemove"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>
    </div>

    <div v-if="hintText" class="attachment-upload-hint">{{ hintText }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string
  buttonText?: string
  accept?: string
  disabled?: boolean
  hintText?: string
}>(), {
  modelValue: '',
  buttonText: '选择文件',
  accept: '',
  disabled: false,
  hintText: ''
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'change', value: File | null): void
}>()

const uploadRef = ref()

const parsed = computed(() => parseAttachmentValue(props.modelValue))
const fileName = computed(() => parsed.value.name)
const previewSource = computed(() => parsed.value.data)
const canPreview = computed(() => isPreviewable(fileName.value, previewSource.value))

function parseAttachmentValue(value: string): { name: string; data: string } {
  const text = (value || '').trim()
  if (!text) return { name: '', data: '' }
  try {
    const parsedValue = JSON.parse(text) as { name?: string; data?: string }
    return {
      name: parsedValue.name || text,
      data: parsedValue.data || ''
    }
  } catch {
    return { name: text, data: '' }
  }
}

function isPreviewable(name: string, source: string): boolean {
  const text = (source || '').trim().toLowerCase()
  if (!text) return false
  if (/^data:image\//.test(text) || /^data:application\/pdf/.test(text)) return true
  const lowerName = (name || '').trim().toLowerCase()
  return /\.(png|jpe?g|gif|webp|bmp|svg|pdf)(\?.*)?$/.test(lowerName) || /\.(png|jpe?g|gif|webp|bmp|svg|pdf)(\?.*)?$/.test(text)
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}

async function handleFileChange(file: any) {
  const rawFile = file?.raw as File | undefined
  if (!rawFile || !file?.name) {
    handleRemove()
    return
  }
  const dataUrl = await readFileAsDataUrl(rawFile)
  emit('update:modelValue', JSON.stringify({ name: file.name, data: dataUrl }))
  emit('change', rawFile)
}

function handleRemove() {
  uploadRef.value?.clearFiles?.()
  emit('update:modelValue', '')
  emit('change', null)
}

function handlePreview() {
  if (!canPreview.value || !previewSource.value) return
  window.open(previewSource.value, '_blank', 'noopener,noreferrer')
}
</script>

<style scoped>
.attachment-upload-field {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.attachment-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  max-width: 100%;
  padding: 8px 12px;
  border: 1px solid #dbe4ff;
  border-radius: 10px;
  background: #f8fbff;
  color: #1f2d3d;
  cursor: default;
  transition: all 0.18s ease;
}

.attachment-chip.is-previewable {
  cursor: pointer;
}

.attachment-chip:hover {
  border-color: #93c5fd;
  background: #eff6ff;
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
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-chip-preview {
  font-size: 12px;
  color: #3b82f6;
}

.attachment-chip-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin-left: 2px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #94a3b8;
  opacity: 0;
  transform: scale(0.92);
  transition: opacity 0.15s ease, transform 0.15s ease, background-color 0.15s ease, color 0.15s ease;
}

.attachment-chip:hover .attachment-chip-remove {
  opacity: 1;
  transform: scale(1);
}

.attachment-chip-remove:hover {
  background: #fee2e2;
  color: #ef4444;
}

.attachment-chip-remove svg {
  width: 14px;
  height: 14px;
}

.attachment-upload-hint {
  width: 100%;
  margin-top: 2px;
  font-size: 12px;
  color: #94a3b8;
}
</style>
