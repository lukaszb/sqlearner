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
import type { CourseProgress, LessonWorkspaceState, QueryResult, QuizQuestion, QuizSnapshot } from '@/shared/types'
import { useAppStore } from '@/renderer/src/stores/app-store'
import { createQuizSnapshot } from '@/renderer/src/utils/quiz-snapshot'

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
  furthestIndex: number
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
  practiceDrafts: Record<string, string>
  runs: Record<string, RunState>
  error: string | undefined
}

const workspaceSaveTimers = new Map<string, number>()

function restoredQuiz(snapshot: QuizSnapshot | undefined, selection: LessonSelection | undefined): QuizState | undefined {
  if (!snapshot || !selection) return undefined
  const matchesSelection = snapshot.mode === 'lesson'
    ? selection.type === 'lesson' && selection.lessonId === snapshot.targetId
    : selection.type === 'exam' && selection.moduleId === snapshot.targetId
  if (!matchesSelection || snapshot.items.length === 0) return undefined

  return {
    ...snapshot,
    items: snapshot.items.map((item) => ({
      question: item.question,
      options: [...item.options],
      ...(item.selected !== undefined ? { selected: item.selected } : {}),
      queryDraft: item.queryDraft
    }))
  }
}

export const useLessonsStore = defineStore('lessons', {
  state: (): LessonsState => ({
    progress: createEmptyProgress(),
    progressLoadedFor: undefined,
    expandedModules: [course[0]?.id ?? ''],
    selection: undefined,
    quiz: undefined,
    attempts: {},
    practiceDrafts: {},
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
      this.persistWorkspace()
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
    async restoreWorkspace(sessionId: string) {
      if (!window.sqlearner?.loadSessionWorkspace) return
      try {
        const workspace = await window.sqlearner.loadSessionWorkspace(sessionId)
        const app = useAppStore()
        if (app.activeSessionId !== sessionId) return
        app.activeView = workspace.activeView
        this.applyWorkspace(workspace.lessons)
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to restore lesson state'
      }
    },
    applyWorkspace(workspace: LessonWorkspaceState) {
      const validModules = new Set(course.map((module) => module.id))
      this.expandedModules = workspace.expandedModules.filter((id) => validModules.has(id))
      if (this.expandedModules.length === 0 && course[0]) this.expandedModules = [course[0].id]
      this.attempts = { ...workspace.attempts }
      this.practiceDrafts = { ...workspace.practiceDrafts }

      if (workspace.selection?.type === 'lesson' && findLesson(workspace.selection.lessonId)) {
        this.selection = workspace.selection
      } else if (workspace.selection?.type === 'exam' && findModule(workspace.selection.moduleId)) {
        this.selection = workspace.selection
      } else {
        this.selection = undefined
      }
      this.quiz = restoredQuiz(workspace.quiz, this.selection)
    },
    workspaceSnapshot(): LessonWorkspaceState {
      return {
        expandedModules: [...this.expandedModules],
        ...(this.selection ? { selection: { ...this.selection } } : {}),
        ...(this.quiz ? { quiz: createQuizSnapshot(this.quiz) } : {}),
        attempts: { ...this.attempts },
        practiceDrafts: { ...this.practiceDrafts }
      }
    },
    persistWorkspace(delayMs = 0) {
      const app = useAppStore()
      const sessionId = app.activeSessionId
      if (!sessionId || !window.sqlearner?.saveSessionWorkspace) return
      const pending = workspaceSaveTimers.get(sessionId)
      if (pending !== undefined) window.clearTimeout(pending)
      const snapshot = this.workspaceSnapshot()

      const save = () => {
        workspaceSaveTimers.delete(sessionId)
        void window.sqlearner.saveSessionWorkspace(sessionId, { lessons: snapshot })
          .catch((error: unknown) => {
            this.error = error instanceof Error ? error.message : 'Failed to save lesson state'
          })
      }
      if (delayMs > 0) workspaceSaveTimers.set(sessionId, window.setTimeout(save, delayMs))
      else save()
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
      this.practiceDrafts = {}
    },
    openLesson(lessonId: string) {
      const located = findLesson(lessonId)
      if (!located) return
      const resumesCurrentQuiz = this.selection?.type === 'lesson'
        && this.selection.lessonId === lessonId
        && this.quiz?.mode === 'lesson'
        && this.quiz.targetId === lessonId
      this.selection = { type: 'lesson', lessonId }
      if (!resumesCurrentQuiz) this.quiz = undefined
      this.expandModule(located.module.id)
      this.persistWorkspace()
    },
    openExam(moduleId: string) {
      if (!findModule(moduleId)) return
      const resumesCurrentQuiz = this.selection?.type === 'exam'
        && this.selection.moduleId === moduleId
        && this.quiz?.mode === 'exam'
        && this.quiz.targetId === moduleId
      this.selection = { type: 'exam', moduleId }
      if (!resumesCurrentQuiz) this.quiz = undefined
      this.expandModule(moduleId)
      this.persistWorkspace()
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
        furthestIndex: 0,
        finished: false,
        passed: false
      }
      this.persistWorkspace()
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
        furthestIndex: 0,
        finished: false,
        passed: false
      }
      this.persistWorkspace()
    },
    retryQuiz() {
      const quiz = this.quiz
      if (!quiz) return
      if (quiz.mode === 'lesson') this.startLessonQuiz(quiz.targetId)
      else this.startExam(quiz.targetId)
    },
    closeQuiz() {
      this.quiz = undefined
      this.persistWorkspace()
    },
    answerCurrent(option: string) {
      const quiz = this.quiz
      const item = quiz?.items[quiz.index]
      if (!quiz || !item || item.selected !== undefined) return
      item.selected = option
      this.persistWorkspace()
    },
    updateCurrentQueryDraft(value: string) {
      const item = this.quiz?.items[this.quiz.index]
      if (!item || item.selected !== undefined) return
      item.queryDraft = value
      this.persistWorkspace(150)
    },
    setPracticeDraft(lessonId: string, value: string) {
      this.practiceDrafts[lessonId] = value
      this.persistWorkspace(150)
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
        this.persistWorkspace()
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
        quiz.furthestIndex = Math.max(quiz.furthestIndex, quiz.index)
        this.persistWorkspace()
        return
      }
      void this.finishQuiz()
    },
    goToQuestion(index: number) {
      const quiz = this.quiz
      if (!quiz || quiz.finished || !Number.isInteger(index)) return
      if (index < 0 || index >= quiz.items.length || index > quiz.furthestIndex) return
      quiz.index = index
      this.persistWorkspace()
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

      if (!passed) {
        this.persistWorkspace()
        return
      }

      const entry = { completedAt: new Date().toISOString(), attempts }
      if (quiz.mode === 'lesson') this.progress.lessons[quiz.targetId] = entry
      else this.progress.exams[quiz.targetId] = entry
      await this.persistProgress()
      this.persistWorkspace()
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
