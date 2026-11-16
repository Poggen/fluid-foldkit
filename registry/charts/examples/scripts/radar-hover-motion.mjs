import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs/promises'
import path from 'node:path'

const run = promisify(execFile)
const output = process.argv[2]
if (!output || !path.isAbsolute(output)) throw new Error('Absolute observation directory required')
await fs.mkdir(output, { recursive: true })
const mode = process.argv[3] ?? 'settled'
if (!['settled', 'reverse', 'enter', 'pointer'].includes(mode))
  throw new Error('Unknown Radar case')
const reduced = process.argv[4] === 'reduced'
const warm = process.argv[5] === 'warm'
const session = 'charts-radar-hover'
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
  const key = `${side}-${Date.now()}`
  const url = `http://127.0.0.1:${port}/radar-funnel.html?implementation=original&hover_run=${key}`
  let recording = false
  try {
    await browser('open', url)
    await browser('set', 'viewport', '1100', '900')
    await browser('record', 'start', path.join(output, `${key}.webm`), url)
    recording = true
    await browser('set', 'viewport', '1100', '900')
    await browser('set', 'media', 'light', ...(reduced ? ['reduced-motion'] : []))
    if (reduced) await browser('reload')
    if (mode === 'enter') {
      await browser('find', 'role', 'button', 'click', '--name', 'Toggle mount', '--exact')
    } else {
      await browser(
        'wait',
        '--fn',
        `(() => {
        const areas=[...document.querySelectorAll('#radar-fixture svg g')].filter(g=>g.style.cursor==='pointer');
        return areas.length===2 && Number(areas[0].querySelector('circle')?.getAttribute('cy'))===-80 && Number(areas[1].querySelector('circle')?.getAttribute('cy'))===-50;
      })()`,
      )
    }
    if (warm) {
      const coordinates = JSON.parse(
        await browser(
          'eval',
          `(() => {
        const areas=[...document.querySelectorAll('#radar-fixture svg g')].filter(g=>g.style.cursor==='pointer');
        const rect=areas[1].querySelector('circle').getBoundingClientRect();return {x:Math.round(rect.x+rect.width/2),y:Math.round(rect.y+rect.height/2)};
      })()`,
        ),
      )
      await browser('mouse', 'move', String(coordinates.x), String(coordinates.y))
      await browser('mouse', 'move', '600', '600')
      await browser(
        'wait',
        '--fn',
        `(() => {
        const areas=[...document.querySelectorAll('#radar-fixture svg g')].filter(g=>g.style.cursor==='pointer');
        return areas.length===2 && areas.every(g=>getComputedStyle(g).opacity==='1' && Math.abs(new DOMMatrix(getComputedStyle(g).transform).a-1)<0.0001);
      })()`,
      )
    }
    await browser(
      'eval',
      `(() => {
      const trace = {frames:[],events:[],done:false}; window.radarHoverTrace=trace;
      for(const type of ['pointermove','pointerdown','pointerup'])document.addEventListener(type,e=>trace.events.push({type,t:e.timeStamp,trusted:e.isTrusted,x:e.clientX,y:e.clientY}),true);
      let start;
      const sample=t=>{start??=t;const groups=[...document.querySelectorAll('#radar-fixture svg g')].filter(g=>g.style.cursor==='pointer').map(g=>{
        const style=getComputedStyle(g),box=g.getBBox(),matrix=g.getScreenCTM(),circle=g.querySelector('circle'),point=circle?.getBoundingClientRect();
        const path=g.querySelector('path'),paint=path?getComputedStyle(path):null;
        return {path:path?{d:path.getAttribute('d'),fillOpacity:paint.fillOpacity,strokeWidth:paint.strokeWidth,filter:paint.filter}:null,cy:circle?.getAttribute('cy'),transform:style.transform,origin:style.transformOrigin,opacity:style.opacity,bbox:[box.x,box.y,box.width,box.height],matrix:matrix?[matrix.a,matrix.b,matrix.c,matrix.d,matrix.e,matrix.f]:null,point:point?[point.x,point.y,point.width,point.height]:null,r:circle?.getAttribute('r')};
      });trace.frames.push({t,hidden:document.hidden,groups});if(t-start<2300)requestAnimationFrame(sample);else trace.done=true};requestAnimationFrame(sample);
    })()`,
    )
    if (mode === 'enter') {
      await browser('find', 'role', 'button', 'click', '--name', 'Toggle mount', '--exact')
      await browser(
        'wait',
        '--fn',
        '(() => {const y=Number(document.querySelector("#radar-fixture svg circle")?.getAttribute("cy"));return y < -1 && y > -15})()',
      )
    }
    if (mode === 'pointer') {
      const coordinates = JSON.parse(
        await browser(
          'eval',
          `(() => {
        const areas=[...document.querySelectorAll('#radar-fixture svg g')].filter(g=>g.style.cursor==='pointer');
        const rect=areas[1].querySelector('circle').getBoundingClientRect();return {x:Math.round(rect.x+rect.width/2),y:Math.round(rect.y+rect.height/2)};
      })()`,
        ),
      )
      await browser('mouse', 'move', String(coordinates.x), String(coordinates.y))
      await browser('mouse', 'move', '600', '600')
      await browser('mouse', 'move', String(coordinates.x), String(coordinates.y))
    } else {
      await browser('find', 'role', 'button', 'click', '--name', 'Focus second', '--exact')
    }
    if (mode === 'reverse') {
      await browser('find', 'role', 'button', 'click', '--name', 'Focus first', '--exact')
      await browser('find', 'role', 'button', 'click', '--name', 'Clear focus', '--exact')
    }
    await browser('wait', '--fn', 'window.radarHoverTrace?.done === true')
    const trace = await browser(
      'eval',
      '({trace:window.radarHoverTrace,url:location.href,title:document.title,fonts:document.fonts.status,reduced:matchMedia("(prefers-reduced-motion: reduce)").matches,viewport:[innerWidth,innerHeight],resources:performance.getEntriesByType("resource").map(r=>r.name)})',
    )
    await fs.writeFile(path.join(output, `${key}.json`), trace)
    await fs.writeFile(
      path.join(output, `${key}-case.json`),
      JSON.stringify({ mode, reduced, warm }),
    )
    await browser('screenshot', path.join(output, `${key}.png`))
  } catch (error) {
    await fs.writeFile(path.join(output, `${key}-invalid.txt`), String(error))
    throw error
  } finally {
    try {
      if (recording) await browser('record', 'stop')
    } finally {
      await browser('close')
    }
  }
}
