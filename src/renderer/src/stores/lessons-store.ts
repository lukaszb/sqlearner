import { defineStore } from 'pinia'
import {
  course,
  createEmptyProgress,
  drawExamQuestions,
  drawLessonQuestions,
  findLesson,
  findModule,
  moduleExamSize,
  presentQuestion
} from '@/shared/course'
import type { CourseProgress, QueryResult, QuizQuestion } from '@/shared/types'
import { useAppStore } from '@/renderer/src/stores/app-store'

export type LessonSelection =
  | { type: 'lesson'; lessonId: string }
  | { type: 'exam'; moduleId: string }

export interface QuizItem {
  question: QuizQuestion
  options: string[]
  selected?: string
  queryDraft: string
  queryRunning?: boolean
  queryResult?: QueryResult
  queryError?: string
}

export interface QuizState {
  mode: 'lesson' | 'exam'
  targetId: string
  title: string
  items: QuizItem[]
  index: number
  finished: boolean
  passed: boolean
}

export interface RunState {
  running: boolean
  result?: QueryResult
  error?: string
}

interface LessonsState {
  progress: CourseProgress
  progressLoadedFor: string | undefined
  expandedModules: string[]
  selection: LessonSelection | undefined
  quiz: QuizState | undefined
  attempts: Record<string, number>
  runs: Record<string, RunState>
  error: string | undefined
}

export const useLessonsStore = defineStore('lessons', {
  state: (): LessonsState => ({
    progress: createEmptyProgress(),
    progressLoadedFor: undefined,
    expandedModules: [course[0]?.id ?? ''],
    selection: undefined,
    quiz: undefined,
    attempts: {},
    runs: {},
    error: undefined
  }),
  getters: {
    modules: () => course,
    activeLesson: (state) => (state.selection?.type === 'lesson' ? findLesson(state.selection.lessonId) : undefined),
    activeExamModule: (state) => (state.selection?.type === 'exam' ? findModule(state.selection.moduleId) : undefined),
    isLessonDone: (state) => (lessonId: string) => Boolean(state.progress.lessons[lessonId]),
    isExamDone: (state) => (moduleId: string) => Boolean(state.progress.exams[moduleId]),
    completedInModule: (state) => (moduleId: string) => {
      const module = findModule(moduleId)
      if (!module) return 0
      return module.lessons.filter((lesson) => Boolean(state.progress.lessons[lesson.id])).length
    },
    completedLessonCount: (state) => Object.keys(state.progress.lessons).length
  },
  actions: {
    isModuleExpanded(moduleId: string): boolean {
      return this.expandedModules.includes(moduleId)
    },
    toggleModule(moduleId: string) {
      this.expandedModules = this.isModuleExpanded(moduleId)
        ? this.expandedModules.filter((id) => id !== moduleId)
        : [...this.expandedModules, moduleId]
    },
    expandModule(moduleId: string) {
      if (!this.isModuleExpanded(moduleId)) this.expandedModules = [...this.expandedModules, moduleId]
    },
    async loadProgress(sessionId: string) {
      if (!window.sqlearner?.loadLessonProgress) return
      try {
        this.progress = await window.sqlearner.loadLessonProgress(sessionId)
        this.progressLoadedFor = sessionId
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to load lesson progress'
      }
    },
    async persistProgress() {
      const app = useAppStore()
      if (!app.activeSessionId || !window.sqlearner?.saveLessonProgress) return
      try {
        await window.sqlearner.saveLessonProgress(app.activeSessionId, this.progress)
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to save lesson progress'
      }
    },
    resetForSession() {
      this.progress = createEmptyProgress()
      this.progressLoadedFor = undefined
      this.selection = undefined
      this.quiz = undefined
      this.runs = {}
      this.attempts = {}
    },
    openLesson(lessonId: string) {
      const located = findLesson(lessonId)
      if (!located) return
      this.selection = { type: 'lesson', lessonId }
      this.quiz = undefined
      this.expandModule(located.module.id)
    },
    openExam(moduleId: string) {
      if (!findModule(moduleId)) return
      this.selection = { type: 'exam', moduleId }
      this.quiz = undefined
      this.expandModule(moduleId)
    },
    startLessonQuiz(lessonId: string) {
      const located = findLesson(lessonId)
      if (!located) return
      this.quiz = {
        mode: 'lesson',
        targetId: lessonId,
        title: located.lesson.title,
        items: drawLessonQuestions(located.lesson).map((question) => ({
          ...presentQuestion(question),
          queryDraft: question.starterSql ?? ''
        })),
        index: 0,
        finished: false,
        passed: false
      }
    },
    startExam(moduleId: string) {
      const module = findModule(moduleId)
      if (!module) return
      this.quiz = {
        mode: 'exam',
        targetId: moduleId,
        title: `${module.title} - module exam`,
        items: drawExamQuestions(module, moduleExamSize(module)).map((question) => ({
          ...presentQuestion(question),
          queryDraft: ''
        })),
        index: 0,
        finished: false,
        passed: false
      }
    },
    retryQuiz() {
      const quiz = this.quiz
      if (!quiz) return
      if (quiz.mode === 'lesson') this.startLessonQuiz(quiz.targetId)
      else this.startExam(quiz.targetId)
    },
    closeQuiz() {
      this.quiz = undefined
    },
    answerCurrent(option: string) {
      const quiz = this.quiz
      const item = quiz?.items[quiz.index]
      if (!quiz || !item || item.selected !== undefined) return
      item.selected = option
    },
    async runCurrentQuizQuery() {
      const quiz = this.quiz
      const item = quiz?.items[quiz.index]
      const app = useAppStore()
      if (
        !quiz ||
        !item ||
        item.question.kind !== 'query' ||
        item.selected !== undefined ||
        item.queryRunning ||
        !item.queryDraft.trim() ||
        !app.activeSessionId ||
        !window.sqlearner
      ) return

      item.queryRunning = true
      item.queryError = undefined
      item.queryResult = undefined
      try {
        const result = await window.sqlearner.runQuery(app.activeSessionId, item.queryDraft)
        item.queryResult = result
        if (result.changes !== undefined) app.markTablesStale()
        item.selected = item.question.answer
      } catch (error) {
        item.queryError = error instanceof Error ? error.message : 'Query failed'
      } finally {
        item.queryRunning = false
      }
    },
    nextQuestion() {
      const quiz = this.quiz
      if (!quiz) return
      if (quiz.index < quiz.items.length - 1) {
        quiz.index += 1
        return
      }
      void this.finishQuiz()
    },
    async finishQuiz() {
      const quiz = this.quiz
      if (!quiz) return
      const passed = quiz.items.every((item) => item.selected === item.question.answer)
      const key = `${quiz.mode}:${quiz.targetId}`
      const attempts = (this.attempts[key] ?? 0) + 1
      this.attempts[key] = attempts
      quiz.finished = true
      quiz.passed = passed

      if (!passed) return

      const entry = { completedAt: new Date().toISOString(), attempts }
      if (quiz.mode === 'lesson') this.progress.lessons[quiz.targetId] = entry
      else this.progress.exams[quiz.targetId] = entry
      await this.persistProgress()
    },
    async runSql(key: string, sql: string) {
      const app = useAppStore()
      if (!app.activeSessionId || !window.sqlearner) return
      this.runs[key] = { running: true }
      try {
        const result = await window.sqlearner.runQuery(app.activeSessionId, sql)
        this.runs[key] = { running: false, result }
        if (result.changes !== undefined) app.markTablesStale()
      } catch (error) {
        this.runs[key] = { running: false, error: error instanceof Error ? error.message : 'Query failed' }
      }
    },
    clearRun(key: string) {
      delete this.runs[key]
    },
    /** Resets the working copy and drops the results of the lesson statements that ran against it. */
    async resetDatabase() {
      const app = useAppStore()
      const reset = await app.resetDatabase()
      if (reset) this.runs = {}
    }
  }
})
