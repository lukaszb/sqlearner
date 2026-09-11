<script setup lang="ts">
import { ref } from 'vue'
import { useAppStore } from '@/renderer/src/stores/app-store'

const props = defineProps<{ sessionId?: string }>()
const store = useAppStore()
const busy = ref(false)
const notice = ref('')

async function transfer(mode: 'export' | 'import') {
  if (!window.sqlearner || busy.value) return
  busy.value = true
  notice.value = ''
  try {
    if (mode === 'export' && props.sessionId) {
      if (await window.sqlearner.exportSession(props.sessionId)) notice.value = 'Session key saved.'
    } else {
      const session = await window.sqlearner.importSession()
      if (session) {
        await store.refreshSessions()
        await store.selectSession(session.id)
        notice.value = 'Session restored.'
      }
    }
  } catch (error) {
    notice.value = error instanceof Error ? error.message : 'Session transfer failed'
  } finally {
    busy.value = false
    store.progress = undefined
  }
}
</script>

<template>
  <div class="space-y-2 border-b border-stone-200 bg-white px-5 py-3 text-sm">
    <div class="flex flex-wrap gap-4">
      <button v-if="sessionId" :disabled="busy" class="font-semibold text-brand disabled:opacity-50" @click="transfer('export')">
        Save session key
      </button>
      <button :disabled="busy" class="font-semibold text-brand disabled:opacity-50" @click="transfer('import')">
        Restore session key
      </button>
    </div>
    <p class="text-xs text-stone-500">The key file includes your databases and interaction history. Its size grows with your session.</p>
    <p v-if="busy || notice" role="status">{{ busy ? 'Processing session…' : notice }}</p>
  </div>
</template>
