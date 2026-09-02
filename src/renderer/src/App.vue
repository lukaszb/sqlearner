<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import DatabaseView from '@/renderer/src/components/DatabaseView.vue'
import QueryView from '@/renderer/src/components/QueryView.vue'
import SessionList from '@/renderer/src/components/SessionList.vue'
import { useAppStore } from '@/renderer/src/stores/app-store'

const store = useAppStore()
const { activeSession, activeView, electronReady, error, loading, progress, sessions } = storeToRefs(store)
const sessionName = ref('')
const renaming = ref(false)

watch(activeSession, (session) => {
  sessionName.value = session?.name ?? ''
}, { immediate: true })

onMounted(() => {
  void store.initialize()
})

async function saveSessionName(): Promise<void> {
  if (!activeSession.value || renaming.value) return

  const nextName = sessionName.value.trim()
  if (!nextName || nextName === activeSession.value.name) {
    sessionName.value = activeSession.value.name
    return
  }

  renaming.value = true
  try {
    const renamed = await store.renameActiveSession(nextName)
    if (!renamed) sessionName.value = activeSession.value.name
  } finally {
    renaming.value = false
  }
}

function submitSessionName(event: Event): void {
  const form = event.currentTarget as HTMLFormElement
  void saveSessionName().then(() => nextTick(() => form.querySelector('input')?.blur()))
}
</script>

<template>
  <main class="flex h-screen bg-panel text-ink" data-testid="app-shell">
    <template v-if="!activeSession">
      <section class="flex min-w-0 flex-1 flex-col" data-testid="sessions-home">
        <header class="border-b border-stone-200 bg-white px-8 py-5">
          <h1 class="text-2xl font-semibold">SQLearner</h1>
          <p class="mt-1 text-sm text-stone-600">Learn SQL on a local SQLite dataset.</p>
        </header>

        <div v-if="error" class="border-b border-red-200 bg-red-50 px-8 py-3 text-sm text-red-700">
          {{ error }}
        </div>

        <div v-if="progress" class="border-b border-amber-200 bg-amber-50 px-8 py-3">
          <div class="mb-2 flex justify-between text-sm">
            <span>{{ progress.label }}</span>
            <span>{{ progress.percent === 100 ? 'Complete' : `${progress.percent}%` }}</span>
          </div>
          <div class="h-2 rounded bg-amber-100">
            <div class="h-2 rounded bg-amber-500" :style="{ width: `${progress.percent}%` }" />
          </div>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto p-8 sm:p-12">
          <div class="mx-auto max-w-3xl">
            <div v-if="sessions.length === 0" class="py-12" data-testid="sessions-empty-state">
              <p class="text-sm font-medium uppercase tracking-wide text-brand">Welcome to SQLearner</p>
              <h2 class="mt-3 text-4xl font-semibold">Prepare your learning database</h2>
              <p class="mt-4 max-w-xl text-lg text-stone-700">
                We first need to prepare the dataset. SQLearner will download it and create a local SQLite database for you.
              </p>
              <p v-if="!electronReady" class="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                Setup is available only in the Electron desktop window.
              </p>
              <button
                class="mt-8 rounded-md bg-brand px-5 py-3 font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                data-testid="create-first-session"
                :disabled="loading || !electronReady"
                @click="store.prepareDatabase"
              >
                {{ loading ? 'Setting up...' : 'Setup my database' }}
              </button>
            </div>

            <template v-else>
              <div class="mb-6">
                <p class="text-sm font-medium uppercase tracking-wide text-brand">Your workspace</p>
                <h2 class="mt-2 text-3xl font-semibold">Choose a session</h2>
                <p class="mt-2 text-stone-600">Continue where you left off or create a fresh database.</p>
              </div>
              <SessionList
                :sessions="sessions"
                @select="store.selectSession"
                @open-folder="store.openSessionFolder"
                @delete="store.deleteSession"
              />
              <button
                class="mt-5 w-full rounded-md border border-dashed border-stone-400 bg-white px-5 py-3 font-semibold text-brand hover:border-brand hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                data-testid="create-session"
                :disabled="loading || !electronReady"
                @click="store.prepareDatabase"
              >
                {{ loading ? 'Creating session...' : '+ Create new session' }}
              </button>
            </template>
          </div>
        </div>
      </section>
    </template>

    <template v-else>
      <aside class="flex w-72 shrink-0 flex-col border-r border-stone-300 bg-white" data-testid="workspace-sidebar">
        <div class="border-b border-stone-200 p-4">
          <button
            class="mb-4 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-ink"
            data-testid="back-to-sessions"
            @click="store.closeSession"
          >
            <span aria-hidden="true">←</span>
            All sessions
          </button>
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500" for="session-name">
            Session
          </label>
          <form class="flex gap-2" @submit.prevent="submitSessionName">
            <input
              id="session-name"
              v-model="sessionName"
              class="min-w-0 flex-1 rounded-md border border-stone-300 px-2 py-1.5 font-semibold outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              data-testid="session-name"
              maxlength="100"
              :disabled="renaming"
              @blur="saveSessionName"
              @keydown.esc="sessionName = activeSession?.name ?? ''"
            >
            <button
              class="rounded-md border border-stone-300 px-2 text-xs font-semibold text-brand hover:bg-emerald-50 disabled:opacity-50"
              type="submit"
              :disabled="renaming || !sessionName.trim() || sessionName.trim() === activeSession.name"
            >
              {{ renaming ? '...' : 'Save' }}
            </button>
          </form>
        </div>

        <nav class="flex-1 p-3">
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

        <div class="border-t border-stone-200 px-5 py-4">
          <div class="text-sm font-semibold">SQLearner</div>
          <div class="mt-1 truncate text-xs text-stone-500" :title="activeSession.databasePath">
            {{ activeSession.databasePath }}
          </div>
        </div>
      </aside>

      <section class="flex min-w-0 flex-1 flex-col">
        <div v-if="error" class="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700">
          {{ error }}
        </div>

        <div v-if="progress" class="border-b border-amber-200 bg-amber-50 px-6 py-3">
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
    </template>
  </main>
</template>
