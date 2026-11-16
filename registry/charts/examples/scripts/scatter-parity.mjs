import { verifyBrowserErrors } from '../../../../scripts/browser-errors.mjs'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const run = promisify(execFile)
const output = process.argv[2]
if (!output) throw Error('Usage: scatter-parity.mjs <absolute-receipt-directory>')
await fs.mkdir(output, { recursive: true })
const commands = []
const captures = {}
const browser = async (session, ...args) => {
  const result = await run('agent-browser', ['--session', session, ...args], {
    maxBuffer: 3_000_000,
  }).catch(async (error) => {
    await fs.writeFile(
      path.join(output, 'failure.json'),
      JSON.stringify({ session, args, stderr: error.stderr, message: error.message }, null, 2) +
        '\n',
    )
    throw error
  })
  commands.push({ session, args, ...result })
  await fs.writeFile(path.join(output, 'commands.json'), JSON.stringify(commands, null, 2) + '\n')
  return result.stdout
}
for (const [side, url] of [
  ['baseline', process.env.CHARTS_SOURCE_URL ?? 'http://127.0.0.1:5241/scatter.html'],
  ['native', process.env.CHARTS_NATIVE_URL ?? 'http://127.0.0.1:5242/scatter.html'],
].filter(([side]) => !process.env.CHARTS_SIDE || process.env.CHARTS_SIDE === side)) {
  const session = `charts-scatter-${side}`
  try {
    await browser(session, '--headed', 'open', url)
    await browser(session, 'set', 'viewport', '1280', '1000', '1')
    await browser(session, 'wait', '#scatter-fixture svg.ts-chart')
    const capture = async (name, dots) => {
      const state = JSON.parse(
        await browser(
          session,
          'eval',
          `(async()=>{await document.fonts.ready;for(let i=0;i<240;i++){const svg=document.querySelector('#scatter-fixture svg.ts-chart');if(document.querySelector('#scatter-fixture [data-bkm-ready]')&&svg.querySelectorAll('.ts-chart__dot circle').length===${dots}&&svg.getAttribute('data-ts-motion-state')!=='running')break;await new Promise(requestAnimationFrame)}await Promise.all(document.getAnimations().filter(a=>a.effect?.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));if(document.visibilityState!=='visible'||!document.hasFocus())throw Error('Visible owned capture required');const root=document.querySelector('#scatter-fixture [data-bkm-kit]');const svg=root.querySelector('svg.ts-chart');return {visible:document.visibilityState,focused:document.hasFocus(),ready:root.hasAttribute('data-bkm-ready'),box:svg.getBoundingClientRect().toJSON(),svgNodes:svg.querySelectorAll('path,rect,circle').length,circles:[...svg.querySelectorAll('.ts-chart__dot circle')].map(e=>Object.fromEntries([...e.attributes].map(a=>[a.name,a.value]))),labels:[...svg.querySelectorAll('text')].map(e=>e.textContent),phases:document.documentElement.dataset.scatterPhases,state:document.querySelector('#state')?.textContent}})()`,
        ),
      )
      assert.equal(state.ready, true)
      assert.equal(state.circles.length, dots)
      await browser(session, 'mouse', 'move', '5', '5')
      await browser(session, 'screenshot', path.join(output, `${name}.${side}.png`))
      captures[name] ??= {}
      captures[name][side] = state
      await fs.writeFile(
        path.join(output, `${name}.capture.json`),
        JSON.stringify(captures[name], null, 2) + '\n',
      )
      return state
    }
    const initial = await capture('default', 21)
    assert.equal(initial.phases, 'revealing,ready,')
    await browser(session, 'find', 'role', 'button', 'click', '--name', 'Change options')
    await capture('changed', 28)
    await browser(session, 'find', 'role', 'button', 'click', '--name', 'Empty', '--exact')
    await capture('empty', 0)
    await browser(session, 'find', 'role', 'button', 'click', '--name', 'Restore', '--exact')
    await browser(session, 'find', 'role', 'button', 'click', '--name', 'Change options')
    await capture('restored', 21)
    await browser(
      session,
      'eval',
      `window.__scatterBeforeSvg=document.querySelector('#scatter-fixture svg.ts-chart')`,
    )
    await browser(session, 'find', 'role', 'button', 'click', '--name', 'Replay')
    const replay = await capture('replayed', 21)
    assert.equal(replay.phases, 'revealing,ready,revealing,ready,')
    assert.equal(
      JSON.parse(
        await browser(
          session,
          'eval',
          `window.__scatterBeforeSvg!==document.querySelector('#scatter-fixture svg.ts-chart')`,
        ),
      ),
      true,
    )
    await browser(session, 'focus', '#scatter-fixture svg.ts-chart')
    await browser(session, 'press', 'End')
    const keyboard = JSON.parse(
      await browser(
        session,
        'eval',
        `new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{const root=document.querySelector('#scatter-fixture [data-bkm-kit]');resolve({hover:root.hasAttribute('data-bkm-hover'),x:Number(root.style.getPropertyValue('--bkm-hx')),index:root.presentation?.focusedIndex,svgCount:root.querySelectorAll('svg.ts-chart').length})})))`,
      ),
    )
    if (side === 'native') assert.equal(keyboard.index, 6)
    assert.equal(keyboard.hover, true)
    assert.equal(Math.round(keyboard.x * 100) / 100, 585)
    assert.equal(keyboard.svgCount, 1)
    await fs.writeFile(
      path.join(output, `${side}-keyboard.json`),
      JSON.stringify(keyboard, null, 2) + '\n',
    )
    await verifyBrowserErrors(session, path.join(output, `${side}-errors.json`))
  } finally {
    await browser(session, 'close')
  }
}
await fs.writeFile(
  path.join(output, 'result.json'),
  JSON.stringify(
    {
      pass: true,
      sides: Object.keys(captures.default ?? {}),
      sourceAndNativeCaptured: Object.keys(captures.default ?? {}).length === 2,
      endpointCases: Object.keys(captures).length,
      physicalKeyboard: true,
      actualReplayRemount: true,
    },
    null,
    2,
  ) + '\n',
)
