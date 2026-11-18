// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom -- owned resource draw measurement and selected overlay
import { describe, afterEach, beforeEach, expect, test, vi } from 'vitest'
import { DateTime, Schema } from 'effect'
import { createChartRuntime } from '@tanstack/charts'
import { ChartTooltip, Line, LineChart } from '@foldkit-visuals/charts/line'
import type { CartesianSnapshot } from '../definition'
import { initialInteraction } from '../state'
import { mountTimeSeriesResource } from '../time-series-resource'
import { nativeObservations } from '../native-resource'
import { fontTestEnvironment } from '../../../test/font-test-environment'

describe('Time-series font measurements', () => {
  const Row = Schema.Struct({ date: Schema.DateFromString, value: Schema.Finite })
  let environment: ReturnType<typeof fontTestEnvironment>
  beforeEach(() => {
    environment = fontTestEnvironment()
  })
  afterEach(() => {
    environment.destroy()
  })

  test.each(['generic', 'custom', 'disabled'] as const)(
    'draw measures only the selected %s overlay before CSS writes',
    (kind) => {
      const chart = LineChart({ name: 'measurement-selection', Row })
      const accessors = { x: (row: typeof Row.Type) => row.date }
      const x = vi.spyOn(accessors, 'x')
      const props = {
        animationDuration: 0,
        x,
        children: [Line({ dataKey: 'value' }), ChartTooltip<typeof Row.Type>({})],
      }
      const rows = [
        Row.make({
          date: DateTime.toDateUtc(DateTime.makeUnsafe('2026-11-12T12:00:00Z')),
          value: 12,
        }),
        Row.make({
          date: DateTime.toDateUtc(DateTime.makeUnsafe('2026-11-13T12:00:00Z')),
          value: 18,
        }),
      ]
      const state = initialInteraction(chart.configuration(props))
      const runtime = createChartRuntime<typeof Row.Type, Date, number>()
      let snapshot: CartesianSnapshot<typeof Row.Type> | undefined
      const definition = chart.inputs('measurement-selection', props).resourceDefinition?.(
        rows,
        state,
        (next) => {
          snapshot = next
        },
        () => 0,
      )
      if (definition === undefined) throw new Error('Expected native definition')
      runtime.render(definition, { width: 640, height: 320 })
      if (snapshot === undefined) throw new Error('Expected native snapshot')
      const resource = mountTimeSeriesResource(
        { drawingHost: environment.container, visualRoot: undefined },
        nativeObservations(environment.container),
        props,
        'measurement-selection',
        () => 0,
        { modelViewport: 'Always' },
      )
      const custom = {
        crosshair: null,
        dots: [],
        pill: { labels: ['December 2', 'December 3'], layout: null },
        indexOf: (time: number) => rows.findIndex((row) => row.date.getTime() === time),
      }
      const next =
        kind === 'generic'
          ? snapshot
          : { ...snapshot, overlayModel: kind === 'disabled' ? null : custom }
      const mutations = new MutationObserver(() => {})
      mutations.observe(environment.container, { attributes: true, childList: true, subtree: true })
      const beforeRead: Array<number> = []
      const getStyle = window.getComputedStyle.bind(window)
      // oxlint-disable-next-line landmines-testing/no-test-doubles -- Pass-through observation records pending DOM mutations at the real style read without replacing its result.
      const styles = vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) => {
        if (element === document.body) beforeRead.push(mutations.takeRecords().length)
        return getStyle(element, pseudo)
      })
      environment.measure.mockClear()
      x.mockClear()
      try {
        resource.draw(next)
        expect(beforeRead).toEqual([0])
        expect(styles.mock.calls.filter(([element]) => element === document.body)).toHaveLength(1)
        expect(environment.measure.mock.calls.map(([word]) => word)).toEqual(
          kind === 'disabled'
            ? []
            : kind === 'custom'
              ? ['December', '2', 'December', '3']
              : ['Nov', '12', 'Nov', '13'],
        )
        expect(x).toHaveBeenCalledTimes(kind === 'generic' ? 2 : 0)
        expect(
          [...environment.container.querySelectorAll('.bkm-hov-pill-row')].map(
            (node) => node.textContent,
          ),
        ).toEqual(
          kind === 'disabled'
            ? []
            : kind === 'custom'
              ? ['December', '2', '3']
              : ['Nov', '12', '13'],
        )
        expect(
          environment.container
            .querySelector<HTMLElement>('.bkm-hov-pill')
            ?.style.getPropertyValue('--bkm-pill-top'),
        ).toBe(kind === 'disabled' ? undefined : '284px')
      } finally {
        mutations.disconnect()
        resource.destroy()
        runtime.destroy()
      }
    },
  )
})
