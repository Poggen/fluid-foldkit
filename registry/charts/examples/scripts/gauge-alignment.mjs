import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const run = promisify(execFile)
const output = process.argv[2]
if (!output) throw Error('Usage: node gauge-alignment.mjs <receipt directory>')
await fs.mkdir(output, { recursive: true })
const results = {}
for (const [side, port] of [
  ['baseline', 5241],
  ['native', 5242],
]) {
  const session = `charts-alignment-${side}`
  const browser = async (args) =>
    (await run('agent-browser', ['--session', session, ...args], { maxBuffer: 2_000_000 })).stdout
  await browser(['open', `http://127.0.0.1:${port}/?fixture=linear-top-center`])
  await browser(['wait', '#fixture'])
  await browser([
    'eval',
    `(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));await Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})));return true})()`,
  ])
  await browser(['find', 'role', 'button', 'click', '--name', 'Cycle label'])
  results[side] = JSON.parse(
    await browser([
      'eval',
      `(()=>{const f=document.querySelector('#fixture');const paths=[...f.querySelectorAll('path,rect')];return {restartedEntrances:paths.flatMap(p=>p.getAnimations()).filter(a=>a instanceof CSSAnimation&&a.playState==='running').length,minOpacity:Math.min(...paths.map(p=>Number(getComputedStyle(p).opacity)))}})()`,
    ]),
  )
  await fs.writeFile(
    path.join(output, 'alignment-results.json'),
    JSON.stringify(results, null, 2) + '\n',
  )
}
console.log(
  JSON.stringify({
    matches: JSON.stringify(results.baseline) === JSON.stringify(results.native),
    results,
  }),
)
