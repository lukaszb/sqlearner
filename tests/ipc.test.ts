import { describe, expect, it } from 'vitest'
import { ipcChannels } from '@/shared/ipc'

describe('ipcChannels', () => {
  it('uses explicit namespaced channel names', () => {
    expect(ipcChannels.sessionsList).toBe('sessions:list')
    expect(ipcChannels.sessionsRename).toBe('sessions:rename')
    expect(ipcChannels.databasePreview).toBe('database:preview')
    expect(ipcChannels.queryRun).toBe('query:run')
    expect(ipcChannels.databaseReset).toBe('database:reset')
  })
})
