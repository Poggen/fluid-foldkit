import { verifyBrowserErrors } from '../../../../scripts/browser-errors.mjs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const run = promisify(execFile)
const output = process.argv[2]
if (!output) throw new Error('Usage: node cartesian-behavior.mjs <receipt directory>')
await fs.mkdir(output, { recursive: true })
const commands = []
const states = []
const session = 'charts-cartesian'
async function browser(args) {
  const result = await run('agent-browser', ['--session', session, ...args], {
    maxBuffer: 2_000_000,
  })
  commands.push({ args, ...result })
  await fs.writeFile(path.join(output, 'commands.json'), JSON.stringify(commands, null, 2) + '\n')
  return result.stdout
}
async function observe(step, expected) {
  const state = JSON.parse(
    await browser([
      'eval',
      `(async()=>{if(document.visibilityState!=='visible')throw Error('Capture requires visible owned tab');for(let i=0;i<8;i++)await new Promise(requestAnimationFrame);return{status:document.querySelector('#status').textContent,visibility:document.visibilityState,active:document.activeElement.tagName,svg:document.querySelectorAll('svg.ts-chart').length,focus:[...document.querySelectorAll('g[data-ts-key^="default-focus:"] circle')].filter(n=>getComputedStyle(n).visibility==='visible'&&getComputedStyle(n).display!=='none').map(n=>({x:Number(n.getAttribute('cx')),y:Number(n.getAttribute('cy'))}))}})()`,
    ]),
  )
  states.push({ step, ...state })
  await fs.writeFile(path.join(output, 'states.json'), JSON.stringify(states, null, 2) + '\n')
  if (state.status !== expected || state.visibility !== 'visible' || state.svg !== 1)
    throw Error(`${step}: ${JSON.stringify(state)}`)
  return state
}
const tabs = await browser(['tab', 'list'])
const taskTab = tabs
  .split('\n')
  .find((line) => line.includes('http://127.0.0.1:5242/cartesian.html'))
  ?.match(/\[(t[0-9]+)\]/)?.[1]
if (taskTab === undefined) throw new Error('Open the owned Cartesian fixture before this check')
await browser(['tab', taskTab])
await browser(['find', 'role', 'button', 'click', '--name', 'Reset data'])
await browser(['find', 'role', 'button', 'click', '--name', 'Clear focus'])
await observe('initial', 'Rows 3; focused none')
await browser(['find', 'role', 'button', 'click', '--name', 'Focus last'])
await observe('public-focus', 'Rows 3; focused 2')
await browser(['find', 'role', 'button', 'click', '--name', 'Shrink data'])
await observe('shrunk', 'Rows 1; focused 0')
await browser(['find', 'role', 'button', 'click', '--name', 'Empty data'])
await observe('empty', 'Rows 0; focused none')
await browser(['find', 'role', 'button', 'click', '--name', 'Reset data'])
await browser(['focus', 'svg.ts-chart'])
await browser(['press', 'End'])
await observe('keyboard-end', 'Rows 3; focused 2')
await browser(['press', 'ArrowLeft'])
const left = await observe('keyboard-left', 'Rows 3; focused 1')
if (
  left.active !== 'svg' ||
  left.focus.length !== 1 ||
  left.focus[0].x !== 320 ||
  left.focus[0].y !== 70
)
  throw Error(`Keyboard focus did not paint the selected observation: ${JSON.stringify(left)}`)
await browser(['press', 'Escape'])
await observe('keyboard-clear', 'Rows 3; focused none')
const point = JSON.parse(
  await browser([
    'eval',
    `(()=>{const box=document.querySelector('svg.ts-chart').getBoundingClientRect();return{x:box.left+box.width/2,y:box.top+box.height*70/320}})()`,
  ]),
)
await browser(['mouse', 'move', String(Math.round(point.x)), String(Math.round(point.y))])
await observe('pointer-focus', 'Rows 3; focused 1')
await browser(['mouse', 'move', '5', '5'])
await observe('pointer-leave', 'Rows 3; focused none')
await browser(['screenshot', path.join(output, 'cartesian.png')])
await verifyBrowserErrors(session, path.join(output, 'errors.json'))
console.log(
  JSON.stringify({
    steps: states.length,
    scope: 'Native typed orchestration contract; not source family pixel or motion qualification',
  }),
)
