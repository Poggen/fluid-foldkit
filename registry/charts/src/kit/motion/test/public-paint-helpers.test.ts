import { expect, it } from 'vitest'
import {
  DEFAULT_CHART_LIFECYCLE,
  resolveTooltipBoxMotion,
  resolveVerticalFadeSides,
  indicatorFadeGradientStops,
  resolveLineLoadingPulseMode,
  getSeriesMarkerVisualExtent,
} from '../../../index'
import type {
  ChartPhase,
  IndicatorFadeEdges,
  IndicatorFadeGradientStop,
  LineLoadingPulseMode,
  VerticalFadeSides,
} from '../../../index'
import { TOOLTIP_BOX_SPRING } from '../springs'

it('retains the lifecycle singleton shape, own undefined label and separate mutable domain tuples', () => {
  const skeleton: [number, number] = DEFAULT_CHART_LIFECYCLE.yDomainSkeletonByAxis.left
  const target: [number, number] = DEFAULT_CHART_LIFECYCLE.yDomainTargetByAxis.left

  expect(DEFAULT_CHART_LIFECYCLE).toEqual({
    chartPhase: 'ready',
    chartStatus: 'ready',
    loadingLabel: undefined,
    yDomainTweenDuration: 500,
    yDomainSkeletonByAxis: { left: [0, 100] },
    yDomainTargetByAxis: { left: [0, 100] },
  })
  expect(Object.hasOwn(DEFAULT_CHART_LIFECYCLE, 'loadingLabel')).toBe(true)
  expect(Object.isFrozen(DEFAULT_CHART_LIFECYCLE)).toBe(false)
  expect(Object.isFrozen(skeleton)).toBe(false)
  expect(skeleton).not.toBe(target)
})

it('returns the existing spring singleton only for instant tooltip motion', () => {
  expect(resolveTooltipBoxMotion(0)).toEqual({ animate: false, springConfig: TOOLTIP_BOX_SPRING })
  expect(resolveTooltipBoxMotion(0).springConfig).toBe(TOOLTIP_BOX_SPRING)
  const normal = resolveTooltipBoxMotion()

  expect(normal).toEqual({ animate: true, springConfig: { stiffness: 100, damping: 20 } })
  expect(normal.springConfig).not.toBe(TOOLTIP_BOX_SPRING)
  expect(Object.hasOwn(normal.springConfig, 'mass')).toBe(false)
})

it.each([
  { damping: 10, stiffness: 300 },
  { damping: 20, stiffness: 100 },
  { damping: 60, stiffness: 58 },
  { damping: 200, stiffness: 12 },
  { damping: -10, stiffness: 700 },
])('retains tooltip stiffness rounding/clamping for damping $damping', ({ damping, stiffness }) => {
  expect(resolveTooltipBoxMotion(damping)).toEqual({
    animate: true,
    springConfig: { damping, stiffness },
  })
})

const fadeCases: Array<[IndicatorFadeEdges | boolean, VerticalFadeSides]> = [
  [false, { top: false, bottom: false, any: false }],
  ['none', { top: false, bottom: false, any: false }],
  [true, { top: true, bottom: true, any: true }],
  ['both', { top: true, bottom: true, any: true }],
  ['top', { top: true, bottom: false, any: true }],
  ['bottom', { top: false, bottom: true, any: true }],
]

it.each(fadeCases)('resolves indicator sides for %s', (fade, expected) => {
  expect(resolveVerticalFadeSides(fade)).toEqual(expected)
})

it('preserves stop ordering, percent strings and fade bounds without merging duplicate middle stops', () => {
  const both: VerticalFadeSides = { top: true, bottom: true, any: true }
  const stops: Array<IndicatorFadeGradientStop> = indicatorFadeGradientStops(both)

  expect(stops).toEqual([
    { offset: '0%', opacity: 0 },
    { offset: '10%', opacity: 1 },
    { offset: '50%', opacity: 1 },
    { offset: '90%', opacity: 1 },
    { offset: '100%', opacity: 0 },
  ])
  expect(indicatorFadeGradientStops(both, -20).map((stop) => stop.offset)).toEqual([
    '0%',
    '2%',
    '50%',
    '98%',
    '100%',
  ])
  expect(indicatorFadeGradientStops(both, 100).map((stop) => stop.offset)).toEqual([
    '0%',
    '40%',
    '50%',
    '60%',
    '100%',
  ])
  expect(indicatorFadeGradientStops({ top: true, bottom: false, any: true }, 5)).toEqual([
    { offset: '0%', opacity: 0 },
    { offset: '5%', opacity: 1 },
    { offset: '100%', opacity: 1 },
  ])
  expect(indicatorFadeGradientStops({ top: false, bottom: true, any: true }, 5)).toEqual([
    { offset: '0%', opacity: 1 },
    { offset: '95%', opacity: 1 },
    { offset: '100%', opacity: 0 },
  ])
  expect(indicatorFadeGradientStops({ top: true, bottom: true, any: false })).toEqual([
    { offset: '0%', opacity: 1 },
  ])
})

const phases: Array<[ChartPhase, LineLoadingPulseMode | null]> = [
  ['loading', 'loop'],
  ['exiting', 'exit'],
  ['revealingLoading', 'enter'],
  ['ready', null],
  ['revealing', null],
  ['gridTweenReady', null],
  ['exitingReady', null],
  ['gridTweenLoading', null],
]

it.each(phases)('resolves public loading pulse mode for %s', (phase, expected) => {
  expect(resolveLineLoadingPulseMode(phase)).toBe(expected)
})

it('retains marker defaults and zero/negative branches without clamping the source options', () => {
  expect(getSeriesMarkerVisualExtent({})).toBe(12.75)
  expect(
    getSeriesMarkerVisualExtent({
      radius: 0,
      strokeWidth: 0,
      outlineWidth: Number.NaN,
      showActiveHighlight: false,
    }),
  ).toBe(2)
  expect(
    getSeriesMarkerVisualExtent({
      radius: 0,
      strokeWidth: 0,
      outlineWidth: 0,
      showActiveHighlight: false,
    }),
  ).toBe(2)
  expect(
    getSeriesMarkerVisualExtent({ radius: -20, strokeWidth: -2, ringGap: 100, outlineWidth: -1 }),
  ).toBe(-25)
  expect(
    getSeriesMarkerVisualExtent({
      radius: 10,
      strokeWidth: 2,
      ringGap: 3,
      outlineWidth: 4,
      showActiveHighlight: false,
    }),
  ).toBe(21)
})
