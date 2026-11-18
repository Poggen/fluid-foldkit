import { DateTime } from 'effect'
import { describe, expect, it } from 'vitest'
import { scaleLinear } from 'd3-scale'
import { timeScale, useBridgedContext } from '../context-bridge'
import { ChartProvider, useChartHover, useChartStable, useYScale } from '../../index'
import { tooltipSetter } from '../chart-context'

describe('explicit chart view contexts', () => {
  it('retains complete caller rows and routes tooltip updates through the supplied parent capability', () => {
    const row = {
      date: DateTime.toDateUtc(DateTime.makeUnsafe('2024-01-01T00:00:00Z')),
      amount: 4,
      textAmount: '4',
      metadata: { source: 'caller' },
    }

    const data = [row]
    const y = scaleLinear().domain([0, 10]).range([100, 0])

    const context = useBridgedContext({
      data,
      margin: { top: 10, right: 20, bottom: 30, left: 40 },
      size: { width: 300, height: 140 },
      containerRef: { current: null },
      ready: true,
      xScale: timeScale(
        [row.date, DateTime.toDateUtc(DateTime.makeUnsafe('2024-01-02T00:00:00Z'))],
        240,
      ),
      yScales: { left: y },
      lines: [
        { dataKey: 'amount', stroke: 'red', strokeWidth: 2 },
        { dataKey: 'textAmount', stroke: 'blue', strokeWidth: 2 },
      ],
      animationDuration: 1100,
      xAccessor: (item) => item.date,
      dateLabels: ['Jan 1'],
      focused: { row, index: 0 },
      focusRow: (index) => ({ type: 'focus', index }),
    })

    expect(context.data).toBe(data)
    expect(context.renderData).toBe(data)
    expect(context.tooltipData?.point).toBe(row)
    expect(context.tooltipData?.yPositions).toEqual({ amount: 60 })
    expect(context.innerWidth).toBe(240)
    expect(context.innerHeight).toBe(100)
    expect(
      context.setTooltipData((previous) => {
        expect(previous).toBeNull()

        return context.tooltipData
      }),
    ).toEqual({ type: 'focus', index: 0 })
    expect(context.setTooltipData(null)).toEqual({ type: 'focus', index: null })
  })

  it('keeps stable and hover slices caller-owned and selects the requested y axis', () => {
    const row = { date: DateTime.toDateUtc(DateTime.makeUnsafe(0)) }
    const left = scaleLinear().domain([0, 10])
    const right = scaleLinear().domain([20, 30])

    const value = useBridgedContext({
      data: [row],
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      size: { width: 100, height: 100 },
      containerRef: { current: null },
      ready: false,
      xScale: timeScale(
        [DateTime.toDateUtc(DateTime.makeUnsafe(0)), DateTime.toDateUtc(DateTime.makeUnsafe(1000))],
        100,
      ),
      yScales: { left, right },
      lines: [],
      animationDuration: 0,
      xAccessor: (item) => item.date,
      dateLabels: [],
      focused: null,
      focusRow: (index) => index,
    })

    const context = { stable: value, hover: value }
    expect(ChartProvider({ value: context, children: useChartStable })).toBe(value)
    expect(useChartHover(context)).toBe(value)
    expect(useYScale(context, 'right')).toBe(right)
    expect(useYScale(context, 'missing')).toBe(left)
    expect(value.chartPhase).toBe('revealing')
    expect(value.tooltipData).toBeNull()
  })

  it('keeps the source null-updater contract even when the calling view has an existing tooltip', () => {
    const setter = tooltipSetter((index) => ({ index }))
    expect(
      setter((previous) => {
        expect(previous).toBeNull()

        return null
      }),
    ).toEqual({ index: null })
  })
})
