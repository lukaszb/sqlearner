<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { SessionSummary } from '@/shared/types'

defineProps<{
  sessions: SessionSummary[]
}>()

const emit = defineEmits<{
  select: [sessionId: string]
  openFolder: [sessionId: string]
  delete: [sessionId: string]
}>()

const sessionToDelete = ref<SessionSummary>()
const cancelButton = ref<HTMLButtonElement>()

watch(sessionToDelete, async (session) => {
  if (!session) return
  await nextTick()
  cancelButton.value?.focus()
})

function requestDelete(session: SessionSummary): void {
  sessionToDelete.value = session
}

function closeDeleteModal(): void {
  sessionToDelete.value = undefined
}

function confirmDelete(): void {
  if (!sessionToDelete.value) return
  emit('delete', sessionToDelete.value.id)
  closeDeleteModal()
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && sessionToDelete.value) closeDeleteModal()
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
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
        <button
          class="text-xs font-medium text-red-700 hover:underline"
          data-testid="delete-session-button"
          @click="requestDelete(session)"
        >
          Delete
        </button>
      </div>
    </article>

    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="sessionToDelete"
          class="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-6 backdrop-blur-sm"
          data-testid="delete-session-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-session-title"
          aria-describedby="delete-session-description"
          @click.self="closeDeleteModal"
        >
          <div class="w-full max-w-md overflow-hidden rounded-xl border border-stone-200 bg-white shadow-2xl">
            <div class="p-6">
              <div class="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-red-700">
                <svg aria-hidden="true" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.3 3.7 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z" />
                </svg>
              </div>
              <h2 id="delete-session-title" class="text-xl font-semibold text-ink">Delete this session?</h2>
              <p id="delete-session-description" class="mt-2 text-sm leading-6 text-stone-600">
                <span class="font-semibold text-ink">{{ sessionToDelete.name }}</span> and its local database will be permanently deleted. This action cannot be undone.
              </p>
            </div>
            <div class="flex justify-end gap-3 border-t border-stone-200 bg-stone-50 px-6 py-4">
              <button
                ref="cancelButton"
                class="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
                data-testid="cancel-delete-session"
                @click="closeDeleteModal"
              >
                Cancel
              </button>
              <button
                class="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
                data-testid="confirm-delete-session"
                @click="confirmDelete"
              >
                Delete session
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
