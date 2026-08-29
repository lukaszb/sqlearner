<script setup lang="ts">
import type { SessionSummary } from '@shared/types'

defineProps<{
  sessions: SessionSummary[]
  activeSessionId?: string
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
  <div class="min-h-0 flex-1 overflow-y-auto p-3">
    <div class="mb-2 flex items-center justify-between px-2">
      <h2 class="text-xs font-semibold uppercase tracking-wide text-stone-500">Sessions</h2>
    </div>

    <p v-if="sessions.length === 0" class="px-2 text-sm text-stone-500">
      No sessions yet.
    </p>

    <div v-for="session in sessions" :key="session.id" class="mb-2 rounded-md border border-stone-200 bg-white">
      <button
        class="w-full px-3 py-3 text-left"
        :class="activeSessionId === session.id ? 'bg-emerald-50' : 'hover:bg-stone-50'"
        @click="$emit('select', session.id)"
      >
        <div class="font-medium">{{ session.name }}</div>
        <div class="mt-1 text-xs text-stone-500">
          Last used {{ new Date(session.lastUsedAt).toLocaleString() }}
        </div>
      </button>
      <div class="flex gap-2 border-t border-stone-100 px-3 py-2">
        <button class="text-xs font-medium text-brand hover:underline" @click="$emit('openFolder', session.id)">
          Show folder
        </button>
        <button class="text-xs font-medium text-red-700 hover:underline" @click="confirmDelete(session)">
          Delete
        </button>
      </div>
    </div>
  </div>
</template>
