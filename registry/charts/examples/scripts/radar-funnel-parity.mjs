import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs/promises'
import path from 'node:path'
const run = promisify(execFile),
  output = process.argv[2]
if (!output) throw Error('Absolute receipt output required')
await fs.mkdir(output, { recursive: true })
const captures = {},
  commands = []
const browser = async (session, ...args) => {
  const result = await run('agent-browser', ['--session', session, ...args], {
    maxBuffer: 5_000_000,
  })
  commands.push({ session, args, ...result })
  await fs.writeFile(path.join(output, 'commands.json'), JSON.stringify(commands, null, 2))
  return result.stdout
}
for (const [side, port] of [
  ['baseline', 5241],
  ['native', 5242],
]) {
  const session = side === 'baseline' ? 'radar-funnel-source' : 'radar-funnel-native'
  await browser(session, 'open', `http://127.0.0.1:${port}/radar-funnel.html`)
  await browser(session, 'set', 'viewport', '1280', '1000', '1')
  await browser(session, 'wait', '#funnel-fixture .bkm-funnel path')
  const capture = async (name) => {
    await browser(session, 'mouse', 'move', '5', '5')
    await browser(
      session,
      'eval',
      `(async()=>{await document.fonts.ready;let previous='',stable=0;for(let i=0;i<600;i++){await new Promise(requestAnimationFrame);const arcs=[...document.querySelectorAll('#funnel-fixture .bkm-funnel path')],signature=arcs.map(p=>p.getAttribute('d')).join('|'),moving=[...document.getAnimations(),...[...document.querySelectorAll('*')].flatMap(e=>e.shadowRoot?.getAnimations()??[])].some(a=>a.playState==='running'&&a.effect?.getComputedTiming().iterations!==Infinity)||[...document.querySelectorAll('[data-ts-motion-state]')].some(e=>e.getAttribute('data-ts-motion-state')==='running');if(!moving&&arcs.every(p=>p.getAttribute('d'))&&signature===previous)stable++;else stable=0;if(stable>=20)return;previous=signature}throw Error('Polar renderer did not settle')})()`,
    )
    const filename = path.join(output, `${name}.${side}.png`)
    await browser(session, 'screenshot', filename)
    for (const family of ['radar', 'funnel']) {
      const state = JSON.parse(
        await browser(
          session,
          'eval',
          `(()=>{const root=document.querySelector('#${family}-fixture');return{box:root.getBoundingClientRect().toJSON(),svgNodes:root.querySelectorAll('svg path').length,paths:[...root.querySelectorAll('svg path')].map(p=>p.getAttribute('d')),hover:root.querySelector('[data-bkm-chart],[data-bkm-radar]')?.dataset.hover,text:root.textContent,state:document.querySelector('#state')?.textContent}})()`,
        ),
      )
      captures[`${name}-${family}`] ??= {}
      captures[`${name}-${family}`][side] = state
      await fs.copyFile(filename, path.join(output, `${name}-${family}.${side}.png`))
      await fs.writeFile(
        path.join(output, `${name}-${family}.capture.json`),
        JSON.stringify(captures[`${name}-${family}`], null, 2),
      )
    }
  }
  await capture('default')
  await browser(session, 'find', 'role', 'button', 'click', '--name', 'Change options')
  await capture('changed')
  await browser(session, 'find', 'role', 'button', 'click', '--name', 'Empty', '--exact')
  await capture('empty')
  await browser(session, 'find', 'role', 'button', 'click', '--name', 'Restore', '--exact')
  await browser(session, 'find', 'role', 'button', 'click', '--name', 'Change options')
  await capture('restored')
  for (const family of ['radar', 'funnel']) {
    await browser(session, 'focus', `#${family}-fixture [role=img][tabindex="0"]`)
    await browser(session, 'press', 'End')
    const state = JSON.parse(
      await browser(
        session,
        'eval',
        `new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve({hover:document.querySelector('#${family}-fixture [data-bkm-chart],[data-bkm-radar]')?.dataset.hover,state:document.querySelector('#state')?.textContent}))))`,
      ),
    )
    await fs.writeFile(
      path.join(output, `${side}-${family}-keyboard.json`),
      JSON.stringify(state, null, 2),
    )
  }
  await browser(session, 'find', 'role', 'button', 'click', '--name', 'Toggle mount')
  const unmounted = await browser(
    session,
    'eval',
    `new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve({paths:document.querySelectorAll('#radar-fixture path,#funnel-fixture path').length,animations:document.getAnimations().filter(a=>a.playState==='running').length}))))`,
  )
  await fs.writeFile(path.join(output, `${side}-unmounted.json`), unmounted)
  await browser(session, 'find', 'role', 'button', 'click', '--name', 'Toggle mount')
  await capture('remounted')
}
