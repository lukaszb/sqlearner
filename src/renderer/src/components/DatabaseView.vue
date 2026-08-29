<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAppStore } from '@renderer/stores/app-store'

const store = useAppStore()
const { selectedTable, tablePreview, tables } = storeToRefs(store)
</script>

<template>
  <div class="grid min-h-0 flex-1 grid-cols-[260px_1fr]">
    <aside class="border-r border-stone-300 bg-white p-4">
      <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">Tables</h2>
      <button
        v-for="table in tables"
        :key="table.name"
        class="mb-2 w-full rounded-md border px-3 py-2 text-left"
        :class="selectedTable === table.name ? 'border-brand bg-emerald-50' : 'border-stone-200 hover:bg-stone-50'"
        @click="store.selectTable(table.name)"
      >
        <div class="font-medium">{{ table.name }}</div>
        <div class="text-xs text-stone-500">{{ table.rowCount }} rows</div>
      </button>
    </aside>

    <section class="min-w-0 overflow-auto p-6">
      <div class="mb-4 flex items-end justify-between">
        <div>
          <h2 class="text-2xl font-semibold">{{ selectedTable ?? 'Select a table' }}</h2>
          <p class="text-sm text-stone-600">Previewing up to 100 rows.</p>
        </div>
      </div>

      <div class="overflow-auto rounded-md border border-stone-300 bg-white">
        <table v-if="tablePreview?.columns.length" class="min-w-full border-collapse text-sm">
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
        <p v-else class="p-6 text-sm text-stone-500">No table data to display.</p>
      </div>
    </section>
  </div>
</template>
