<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import DatabaseView from '@/renderer/src/components/DatabaseView.vue'
import QueryView from '@/renderer/src/components/QueryView.vue'
import SessionList from '@/renderer/src/components/SessionList.vue'
import { useAppStore } from '@/renderer/src/stores/app-store'

const store = useAppStore()
const { activeSession, activeView, error, progress, sessions } = storeToRefs(store)

onMounted(() => {
  void store.initialize()
})
</script>

<template>
  <main class="flex h-screen bg-panel text-ink" data-testid="app-shell">
    <aside class="flex w-72 shrink-0 flex-col border-r border-stone-300 bg-white">
      <div class="border-b border-stone-200 p-5">
        <h1 class="text-2xl font-semibold">SQLearner</h1>
        <p class="mt-1 text-sm text-stone-600">Learn SQL on a local SQLite dataset.</p>
      </div>

      <SessionList
        :sessions="sessions"
        :active-session-id="activeSession?.id"
        @select="store.selectSession"
        @open-folder="store.openSessionFolder"
        @delete="store.deleteSession"
      />

      <nav class="border-t border-stone-200 p-3">
        <button
          class="w-full rounded-md px-3 py-2 text-left text-sm font-medium"
          data-testid="nav-database"
          :class="activeView === 'database' ? 'bg-brand text-white' : 'hover:bg-stone-100'"
          @click="store.selectView('database')"
        >
          Database
        </button>
        <button
          class="mt-1 w-full rounded-md px-3 py-2 text-left text-sm font-medium"
          data-testid="nav-queries"
          :class="activeView === 'queries' ? 'bg-brand text-white' : 'hover:bg-stone-100'"
          @click="store.selectView('queries')"
        >
          Queries
        </button>
      </nav>
    </aside>

    <section class="flex min-w-0 flex-1 flex-col">
      <div class="border-b border-stone-200 bg-white px-6 py-2 text-xs text-stone-500" data-testid="status-strip">
        View: {{ activeView }} · Sessions: {{ sessions.length }} · Active:
        {{ activeSession?.name ?? 'none' }}
      </div>

      <div v-if="error" class="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700">
        {{ error }}
      </div>

      <div
        v-if="progress"
        class="border-b border-amber-200 bg-amber-50 px-6 py-3"
      >
        <div class="mb-2 flex justify-between text-sm">
          <span>{{ progress.label }}</span>
          <span>{{ progress.percent === 100 ? 'Complete' : `${progress.percent}%` }}</span>
        </div>
        <div class="h-2 rounded bg-amber-100">
          <div class="h-2 rounded bg-amber-500" :style="{ width: `${progress.percent}%` }" />
        </div>
      </div>

      <DatabaseView v-show="activeView === 'database'" />
      <QueryView v-show="activeView === 'queries'" />
    </section>
  </main>
</template>
