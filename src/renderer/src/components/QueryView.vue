<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAppStore } from '@/renderer/src/stores/app-store'

const store = useAppStore()
const { activeQueryTab, activeQueryTabId, queryTabs } = storeToRefs(store)
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
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
        spellcheck="false"
      />

      <div class="flex items-center gap-3 px-6 pb-3">
        <button class="rounded-md bg-brand px-4 py-2 font-semibold text-white hover:bg-emerald-800" @click="store.runActiveQuery">
          Run query
        </button>
        <p v-if="activeQueryTab.result" class="text-sm text-stone-600">
          {{ activeQueryTab.result.rows.length }} rows in {{ activeQueryTab.result.elapsedMs }}ms
        </p>
        <p v-if="activeQueryTab.error" class="text-sm text-red-700">{{ activeQueryTab.error }}</p>
      </div>

      <div class="mx-6 mb-6 overflow-auto rounded-md border border-stone-300 bg-white">
        <table v-if="activeQueryTab.result?.columns.length" class="min-w-full border-collapse text-sm">
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
  </div>
</template>
