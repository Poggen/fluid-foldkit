import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { verifyBrowserErrors } from '../../../../scripts/browser-errors.mjs'

const output = process.argv[2]
const nativeUrl = process.env.CHARTS_NATIVE_URL
const serverUrl = process.env.CHARTS_NATIVE_SSR_URL
if (!output || !nativeUrl || !serverUrl)
  throw Error('Output directory, CHARTS_NATIVE_URL and CHARTS_NATIVE_SSR_URL are required')
const run = promisify(execFile)
const session = process.env.CHARTS_BROWSER_SESSION ?? 'chart-family-root-75'
const states = []
const commands = []
await fs.mkdir(output, { recursive: true })
const browser = async (...args) => {
  const result = await run('agent-browser', ['--session', session, ...args], {
    maxBuffer: 2_000_000,
  })
  commands.push({ args, ...result })
  await fs.writeFile(path.join(output, 'commands.json'), JSON.stringify(commands, null, 2))
  return result.stdout
}
const focusedTooltip = `(() => {
  const root = document.querySelector('[data-bkm-native-chart]');
  const svg = root?.querySelector('svg.ts-chart');
  const surface = svg?.closest('.ts-chart-surface');
  const shell = root?.querySelector('.ts-chart-tooltip');
  const body = shell?.querySelector('.ts-chart-tooltip__body');
  const focusedIndex = document.querySelector('[data-fixture-state]')?.textContent?.split(';')[2];
  const attached = !!(root && svg && surface && shell && body && shell.isConnected && body.isConnected && shell.parentElement === surface && body.parentElement === shell);
  const shellStyle = shell && getComputedStyle(shell);
  const bodyStyle = body && getComputedStyle(body);
  const box = body?.getBoundingClientRect();
  const visible = attached && !shell.hidden && shellStyle.display !== 'none' && shellStyle.visibility === 'visible' && bodyStyle.visibility === 'visible' && Number(bodyStyle.opacity) > 0 && box.width > 0 && box.height > 0;
  const text = body?.textContent?.trim() ?? '';
  const cells = body ? [...body.querySelectorAll('span')].filter(node => node.children.length === 0).map(node => node.textContent.trim()) : [];
  return { focusedIndex, attached, visible, text, cells };
})()`
const waitFocused = (label, value) =>
  browser(
    'eval',
    `(async()=>{
  let last;
  for(let i=0;i<360;i++) {
    last = ${focusedTooltip};
    if(last.focusedIndex === '1' && last.attached && last.visible && last.text.length > 0 && last.cells.includes(${JSON.stringify(label)}) && last.cells.includes(${JSON.stringify(value)})) return last;
    await new Promise(requestAnimationFrame);
  }
  throw Error('Focused datum and physical tooltip did not settle: ' + JSON.stringify(last));
})()`,
  )
const assertFocused = (value, label, datum) => {
  assert.equal(value.focusedIndex, '1')
  assert.equal(value.attached, true)
  assert.equal(value.visible, true)
  assert(value.text.length > 0)
  assert(value.cells.includes(label))
  assert(value.cells.includes(datum))
}
const read = () =>
  browser(
    'eval',
    `(()=>{
  const root=document.querySelector('[data-bkm-native-chart]');
  const svg=root?.querySelector('svg.ts-chart');
  if(!root||!svg)throw Error('No mounted chart');
  const css=getComputedStyle(root),box=root.getBoundingClientRect(),paint=svg.getBoundingClientRect();
  const number=name=>parseFloat(css[name])||0;
  const borderX=number('borderLeftWidth')+number('borderRightWidth');
  const borderY=number('borderTopWidth')+number('borderBottomWidth');
  const paddingX=number('paddingLeft')+number('paddingRight');
  const paddingY=number('paddingTop')+number('paddingBottom');
  const identity=window.__rootIdentity;
  const sibling=root.querySelector('[data-root-context]');
  return {root:[box.width,box.height],content:[box.width-borderX-paddingX,box.height-borderY-paddingY],svg:[paint.width,paint.height],offset:[paint.left-box.left,paint.top-box.top],classes:root.className,position:css.position,contextColor:sibling?getComputedStyle(sibling).color:null,patternFill:getComputedStyle(root.querySelector('pattern circle')).fill,background:css.backgroundColor,aria:svg.getAttribute('aria-label'),sameRoot:identity?.root===root,sameSvg:identity?.svg===svg,sameShell:identity?.shell===root.querySelector('.ts-chart-tooltip'),sameBody:identity?.body===root.querySelector('.ts-chart-tooltip__body'),state:document.querySelector('[data-fixture-state]')?.textContent,reserves:root.querySelectorAll('[data-bkm-server-reserve]').length,visible:document.visibilityState,focused:document.hasFocus(),tooltip:${focusedTooltip}};
})()`,
  )
const waitBox = async (width, height) =>
  browser(
    'eval',
    `(async()=>{for(let i=0;i<360;i++){const s=document.querySelector('svg.ts-chart');if(s){const r=s.getBoundingClientRect();if(Math.abs(r.width-${width})<0.01&&Math.abs(r.height-${height})<0.01)return true}await new Promise(requestAnimationFrame)}throw Error('SVG size did not settle to ${width}x${height}')})()`,
  )
const remember = () =>
  browser(
    'eval',
    `(()=>{
  const root=document.querySelector('[data-bkm-native-chart]');
  const svg=root?.querySelector('svg.ts-chart');
  const shell=root?.querySelector('.ts-chart-tooltip');
  const body=shell?.querySelector('.ts-chart-tooltip__body');
  const focus=${focusedTooltip};
  if(!root||!svg||!shell||!body||focus.focusedIndex!=='1'||!focus.attached||!focus.visible||!focus.text)throw Error('Cannot capture an unfocused or missing tooltip baseline');
  window.__rootIdentity={root,svg,shell,body};
  return true;
})()`,
  )
const click = (name) => browser('find', 'role', 'button', 'click', '--name', name, '--exact')
try {
  for (const family of ['line', 'candle']) {
    const familyUrl = new URL(nativeUrl)
    if (family === 'candle') familyUrl.searchParams.set('candle', '1')
    await browser('--headed', 'open', familyUrl.href)
    await browser('set', 'viewport', '1280', '1000', '1')
    await waitBox(640, 320)
    await browser(
      'eval',
      `(async()=>{for(let i=0;i<360&&!document.querySelector('[data-bkm-ready]');i++)await new Promise(requestAnimationFrame);if(!document.querySelector('[data-bkm-ready]'))throw Error('Family never became ready')})()`,
    )
    const expectedLabel = family === 'candle' ? 'close' : 'value'
    const expectedValue = family === 'candle' ? '22' : '20'
    await click('Focus')
    await waitFocused(expectedLabel, expectedValue)
    await remember()
    const initial = JSON.parse(await read())
    assertFocused(initial.tooltip, expectedLabel, expectedValue)
    assert(initial.sameRoot && initial.sameSvg && initial.sameShell && initial.sameBody)
    const retainedState = initial.state.split(';').slice(1)
    for (const { name, root, content, offset } of [
      { name: 'fluid', root: [640, 320], content: [640, 320], offset: [0, 0] },
      { name: 'conflict', root: [480, 240], content: [480, 240], offset: [0, 0] },
      { name: 'restored', root: [640, 320], content: [640, 320], offset: [0, 0] },
      { name: 'string', root: [320, 240], content: [320, 240], offset: [0, 0] },
      { name: 'ratio', root: [480, 480], content: [480, 480], offset: [0, 0] },
      { name: 'border', root: [640, 320], content: [596, 276], offset: [22, 22] },
      { name: 'content', root: [684, 364], content: [640, 320], offset: [22, 22] },
      { name: 'fill', root: [640, 400], content: [640, 400], offset: [0, 0] },
      { name: 'paint', root: [640, 320], content: [640, 320], offset: [0, 0] },
      { name: 'restored', root: [640, 320], content: [640, 320], offset: [0, 0] },
    ]) {
      await click(name)
      await waitBox(...content)
      await waitFocused(expectedLabel, expectedValue)
      const value = JSON.parse(await read())
      assert.deepEqual(value.root, root)
      assert.deepEqual(value.content, content)
      assert.deepEqual(value.svg, content)
      assert.deepEqual(value.offset, offset)
      assert(value.sameRoot && value.sameSvg && value.sameShell && value.sameBody)
      assertFocused(value.tooltip, expectedLabel, expectedValue)
      assert.equal(value.visible, 'visible')
      assert.equal(value.focused, true)
      assert.deepEqual(value.state.split(';').slice(1), retainedState)
      if (name === 'conflict') {
        assert(value.classes.split(' ').includes('static'))
        assert(!value.classes.split(' ').includes('relative'))
        assert(!value.classes.split(' ').includes('w-full'))
        assert.equal(value.position, 'static')
        assert.equal(value.contextColor, 'rgb(1, 2, 3)')
        assert.equal(value.patternFill, 'rgb(1, 2, 3)')
      }
      if (name === 'paint') assert.equal(value.background, 'rgb(240, 245, 250)')
      if (name === 'restored') {
        assert.equal(value.background, 'rgba(0, 0, 0, 0)')
        assert.equal(value.position, 'relative')
      }
      states.push({ family, name, ...value })
    }
    await click('Toggle')
    await browser(
      'eval',
      `(async()=>{for(let i=0;i<120&&document.querySelector('svg.ts-chart');i++)await new Promise(requestAnimationFrame);if(document.querySelector('svg.ts-chart'))throw Error('Renderer survived unmount')})()`,
    )
    await click('Toggle')
    await waitBox(640, 320)
    await verifyBrowserErrors(session, path.join(output, `${family}-errors.json`))
  }
  const low = new URL(nativeUrl)
  low.searchParams.set('lowLevel', '1')
  await browser('open', low.href)
  await waitBox(640, 320)
  await browser(
    'eval',
    `(()=>{const svg=document.querySelector('svg.ts-chart');window.__lowSvg=svg;return true})()`,
  )
  await click('conflict')
  await waitBox(480, 240)
  const lowResult = JSON.parse(
    await browser(
      'eval',
      `(()=>{const svg=document.querySelector('svg.ts-chart');return {same:svg===window.__lowSvg,aria:svg.getAttribute('aria-label')}})()`,
    ),
  )
  assert.deepEqual(lowResult, { same: true, aria: 'Changed chart' })
  await verifyBrowserErrors(session, path.join(output, 'low-level-errors.json'))
  await browser('open', serverUrl)
  await waitBox(640, 320)
  const handoff = JSON.parse(await read())
  assert.equal(handoff.reserves, 0)
  assert.deepEqual(handoff.root, [640, 320])
  await verifyBrowserErrors(session, path.join(output, 'server-errors.json'))
  await browser('screenshot', path.join(output, 'family-root.png'))
  await fs.writeFile(
    path.join(output, 'result.json'),
    JSON.stringify({ status: 'PASS', nativeUrl, serverUrl, states, lowResult, handoff }, null, 2),
  )
} finally {
  await browser('close')
}
