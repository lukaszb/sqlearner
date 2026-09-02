import { foundationsModule } from './modules/module-01-foundations.js'
import { aggregationModule } from './modules/module-02-aggregation.js'
import { joinsModule } from './modules/module-03-joins.js'
import { modifyingModule } from './modules/module-04-modifying.js'
import { analyticsModule } from './modules/module-05-analytics.js'
import type { CourseModule, Lesson, ModuleLevel } from './types.js'

export const course: CourseModule[] = [
  foundationsModule,
  aggregationModule,
  joinsModule,
  modifyingModule,
  analyticsModule
]

export const levelLabels: Record<ModuleLevel, string> = {
  basics: 'Basics',
  intermediate: 'Intermediate',
  advanced: 'Advanced'
}

export interface LessonLocation {
  module: CourseModule
  lesson: Lesson
  index: number
}

export function findLesson(lessonId: string): LessonLocation | undefined {
  for (const module of course) {
    const index = module.lessons.findIndex((lesson) => lesson.id === lessonId)
    if (index !== -1) {
      return { module, lesson: module.lessons[index] as Lesson, index }
    }
  }
  return undefined
}

export function findModule(moduleId: string): CourseModule | undefined {
  return course.find((module) => module.id === moduleId)
}

export function allLessons(): Lesson[] {
  return course.flatMap((module) => module.lessons)
}

export function lessonCount(): number {
  return allLessons().length
}

export * from './types.js'
export * from './quiz.js'
