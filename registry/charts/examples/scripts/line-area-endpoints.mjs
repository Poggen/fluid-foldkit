import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const run = promisify(execFile)
const output = process.argv[2]
if (!output) throw Error('Usage: line-area-endpoints.mjs <absolute-receipt-directory>')
await fs.mkdir(output, { recursive: true })
const session = 'charts-line-area-endpoints'
const commands = []
async function browser(args) {
  const result = await run('agent-browser', ['--session', session, ...args], {
    maxBuffer: 2_000_000,
  })
  commands.push({ args, ...result })
  await fs.writeFile(path.join(output, 'commands.json'), JSON.stringify(commands, null, 2) + '\n')
  return result.stdout
}
const capture = {}
for (const [side, url] of [
  ['baseline', process.env.CHARTS_SOURCE_URL ?? 'http://127.0.0.1:5241/line-area.html'],
  ['native', process.env.CHARTS_NATIVE_URL ?? 'http://127.0.0.1:5242/line-area.html'],
]) {
  await browser(['--headed', 'open', url])
  await browser(['set', 'viewport', '1280', '1000', '1'])
  await browser(['wait', '#line-fixture svg.ts-chart'])
  if (side === 'native') {
    await browser(['find', 'role', 'button', 'click', '--name', 'Reset data'])
    await browser(['find', 'role', 'button', 'click', '--name', 'Clear focus'])
    await browser(['find', 'role', 'button', 'click', '--name', 'Full range'])
  }
  await browser(['mouse', 'move', '5', '5'])
  const state = JSON.parse(
    await browser([
      'eval',
      `(async()=>{if(document.visibilityState!=='visible'||!document.hasFocus())throw Error('Active visible owned tab required');await document.fonts.ready;for(let frame=0;frame<240;frame++){if([...document.querySelectorAll('[data-bkm-kit]')].every(element=>element.hasAttribute('data-bkm-ready')))break;await new Promise(requestAnimationFrame)}await Promise.all(document.getAnimations().filter(a=>a.effect?.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));return {visibility:document.visibilityState,focused:document.hasFocus(),devicePixelRatio,viewport:[innerWidth,innerHeight],families:Object.fromEntries(['line','area'].map(family=>{const element=document.querySelector('#'+family+'-fixture');const svg=element.querySelector('svg.ts-chart');return [family,{box:svg.getBoundingClientRect().toJSON(),svgNodes:element.querySelectorAll('path,rect,circle').length,label:svg.getAttribute('aria-label'),ready:element.querySelector('[data-bkm-kit]')?.hasAttribute('data-bkm-ready')??false}]}))}})()`,
    ]),
  )
  if (!state.focused || state.visibility !== 'visible') throw Error('Hidden capture rejected')
  if (Object.values(state.families).some((family) => family.svgNodes < 2 || !family.ready))
    throw Error('Blank or not-ready fixture')
  capture[side] = state
  await browser(['screenshot', path.join(output, `families.${side}.png`)])
}
for (const family of ['line', 'area']) {
  const record = {
    baseline: { ...capture.baseline.families[family] },
    native: { ...capture.native.families[family] },
  }
  await fs.copyFile(
    path.join(output, 'families.baseline.png'),
    path.join(output, `${family}.baseline.png`),
  )
  await fs.copyFile(
    path.join(output, 'families.native.png'),
    path.join(output, `${family}.native.png`),
  )
  await fs.writeFile(
    path.join(output, `${family}.capture.json`),
    JSON.stringify(record, null, 2) + '\n',
  )
}
await fs.writeFile(path.join(output, 'readback.json'), JSON.stringify(capture, null, 2) + '\n')
await browser(['close'])
console.log('Source/native visible endpoint captures complete')
