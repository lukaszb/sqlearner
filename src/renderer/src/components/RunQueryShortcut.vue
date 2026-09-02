<script setup lang="ts">
import { computed } from 'vue'
import { detectOperatingSystem } from '@/renderer/src/utils/keyboard-shortcuts'

const operatingSystem = detectOperatingSystem()
const accessibleModifier = computed(() => {
  if (operatingSystem === 'macos') return 'Command'
  if (operatingSystem === 'windows') return 'Windows'
  return 'Control'
})
const accessibleLabel = computed(() => `${accessibleModifier.value} + Enter`)
</script>

<template>
  <span
    class="ml-2 inline-flex items-center gap-1 text-current"
    data-testid="run-shortcut"
    :aria-label="accessibleLabel"
    :title="accessibleLabel"
  >
    <kbd
      class="inline-flex h-5 min-w-5 items-center justify-center rounded border border-current/25 bg-white/15 px-1.5 font-sans text-[10px] font-semibold leading-none shadow-[0_1px_0_rgba(0,0,0,0.2)]"
      data-testid="shortcut-modifier-key"
    >
      <svg
        v-if="operatingSystem === 'macos'"
        aria-hidden="true"
        class="h-3.5 w-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M18 9a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12Z" />
      </svg>
      <svg
        v-else-if="operatingSystem === 'windows'"
        aria-hidden="true"
        class="h-3 w-3"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M3 4.8 10.3 3.8v7.4H3V4.8Zm8.3-1.1L21 2.3v8.9h-9.7V3.7ZM3 12.2h7.3v7.4L3 18.6v-6.4Zm8.3 0H21v8.9l-9.7-1.4v-7.5Z" />
      </svg>
      <span v-else>Ctrl</span>
    </kbd>
    <span aria-hidden="true" class="text-[10px] opacity-70">+</span>
    <kbd class="inline-flex h-5 items-center justify-center rounded border border-current/25 bg-white/15 px-1.5 font-sans text-[10px] font-semibold leading-none shadow-[0_1px_0_rgba(0,0,0,0.2)]">
      Enter
    </kbd>
  </span>
</template>
