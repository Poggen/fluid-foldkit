import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs/promises'
import path from 'node:path'
const run = promisify(execFile),
  output = process.argv[2],
  entry = path.resolve(import.meta.dirname, '../src/pie-ring-entry.ts'),
  original = await fs.readFile(entry, 'utf8')
await fs.mkdir(output, { recursive: true })
const browser = async (...args) =>
  (await run('agent-browser', ['--session', 'pie-ring-native', ...args], { maxBuffer: 3_000_000 }))
    .stdout
const snapshot = async () =>
  JSON.parse(
    await browser(
      'eval',
      `({origin:performance.timeOrigin,text:document.querySelector('#state')?.textContent,paths:document.querySelectorAll('#pie-fixture path,#ring-fixture path').length})`,
    ),
  )
const validateSnapshot = (captured, stage, before) => {
  if (typeof captured.text !== 'string' || captured.paths <= 0)
    throw Error(`${stage}: chart content is missing`)
  if (before !== undefined && captured.origin !== before.origin)
    throw Error(`${stage}: document reloaded instead of applying HMR`)
}
const receipt = {}
try {
  receipt.before = await snapshot()
  validateSnapshot(receipt.before, 'Initial')
  if (!original.includes(' rows ${')) throw Error('Expected exact owned fixture marker')
  await fs.writeFile(entry, original.replace(' rows ${', ' HMR rows ${'))
  await browser(
    'eval',
    `new Promise((resolve,reject)=>{let frames=0;const step=()=>{if(document.querySelector('#state')?.textContent.includes('HMR'))resolve();else if(frames++>300)reject(Error('HMR visible marker absent'));else requestAnimationFrame(step)};step()})`,
  )
  receipt.changed = await snapshot()
  validateSnapshot(receipt.changed, 'Changed', receipt.before)
  if (!receipt.changed.text.includes('HMR')) throw Error('Changed: HMR marker is missing')
} catch (error) {
  receipt.error = String(error)
} finally {
  try {
    await fs.writeFile(entry, original)
    await browser(
      'eval',
      `new Promise((resolve,reject)=>{let frames=0;const step=()=>{if(document.querySelector('#state')?.textContent&&!document.querySelector('#state')?.textContent.includes('HMR'))resolve();else if(frames++>300)reject(Error('Restored visible marker absent'));else requestAnimationFrame(step)};step()})`,
    )
    receipt.restored = await snapshot()
    validateSnapshot(receipt.restored, 'Restored', receipt.before)
    if (
      receipt.restored.text.includes('HMR') ||
      (receipt.before !== undefined && receipt.restored.text !== receipt.before.text)
    )
      throw Error('Restored: original state text was not restored')
  } catch (error) {
    receipt.cleanupError = String(error)
  }
}
try {
  const response = JSON.parse(await browser('--json', 'errors'))
  if (response.success !== true || !Array.isArray(response.data?.errors))
    throw Error('Page error inspection returned an invalid response')
  receipt.errors = response.data.errors
  if (receipt.errors.length !== 0)
    throw Error(`HMR captured ${receipt.errors.length} page error(s)`)
} catch (error) {
  receipt.browserError = String(error)
}
await fs.writeFile(path.join(output, 'result.json'), JSON.stringify(receipt, null, 2))
if (
  receipt.error !== undefined ||
  receipt.cleanupError !== undefined ||
  receipt.browserError !== undefined
)
  process.exitCode = 1
