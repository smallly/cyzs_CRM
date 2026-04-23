<template>
  <div v-if="visible" class="modal-mask" @click.self="$emit('cancel')">
    <div class="modal-card" style="max-width: 420px">
      <div class="modal-head">
        <h3 class="modal-title">{{ title }}</h3>
        <button class="modal-close-btn" aria-label="关闭" title="关闭" @click="$emit('cancel')">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6 18 18M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>
      <p class="muted" style="margin: 4px 0 0">{{ message }}</p>
      <div class="row" style="justify-content: flex-end; margin: 12px 0 0">
        <button class="secondary" @click="$emit('cancel')">取消</button>
        <button @click="$emit('confirm')">{{ confirmText }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
}>();

defineEmits<{
  (e: "confirm"): void;
  (e: "cancel"): void;
}>();
</script>
