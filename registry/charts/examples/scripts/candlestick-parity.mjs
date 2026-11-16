import { verifyBrowserErrors } from '../../../../scripts/browser-errors.mjs'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const run = promisify(execFile)
const output = process.argv[2]
if (!output) throw Error('Usage: candlestick-parity.mjs <absolute-receipt-directory>')
await fs.mkdir(output, { recursive: true })
const commands = []
const captures = {}
const browser = async (session, ...args) => {
  const result = await run('agent-browser', ['--session', session, ...args], {
    maxBuffer: 3_000_000,
  })
  commands.push({ session, args, ...result })
  await fs.writeFile(path.join(output, 'commands.json'), JSON.stringify(commands, null, 2) + '\n')
  return result.stdout
}
for (const [side, url] of [
  ['baseline', process.env.CHARTS_SOURCE_URL ?? 'http://127.0.0.1:5241/candlestick.html'],
  ['native', process.env.CHARTS_NATIVE_URL ?? 'http://127.0.0.1:5242/candlestick.html'],
]) {
  const session = `charts-candlestick-${side}`
  try {
    await browser(session, '--headed', 'open', url)
    await browser(session, 'set', 'viewport', '1280', '1000', '1')
    await browser(session, 'wait', '#candlestick-fixture svg.ts-chart')
    const capture = async (name) => {
      const state = JSON.parse(
        await browser(
          session,
          'eval',
          `(async()=>{await document.fonts.ready;for(let i=0;i<240&&!document.querySelector('#candlestick-fixture [data-bkm-ready]');i++)await new Promise(requestAnimationFrame);await Promise.all(document.getAnimations().filter(a=>a.effect?.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));for(let i=0;i<240&&document.querySelector('#candlestick-fixture svg.ts-chart')?.getAttribute('data-ts-motion-state')==='running';i++)await new Promise(requestAnimationFrame);if(document.visibilityState!=='visible'||!document.hasFocus())throw Error('Visible owned capture required');const root=document.querySelector('#candlestick-fixture [data-bkm-kit]');const svg=root.querySelector('svg.ts-chart');return {visible:document.visibilityState,focused:document.hasFocus(),ready:root.hasAttribute('data-bkm-ready'),box:svg.getBoundingClientRect().toJSON(),svgNodes:svg.querySelectorAll('path,rect,circle').length,body:[...svg.querySelectorAll('rect[data-ts-key^="body:"]')].map(e=>Object.fromEntries([...e.attributes].map(a=>[a.name,a.value]))),labels:[...svg.querySelectorAll('text')].map(e=>e.textContent),state:document.querySelector('#state')?.textContent}})()`,
        ),
      )
      assert.equal(state.ready, true)
      if (name !== 'empty') assert.equal(state.body.length, 7)
      else assert.equal(state.body.length, 0)
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
    const initial = await capture('default')
    assert.equal(initial.box.height, 320)
    await browser(session, 'find', 'role', 'button', 'click', '--name', 'Change options')
    const changed = await capture('changed')
    assert.equal(changed.box.height, 240)
    assert(changed.body.every((body) => body.width === '14'))
    await browser(session, 'find', 'role', 'button', 'click', '--name', 'Window')
    await capture('window')
    await browser(session, 'find', 'role', 'button', 'click', '--name', 'Empty', '--exact')
    await capture('empty')
    await browser(session, 'find', 'role', 'button', 'click', '--name', 'Restore', '--exact')
    await browser(session, 'find', 'role', 'button', 'click', '--name', 'Full range')
    await browser(session, 'find', 'role', 'button', 'click', '--name', 'Change options')
    await capture('restored')
    await browser(session, 'focus', '#candlestick-fixture svg.ts-chart')
    await browser(session, 'press', 'End')
    const keyboard = JSON.parse(
      await browser(
        session,
        'eval',
        `new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve({text:document.querySelector('#candlestick-fixture').textContent,focused:document.activeElement?.getAttribute('aria-label'),hover:document.querySelector('#candlestick-fixture [data-bkm-kit]').hasAttribute('data-bkm-hover'),x:Number(document.querySelector('#candlestick-fixture [data-bkm-kit]').style.getPropertyValue('--bkm-hx')),index:document.querySelector('#candlestick-fixture [data-bkm-kit]').presentation?.focusedIndex}))))`,
      ),
    )
    if (side === 'native') assert.equal(keyboard.index, 6)
    assert(keyboard.text.includes('Jan 7'))
    assert.equal(keyboard.hover, true)
    assert.equal(Math.round(keyboard.x * 100) / 100, 560)
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
    { pass: true, endpointCases: Object.keys(captures).length, physicalKeyboard: true },
    null,
    2,
  ) + '\n',
)
