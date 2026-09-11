import type { PiniaPluginContext } from 'pinia'

const interactions = new Set([
  'setDisclosure', 'usePracticeSolution', 'toggleModule', 'openLesson', 'openExam', 'startLessonQuiz', 'startExam', 'retryQuiz',
  'closeQuiz', 'answerCurrent', 'updateCurrentQueryDraft', 'setPracticeDraft',
  'runCurrentQuizQuery', 'nextQuestion', 'goToQuestion', 'finishQuiz', 'runSql', 'clearRun',
  'selectView', 'selectTable', 'addQueryTab', 'closeQueryTab', 'runActiveQuery', 'resetDatabase', 'closeSession'
])

/** Capture semantic actions separately from the state events used for replay. */
export function sessionEventsPlugin({ store, pinia }: PiniaPluginContext) {
  store.$onAction(({ name, args, after, onError }) => {
    if (!interactions.has(name)) return
    const sessionId = pinia.state.value.app?.activeSessionId as string | undefined
    if (!sessionId || !window.sqlearner?.recordSessionEvent) return
    const record = (phase: string, error?: unknown) => {
      const data = JSON.parse(JSON.stringify({ args, phase,
        ...(error ? { error: String(error) } : {}),
        ...(store.$id === 'lessons' && phase === 'finished' ? {
          quiz: store.$state.quiz, attempts: store.$state.attempts, runs: store.$state.runs
        } : {}) })) as unknown
      void window.sqlearner.recordSessionEvent(sessionId, { type: `ui.${store.$id}.${name}`, data })
        .catch((failure: unknown) => {
          store.$state.error = failure instanceof Error ? failure.message : 'Failed to save interaction history'
        })
    }
    record('started')
    after(() => record('finished'))
    onError((error) => record('failed', error))
  })
}
