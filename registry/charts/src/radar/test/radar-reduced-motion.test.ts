// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom
import { afterEach, expect, test, vi } from 'vitest'
import { RadarArea, RadarLabels } from '..'
import { RadarHost } from '../host'
import { fontTestEnvironment } from '../../../test/font-test-environment'

const cleanups: Array<() => void> = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup()
})

const mount = (reduced: boolean) => {
  const environment = fontTestEnvironment()
  cleanups.push(environment.destroy)
  const preference = new EventTarget()
  const media = {
    media: '(prefers-reduced-motion: reduce)',
    get matches() {
      return reduced
    },
    onchange: null,
    addEventListener: preference.addEventListener.bind(preference),
    removeEventListener: preference.removeEventListener.bind(preference),
    dispatchEvent: preference.dispatchEvent.bind(preference),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }
  // oxlint-disable-next-line landmines-testing/no-test-doubles -- Controlled media preference transition; native Radar initial/live reduced-motion cases verify the actual browser path.
  vi.spyOn(window, 'matchMedia').mockReturnValue(media)
  const data = [{ label: 'Series', values: { a: 50, b: 50, c: 50 } }]
  const host = new RadarHost(
    environment.container,
    'reduced-radar',
    {
      data,
      size: 320,
      margin: 60,
      metrics: [
        { key: 'a', label: 'Alpha' },
        { key: 'b', label: 'Beta' },
        { key: 'c', label: 'Gamma' },
      ],
      children: [RadarArea({ index: 0 }), RadarLabels()],
    },
    data,
    null,
    () => {},
    () => 0,
    () => {},
  )
  cleanups.push(() => host.destroy())
  return {
    root: environment.container,
    reduce() {
      reduced = true
      preference.dispatchEvent(new Event('change'))
    },
  }
}

const expectFinalGeometry = (root: HTMLElement) => {
  const area = root.querySelector('svg path')
  expect(area?.getAttribute('d')).toContain('-50')
  expect(area?.hasAttribute('data-complete')).toBe(true)
  expect(area?.parentElement?.hasAttribute('data-static')).toBe(true)
  expect(root.querySelector('[data-bkm-enter]')).toBeNull()
  const label = [...root.querySelectorAll('text')].find((node) => node.textContent === 'Alpha')
  expect(label?.parentElement?.style.transform).toContain('-')
}

test('draws final radar geometry immediately for an initial reduced-motion preference', () => {
  expectFinalGeometry(mount(true).root)
})

test('settles an in-flight radar entrance when reduced motion becomes enabled', () => {
  const mounted = mount(false)
  expect(mounted.root.querySelector('[data-bkm-enter]')).not.toBeNull()
  const area = mounted.root.querySelector('svg path')
  expect(area?.getAttribute('d')).not.toContain('-50')
  mounted.reduce()
  expectFinalGeometry(mounted.root)
})
