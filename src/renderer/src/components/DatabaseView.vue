<script setup lang="ts">
import { watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '@/renderer/src/stores/app-store'

const store = useAppStore()
const {
  activeSession,
  databaseError,
  databaseLoading,
  electronReady,
  loading,
  selectedTable,
  tablePreview,
  tables
} = storeToRefs(store)

watch(
  [activeSession, tables, selectedTable],
  () => {
    const firstTable = tables.value[0]
    const currentSelectedTable = selectedTable?.value
    if (activeSession.value && firstTable && !currentSelectedTable) {
      void store.selectTable(firstTable.name)
    }
  },
  { immediate: true }
)
</script>

<template>
  <div v-if="!activeSession" class="flex flex-1 items-center justify-center p-10" data-testid="database-empty-state">
    <div class="max-w-xl">
      <p class="text-sm font-medium uppercase tracking-wide text-brand">Database</p>
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

  <div v-else class="grid min-h-0 flex-1 grid-cols-[260px_1fr]" data-testid="database-view">
    <aside class="border-r border-stone-300 bg-white p-4">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-stone-500">Tables</h2>
        <button class="text-xs font-semibold text-brand hover:underline" @click="store.loadTables({ clearBeforeLoad: true })">
          Refresh
        </button>
      </div>
      <p v-if="activeSession" class="mb-3 truncate text-xs text-stone-500" :title="activeSession.databasePath">
        {{ activeSession.databasePath }}
      </p>
      <p v-if="databaseLoading && tables.length === 0" class="text-sm text-stone-500">
        Opening database...
      </p>
      <p v-else-if="tables.length === 0" class="text-sm text-stone-500">
        No tables found. This session database is empty or was created by an older broken setup.
      </p>
      <button
        v-for="table in tables"
        :key="table.name"
        class="mb-2 w-full rounded-md border px-3 py-2 text-left"
        data-testid="table-button"
        :class="selectedTable === table.name ? 'border-brand bg-emerald-50' : 'border-stone-200 hover:bg-stone-50'"
        @click="store.selectTable(table.name)"
      >
        <div class="font-medium">{{ table.name }}</div>
        <div class="text-xs text-stone-500">
          {{ table.rowCount }} rows · {{ table.columns.length }} columns
        </div>
      </button>
    </aside>

    <section class="min-w-0 overflow-auto p-6">
      <div class="mb-4 flex items-end justify-between">
        <div>
          <h2 class="text-2xl font-semibold">{{ selectedTable ?? 'Select a table' }}</h2>
          <p class="text-sm text-stone-600">
            {{ databaseLoading ? 'Loading table data...' : `${tables.length} tables available. Previewing up to 100 rows.` }}
          </p>
        </div>
      </div>

      <div v-if="databaseError" class="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {{ databaseError }}
      </div>

      <div class="overflow-auto rounded-md border border-stone-300 bg-white">
        <table v-if="tablePreview?.columns.length" class="min-w-full border-collapse text-sm" data-testid="table-preview">
          <thead class="bg-stone-100">
            <tr>
              <th v-for="column in tablePreview.columns" :key="column" class="border-b border-stone-300 px-3 py-2 text-left">
                {{ column }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in tablePreview.rows" :key="index" class="odd:bg-white even:bg-stone-50">
              <td v-for="column in tablePreview.columns" :key="column" class="border-b border-stone-100 px-3 py-2">
                {{ row[column] }}
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else-if="databaseLoading" class="p-6 text-sm text-stone-500">
          Loading preview...
        </p>
        <p v-else class="p-6 text-sm text-stone-500">
          No table data to display.
        </p>
      </div>
    </section>
  </div>
</template>
