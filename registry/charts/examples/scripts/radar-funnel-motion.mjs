import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs/promises'
import path from 'node:path'

const run = promisify(execFile)
const output = process.argv[2]
if (!output || !path.isAbsolute(output)) throw new Error('Absolute observation directory required')
await fs.mkdir(output, { recursive: true })
const probe = await fs.readFile(new URL('./radar-funnel-motion-init.js', import.meta.url), 'utf8')
const session = 'charts-radar-current'
const modes =
  process.argv[3] === 'normal' ? [false] : process.argv[3] === 'reduced' ? [true] : [false, true]
const browser = async (...args) =>
  (
    await run('agent-browser', ['--session', session, ...args], {
      timeout: 15000,
      maxBuffer: 20_000_000,
    })
  ).stdout

for (const [side, port] of [
  ['original', 5251],
  ['native', 5252],
]) {
  for (const reduced of modes) {
    const key = `${side}-${reduced ? 'reduced' : 'normal'}-${Date.now()}`
    const base = `http://127.0.0.1:${port}/radar-funnel.html?implementation=original&${process.argv[4] ?? ''}`
    let recording = false
    try {
      await browser('open', `${base}&motion_run=prewarm-${key}`)
      await browser('set', 'viewport', '1100', '900')
      await browser(
        'record',
        'start',
        path.join(output, `${key}.webm`),
        `${base}&motion_run=${key}`,
      )
      recording = true
      await browser('set', 'viewport', '1100', '900')
      await browser('set', 'media', 'light', ...(reduced ? ['reduced-motion'] : []))
      const restore = process.argv[5] === 'restore'
      if (restore) {
        await browser(
          'wait',
          '--fn',
          'Number(document.querySelector("#radar-fixture svg circle")?.getAttribute("cy")) === -80',
        )
      }
      await browser(
        'find',
        'role',
        'button',
        'click',
        '--name',
        restore ? 'Empty' : 'Toggle mount',
        '--exact',
      )
      await browser('eval', probe)
      if (process.argv[5] === 'layout') {
        await browser(
          'eval',
          await fs.readFile(new URL('./funnel-layout-motion-init.js', import.meta.url), 'utf8'),
        )
      }
      await browser(
        'find',
        'role',
        'button',
        'click',
        '--name',
        restore ? 'Restore' : 'Toggle mount',
        '--exact',
      )
      const trace = await browser(
        'eval',
        `Promise.race([new Promise(resolve=>{const read=()=>{if(!window.polarMotionTrace)throw new Error('Missing post-record probe');if(window.polarMotionTrace.done)resolve({trace:window.polarMotionTrace,layout:window.funnelLayoutTrace,url:location.href,title:document.title,viewport:[innerWidth,innerHeight],reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,fonts:document.fonts.status,resources:performance.getEntriesByType('resource').map(r=>r.name)});else requestAnimationFrame(read)};read()}),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Incomplete motion trace')),6000))])`,
      )
      await fs.writeFile(path.join(output, `${key}.json`), trace)
    } catch (error) {
      await fs.writeFile(path.join(output, `${key}-invalid.txt`), String(error))
      throw error
    } finally {
      try {
        if (process.argv[5] === 'layout')
          await browser('eval', 'window.cleanFunnelLayout?.(); true')
      } finally {
        try {
          if (recording) await browser('record', 'stop')
        } finally {
          await browser('close')
        }
      }
    }
  }
}
