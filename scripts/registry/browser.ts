import path from 'node:path'
import { Schema } from 'effect'
import { root } from './config.ts'

const BrowserErrors = Schema.Struct({
  success: Schema.Boolean,
  data: Schema.Struct({ errors: Schema.Array(Schema.Unknown) }),
})

export const verifyBrowser = async (url: string) => {
  const session = `visuals-registry-${process.pid}`
  const executable = path.join(root, 'node_modules/.bin/agent-browser')
  const command = async (arguments_: readonly string[], capture = false) => {
    const child = Bun.spawn([executable, '--session', session, ...arguments_], {
      cwd: root,
      stdout: capture ? 'pipe' : 'inherit',
      stderr: 'inherit',
    })
    const text = capture ? await new Response(child.stdout).text() : ''
    const code = await child.exited
    if (code !== 0) throw new Error(`Browser check failed: ${arguments_.join(' ')}`)
    return text
  }
  try {
    await command(['open', url])
    await command(['wait', '--text', 'Gauge 60'])
    await command(['click', '[data-accordion-trigger=one]'])
    await command([
      'wait',
      '--fn',
      "document.querySelector('[data-accordion-trigger=one]')?.getAttribute('aria-expanded')==='true'",
    ])
    await command(['focus', '[data-accordion-trigger=one]'])
    await command(['press', 'Tab'])
    await command(['press', 'Enter'])
    await command(['wait', '--text', 'selected two'])
    await command(['find', 'role', 'button', 'click', '--name', 'Increase gauge'])
    await command(['wait', '--text', 'Gauge 70'])
    await command(['click', '[data-accordion-trigger=one]'])
    await command(['wait', '--text', 'selected one'])
    await command(['find', 'role', 'button', 'click', '--name', 'Open second through Binding'])
    await command([
      'wait',
      '--fn',
      "document.querySelector('[data-accordion-trigger=two]')?.getAttribute('aria-expanded')==='true'",
    ])
    await command([
      'wait',
      '--fn',
      "typeof document.startViewTransition==='function' && [...document.querySelectorAll('[data-ramka-trigger] img')].every(image=>image.complete && image.naturalWidth>0)",
    ])
    await command(['find', 'role', 'button', 'click', '--name', 'Open installed image 1'])
    await command([
      'wait',
      '--fn',
      "document.documentElement.hasAttribute('data-ramka-view-transition') && document.getAnimations().some(animation=>animation.effect?.pseudoElement?.startsWith('::view-transition'))",
    ])
    await command([
      'wait',
      '--fn',
      "document.querySelector('[data-ramka-content]')?.hasAttribute('open')===true",
    ])
    await command([
      'wait',
      '--fn',
      "!document.documentElement.hasAttribute('data-ramka-view-transition') && document.querySelector('[data-ramka-content]')?.getAttribute('aria-hidden')!=='true' && !document.querySelector('[data-ramka-content]')?.hasAttribute('inert')",
    ])
    await command(['find', 'role', 'button', 'click', '--name', 'Next', '--exact'])
    await command([
      'wait',
      '--fn',
      "document.querySelector('[data-ramka-content] [data-ramka-caption]')?.textContent==='Second installed image'",
    ])
    await command(['press', 'Escape'])
    await command(['wait', '--fn', "document.querySelector('[data-ramka-content][open]')===null"])
    await command([
      'wait',
      '--fn',
      "!document.documentElement.hasAttribute('data-ramka-view-transition')",
    ])
    await command(['screenshot', path.join(root, '.verification/consumer.png')])
    await command(['find', 'role', 'button', 'click', '--name', 'Unmount components'])
    await command([
      'wait',
      '--fn',
      "document.querySelectorAll('svg.ts-chart').length===0 && document.querySelectorAll('[data-accordion-trigger]').length===0 && document.getAnimations().length===0",
    ])
    await command(['find', 'role', 'button', 'click', '--name', 'Remount components'])
    await command([
      'wait',
      '--fn',
      "document.querySelectorAll('svg.ts-chart').length===1 && document.querySelectorAll('[data-accordion-trigger]').length===2",
    ])
    const errors = await command(['errors', '--json'], true)
    const result = Schema.decodeUnknownSync(BrowserErrors)(JSON.parse(errors))
    if (!result.success || result.data.errors.length > 0)
      throw new Error(`Browser reported errors: ${errors}`)
    return {
      ramkaNativeViewTransition: true,
      ramkaOpenNavigateClose: true,
      pointerActivation: true,
      keyboardActivation: true,
      bindingCommands: true,
      unmountCleanup: true,
      remount: true,
      errors: [],
    }
  } finally {
    await command(['close'])
  }
}
