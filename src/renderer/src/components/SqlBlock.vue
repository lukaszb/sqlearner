<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type { SqlBreakdownItem } from '@/shared/course'
import RunQueryShortcut from '@/renderer/src/components/RunQueryShortcut.vue'
import { useLessonsStore } from '@/renderer/src/stores/lessons-store'
import { isRunQueryShortcut } from '@/renderer/src/utils/keyboard-shortcuts'

const props = defineProps<{
  runKey: string
  sql: string
  modelValue?: string
  title?: string
  explanation?: string
  breakdown?: SqlBreakdownItem[]
  writesData?: boolean
  resetLabel?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const store = useLessonsStore()
const { runs } = storeToRefs(store)

const draft = ref(props.modelValue ?? props.sql)
watch(
  () => props.sql,
  (next) => {
    if (props.modelValue !== undefined) return
    draft.value = next
  }
)
watch(
  () => props.modelValue,
  (next) => {
    if (next !== undefined && next !== draft.value) draft.value = next
  }
)
watch(draft, (next) => emit('update:modelValue', next))

const run = computed(() => runs.value[props.runKey])
const rows = computed(() => Math.min(18, Math.max(3, draft.value.split('\n').length)))
const isDirty = computed(() => draft.value !== props.sql)

function execute(): void {
  void store.runSql(props.runKey, draft.value)
}

function handleShortcut(event: KeyboardEvent): void {
  if (!isRunQueryShortcut(event)) return
  event.preventDefault()
  execute()
}

function reset(): void {
  draft.value = props.sql
  store.clearRun(props.runKey)
}
</script>

<template>
  <section class="rounded-lg border border-stone-300 bg-white" data-testid="sql-block">
    <header v-if="title" class="flex items-center gap-2 border-b border-stone-200 px-4 py-2.5">
      <h4 class="text-sm font-semibold">{{ title }}</h4>
      <span v-if="writesData" class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
        writes data
      </span>
    </header>

    <div class="p-4">
      <p v-if="explanation" class="mb-3 text-sm text-stone-700">{{ explanation }}</p>

      <textarea
        v-model="draft"
        class="w-full resize-y rounded-md border border-stone-300 bg-stone-50 p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-brand focus:bg-white"
        data-testid="sql-block-editor"
        spellcheck="false"
        :rows="rows"
        @keydown="handleShortcut"
      />

      <div class="mt-3 flex flex-wrap items-center gap-3">
        <button
          class="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="run-sql-block"
          :disabled="run?.running"
          @click="execute"
        >
          {{ run?.running ? 'Running...' : 'Run query' }}
          <RunQueryShortcut />
        </button>
        <button
          v-if="isDirty || run"
          class="rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100"
          type="button"
          @click="reset"
        >
          {{ resetLabel ?? 'Reset example' }}
        </button>
        <p v-if="run?.result" class="text-sm text-stone-600">
          <span v-if="run.result.message">{{ run.result.message }} - </span>
          {{ run.result.rows.length }} rows in {{ run.result.elapsedMs }}ms
        </p>
      </div>

      <ul v-if="breakdown?.length" class="mt-4 space-y-2 border-t border-stone-200 pt-4">
        <li v-for="item in breakdown" :key="item.part" class="text-sm">
          <code class="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[12px] text-ink">{{ item.part }}</code>
          <span class="ml-2 text-stone-700">{{ item.meaning }}</span>
        </li>
      </ul>

      <p v-if="run?.error" class="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" data-testid="sql-block-error">
        {{ run.error }}
      </p>

      <div
        v-else-if="run?.result && run.result.columns.length"
        class="mt-4 max-h-72 overflow-auto rounded-md border border-stone-300"
        data-testid="sql-block-result"
      >
        <table class="min-w-full border-collapse text-sm">
          <thead class="sticky top-0 bg-stone-100">
            <tr>
              <th v-for="column in run.result.columns" :key="column" class="border-b border-stone-300 px-3 py-2 text-left font-semibold">
                {{ column }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in run.result.rows.slice(0, 100)" :key="index" class="odd:bg-white even:bg-stone-50">
              <td v-for="column in run.result.columns" :key="column" class="border-b border-stone-100 px-3 py-1.5">
                {{ row[column] }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
