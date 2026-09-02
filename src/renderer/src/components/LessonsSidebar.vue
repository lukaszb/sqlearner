<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { levelLabels, moduleExamSize } from '@/shared/course'
import type { CourseModule, Lesson } from '@/shared/course'
import { useAppStore } from '@/renderer/src/stores/app-store'
import { useLessonsStore } from '@/renderer/src/stores/lessons-store'

interface TooltipState {
  title: string
  detail: string
  top: number
  left: number
}

const appStore = useAppStore()
const lessonsStore = useLessonsStore()
const { activeView } = storeToRefs(appStore)
const { selection } = storeToRefs(lessonsStore)

const tooltip = ref<TooltipState | undefined>()
const isActive = computed(() => activeView.value === 'lessons')

function shortLabel(title: string): string {
  return title.split(' - ')[0] ?? title
}

function showTooltip(event: MouseEvent | FocusEvent, title: string, detail: string): void {
  const target = event.currentTarget as HTMLElement | null
  if (!target) return
  const rect = target.getBoundingClientRect()
  tooltip.value = {
    title,
    detail,
    top: Math.max(12, Math.min(rect.top, window.innerHeight - 140)),
    left: rect.right + 12
  }
}

function hideTooltip(): void {
  tooltip.value = undefined
}

function openLessons(): void {
  void appStore.selectView('lessons')
}

function selectLesson(lesson: Lesson): void {
  hideTooltip()
  void appStore.selectView('lessons')
  lessonsStore.openLesson(lesson.id)
}

function selectExam(module: CourseModule): void {
  hideTooltip()
  void appStore.selectView('lessons')
  lessonsStore.openExam(module.id)
}

function isLessonSelected(lessonId: string): boolean {
  return selection.value?.type === 'lesson' && selection.value.lessonId === lessonId
}

function isExamSelected(moduleId: string): boolean {
  return selection.value?.type === 'exam' && selection.value.moduleId === moduleId
}
</script>

<template>
  <div class="mt-1">
    <button
      class="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium"
      data-testid="nav-lessons"
      :class="isActive ? 'bg-brand text-white' : 'hover:bg-stone-100'"
      @click="openLessons"
    >
      <span>Lessons</span>
      <span class="text-xs" :class="isActive ? 'text-emerald-100' : 'text-stone-500'">
        {{ lessonsStore.completedLessonCount }} done
      </span>
    </button>

    <div v-if="isActive" class="mt-1 space-y-0.5" data-testid="lessons-tree">
      <div v-for="module in lessonsStore.modules" :key="module.id">
        <button
          class="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm hover:bg-stone-100"
          data-testid="module-toggle"
          @click="lessonsStore.toggleModule(module.id)"
        >
          <span class="w-3 text-xs text-stone-500">{{ lessonsStore.isModuleExpanded(module.id) ? '-' : '+' }}</span>
          <span class="min-w-0 flex-1 truncate font-medium">{{ module.title }}</span>
          <span class="text-[11px] text-stone-500">
            {{ lessonsStore.completedInModule(module.id) }}/{{ module.lessons.length }}
          </span>
        </button>

        <div v-show="lessonsStore.isModuleExpanded(module.id)" class="ml-5 border-l border-stone-200 pl-2">
          <div class="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-stone-400">
            {{ levelLabels[module.level] }}
          </div>

          <button
            v-for="lesson in module.lessons"
            :key="lesson.id"
            class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
            data-testid="lesson-item"
            :class="isLessonSelected(lesson.id) ? 'bg-emerald-50 font-medium text-brand' : 'hover:bg-stone-100'"
            @click="selectLesson(lesson)"
            @mouseenter="showTooltip($event, lesson.title, lesson.goal)"
            @mouseleave="hideTooltip"
            @focus="showTooltip($event, lesson.title, lesson.goal)"
            @blur="hideTooltip"
          >
            <span
              class="w-4 shrink-0 text-center text-xs"
              :class="lessonsStore.isLessonDone(lesson.id) ? 'text-emerald-600' : 'text-stone-300'"
            >
              {{ lessonsStore.isLessonDone(lesson.id) ? 'v' : 'o' }}
            </span>
            <span class="min-w-0 flex-1 truncate">{{ shortLabel(lesson.title) }}</span>
          </button>

          <button
            class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
            data-testid="module-exam-item"
            :class="isExamSelected(module.id) ? 'bg-emerald-50 font-medium text-brand' : 'hover:bg-stone-100'"
            @click="selectExam(module)"
            @mouseenter="showTooltip($event, `${module.title} - module exam`, `${moduleExamSize(module)} questions drawn from every lesson of this module.`)"
            @mouseleave="hideTooltip"
            @focus="showTooltip($event, `${module.title} - module exam`, `${moduleExamSize(module)} questions drawn from every lesson of this module.`)"
            @blur="hideTooltip"
          >
            <span
              class="w-4 shrink-0 text-center text-xs"
              :class="lessonsStore.isExamDone(module.id) ? 'text-emerald-600' : 'text-stone-300'"
            >
              {{ lessonsStore.isExamDone(module.id) ? 'v' : 'o' }}
            </span>
            <span class="min-w-0 flex-1 truncate italic text-stone-600">Module exam</span>
          </button>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="tooltip"
        class="pointer-events-none fixed z-50 max-w-xs rounded-md bg-ink px-3 py-2 text-xs text-white shadow-lg"
        data-testid="lesson-tooltip"
        :style="{ top: `${tooltip.top}px`, left: `${tooltip.left}px` }"
      >
        <p class="font-semibold">{{ tooltip.title }}</p>
        <p class="mt-1 text-stone-300">{{ tooltip.detail }}</p>
      </div>
    </Teleport>
  </div>
</template>
