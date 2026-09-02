<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { levelLabels, moduleExamSize } from '@/shared/course'
import { useAppStore } from '@/renderer/src/stores/app-store'
import { useLessonsStore } from '@/renderer/src/stores/lessons-store'
import QuizPanel from '@/renderer/src/components/QuizPanel.vue'
import SqlBlock from '@/renderer/src/components/SqlBlock.vue'

const appStore = useAppStore()
const store = useLessonsStore()
const { quiz, selection, sandboxBusy, sandboxNotice } = storeToRefs(store)

const located = computed(() => store.activeLesson)
const examModule = computed(() => store.activeExamModule)
const lesson = computed(() => located.value?.lesson)
const module = computed(() => located.value?.module ?? examModule.value)
const usesSandbox = computed(() => Boolean(module.value?.usesSandbox))
const showHint = ref(false)
const showSolution = ref(false)

watch(selection, () => {
  showHint.value = false
  showSolution.value = false
})

const lessonDone = computed(() => (lesson.value ? store.isLessonDone(lesson.value.id) : false))
const examDone = computed(() => (examModule.value ? store.isExamDone(examModule.value.id) : false))
const nextLesson = computed(() => {
  if (!located.value) return undefined
  return located.value.module.lessons[located.value.index + 1]
})

function startLessonQuiz(): void {
  if (lesson.value) store.startLessonQuiz(lesson.value.id)
}

function startExam(): void {
  if (examModule.value) store.startExam(examModule.value.id)
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col" data-testid="lessons-view">
    <header class="border-b border-stone-300 bg-panel px-6 py-4">
      <h2 class="text-2xl font-semibold">Lessons</h2>
      <p class="text-sm text-stone-600">
        A guided SQL course for data analysts, built on the Olist dataset in this session.
      </p>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto px-6 py-6">
      <div class="mx-auto max-w-3xl">
        <template v-if="!selection">
          <section data-testid="lessons-overview">
            <h3 class="text-xl font-semibold">Where do you want to start?</h3>
            <p class="mt-2 text-stone-600">
              Modules go from reading data to changing it and finally to the analysis techniques a data analyst uses
              every day. You can jump to any lesson at any time.
            </p>
            <div class="mt-6 space-y-3">
              <button
                v-for="item in store.modules"
                :key="item.id"
                class="w-full rounded-lg border border-stone-300 bg-white p-4 text-left hover:border-brand"
                data-testid="module-card"
                @click="item.lessons[0] && store.openLesson(item.lessons[0].id)"
              >
                <div class="flex items-center justify-between">
                  <span class="font-semibold">{{ item.title }}</span>
                  <span class="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-stone-600">
                    {{ levelLabels[item.level] }}
                  </span>
                </div>
                <p class="mt-1 text-sm text-stone-600">{{ item.description }}</p>
                <p class="mt-2 text-xs text-stone-500">
                  {{ item.lessons.length }} lessons - {{ store.completedInModule(item.id) }} completed
                </p>
              </button>
            </div>
          </section>
        </template>

        <template v-else-if="lesson && module">
          <section data-testid="lesson-detail">
            <p class="text-sm font-medium uppercase tracking-wide text-brand">
              {{ module.title }} - {{ levelLabels[module.level] }}
            </p>
            <div class="mt-2 flex items-start justify-between gap-4">
              <h3 class="text-2xl font-semibold" data-testid="lesson-title">{{ lesson.title }}</h3>
              <span
                v-if="lessonDone"
                class="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800"
                data-testid="lesson-completed-badge"
              >
                Completed
              </span>
            </div>
            <p class="mt-2 text-stone-700">{{ lesson.goal }}</p>
            <div class="mt-3 flex flex-wrap gap-2">
              <span
                v-for="table in lesson.tables"
                :key="table"
                class="rounded-md bg-stone-100 px-2 py-1 font-mono text-xs text-stone-700"
              >
                {{ table }}
              </span>
            </div>

            <div
              v-if="usesSandbox"
              class="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4"
              data-testid="sandbox-banner"
            >
              <p class="text-sm font-semibold text-amber-900">This module writes to the practice sandbox</p>
              <p class="mt-1 text-sm text-amber-900">
                Statements here run against practice.sqlite, a private copy of your session database. The imported
                Olist data stays read-only, and you can start over whenever you want.
              </p>
              <div class="mt-3 flex items-center gap-3">
                <button
                  class="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                  data-testid="reset-sandbox"
                  :disabled="sandboxBusy"
                  @click="store.resetSandbox"
                >
                  {{ sandboxBusy ? 'Resetting...' : 'Reset sandbox' }}
                </button>
                <span v-if="sandboxNotice" class="text-sm text-amber-900">{{ sandboxNotice }}</span>
              </div>
            </div>

            <div class="mt-6 space-y-5">
              <template v-for="(block, index) in lesson.blocks" :key="`${lesson.id}-block-${index}`">
                <p v-if="block.kind === 'text'" class="leading-relaxed text-stone-800">{{ block.text }}</p>

                <div v-else-if="block.kind === 'list'">
                  <p v-if="block.title" class="mb-2 font-semibold">{{ block.title }}</p>
                  <ul class="list-disc space-y-1 pl-5 text-stone-800">
                    <li v-for="listItem in block.items" :key="listItem">{{ listItem }}</li>
                  </ul>
                </div>

                <p
                  v-else-if="block.kind === 'note'"
                  class="rounded-md border-l-4 border-brand bg-emerald-50/60 px-4 py-3 text-sm text-stone-800"
                >
                  {{ block.text }}
                </p>

                <SqlBlock
                  v-else
                  :run-key="`${lesson.id}-block-${index}`"
                  :sql="block.sql"
                  :title="block.title"
                  :explanation="block.explanation"
                  :breakdown="block.breakdown"
                  :use-sandbox="usesSandbox"
                />
              </template>
            </div>

            <section class="mt-8 rounded-lg border border-stone-300 bg-white p-5" data-testid="lesson-practice">
              <h4 class="font-semibold">Practice</h4>
              <p class="mt-1 text-stone-800">{{ lesson.practice.task }}</p>
              <div class="mt-3 flex flex-wrap gap-3">
                <button
                  class="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium hover:bg-stone-100"
                  @click="showHint = !showHint"
                >
                  {{ showHint ? 'Hide hint' : 'Show hint' }}
                </button>
                <button
                  class="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium hover:bg-stone-100"
                  data-testid="show-solution"
                  @click="showSolution = !showSolution"
                >
                  {{ showSolution ? 'Hide solution' : 'Show solution' }}
                </button>
              </div>
              <p v-if="showHint" class="mt-3 text-sm text-stone-700">{{ lesson.practice.hint }}</p>
              <div v-if="showSolution" class="mt-4">
                <SqlBlock
                  :run-key="`${lesson.id}-practice`"
                  :sql="lesson.practice.solution"
                  title="One possible solution"
                  :use-sandbox="usesSandbox"
                />
              </div>
            </section>

            <section class="mt-8">
              <QuizPanel v-if="quiz && quiz.mode === 'lesson' && quiz.targetId === lesson.id" />
              <div v-else class="rounded-lg border border-stone-300 bg-white p-5" data-testid="lesson-quiz-intro">
                <h4 class="font-semibold">Check yourself</h4>
                <p class="mt-1 text-sm text-stone-700">
                  Four questions drawn from this lesson, including one or two SQL queries to run. Every answer has to
                  be correct - one mistake and a new set is drawn so you can try again.
                </p>
                <div class="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    class="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                    data-testid="start-lesson-quiz"
                    @click="startLessonQuiz"
                  >
                    {{ lessonDone ? 'Practice again' : 'Start the questions' }}
                  </button>
                  <button
                    v-if="nextLesson"
                    class="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100"
                    data-testid="next-lesson"
                    @click="store.openLesson(nextLesson.id)"
                  >
                    Next lesson
                  </button>
                  <button
                    class="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100"
                    @click="store.openExam(module.id)"
                  >
                    Module exam
                  </button>
                </div>
              </div>
            </section>
          </section>
        </template>

        <template v-else-if="examModule">
          <section data-testid="exam-detail">
            <p class="text-sm font-medium uppercase tracking-wide text-brand">
              {{ examModule.title }} - {{ levelLabels[examModule.level] }}
            </p>
            <div class="mt-2 flex items-start justify-between gap-4">
              <h3 class="text-2xl font-semibold">Module exam</h3>
              <span
                v-if="examDone"
                class="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800"
              >
                Passed
              </span>
            </div>
            <p class="mt-2 text-stone-700">
              {{ moduleExamSize(examModule) }} questions drawn at random, with at least two from every lesson of this
              module. All of them have to be correct; otherwise a fresh set is drawn.
            </p>

            <QuizPanel v-if="quiz && quiz.mode === 'exam' && quiz.targetId === examModule.id" class="mt-6" />
            <div v-else class="mt-6 rounded-lg border border-stone-300 bg-white p-5">
              <p class="text-sm text-stone-700">
                Covers: {{ examModule.lessons.map((item) => item.title).join(', ') }}
              </p>
              <button
                class="mt-4 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                data-testid="start-module-exam"
                @click="startExam"
              >
                {{ examDone ? 'Take the exam again' : 'Start the exam' }}
              </button>
            </div>
          </section>
        </template>
      </div>
    </div>

    <div v-if="!appStore.activeSessionId" class="border-t border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-900">
      Select a session to run the SQL examples.
    </div>
  </div>
</template>
