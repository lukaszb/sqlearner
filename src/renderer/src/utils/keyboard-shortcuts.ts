export type OperatingSystem = 'macos' | 'windows' | 'linux'

interface KeyboardShortcutEvent {
  key: string
  ctrlKey: boolean
  metaKey: boolean
}

export function detectOperatingSystem(
  platform = navigator.platform,
  userAgent = navigator.userAgent
): OperatingSystem {
  const fingerprint = `${platform} ${userAgent}`.toLowerCase()

  if (fingerprint.includes('mac')) return 'macos'
  if (fingerprint.includes('win')) return 'windows'
  return 'linux'
}

export function isRunQueryShortcut(
  event: KeyboardShortcutEvent,
  operatingSystem = detectOperatingSystem()
): boolean {
  if (event.key !== 'Enter') return false

  if (operatingSystem === 'linux') return event.ctrlKey && !event.metaKey
  return event.metaKey && !event.ctrlKey
}
