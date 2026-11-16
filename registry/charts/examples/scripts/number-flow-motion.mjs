import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const run = promisify(execFile)
const output = process.argv[2]
if (!output) throw Error('Usage: node number-flow-motion.mjs <receipt directory>')
await fs.mkdir(output, { recursive: true })
const frames = [0, 100, 250, 500, 750]
const records = {}
const log = []
async function browser(args) {
  const result = await run('agent-browser', ['--session', 'charts-number-motion', ...args], {
    maxBuffer: 4_000_000,
  })
  log.push({ args, stdout: result.stdout, stderr: result.stderr })
  await fs.writeFile(
    path.join(output, 'number-motion-commands.json'),
    JSON.stringify(log, null, 2) + '\n',
  )
  return result.stdout
}
for (const [side, port] of [
  ['baseline', 5241],
  ['native', 5242],
]) {
  await browser(['set', 'viewport', '1280', '720', '1'])
  await browser(['open', `http://127.0.0.1:${port}/?fixture=arc`])
  await browser(['wait', '#fixture'])
  await browser([
    'eval',
    `(async()=>{await document.fonts.ready;for(let i=0;i<4;i++){await new Promise(requestAnimationFrame);const a=[...document.getAnimations(),...[...document.querySelectorAll('*')].flatMap(e=>e.shadowRoot?[...e.shadowRoot.getAnimations()]:[])];await Promise.all(a.filter(x=>x.playState==='running').map(x=>x.finished.catch(()=>{})))}return true})()`,
  ])
  await browser(['find', 'role', 'button', 'click', '--name', 'Change center'])
  const signature = JSON.parse(
    await browser([
      'eval',
      `(()=>{const f=document.querySelector('number-flow-react,fk-bklit-number');if(!f?.shadowRoot)throw Error('Missing source number engine');window.__numberFrames=f.shadowRoot.getAnimations().filter(a=>a.playState==='running');if(!window.__numberFrames.length)throw Error('No live number animations');for(const a of window.__numberFrames){a.pause();a.currentTime=0}return window.__numberFrames.map(a=>({target:a.effect.target.className,frames:a.effect.getKeyframes(),timing:a.effect.getTiming()}))})()`,
    ]),
  )
  records[side] = { signature, frames: [] }
  for (const frame of frames) {
    const state = JSON.parse(
      await browser([
        'eval',
        `(()=>{for(const a of window.__numberFrames)a.currentTime=${frame};const f=document.querySelector('#fixture');return{box:f.getBoundingClientRect().toJSON(),svgNodes:f.querySelectorAll('path,rect').length,frame:${frame}}})()`,
      ]),
    )
    records[side].frames.push(state)
    await browser(['screenshot', path.join(output, `number-${frame}.${side}.png`)])
  }
  await browser(['eval', 'for(const a of window.__numberFrames)a.finish()'])
}
for (let i = 0; i < frames.length; i++)
  await fs.writeFile(
    path.join(output, `number-${frames[i]}.capture.json`),
    JSON.stringify(
      { baseline: records.baseline.frames[i], native: records.native.frames[i] },
      null,
      2,
    ) + '\n',
  )
const sameSignature =
  JSON.stringify(records.baseline.signature) === JSON.stringify(records.native.signature)
await fs.writeFile(
  path.join(output, 'number-motion-results.json'),
  JSON.stringify({ sameSignature, frames, records }, null, 2) + '\n',
)
console.log(
  JSON.stringify({
    sameSignature,
    frames: frames.length,
    baselineAnimations: records.baseline.signature.length,
    nativeAnimations: records.native.signature.length,
  }),
)
