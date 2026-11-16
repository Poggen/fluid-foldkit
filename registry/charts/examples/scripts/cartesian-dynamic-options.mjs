import { verifyBrowserErrors } from '../../../../scripts/browser-errors.mjs'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const run = promisify(execFile)
const output = process.argv[2]
if (!output) throw Error('Usage: cartesian-dynamic-options.mjs <absolute-receipt-directory>')
await fs.mkdir(output, { recursive: true })
const session = 'charts-cartesian-dynamic'
const commands = []
const states = []
const browser = async (...args) => {
  const result = await run('agent-browser', ['--session', session, ...args], {
    maxBuffer: 2_000_000,
  })
  commands.push({ args, ...result })
  await fs.writeFile(path.join(output, 'commands.json'), JSON.stringify(commands, null, 2) + '\n')
  return result.stdout
}
const read = async (side, step) => {
  const value = JSON.parse(
    await browser(
      'eval',
      `(()=>{const chart=document.querySelector('#line-fixture [data-bkm-kit]');const svg=chart.querySelector('svg.ts-chart');return {visible:document.visibilityState,focused:document.hasFocus(),box:svg.getBoundingClientRect().toJSON(),background:getComputedStyle(chart).backgroundColor,label:chart.querySelector('.ts-bkm-loading-label-text')?.textContent??'',ready:chart.hasAttribute('data-bkm-ready'),labels:chart.querySelectorAll('[data-slot="loading-label"]').length,clip:chart.hasAttribute('data-bkm-clip'),generation:chart.presentation?.state.generation,focus:chart.presentation?.focusedIndex,rows:chart.presentation?.data.length,stroke:[...svg.querySelectorAll('path')].map(e=>e.getAttribute('stroke')).filter(Boolean),svgCount:chart.querySelectorAll('svg.ts-chart').length}})()`,
    ),
  )
  assert.equal(value.visible, 'visible')
  assert.equal(value.focused, true)
  assert(value.labels <= 1)
  if (side === 'native') assert.equal(value.labels, 1)
  assert.equal(value.svgCount, 1)
  states.push({ side, step, ...value })
  await fs.writeFile(path.join(output, 'states.json'), JSON.stringify(states, null, 2) + '\n')
  return value
}
try {
  for (const [side, url] of [
    ['source', process.env.CHARTS_SOURCE_URL ?? 'http://127.0.0.1:5241/line-area.html'],
    ['native', process.env.CHARTS_NATIVE_URL ?? 'http://127.0.0.1:5242/line-area.html'],
  ]) {
    await browser('--headed', 'open', url)
    await browser('set', 'viewport', '1280', '1000', '1')
    await browser('wait', '#line-fixture svg.ts-chart')
    await browser(
      'eval',
      `(async()=>{for(let i=0;i<240&&!document.querySelector('#line-fixture [data-bkm-ready]');i++)await new Promise(requestAnimationFrame)})()`,
    )
    await browser(
      'eval',
      `(()=>{window.__chartPhases=[];document.addEventListener('fixture-phase',event=>window.__chartPhases.push(event.detail))})()`,
    )
    const before = await read(side, 'before')
    assert.equal(before.ready, true)
    await browser('find', 'role', 'button', 'click', '--name', 'Change inputs')
    await browser('eval', `new Promise(requestAnimationFrame)`)
    const changed = await read(side, 'changed')
    assert.equal(changed.box.width, 480)
    assert.equal(changed.box.height, 240)
    assert.equal(changed.background, 'rgb(240, 245, 250)')
    assert.equal(changed.ready, true)
    assert.equal(changed.clip, false)
    assert(changed.stroke.includes('rgb(20, 110, 180)'))
    if (side === 'native') {
      assert.equal(changed.generation, before.generation)
      assert.equal(changed.rows, before.rows)
    }
    await browser('find', 'role', 'button', 'click', '--name', 'Loading')
    await browser(
      'eval',
      `(async()=>{for(let i=0;i<240&&!document.querySelector('#line-fixture [data-bkm-status="loading"]');i++)await new Promise(requestAnimationFrame)})()`,
    )
    const loading = await read(side, 'loading')
    assert(loading.label.includes('Updating chart'))
    await browser('find', 'role', 'button', 'click', '--name', 'Change inputs')
    await browser('eval', `new Promise(requestAnimationFrame)`)
    const restored = await read(side, 'restored')
    assert.equal(restored.box.width, 640)
    assert.equal(restored.box.height, 320)
    assert.equal(restored.background, 'rgba(0, 0, 0, 0)')
    assert.equal(restored.label, '')
    const callbacks = JSON.parse(await browser('eval', 'window.__chartPhases'))
    assert.deepEqual(callbacks, [
      { variant: 'alternate', phase: 'ready' },
      { variant: 'alternate', phase: 'loading' },
      { variant: 'default', phase: 'loading' },
    ])
    await fs.writeFile(
      path.join(output, `${side}-callbacks.json`),
      JSON.stringify(callbacks, null, 2) + '\n',
    )
    await browser('screenshot', path.join(output, `${side}.png`))
    await verifyBrowserErrors(session, path.join(output, `${side}-errors.json`))
  }
  await fs.writeFile(
    path.join(output, 'result.json'),
    JSON.stringify({ pass: true, states: states.length }, null, 2) + '\n',
  )
} finally {
  await browser('close')
}
