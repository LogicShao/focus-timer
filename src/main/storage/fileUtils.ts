import { rename, unlink, writeFile, readFile } from 'fs/promises'

export async function readJsonFile(filePath: string): Promise<unknown | null> {
  try {
    const content = await readFile(filePath, 'utf8')
    return JSON.parse(content) as unknown
  } catch {
    return null
  }
}

export async function writeJsonAtomic(filePath: string, data: unknown): Promise<void> {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
  const content = `${JSON.stringify(data, null, 2)}\n`

  await writeFile(tempPath, content, 'utf8')

  try {
    await rename(tempPath, filePath)
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code !== 'EEXIST' && code !== 'EPERM') {
      throw error
    }

    try {
      await unlink(filePath)
    } catch (unlinkError) {
      if ((unlinkError as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw unlinkError
      }
    }

    await rename(tempPath, filePath)
  } finally {
    try {
      await unlink(tempPath)
    } catch {
      // noop
    }
  }
}
