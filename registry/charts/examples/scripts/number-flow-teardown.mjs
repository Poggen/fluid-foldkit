import { verifyBrowserErrors } from '../../../../scripts/browser-errors.mjs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)
const output = process.argv[2]
if (!output) throw Error('Usage: node number-flow-teardown.mjs <receipt directory>')
await fs.mkdir(output, { recursive: true })
const records = {}
const commands = []
async function browser(args) {
  const result = await run('agent-browser', ['--session', 'charts-number-teardown', ...args], {
    maxBuffer: 4_000_000,
  })
  commands.push({ args, ...result })
  await fs.writeFile(path.join(output, 'commands.json'), JSON.stringify(commands, null, 2) + '\n')
  return result.stdout
}
for (const [side, port] of [
  ['baseline', 5241],
  ['native', 5242],
]) {
  await browser(['open', `http://127.0.0.1:${port}/?fixture=arc`])
  await browser(['wait', '#fixture'])
  await browser([
    'eval',
    `(async()=>{await document.fonts.ready;for(let i=0;i<4;i++){await new Promise(requestAnimationFrame);const a=[...document.getAnimations(),...[...document.querySelectorAll('*')].flatMap(e=>e.shadowRoot?[...e.shadowRoot.getAnimations()]:[])];await Promise.all(a.filter(x=>x.playState==='running').map(x=>x.finished.catch(()=>{})))}return true})()`,
  ])
  records[side] = JSON.parse(
    await browser([
      'eval',
      `(async()=>{const button=(name)=>[...document.querySelectorAll('button')].find(b=>b.textContent===name);button('Change center').click();await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);const node=document.querySelector('number-flow-react,fk-bklit-number');const root=node?.shadowRoot;if(!root)throw Error('Missing native number engine');const animations=root.getAnimations().filter(a=>a.playState==='running');if(!animations.length)throw Error('No in-flight number animation');let mutations=0;const observer=new MutationObserver(list=>mutations+=list.length);observer.observe(root,{attributes:true,childList:true,subtree:true});button('Unmount').click();await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);mutations=0;for(let i=0;i<8;i++)await new Promise(requestAnimationFrame);const result={inFlightBeforeRemoval:animations.length,remainingChildren:document.querySelector('#fixture').children.length,connected:node.isConnected,remainingShadowAnimations:root.getAnimations().filter(a=>a.playState==='running').length,capturedAnimationStates:animations.map(a=>a.playState),postReleaseMutations:mutations,observedFrames:8};observer.disconnect();return result})()`,
    ]),
  )
  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(records, null, 2) + '\n')
  await verifyBrowserErrors('charts-number-teardown', path.join(output, `${side}-errors.json`))
}
console.log(JSON.stringify(records))
if (
  records.native.remainingChildren ||
  records.native.connected ||
  records.native.remainingShadowAnimations ||
  records.native.postReleaseMutations ||
  records.native.capturedAnimationStates.some((state) => state === 'running')
)
  process.exitCode = 1
