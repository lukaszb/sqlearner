<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import RunQueryShortcut from '@/renderer/src/components/RunQueryShortcut.vue'
import { useAppStore } from '@/renderer/src/stores/app-store'
import { isRunQueryShortcut } from '@/renderer/src/utils/keyboard-shortcuts'

const store = useAppStore()
const { activeQueryTabId, activeSession, queryTabs } = storeToRefs(store)
const activeQueryTab = computed(() => store.activeQueryTab)

function runQueryWithShortcut(event: KeyboardEvent): void {
  if (!isRunQueryShortcut(event)) return

  event.preventDefault()
  void store.runActiveQuery()
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col" data-testid="queries-view">
    <header class="border-b border-stone-300 bg-panel px-6 py-4">
      <h2 class="text-2xl font-semibold">Queries</h2>
      <p class="text-sm text-stone-600">
        Write SQL in the editor and run it against this session's working copy. INSERT, UPDATE, DELETE and DDL are
        allowed - use Reset database in the Database view to restore the imported data.
      </p>
    </header>

    <div class="flex items-center gap-1 border-b border-stone-300 bg-white px-4 pt-3">
      <button
        v-for="tab in queryTabs"
        :key="tab.id"
        class="flex items-center gap-2 rounded-t-md border border-b-0 px-3 py-2 text-sm"
        :class="activeQueryTabId === tab.id ? 'border-stone-300 bg-panel' : 'border-transparent hover:bg-stone-100'"
        @click="store.activeQueryTabId = tab.id"
      >
        {{ tab.title }}
        <span class="text-stone-400 hover:text-red-700" @click.stop="store.closeQueryTab(tab.id)">x</span>
      </button>
      <button class="rounded-md px-3 py-2 text-sm font-semibold text-brand hover:bg-stone-100" @click="store.addQueryTab">
        + New
      </button>
    </div>

    <section v-if="activeQueryTab" class="grid min-h-0 flex-1 grid-rows-[220px_auto_1fr]">
      <textarea
        v-model="activeQueryTab.sql"
        class="m-6 mb-3 resize-none rounded-md border border-stone-300 bg-white p-4 font-mono text-sm outline-none focus:border-brand"
        data-testid="query-editor"
        spellcheck="false"
        @keydown="runQueryWithShortcut"
      />

      <div class="flex items-center gap-3 px-6 pb-3">
        <button
          class="rounded-md bg-brand px-4 py-2 font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="run-query"
          :disabled="!activeSession"
          @click="store.runActiveQuery"
        >
          Run query
          <RunQueryShortcut />
        </button>
        <p v-if="!activeSession" class="text-sm text-stone-600">
          Select or create a database session to run queries.
        </p>
        <p v-if="activeQueryTab.result" class="text-sm text-stone-600">
          {{ activeQueryTab.result.rows.length }} rows in {{ activeQueryTab.result.elapsedMs }}ms
        </p>
        <p v-if="activeQueryTab.error" class="text-sm text-red-700">{{ activeQueryTab.error }}</p>
      </div>

      <div class="mx-6 mb-6 overflow-auto rounded-md border border-stone-300 bg-white">
        <table v-if="activeQueryTab.result?.columns.length" class="min-w-full border-collapse text-sm" data-testid="query-result">
          <thead class="bg-stone-100">
            <tr>
              <th v-for="column in activeQueryTab.result.columns" :key="column" class="border-b border-stone-300 px-3 py-2 text-left">
                {{ column }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in activeQueryTab.result.rows" :key="index" class="odd:bg-white even:bg-stone-50">
              <td v-for="column in activeQueryTab.result.columns" :key="column" class="border-b border-stone-100 px-3 py-2">
                {{ row[column] }}
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="p-6 text-sm text-stone-500">Run a query to see results.</p>
      </div>
    </section>
    <section v-else class="flex flex-1 items-center justify-center p-10">
      <button class="rounded-md bg-brand px-4 py-2 font-semibold text-white" @click="store.addQueryTab">
        New query
      </button>
    </section>
  </div>
</template>
