import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs/promises'
import path from 'node:path'
const run = promisify(execFile),
  output = process.argv[2],
  commands = []
await fs.mkdir(output, { recursive: true })
const browser = async (session, ...args) => {
  const r = await run('agent-browser', ['--session', session, ...args], { maxBuffer: 4_000_000 })
  commands.push({ session, args, ...r })
  await fs.writeFile(path.join(output, 'commands.json'), JSON.stringify(commands, null, 2))
  return r.stdout
}
const read = `new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve([...document.querySelectorAll('[data-bkm-chart=pie],[data-bkm-chart=ring]')].map(e=>({family:e.dataset.bkmChart,hover:e.dataset.hover??null,box:e.getBoundingClientRect().toJSON(),paths:e.querySelectorAll('path').length,centers:[...e.querySelectorAll('[data-slot=center-stat]')].map(c=>c.textContent),pending:window.polarFrames?.sample().pending}))))))`
for (const [side, port] of [
  ['baseline', 5241],
  ['native', 5242],
]) {
  const session = side === 'baseline' ? 'pie-ring-source' : 'pie-ring-native',
    records = {}
  await browser(session, 'set', 'viewport', '1280', '1000', '1')
  await browser(session, 'open', `http://127.0.0.1:${port}/pie-ring.html`)
  await browser(session, 'wait', '#ring-fixture .bkm-rg-progress path')
  for (const family of ['pie', 'ring']) {
    await browser(session, 'focus', `#${family}-fixture [role=img][tabindex="0"]`)
    await browser(session, 'press', 'End')
    records[family + '-end'] = JSON.parse(await browser(session, 'eval', read))
    const box = records[family + '-end'].find((r) => r.family === family).box
    await browser(session, 'mouse', 'move', String(box.x + 180), String(box.y + 75))
    await browser(session, 'mouse', 'move', '5', '5')
    records[family + '-hold-restored'] = JSON.parse(await browser(session, 'eval', read))
  }
  await browser(session, 'find', 'role', 'button', 'click', '--name', 'Toggle mount')
  records.unmounted = JSON.parse(
    await browser(
      session,
      'eval',
      `new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve({paths:document.querySelectorAll('#pie-fixture path,#ring-fixture path').length,animations:document.getAnimations().filter(a=>a.playState==='running').length,pending:window.polarFrames?.sample().pending}))))`,
    ),
  )
  for (const flag of ['controlled', 'scrub', 'fluid']) {
    await browser(session, 'open', `http://127.0.0.1:${port}/pie-ring.html?${flag}`)
    await browser(session, 'wait', '#ring-fixture .bkm-rg-progress path')
    await browser(session, 'mouse', 'move', '200', '150')
    records[flag] = JSON.parse(await browser(session, 'eval', read))
    if (flag === 'fluid') {
      for (const width of [200, 55, 400]) {
        await browser(session, 'set', 'viewport', String(width), '1000', '1')
        await browser(
          session,
          'eval',
          `new Promise(resolve=>{let last='',stable=0;const step=()=>{const now=[...document.querySelectorAll('[data-bkm-chart=pie],[data-bkm-chart=ring]')].map(e=>e.getBoundingClientRect().width).join(',');stable=now===last?stable+1:0;last=now;if(stable>=5)resolve();else requestAnimationFrame(step)};step()})`,
        )
        records['resize-' + width] = JSON.parse(await browser(session, 'eval', read))
      }
    }
  }
  await fs.writeFile(path.join(output, `${side}.json`), JSON.stringify(records, null, 2))
}
