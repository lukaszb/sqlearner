<script setup lang="ts">
import type { SessionSummary } from '@/shared/types'

defineProps<{
  sessions: SessionSummary[]
}>()

const emit = defineEmits<{
  select: [sessionId: string]
  openFolder: [sessionId: string]
  delete: [sessionId: string]
}>()

function confirmDelete(session: SessionSummary): void {
  const confirmed = window.confirm(
    `Delete session "${session.name}"?\n\nThis removes the session folder and cannot be undone.`
  )

  if (confirmed) emit('delete', session.id)
}
</script>

<template>
  <div class="space-y-3" data-testid="session-list">
    <article
      v-for="session in sessions"
      :key="session.id"
      class="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm transition hover:border-stone-300 hover:shadow"
      data-testid="session-card"
    >
      <button class="w-full px-5 py-4 text-left hover:bg-stone-50" @click="$emit('select', session.id)">
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="text-lg font-semibold">{{ session.name }}</div>
            <div class="mt-1 text-sm text-stone-500">
              Last used {{ new Date(session.lastUsedAt).toLocaleString() }}
            </div>
          </div>
          <span class="mt-1 text-stone-400" aria-hidden="true">→</span>
        </div>
      </button>
      <div class="flex gap-4 border-t border-stone-100 px-5 py-2.5">
        <button class="text-xs font-medium text-brand hover:underline" @click="$emit('openFolder', session.id)">
          Show folder
        </button>
        <button class="text-xs font-medium text-red-700 hover:underline" @click="confirmDelete(session)">
          Delete
        </button>
      </div>
    </article>
  </div>
</template>
