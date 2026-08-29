<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import DatabaseView from './components/DatabaseView.vue'
import QueryView from './components/QueryView.vue'
import SessionList from './components/SessionList.vue'
import { useAppStore } from './stores/app-store'

const store = useAppStore()
const { activeSession, activeView, electronReady, error, loading, progress, sessions } = storeToRefs(store)

onMounted(() => {
  void store.initialize()
})
</script>

<template>
  <main class="flex h-screen bg-panel text-ink">
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
          :class="activeView === 'database' ? 'bg-brand text-white' : 'hover:bg-stone-100'"
          @click="store.activeView = 'database'"
        >
          Database
        </button>
        <button
          class="mt-1 w-full rounded-md px-3 py-2 text-left text-sm font-medium"
          :class="activeView === 'queries' ? 'bg-brand text-white' : 'hover:bg-stone-100'"
          @click="store.activeView = 'queries'"
        >
          Queries
        </button>
      </nav>
    </aside>

    <section class="flex min-w-0 flex-1 flex-col">
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

      <div v-if="!activeSession" class="flex flex-1 items-center justify-center p-10">
        <div class="max-w-xl">
          <p class="text-sm font-medium uppercase tracking-wide text-brand">First launch</p>
          <h2 class="mt-3 text-4xl font-semibold">Prepare your learning database</h2>
          <p class="mt-4 text-lg text-stone-700">
            We first need to prepare dataset. Click "Setup my database", get coffee, relax
            and prepare to learn SQL.
          </p>
          <p v-if="!electronReady" class="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Setup is available only in the Electron desktop window.
          </p>
          <button
            class="mt-8 rounded-md bg-brand px-5 py-3 font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="loading"
            @click="store.prepareDatabase"
          >
            {{ loading ? 'Setting up...' : 'Setup my database' }}
          </button>
        </div>
      </div>

      <DatabaseView v-else-if="activeView === 'database'" />
      <QueryView v-else />
    </section>
  </main>
</template>
