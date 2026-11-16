import { verifyBrowserErrors } from '../../../../scripts/browser-errors.mjs'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const run = promisify(execFile)
const output = process.argv[2]
if (!output) throw Error('Usage: cartesian-sweep.mjs <absolute-receipt-directory>')
await fs.mkdir(output, { recursive: true })
const commands = []
const results = []
const browser = async (session, ...args) => {
  const result = await run('agent-browser', ['--session', session, ...args], {
    maxBuffer: 5_000_000,
  })
  commands.push({ session, args, ...result })
  await fs.writeFile(path.join(output, 'commands.json'), JSON.stringify(commands, null, 2) + '\n')
  return result.stdout
}
for (const reduced of [false, true]) {
  for (const [side, url] of [
    ['baseline', process.env.CHARTS_SOURCE_URL ?? 'http://127.0.0.1:5241/line-area.html'],
    ['native', process.env.CHARTS_NATIVE_URL ?? 'http://127.0.0.1:5242/line-area.html'],
  ]) {
    const session = `charts-sweep-${reduced ? 'reduced' : 'normal'}-${side}`
    try {
      await browser(session, '--headed', 'open', url)
      await browser(session, 'set', 'viewport', '1280', '1000', '1')
      if (reduced) await browser(session, 'set', 'media', 'light', 'reduced-motion')
      await browser(session, 'wait', '#line-fixture svg.ts-chart')
      await browser(
        session,
        'eval',
        `(async()=>{for(let i=0;i<240&&!document.querySelector('#line-fixture [data-bkm-ready]');i++)await new Promise(requestAnimationFrame)})()`,
      )
      if (!reduced) {
        const tree = JSON.parse(
          await browser(
            session,
            'eval',
            `(()=>{const svg=document.querySelector('#area-fixture svg.ts-chart');const capture=e=>{const css=getComputedStyle(e);return {tag:e.tagName,attributes:Object.fromEntries([...e.attributes].map(a=>[a.name,a.value])),box:e.getBoundingClientRect().toJSON(),css:Object.fromEntries([...css].map(name=>[name,css.getPropertyValue(name)]))}};const ancestors=[];for(let e=svg;e;e=e.parentElement)ancestors.push(capture(e));return {descendants:[...svg.querySelectorAll('*')].map(capture),ancestors}})()`,
          ),
        )
        await fs.writeFile(
          path.join(output, `${side}-complete-paint-tree.json`),
          JSON.stringify(tree, null, 2) + '\n',
        )
      }
      await browser(session, 'find', 'role', 'button', 'click', '--name', 'Sweep style')
      await browser(session, 'find', 'role', 'button', 'click', '--name', 'Loading')
      const state = JSON.parse(
        await browser(
          session,
          'eval',
          `(async()=>{let sweep;for(let i=0;i<240;i++){sweep=[...document.querySelectorAll('#line-fixture svg')].find(svg=>svg.getAttribute('width')==='560'&&svg.querySelector('path[stroke-linecap="round"]'));if(sweep)break;await new Promise(requestAnimationFrame)}if(!sweep)throw Error('No loading sweep');if(document.visibilityState!=='visible'||!document.hasFocus())throw Error('Owned visible/focused page required');const read=()=>({line:sweep.querySelector('path[stroke-linecap="round"]').getAttribute('d'),box:sweep.getBoundingClientRect().toJSON(),mask:sweep.querySelector('g[mask]')?.getAttribute('mask')??null,cycles:document.querySelector('#line-fixture [data-bkm-kit]').presentation?.state.sweepCycles});const before=read();if(!matchMedia('(prefers-reduced-motion: reduce)').matches){const band=sweep.querySelector('mask rect');await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('No real sweep iteration')),3500);band.addEventListener('animationiteration',()=>{clearTimeout(timeout);requestAnimationFrame(()=>requestAnimationFrame(resolve))},{once:true})})}return {visible:document.visibilityState,focused:document.hasFocus(),pulseCycles:Number(document.documentElement.dataset.pulseCycles??'0'),reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,before,after:read()}})()`,
        ),
      )
      assert.equal(state.reduced, reduced)
      assert.equal(state.pulseCycles, 0)
      if (reduced) assert.equal(state.after.mask, null)
      else {
        assert.notEqual(state.before.line, state.after.line)
        if (side === 'native') assert(state.after.cycles['line:revenue'] >= 1)
      }
      const name = reduced ? 'reduced' : 'normal'
      await browser(session, 'screenshot', path.join(output, `${name}.${side}.png`))
      const svg = JSON.parse(
        await browser(
          session,
          'eval',
          `(()=>{const svg=document.querySelector('#line-fixture svg.ts-chart');return {box:svg.getBoundingClientRect().toJSON(),svgNodes:svg.querySelectorAll('path,rect,circle').length}})()`,
        ),
      )
      results.push({ side, reduced, ...state, svg })
      await fs.writeFile(path.join(output, 'states.json'), JSON.stringify(results, null, 2) + '\n')
      await browser(session, 'find', 'role', 'button', 'click', '--name', 'Sweep style')
      await browser(session, 'eval', 'new Promise(requestAnimationFrame)')
      const remaining = Number(
        await browser(
          session,
          'eval',
          `document.querySelectorAll('#line-fixture mask[id*="line-sweep"]').length`,
        ),
      )
      assert.equal(remaining, 0)
      await verifyBrowserErrors(session, path.join(output, `${name}-${side}-errors.json`))
    } finally {
      await browser(session, 'close')
    }
  }
}
const reduced = results.filter((result) => result.reduced)
assert.equal(reduced[0].after.line, reduced[1].after.line)
for (const name of ['reduced']) {
  await fs.writeFile(
    path.join(output, `${name}.capture.json`),
    JSON.stringify(
      Object.fromEntries(
        results.filter((result) => result.reduced).map((result) => [result.side, result.svg]),
      ),
      null,
      2,
    ) + '\n',
  )
}
await fs.writeFile(
  path.join(output, 'result.json'),
  JSON.stringify({ pass: true, cases: results.length, reducedGeometryEqual: true }, null, 2) + '\n',
)
