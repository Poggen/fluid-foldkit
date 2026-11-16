// @vitest-environment happy-dom -- public renderer font invalidation behavior
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { scaleLinear } from 'd3-scale'
import { text } from '@tanstack/charts'
import type {
  ChartRenderer,
  ChartRendererHostOptions,
  ChartScene,
  ChartSurfaceRenderOptions,
} from '@tanstack/charts'
import { motion } from '@tanstack/charts/motion'
import { mountCartesianRenderer } from '../src/cartesian/font-renderer'
import { pillFontMeasurement } from '../src/cartesian/pill-font-measurement'
import { fontTestEnvironment } from './font-test-environment'

let environment: ReturnType<typeof fontTestEnvironment>

beforeEach(() => {
  environment = fontTestEnvironment()
})

afterEach(() => {
  environment.destroy()
})

const row = { x: 1, y: 2, label: 'Label' }

const unchangedResource = { fontMetricsChanged: () => false }

const setup = (
  resource: { readonly fontMetricsChanged?: (() => boolean) | undefined } = unchangedResource,
  custom = false,
  responsive = false,
) => {
  const delegate = motion<typeof row, number, number>({ initial: false })

  const rendered =
    vi.fn<
      (scene: ChartScene<typeof row, number, number>, options: ChartSurfaceRenderOptions) => void
    >()

  const destroyed = vi.fn<() => void>()

  const renderer: ChartRenderer<typeof row, number, number> = {
    ...delegate,
    mount: (container, requestRender) => {
      const surface = delegate.mount(container, requestRender)

      const { render } = surface
      const { destroy } = surface

      return Object.assign(surface, {
        renderer,
        render: (
          scene: ChartScene<typeof row, number, number>,
          options: ChartSurfaceRenderOptions,
        ) => {
          rendered(scene, options)
          render(scene, options)
        },
        destroy: () => {
          destroyed()
          destroy()
        },
      })
    },
  }

  const measureText = vi.fn(() => ({ x: 0, y: -10, width: 30, height: 12 }))

  let options: ChartRendererHostOptions<typeof row, number, number> = {
    renderer,
    ariaLabel: 'Font fixture',
    width: 400,
    height: 240,
    definition: {
      scales: { x: { scale: scaleLinear() }, y: { scale: scaleLinear() } },
      marks: [text([row], { x: 'x', y: 'y', text: 'label' })],
      pointer: false,
      keyboard: false,
      svgAnimation: { duration: 100 },
    },
  }

  if (custom) {
    options = { ...options, measureText }
  }

  if (responsive) {
    const { width: _width, ...rest } = options
    options = { ...rest, initialWidth: 400 }
  }

  let currentResource = resource

  const replaceResource = (next: typeof resource) => {
    currentResource = next
  }

  const host = mountCartesianRenderer(environment.container, options, () => currentResource)

  return { host, options, rendered, destroyed, measureText, replaceResource }
}

test('unchanged font metrics preserve SVG nodes, host interaction and motion surface', () => {
  const { host, rendered, destroyed } = setup()

  try {
    const svg = environment.container.querySelector('svg')
    const { interaction } = host
    const count = rendered.mock.calls.length
    environment.loaded()
    environment.loaded()
    environment.flush()
    expect(rendered).toHaveBeenCalledTimes(count)
    expect(environment.container.querySelector('svg')).toBe(svg)
    expect(host.interaction).toBe(interaction)
    expect(destroyed).not.toHaveBeenCalled()
  } finally {
    host.destroy()
  }
})

test('changed bounds redraw once as layout and retain latest full host options', () => {
  const { host, options, rendered } = setup()

  try {
    host.update({ ...options, ariaLabel: 'Latest' })
    const count = rendered.mock.calls.length
    environment.setBounds({ ascent: 14 })
    environment.loaded()
    environment.loaded()
    environment.flush()
    expect(rendered).toHaveBeenCalledTimes(count + 1)
    expect(rendered.mock.lastCall?.[1].animation).toBeUndefined()
    expect(environment.container.querySelector('svg')?.getAttribute('aria-label')).toBe('Latest')
  } finally {
    host.destroy()
  }
})

test('date-pill word changes redraw even when guide painted bounds are unchanged', () => {
  const pill = pillFontMeasurement(environment.container)
  pill.begin()
  pill.measure('November')
  pill.commit()
  const { host, rendered } = setup({ fontMetricsChanged: pill.changed })

  try {
    const count = rendered.mock.calls.length
    environment.setBounds({ width: 50 })
    environment.loaded()
    environment.flush()
    expect(rendered).toHaveBeenCalledTimes(count + 1)
  } finally {
    host.destroy()
  }
})

test('public update consumes the font epoch and refreshes computed typography', () => {
  const { host, options, rendered } = setup()

  try {
    environment.loaded()
    environment.container.style.fontFamily = 'Replacement'
    environment.container.style.fontWeight = '700'
    host.update(options)
    const count = rendered.mock.calls.length
    expect(environment.context.font).toContain('Replacement')
    environment.flush()
    expect(rendered).toHaveBeenCalledTimes(count)
    expect(environment.context.font).toContain('700')
  } finally {
    host.destroy()
  }
})

test('custom measurers bypass optimization and remain the exact public function', () => {
  const { host, measureText, rendered } = setup(undefined, true)

  try {
    expect(measureText).toHaveBeenCalled()
    const count = rendered.mock.calls.length
    environment.loaded()
    environment.flush()
    expect(rendered).toHaveBeenCalledTimes(count)
    expect(environment.measure).not.toHaveBeenCalled()
  } finally {
    host.destroy()
  }
})

test('unavailable canvas preserves stock font-event rendering', () => {
  environment.unavailable()
  const { host, rendered } = setup()

  try {
    const count = rendered.mock.calls.length
    environment.loaded()
    environment.flush()
    expect(rendered).toHaveBeenCalledTimes(count + 1)
  } finally {
    host.destroy()
  }
})

test('disposal removes pending font work and destroys the existing surface once', () => {
  const { host, rendered, destroyed } = setup()
  environment.setBounds({ ascent: 15 })
  environment.loaded()
  host.destroy()
  host.destroy()
  const count = rendered.mock.calls.length
  environment.loaded()
  environment.flush()
  expect(rendered).toHaveBeenCalledTimes(count)
  expect(destroyed).toHaveBeenCalledTimes(1)
})

test.each(['resize-first', 'font-first'])(
  'native resize and fonts coalesce with fresh typography (%s)',
  (order) => {
    const deliveries: Array<(width: number) => void> = []

    class Observer implements ResizeObserver {
      readonly deliver: ResizeObserverCallback
      constructor(deliver: ResizeObserverCallback) {
        this.deliver = deliver
      }
      observe(target: Element) {
        deliveries.push((width) => {
          this.deliver(
            [
              {
                target,
                contentRect: new DOMRect(0, 0, width, 240),
                borderBoxSize: [],
                contentBoxSize: [],
                devicePixelContentBoxSize: [],
              },
            ],
            this,
          )
        })
      }
      unobserve = vi.fn<() => void>()
      disconnect = vi.fn<() => void>()
    }

    vi.stubGlobal('ResizeObserver', Observer)
    const { host, rendered } = setup(undefined, false, true)

    try {
      const count = rendered.mock.calls.length
      environment.container.style.fontFamily = 'Resized'

      if (order === 'font-first') {
        environment.loaded()
      }

      deliveries[0]?.(600)

      if (order === 'resize-first') {
        environment.loaded()
      }

      environment.flush()
      expect(host.getScene().width).toBe(600)
      expect(rendered).toHaveBeenCalledTimes(count + 1)
      expect(environment.context.font).toContain('Resized')
    } finally {
      host.destroy()
    }
  },
)

test('switching to a custom measurer cancels pending adapter work and switching back refreshes', () => {
  const { host, options, rendered } = setup()
  const measureText = vi.fn(() => ({ x: 0, y: -10, width: 30, height: 12 }))

  try {
    environment.loaded()
    host.update({ ...options, measureText })
    const count = rendered.mock.calls.length
    environment.flush()
    expect(rendered).toHaveBeenCalledTimes(count)
    environment.setBounds({ ascent: 17 })
    environment.loaded()
    host.update(options)
    expect(environment.context.measureText('Label').actualBoundingBoxAscent).toBe(17)
    expect(rendered).toHaveBeenCalledTimes(count + 1)
  } finally {
    host.destroy()
  }
})

test('losing the current resource hook stays conservative', () => {
  let check: (() => boolean) | undefined = unchangedResource.fontMetricsChanged

  const resource = {
    get fontMetricsChanged() {
      return check
    },
  }

  const { host, rendered } = setup(resource)

  try {
    check = undefined
    const count = rendered.mock.calls.length
    environment.loaded()
    environment.flush()
    expect(rendered).toHaveBeenCalledTimes(count + 1)
  } finally {
    host.destroy()
  }
})

test('a replaced resource and an initially unaudited resource remain conservative', () => {
  const first = setup()

  try {
    first.replaceResource({ fontMetricsChanged: unchangedResource.fontMetricsChanged })
    const count = first.rendered.mock.calls.length
    environment.loaded()
    environment.flush()
    expect(first.rendered).toHaveBeenCalledTimes(count + 1)
  } finally {
    first.host.destroy()
  }

  const second = setup({})

  try {
    const count = second.rendered.mock.calls.length
    environment.loaded()
    environment.flush()
    expect(second.rendered).toHaveBeenCalledTimes(count + 1)
  } finally {
    second.host.destroy()
  }
})
