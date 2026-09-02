import { describe, expect, it } from 'vitest'
import { detectOperatingSystem, isRunQueryShortcut } from '@/renderer/src/utils/keyboard-shortcuts'

describe('keyboard shortcut platform detection', () => {
  it('detects macOS, Windows, and Linux', () => {
    expect(detectOperatingSystem('MacIntel', '')).toBe('macos')
    expect(detectOperatingSystem('Win32', '')).toBe('windows')
    expect(detectOperatingSystem('Linux x86_64', '')).toBe('linux')
  })
})

describe('run query shortcut', () => {
  const enterWith = (ctrlKey: boolean, metaKey: boolean) => ({ key: 'Enter', ctrlKey, metaKey })

  it('uses Command+Enter only on macOS', () => {
    expect(isRunQueryShortcut(enterWith(false, true), 'macos')).toBe(true)
    expect(isRunQueryShortcut(enterWith(true, false), 'macos')).toBe(false)
  })

  it('uses Windows+Enter only on Windows', () => {
    expect(isRunQueryShortcut(enterWith(false, true), 'windows')).toBe(true)
    expect(isRunQueryShortcut(enterWith(true, false), 'windows')).toBe(false)
  })

  it('uses Ctrl+Enter only on Linux', () => {
    expect(isRunQueryShortcut(enterWith(true, false), 'linux')).toBe(true)
    expect(isRunQueryShortcut(enterWith(false, true), 'linux')).toBe(false)
  })
})
