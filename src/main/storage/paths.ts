import { mkdir } from 'fs/promises'
import { join } from 'path'
import { app } from 'electron'

export interface StoragePaths {
  dataDir: string
  settingsFile: string
  historyFile: string
}

export async function ensureStoragePaths(): Promise<StoragePaths> {
  const dataDir = join(app.getPath('userData'), 'data')
  await mkdir(dataDir, { recursive: true })

  return {
    dataDir,
    settingsFile: join(dataDir, 'settings.json'),
    historyFile: join(dataDir, 'history.json')
  }
}
