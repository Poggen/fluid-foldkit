// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom -- public callbacks before native scene compilation
import { describe, afterEach, beforeEach, expect, test, vi } from 'vitest'
import { scaleLinear } from 'd3-scale'
import { text } from '@tanstack/charts'
import type { ChartRendererHostOptions, ChartTooltipExtension } from '@tanstack/charts'
import { motion } from '@tanstack/charts/motion'
import { createChartCursor, cursorHost } from '@tanstack/charts/cursor'
import { mountCartesianRenderer } from '../font-renderer'
import { fontTestEnvironment } from '../../../test/font-test-environment'

describe('Cartesian font renderer callbacks', () => {
  let environment: ReturnType<typeof fontTestEnvironment>
  beforeEach(() => {
    environment = fontTestEnvironment()
  })
  afterEach(() => {
    environment.destroy()
  })

  const row = { x: 1, y: 2, label: 'Label' }
  const setup = (tooltip?: ChartTooltipExtension) => {
    const options: ChartRendererHostOptions<typeof row, number, number> = {
      renderer: motion({ initial: false }),
      ariaLabel: 'Callback fixture',
      width: 400,
      height: 240,
      definition: {
        scales: { x: { scale: scaleLinear() }, y: { scale: scaleLinear() } },
        marks: [text([row], { x: 'x', y: 'y', text: 'label' })],
        ...(tooltip === undefined ? {} : { tooltip }),
      },
    }
    const resource = { fontMetricsChanged: () => false }
    return { options, host: mountCartesianRenderer(environment.container, options, () => resource) }
  }

  test('tooltip callbacks remain fresh after removal on later updates and font checks', () => {
    const { host, options } = setup()
    let nextFont: string | undefined
    const applyFont = () => {
      if (nextFont !== undefined) {
        environment.container.style.fontFamily = nextFont
        nextFont = undefined
      }
    }
    const tooltip: ChartTooltipExtension = {
      id: 'font-mutating-tooltip',
      __chartExtensionType: 'tooltip',
      __chartTooltipHost: 'dom',
      create: () => ({
        update: applyFont,
        hide: applyFont,
        destroy: applyFont,
        paint: () => {},
        contains: () => false,
      }),
    }
    const withTooltip = { ...options, definition: { ...options.definition, tooltip } }
    try {
      host.update(withTooltip)
      const point = host.getScene().points[0]
      if (point === undefined) throw new Error('Expected focus point')
      host.interaction.setControlledFocus(point)
      nextFont = 'TooltipUpdated'
      host.update({ ...withTooltip, ariaLabel: 'Updated' })
      expect(environment.context.font).toContain('TooltipUpdated')
      nextFont = 'TooltipHidden'
      host.update(options)
      expect(environment.context.font).toContain('TooltipHidden')
      nextFont = 'RetiredTooltipChanged'
      host.update({ ...options, ariaLabel: 'Later tooltip-free render' })
      expect(environment.container.style.fontFamily).toBe('RetiredTooltipChanged')
      expect(environment.context.font).toContain('RetiredTooltipChanged')
      nextFont = 'RetiredTooltipFontCheck'
      environment.setBounds({ ascent: 19 })
      environment.loaded()
      environment.container.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
      expect(environment.container.style.fontFamily).toBe('RetiredTooltipFontCheck')
      expect(environment.context.font).toContain('RetiredTooltipFontCheck')
    } finally {
      host.destroy()
    }
  })

  test('cursor subscription and retirement may change fonts before compilation', () => {
    const { host, options } = setup()
    const controller = createChartCursor<number, number>()
    let retired = 0
    const subscribe: typeof controller.subscribe = (listener) => {
      environment.container.style.fontFamily = 'CursorCreated'
      const release = controller.subscribe(listener)
      return () => {
        retired += 1
        environment.container.style.fontFamily = 'CursorRetired'
        release()
      }
    }
    try {
      host.update({
        ...options,
        definition: {
          ...options.definition,
          cursor: { mode: 'free', use: cursorHost, controller: { ...controller, subscribe } },
        },
      })
      expect(environment.context.font).toContain('CursorCreated')
      host.update(options)
      expect(environment.context.font).toContain('CursorRetired')
      environment.container.style.fontFamily = 'AfterCursor'
      const styles = vi.spyOn(window, 'getComputedStyle')
      host.update({ ...options, ariaLabel: 'Later cursor-free render' })
      expect(environment.context.font).toContain('AfterCursor')
      expect(retired).toBe(1)
      expect(
        styles.mock.calls.filter(([element]) => element === environment.container),
      ).toHaveLength(1)
    } finally {
      host.destroy()
    }
  })

  test('disabling active pointer focus captures fonts changed by focus clearing', () => {
    const { host, options } = setup()
    try {
      const point = host.getScene().points[0]
      if (point === undefined) throw new Error('Expected focus point')
      host.interaction.setControlledFocus(point)
      environment.container.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
      let cleared = false
      host.update({
        ...options,
        definition: { ...options.definition, pointer: false },
        onFocusChange: (next) => {
          if (next === null) {
            cleared = true
            environment.container.style.fontFamily = 'PointerCleared'
          }
        },
      })
      expect(cleared).toBe(true)
      expect(environment.context.font).toContain('PointerCleared')
    } finally {
      host.destroy()
    }
  })

  test.each(['initial', 'custom-measurer'] as const)(
    'tooltip retention includes %s acquisition',
    (mode) => {
      let nextFont: string | undefined
      const applyFont = () => {
        if (nextFont !== undefined) {
          environment.container.style.fontFamily = nextFont
          nextFont = undefined
        }
      }
      const tooltip: ChartTooltipExtension = {
        id: 'acquired-tooltip',
        __chartExtensionType: 'tooltip',
        __chartTooltipHost: 'dom',
        create: () => ({
          update: applyFont,
          hide: applyFont,
          destroy: () => {},
          paint: () => {},
          contains: () => false,
        }),
      }
      const { host, options } = setup(mode === 'initial' ? tooltip : undefined)
      try {
        if (mode === 'custom-measurer') {
          host.update({
            ...options,
            measureText: () => ({ x: 0, y: -10, width: 30, height: 12 }),
            definition: { ...options.definition, tooltip },
          })
        }
        const point = host.getScene().points[0]
        if (point === undefined) throw new Error('Expected focus point')
        host.interaction.setControlledFocus(point)
        const absent = {
          ...options,
          definition: { ...options.definition, tooltip: false as const },
        }
        host.update(absent)
        nextFont = 'AcquiredTooltipChanged'
        host.update({ ...absent, ariaLabel: 'Later absent render' })
        expect(environment.container.style.fontFamily).toBe('AcquiredTooltipChanged')
        expect(environment.context.font).toContain('AcquiredTooltipChanged')
      } finally {
        host.destroy()
      }
    },
  )
})
