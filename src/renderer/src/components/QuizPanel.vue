<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import RunQueryShortcut from '@/renderer/src/components/RunQueryShortcut.vue'
import { useLessonsStore } from '@/renderer/src/stores/lessons-store'
import { isRunQueryShortcut } from '@/renderer/src/utils/keyboard-shortcuts'

const store = useLessonsStore()
const { quiz } = storeToRefs(store)

const item = computed(() => (quiz.value ? quiz.value.items[quiz.value.index] : undefined))
const answered = computed(() => item.value?.selected !== undefined)
const isCorrect = computed(() => answered.value && item.value?.selected === item.value?.question.answer)
const correctCount = computed(
  () => quiz.value?.items.filter((entry) => entry.selected === entry.question.answer).length ?? 0
)
const isLast = computed(() => Boolean(quiz.value && quiz.value.index === quiz.value.items.length - 1))
const hintVisible = ref(false)

watch(
  [() => quiz.value?.items, () => quiz.value?.index],
  () => {
    hintVisible.value = false
  }
)

function runQueryWithShortcut(event: KeyboardEvent): void {
  if (!isRunQueryShortcut(event)) return

  event.preventDefault()
  void store.runCurrentQuizQuery()
}

function optionClass(option: string): string {
  if (!answered.value) return 'border-stone-300 bg-white hover:border-brand hover:bg-emerald-50'
  if (option === item.value?.question.answer) return 'border-emerald-500 bg-emerald-50 text-emerald-900'
  if (option === item.value?.selected) return 'border-red-400 bg-red-50 text-red-800'
  return 'border-stone-200 bg-white text-stone-500'
}
</script>

<template>
  <section v-if="quiz" class="rounded-lg border border-stone-300 bg-white" data-testid="quiz-panel">
    <header class="flex items-center justify-between border-b border-stone-200 px-5 py-3">
      <div>
        <h3 class="font-semibold">{{ quiz.mode === 'exam' ? 'Module exam' : 'Check yourself' }}</h3>
        <p class="text-xs text-stone-500">{{ quiz.title }}</p>
      </div>
      <div v-if="!quiz.finished" class="text-sm text-stone-600" data-testid="quiz-counter">
        Question {{ quiz.index + 1 }} of {{ quiz.items.length }}
      </div>
    </header>

    <div v-if="!quiz.finished && item" class="p-5">
      <p class="font-medium" data-testid="quiz-prompt">{{ item.question.prompt }}</p>
      <pre
        v-if="item.question.code"
        class="mt-3 overflow-x-auto rounded-md bg-stone-100 p-3 font-mono text-[13px]"
      >{{ item.question.code }}</pre>

      <div v-if="item.question.kind === 'query'" class="mt-4">
        <textarea
          v-model="item.queryDraft"
          class="min-h-36 w-full resize-y rounded-md border border-stone-300 bg-stone-50 p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-brand focus:bg-white"
          data-testid="quiz-query-editor"
          spellcheck="false"
          :disabled="answered || item.queryRunning"
          @keydown="runQueryWithShortcut"
        />
        <button
          v-if="item.question.hint"
          class="mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold text-brand hover:bg-emerald-50"
          data-testid="quiz-hint-toggle"
          type="button"
          :aria-expanded="hintVisible"
          @click="hintVisible = !hintVisible"
        >
          <svg aria-hidden="true" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 18h6m-5 3h4m2-8.5A6 6 0 1 0 8 18h8a6 6 0 0 0 0-5.5Z" />
          </svg>
          {{ hintVisible ? 'Hide hint' : 'Show hint' }}
        </button>
        <div
          v-if="item.question.hint && hintVisible"
          class="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          data-testid="quiz-hint"
        >
          <span class="font-semibold">Hint:</span> {{ item.question.hint }}
        </div>
        <button
          class="mt-3 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="quiz-run-query"
          :disabled="answered || item.queryRunning || !item.queryDraft.trim()"
          @click="store.runCurrentQuizQuery"
        >
          {{ item.queryRunning ? 'Running...' : 'Run query' }}
          <RunQueryShortcut />
        </button>
        <p
          v-if="item.queryError"
          class="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          data-testid="quiz-query-error"
        >
          {{ item.queryError }}
        </p>
        <div
          v-if="item.queryResult"
          class="mt-3 max-h-52 overflow-auto rounded-md border border-stone-300"
          data-testid="quiz-query-result"
        >
          <table v-if="item.queryResult.columns.length" class="min-w-full border-collapse text-sm">
            <thead class="sticky top-0 bg-stone-100">
              <tr>
                <th v-for="column in item.queryResult.columns" :key="column" class="border-b border-stone-300 px-3 py-2 text-left font-semibold">
                  {{ column }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in item.queryResult.rows.slice(0, 20)" :key="index" class="odd:bg-white even:bg-stone-50">
                <td v-for="column in item.queryResult.columns" :key="column" class="border-b border-stone-100 px-3 py-1.5">
                  {{ row[column] }}
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else class="p-3 text-sm text-stone-600">
            {{ item.queryResult.message ?? 'Query executed successfully.' }}
          </p>
        </div>
      </div>

      <div v-else class="mt-4 space-y-2">
        <button
          v-for="option in item.options"
          :key="option"
          class="w-full rounded-md border px-4 py-2.5 text-left text-sm"
          :class="optionClass(option)"
          data-testid="quiz-option"
          :disabled="answered"
          @click="store.answerCurrent(option)"
        >
          {{ option }}
        </button>
      </div>

      <div v-if="answered" class="mt-4 rounded-md p-3 text-sm" :class="isCorrect ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-800'" data-testid="quiz-feedback">
        <p class="font-semibold">{{ isCorrect ? 'Correct' : 'Not quite' }}</p>
        <p class="mt-1 whitespace-pre-wrap">{{ item.question.explanation }}</p>
      </div>

      <div class="mt-4 flex items-center gap-3">
        <button
          class="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          data-testid="quiz-next"
          :disabled="!answered"
          @click="store.nextQuestion"
        >
          {{ isLast ? 'Finish' : 'Next question' }}
        </button>
        <button class="text-sm text-stone-500 hover:text-ink" type="button" @click="store.closeQuiz">Cancel</button>
      </div>
    </div>

    <div v-else-if="quiz.finished" class="p-5" data-testid="quiz-summary">
      <div
        class="rounded-md p-4"
        :class="quiz.passed ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'"
      >
        <p class="text-lg font-semibold">
          {{ quiz.passed ? 'Passed' : 'Not passed yet' }}
        </p>
        <p class="mt-1 text-sm">
          {{ correctCount }} of {{ quiz.items.length }} answers correct.
          <template v-if="!quiz.passed">
            Every answer has to be correct, so here is a fresh set of questions - read the lesson again if you need to.
          </template>
          <template v-else-if="quiz.mode === 'exam'">
            The module is marked as completed.
          </template>
          <template v-else>
            The lesson is marked as completed.
          </template>
        </p>
      </div>

      <ul class="mt-4 space-y-2">
        <li
          v-for="(entry, index) in quiz.items"
          :key="entry.question.id"
          class="rounded-md border px-3 py-2 text-sm"
          :class="entry.selected === entry.question.answer ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50'"
        >
          <span class="font-medium">{{ index + 1 }}. {{ entry.question.prompt }}</span>
          <span v-if="entry.question.kind !== 'query' && entry.selected !== entry.question.answer" class="mt-1 block text-stone-700">
            Correct answer: {{ entry.question.answer }}
          </span>
        </li>
      </ul>

      <div class="mt-4 flex items-center gap-3">
        <button
          v-if="!quiz.passed"
          class="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          data-testid="quiz-retry"
          @click="store.retryQuiz"
        >
          Try again with new questions
        </button>
        <button
          class="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100"
          data-testid="quiz-close"
          @click="store.closeQuiz"
        >
          {{ quiz.passed ? 'Back to the lesson' : 'Close' }}
        </button>
      </div>
    </div>
  </section>
</template>
