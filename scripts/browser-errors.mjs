import { execFile } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

const run = promisify(execFile)

export async function verifyBrowserErrors(session, receiptFile) {
  const { stdout } = await run('agent-browser', ['--session', session, '--json', 'errors'], {
    maxBuffer: 3_000_000,
  })
  if (receiptFile !== undefined) await writeFile(receiptFile, stdout)
  let response
  try {
    response = JSON.parse(stdout)
  } catch {
    throw new Error(`Invalid browser error response: ${stdout}`)
  }
  if (
    response?.success !== true ||
    !Array.isArray(response.data?.errors) ||
    (response.error !== undefined && response.error !== null)
  )
    throw new Error(`Invalid browser error response: ${stdout}`)
  if (response.data.errors.length > 0) throw new Error(`Browser reported page errors: ${stdout}`)
  return stdout
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const session = process.argv[2]
  if (!session) throw new Error('Usage: node browser-errors.mjs <session> [receipt-file]')
  process.stdout.write(await verifyBrowserErrors(session, process.argv[3]))
}
