import { verifyBrowserErrors } from '../../../../scripts/browser-errors.mjs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const run = promisify(execFile)
const output = process.argv[2]
if (!output) throw new Error('Usage: node gauge-behavior.mjs <receipt directory>')
await fs.mkdir(output, { recursive: true })
const records = {}
const log = []
async function browser(session, args) {
  const result = await run('agent-browser', ['--session', session, ...args], {
    maxBuffer: 4_000_000,
  })
  log.push({ session, args, stdout: result.stdout, stderr: result.stderr })
  await fs.writeFile(
    path.join(output, 'behavior-commands.json'),
    JSON.stringify(log, null, 2) + '\n',
  )
  return result.stdout
}
const settle = `(async()=>{await document.fonts.ready;for(let i=0;i<8;i++){await new Promise(requestAnimationFrame);const all=[...document.getAnimations(),...[...document.querySelectorAll('*')].flatMap(e=>e.shadowRoot?[...e.shadowRoot.getAnimations()]:[])].filter(a=>a.playState==='running');if(all.length)await Promise.all(all.map(a=>a.finished.catch(()=>{})))}const fixture=document.querySelector('#fixture');const svg=fixture.querySelector('svg.ts-chart');return{box:fixture.getBoundingClientRect().toJSON(),svgNodes:fixture.querySelectorAll('path,rect').length,label:svg?.getAttribute('aria-label'),tabindex:svg?.getAttribute('tabindex'),text:document.querySelector('#status')?.textContent}})()`
for (const [side, port] of [
  ['baseline', 5241],
  ['native', 5242],
]) {
  const session = `charts-behavior-${side}`
  await browser(session, ['set', 'viewport', '1280', '720', '1'])
  await browser(session, ['open', `http://127.0.0.1:${port}/?fixture=arc-gradient`])
  await browser(session, ['wait', '#fixture'])
  const results = []
  results.push({ step: 'initial', state: JSON.parse(await browser(session, ['eval', settle])) })
  await browser(session, ['find', 'role', 'button', 'click', '--name', 'Increase'])
  await browser(session, ['find', 'role', 'button', 'click', '--name', 'Decrease'])
  results.push({
    step: 'interrupted-value-update',
    state: JSON.parse(await browser(session, ['eval', settle])),
  })
  await browser(session, ['find', 'role', 'button', 'click', '--name', 'Increase'])
  results.push({ step: 'increased', state: JSON.parse(await browser(session, ['eval', settle])) })
  await browser(session, [
    'eval',
    `window.__detachedFixture=document.querySelector('#fixture').firstElementChild;window.__mutations=0;window.__watcher=new MutationObserver(list=>window.__mutations+=list.length);window.__watcher.observe(window.__detachedFixture,{subtree:true,childList:true,attributes:true})`,
  ])
  await browser(session, ['find', 'role', 'button', 'click', '--name', 'Unmount'])
  const teardown = JSON.parse(
    await browser(session, [
      'eval',
      `(async()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));window.__mutations=0;for(let i=0;i<8;i++)await new Promise(requestAnimationFrame);const result={nodes:document.querySelector('#fixture').children.length,detachedAnimations:window.__detachedFixture.getAnimations({subtree:true}).length,postReleaseMutations:window.__mutations};window.__watcher.disconnect();return result})()`,
    ]),
  )
  if (
    teardown.nodes !== 0 ||
    teardown.detachedAnimations !== 0 ||
    teardown.postReleaseMutations !== 0
  )
    throw Error(`${side} teardown failed ${JSON.stringify(teardown)}`)
  results.push({ step: 'teardown', state: teardown })
  await browser(session, ['find', 'role', 'button', 'click', '--name', 'Remount'])
  results.push({ step: 'remounted', state: JSON.parse(await browser(session, ['eval', settle])) })
  await verifyBrowserErrors(session, path.join(output, `${side}-arc-gradient-errors.json`))
  await browser(session, ['set', 'viewport', '390', '844', '1'])
  await browser(session, ['open', `http://127.0.0.1:${port}/?fixture=arc-fluid&width=390`])
  await browser(session, ['wait', '#fixture'])
  results.push({
    step: 'resized-fluid',
    state: JSON.parse(await browser(session, ['eval', settle])),
  })
  await verifyBrowserErrors(session, path.join(output, `${side}-arc-fluid-errors.json`))
  await browser(session, ['set', 'media', 'light', 'reduced-motion'])
  await browser(session, ['reload'])
  await browser(session, ['wait', '#fixture'])
  results.push({
    step: 'reduced-motion',
    state: JSON.parse(await browser(session, ['eval', settle])),
  })
  await verifyBrowserErrors(session, path.join(output, `${side}-reduced-errors.json`))
  records[side] = results
  await fs.writeFile(
    path.join(output, 'behavior-results.json'),
    JSON.stringify(records, null, 2) + '\n',
  )
}
console.log(
  JSON.stringify({
    matching: JSON.stringify(records.baseline) === JSON.stringify(records.native),
    steps: records.native.length,
  }),
)
