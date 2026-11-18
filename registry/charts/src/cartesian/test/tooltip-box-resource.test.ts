// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom -- native resource with controlled size notifications
import { frameData, frameSteps, motionValue } from 'motion-dom'
import { afterAll, afterEach, beforeAll, expect, test, vi } from 'vitest'
import { createTooltipBoxResource } from '../tooltip-box-resource'
import type { TooltipBoxGeometry } from '../tooltip-box-geometry'

const animationDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'animate')

beforeAll(() => {
  if (animationDescriptor === undefined || !Reflect.deleteProperty(Element.prototype, 'animate')) {
    throw new Error('Tooltip resource test requires scoped WAAPI capability removal')
  }
})

afterAll(() => {
  if (animationDescriptor !== undefined) {
    Object.defineProperty(Element.prototype, 'animate', animationDescriptor)
  }
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const observeSizes = () => {
  const deliveries: Array<() => void> = []
  const observed = new Map<Element, ResizeObserverOptions | undefined>()
  const disconnected = vi.fn<() => void>()

  class Observer implements ResizeObserver {
    readonly observed = observed
    readonly disconnected = disconnected
    constructor(deliver: ResizeObserverCallback) {
      deliveries.push(() => {
        deliver([], this)
      })
    }
    observe(element: Element, options?: ResizeObserverOptions) {
      this.observed.set(element, options)
    }
    unobserve(element: Element) {
      this.observed.delete(element)
    }
    disconnect() {
      this.observed.clear()
      this.disconnected()
    }
  }

  // oxlint-disable-next-line landmines-testing/no-test-doubles -- Queued finite host deliveries exercise equal-size reconciliation and stale callbacks after hide; native Heatmap covers real observation.
  vi.stubGlobal('ResizeObserver', Observer)

  return { deliveries, observed, disconnected }
}

const panel = () => {
  const element = document.createElement('div')
  const body = document.createElement('div')
  body.className = 'ts-chart-tooltip__body'
  element.append(body)
  document.body.append(element)
  const dimensions = { width: 100, height: 60 }
  // oxlint-disable-next-line landmines-testing/no-test-doubles -- Controlled integer widths cover exact flip boundaries, zero-size retention and cached layout reads outside a native layout engine.
  const widthRead = vi.fn(() => dimensions.width)
  // oxlint-disable-next-line landmines-testing/no-test-doubles -- Controlled integer heights independently cover zero-axis retention and stationary resize targets; native Heatmap exercises real geometry.
  const heightRead = vi.fn(() => dimensions.height)
  Object.defineProperties(element, {
    offsetWidth: { get: widthRead },
    offsetHeight: { get: heightRead },
  })

  return { element, body, dimensions, widthRead, heightRead }
}

const geometry: TooltipBoxGeometry = {
  x: 350,
  y: 240,
  containerWidth: 500,
  containerHeight: 300,
  animate: false,
}

test('pointer updates reuse native integer size and the first equal-size delivery reconciles flip', () => {
  const observer = observeSizes()
  const { element, body, widthRead, heightRead } = panel()
  const resource = createTooltipBoxResource(element)

  try {
    resource.show(geometry)
    expect(element.style.left).toBe('366px')
    expect(element.style.top).toBe('210px')
    expect(element.dataset.placement).toBe('left')
    expect(body.style.transformOrigin).toBe('right top')
    expect(observer.observed.get(element)).toEqual({ box: 'border-box' })
    observer.deliveries[0]?.()
    expect(element.dataset.placement).toBe('right')
    expect(body.style.transformOrigin).toBe('left top')
    body.style.opacity = '0.7'
    body.style.transform = 'scale(0.97)'
    element.style.opacity = '0.6'
    observer.deliveries[0]?.()
    expect(body.style.opacity).toBe('0.7')
    expect(body.style.transform).toBe('scale(0.97)')
    expect(element.style.opacity).toBe('0.6')
    const reads = widthRead.mock.calls.length

    for (let x = 200; x < 220; x += 1) {
      resource.show({ ...geometry, x, y: x, offset: 12, containerHeight: 320 })
    }

    expect(widthRead).toHaveBeenCalledTimes(reads)
    expect(heightRead).toHaveBeenCalledTimes(reads)
    expect(element.style.left).toBe('231px')
    expect(element.style.top).toBe('189px')
  } finally {
    resource.destroy()
    element.remove()
  }
})

test('stationary content and style resizing retargets, preserves positive axes and only restarts a flipped panel', () => {
  const observer = observeSizes()
  const { element, body, dimensions } = panel()
  const resource = createTooltipBoxResource(element)

  try {
    resource.show(geometry)
    observer.deliveries[0]?.()
    body.textContent = 'A longer tooltip label'
    body.style.fontSize = '24px'
    dimensions.height = 100
    element.style.opacity = '0.6'
    body.style.opacity = '0.7'
    body.style.transform = 'scale(0.97)'
    observer.deliveries[0]?.()
    expect(element.style.top).toBe('184px')
    expect(element.style.opacity).toBe('0.6')
    expect(body.style.opacity).toBe('0.7')
    expect(body.style.transform).toBe('scale(0.97)')
    dimensions.width = 200
    dimensions.height = 0
    observer.deliveries[0]?.()
    expect(element.style.left).toBe('134px')
    expect(element.style.top).toBe('184px')
    expect(element.dataset.placement).toBe('left')
    expect(body.style.transformOrigin).toBe('right top')
    expect(body.style.opacity).toBe('0')
    expect(element.style.opacity).toBe('0.6')
    dimensions.width = 0
    dimensions.height = 120
    observer.deliveries[0]?.()
    expect(element.style.left).toBe('134px')
    expect(element.style.top).toBe('164px')
    dimensions.width = 100
    observer.deliveries[0]?.()
    expect(element.style.left).toBe('366px')
    expect(element.dataset.placement).toBe('right')
    element.style.left = '123px'
    observer.deliveries[0]?.()
    expect(element.style.left).toBe('123px')
  } finally {
    resource.destroy()
    element.remove()
  }
})

test('hide and destroy disconnect size observation and stale callbacks cannot mutate reentry', () => {
  const observer = observeSizes()
  const { element, dimensions, widthRead } = panel()
  const resource = createTooltipBoxResource(element)

  try {
    resource.show(geometry)
    const [stale] = observer.deliveries
    resource.hide()
    expect(observer.disconnected).toHaveBeenCalledTimes(1)
    const reads = widthRead.mock.calls.length
    stale?.()
    expect(widthRead).toHaveBeenCalledTimes(reads)
    dimensions.width = 220
    resource.show(geometry)
    expect(element.style.left).toBe('114px')
    expect(observer.deliveries).toHaveLength(2)
    dimensions.width = 300
    stale?.()
    expect(element.style.left).toBe('114px')
    expect(widthRead).toHaveBeenCalledTimes(reads + 1)
    resource.destroy()
    observer.deliveries[1]?.()
    expect(widthRead).toHaveBeenCalledTimes(reads + 1)
    expect(observer.disconnected).toHaveBeenCalledTimes(2)
    expect(element.hidden).toBe(true)
  } finally {
    resource.destroy()
    element.remove()
  }
})

test('resize preserves source positions, explicit overrides and entrance flags', () => {
  const observer = observeSizes()
  const { element, body, dimensions } = panel()
  const left = motionValue(75)
  const top = motionValue(95)
  const resource = createTooltipBoxResource(element, { left, top })

  try {
    resource.show({ ...geometry, animate: true, flipped: false })
    dimensions.width = 240
    observer.deliveries[0]?.()
    expect(element.style.left).toBe('75px')
    expect(element.style.top).toBe('95px')
    expect(element.dataset.placement).toBe('right')
    expect(body.style.transformOrigin).toBe('left top')
    left.set(85)
    top.set(105)
    frameSteps.render.process(frameData)
    expect(element.style.left).toBe('85px')
    expect(element.style.top).toBe('105px')
    resource.show({ ...geometry, animate: true, left: 20, top: 30 })
    dimensions.height = 180
    observer.deliveries[0]?.()
    expect(element.style.left).toBe('20px')
    expect(element.style.top).toBe('30px')
    resource.show({ ...geometry, entrance: false })
    dimensions.height = 200
    observer.deliveries[0]?.()
    expect(element.style.left).toBe('94px')
    expect(element.style.top).toBe('84px')
    expect(element.style.opacity).toBe('')
    expect(body.style.opacity).toBe('')
    expect(body.style.transform).toBe('')
  } finally {
    resource.destroy()
    left.destroy()
    top.destroy()
    element.remove()
  }
})

test('without ResizeObserver synchronous updates and stationary read frames stay correct until disposal', () => {
  // oxlint-disable-next-line landmines-testing/no-test-doubles -- Explicitly unsupported ResizeObserver exercises the read-frame fallback and disposal; modern Chromium cannot supply this capability gap.
  vi.stubGlobal('ResizeObserver', undefined)
  const { element, dimensions, widthRead } = panel()
  const resource = createTooltipBoxResource(element)

  try {
    resource.show(geometry)
    expect(element.style.left).toBe('366px')
    dimensions.width = 200
    resource.show({ ...geometry, y: 250 })
    expect(element.style.left).toBe('134px')
    dimensions.height = 180
    const reads = widthRead.mock.calls.length
    frameSteps.read.process(frameData)
    expect(widthRead).toHaveBeenCalledTimes(reads + 1)
    expect(element.style.top).toBe('104px')
    expect(element.dataset.placement).toBe('left')
    resource.hide()
    frameSteps.read.process(frameData)
    expect(widthRead).toHaveBeenCalledTimes(reads + 1)
    resource.show(geometry)
    dimensions.width = 100
    frameSteps.read.process(frameData)
    expect(element.style.left).toBe('366px')
    const finalReads = widthRead.mock.calls.length
    resource.destroy()
    frameSteps.read.process(frameData)
    expect(widthRead).toHaveBeenCalledTimes(finalReads)
  } finally {
    resource.destroy()
    element.remove()
  }
})
