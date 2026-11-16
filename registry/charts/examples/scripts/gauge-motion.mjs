import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const run = promisify(execFile)
const output = process.argv[2]
if (!output) throw new Error('Usage: node gauge-motion.mjs <receipt directory>')
await fs.mkdir(output, { recursive: true })
const log = []
async function browser(args) {
  const result = await run('agent-browser', ['--session', 'charts-motion', ...args], {
    maxBuffer: 4_000_000,
  })
  log.push({ args, stdout: result.stdout, stderr: result.stderr })
  await fs.writeFile(path.join(output, 'motion-commands.json'), JSON.stringify(log, null, 2) + '\n')
  return result.stdout
}
const frames = [0, 167, 333, 500, 750, 1000, 1500]
const records = {}
for (const [side, port] of [
  ['baseline', 5241],
  ['native', 5242],
]) {
  await browser(['set', 'viewport', '1280', '720', '1'])
  await browser(['open', `http://127.0.0.1:${port}/?fixture=arc-gradient`])
  await browser(['wait', '#fixture'])
  await browser([
    'eval',
    `(async()=>{await document.fonts.ready;const find=name=>[...document.querySelectorAll('button')].find(b=>b.textContent===name);find('Unmount').click();while(document.querySelector('#fixture path'))await new Promise(requestAnimationFrame);find('Remount').click();while(!document.querySelector('#fixture path'))await new Promise(requestAnimationFrame);window.__gaugeFrames=document.getAnimations().filter(a=>a instanceof CSSAnimation&&a.animationName.startsWith('bkm-gn-'));if(!window.__gaugeFrames.length)throw Error('No source notch animations acquired');for(const animation of window.__gaugeFrames){const target=animation.effect.target;const group=target.parentElement;const index=[...group.children].indexOf(target);const active=group.getAttribute('data-ts-key')==='gauge:active';const authoredDelay=(active?300+index*20:index*15);animation.pause();animation.effect.updateTiming({delay:authoredDelay,fill:'both'});animation.currentTime=0;}return {animations:window.__gaugeFrames.length,origin:document.querySelector('.bk-gauge-host').style.getPropertyValue('--bkm-gn-lag')}})()`,
  ])
  records[side] = []
  for (const frame of frames) {
    const state = JSON.parse(
      await browser([
        'eval',
        `(()=>{for(const a of window.__gaugeFrames)a.currentTime=${frame};const f=document.querySelector('#fixture');return{box:f.getBoundingClientRect().toJSON(),svgNodes:f.querySelectorAll('path,rect').length,frame:${frame}}})()`,
      ]),
    )
    records[side].push(state)
    await browser(['screenshot', path.join(output, `frame-${frame}.${side}.png`)])
  }
}
for (let i = 0; i < frames.length; i++)
  await fs.writeFile(
    path.join(output, `frame-${frames[i]}.capture.json`),
    JSON.stringify({ baseline: records.baseline[i], native: records.native[i] }, null, 2) + '\n',
  )
await fs.writeFile(
  path.join(output, 'motion-results.json'),
  JSON.stringify(
    {
      contract:
        'Exact authored notch timing, curve and geometry at the sampled shared engine clock; CSS phase seeking normalizes wall-clock acquisition lag and does not verify real-time origin alignment.',
      frames,
      records,
    },
    null,
    2,
  ) + '\n',
)
console.log(
  JSON.stringify({
    frames: frames.length,
    baseline: records.baseline.length,
    native: records.native.length,
  }),
)
