import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)
const [output, ...requested] = process.argv.slice(2)
if (!output)
  throw new Error('Usage: node compare.mjs <absolute-receipt-directory> [fixture-id ...]')
const fixtures = JSON.parse(
  await fs.readFile(new URL('../src/fixtures.json', import.meta.url), 'utf8'),
)
await fs.mkdir(output, { recursive: true })
const commandLog = []
async function browser(session, args) {
  const result = await run('agent-browser', ['--session', session, ...args], {
    maxBuffer: 4_000_000,
  })
  commandLog.push({ session, args, stdout: result.stdout, stderr: result.stderr })
  await fs.writeFile(
    path.join(output, 'browser-commands.json'),
    JSON.stringify(commandLog, null, 2) + '\n',
  )
  return result.stdout
}
const settle = `(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));for(let i=0;i<4;i++){const shadows=[...document.querySelectorAll('*')].flatMap(e=>e.shadowRoot?[...e.shadowRoot.getAnimations()]:[]);const animations=[...document.getAnimations(),...shadows].filter(a=>a.playState==='running');if(!animations.length)break;await Promise.all(animations.map(a=>a.finished.catch(()=>{})));await new Promise(requestAnimationFrame)}const fixture=document.querySelector('#fixture');if(!fixture)throw Error('Missing fixture');const box=fixture.getBoundingClientRect().toJSON();const svgNodes=fixture.querySelectorAll('path,rect').length;const images=[...fixture.querySelectorAll('[role=img]')].map(e=>({label:e.getAttribute('aria-label'),tabindex:e.getAttribute('tabindex')}));return {box,svgNodes,images,theme:document.documentElement.className,devicePixelRatio,viewport:[innerWidth,innerHeight],fonts:document.fonts.status,captureControl:window.__chartsCapture??null}})()`
for (const fixture of fixtures.filter((f) => !requested.length || requested.includes(f.id))) {
  for (const theme of ['light', 'dark']) {
    const id = `${fixture.id}-${theme}`
    const capture = {}
    for (const [side, port] of [
      ['baseline', 5241],
      ['native', 5242],
    ]) {
      const session =
        process.env.CHARTS_SESSION ??
        (process.env.CHARTS_WAAPI_FINISH === '1' ? 'charts-static-finish' : 'charts-parity')
      await browser(session, ['set', 'viewport', '1280', '720', '1'])
      await browser(session, [
        'open',
        `${side === 'native' ? (process.env.CHARTS_NATIVE_URL ?? `http://127.0.0.1:${port}/`) : `http://127.0.0.1:${port}/`}?fixture=${fixture.id}&theme=${theme}`,
      ])
      await browser(session, ['wait', '#fixture'])
      const result = await browser(session, ['eval', settle])
      capture[side] = JSON.parse(result)
      if (capture[side].svgNodes === 0 && fixture.id !== 'arc-empty')
        throw new Error(`Blank ${side} fixture ${id}`)
      await browser(session, ['screenshot', path.join(output, `${id}.${side}.png`)])
    }
    await fs.writeFile(
      path.join(output, `${id}.capture.json`),
      JSON.stringify(capture, null, 2) + '\n',
    )
    console.log(id)
  }
}
await fs.writeFile(
  path.join(output, 'browser-commands.json'),
  JSON.stringify(commandLog, null, 2) + '\n',
)
