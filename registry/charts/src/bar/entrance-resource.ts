import { animateSingleValue, motionValue } from 'motion-dom'
import { mountBarFade } from './fade-entrance'
import { barFrontCurrentRules } from './front-precision'
import { acquireDepthMotion } from './depth-motion'
import type { ChartRendererHost, SceneNode, SceneRect } from '@tanstack/charts'
import type { Interaction } from '../cartesian/state'
import { keyIs } from '../kit/renderer-dom'
import { keyAttr } from '../cartesian/build-state'
import { mountProgressOptions } from '../kit/motion/transition-options'
import type { BarSnapshot, BarValue } from './definition'
import type { BarDatum } from './model'
import { resolveBarSeries } from './model'
import type { BarChartProps, BarProps } from './options'

const rectangles = (nodes: ReadonlyArray<SceneNode>): ReadonlyArray<SceneRect> =>
  nodes.flatMap((node) => {
    if (node.kind === 'group') {
      return rectangles(node.children)
    }

    if (node.kind === 'rect' && node.key.startsWith('bars:')) {
      return [node]
    }

    return []
  })

const entering = (current: Interaction) =>
  !current.revealReady && current.configuration.status === 'ready'

/** Own the Source bar entrance; the scene remains the sole source of target geometry. */
export function barEntranceResource<Row>(element: HTMLElement, props: () => BarChartProps<Row>) {
  let host: ChartRendererHost<BarDatum<Row>, BarValue, BarValue> | undefined
  let state: Interaction | undefined
  let snapshot: BarSnapshot<Row> | undefined
  let pending = false
  let disposed = false
  const entries = new Map<SVGRectElement, ReturnType<typeof acquire>>()
  const currentRules = barFrontCurrentRules(element)
  let frontGeneration = -1
  const depthEntries = new Map<string, NonNullable<ReturnType<typeof acquireDepthMotion>>>()
  const depthSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const depthDefs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
  depthSvg.setAttribute('width', '0')
  depthSvg.setAttribute('height', '0')
  depthSvg.setAttribute('aria-hidden', 'true')
  depthSvg.dataset.bkmDepthDefinitions = ''
  depthSvg.setAttribute('class', 'absolute w-0 h-0')
  depthSvg.append(depthDefs)
  let depthGeneration = -1

  const refreshDepth = (current: Interaction, drawing: BarSnapshot<Row>) => {
    if (depthGeneration !== current.generation) {
      for (const entry of depthEntries.values()) {
        entry.destroy()
      }

      depthEntries.clear()
      depthGeneration = current.generation
    }

    const active = new Set<string>()

    if (current.configuration.status === 'ready') {
      const total = current.configuration.animationDuration || 1100
      const stagger = drawing.data.length > 1 ? (total * 0.4) / 1000 / drawing.data.length : 0

      for (const target of drawing.depthTargets) {
        const options = {
          loaded: current.revealReady,
          delay: target.entry.index * stagger,
          transition: props().enterTransition,
        }

        active.add(target.key)
        let entry = depthEntries.get(target.key)

        if (entry !== undefined && !entry.current()) {
          entry.destroy()
          depthEntries.delete(target.key)
          entry = undefined
        }

        if (entry === undefined) {
          entry = acquireDepthMotion(element, depthDefs, target, options)

          if (entry !== undefined) {
            depthEntries.set(target.key, entry)
          }
        } else {
          entry.update(target, options)
        }
      }
    }

    for (const [key, entry] of depthEntries) {
      if (!active.has(key)) {
        entry.destroy()
        depthEntries.delete(key)
      }
    }

    if (depthDefs.childElementCount > 0) {
      element.append(depthSvg)
    } else {
      depthSvg.remove()
    }
  }

  function acquire(
    node: SVGRectElement,
    geometry: SceneRect,
    bar: BarProps,
    datum: BarDatum<Row>,
    className: string,
  ) {
    const horizontal = props().orientation === 'horizontal'
    const fade = bar.animationType === 'fade'
    const current = fade ? undefined : currentRules.acquire(className)
    const baseline = (snapshot?.height ?? 0) - (snapshot?.margin.bottom ?? 0)
    const index = datum.index
    const category = datum.category
    const x = motionValue(horizontal && !fade ? (snapshot?.margin.left ?? 0) : geometry.x)
    const width = motionValue(horizontal && !fade ? 0 : geometry.width)
    const height = motionValue(!horizontal && !fade ? 0 : geometry.height)
    const y = motionValue(!horizontal && !fade ? baseline : geometry.y)

    const subscriptions = [
      x.on('change', (value) => {
        current?.set('x', value)
      }),
      width.on('change', (value) => {
        current?.set('width', value)
      }),
      height.on('change', (value) => {
        current?.set('height', value)
      }),
      y.on('change', (value) => {
        current?.set('y', value)
      }),
    ]

    let fadeOwner: ReturnType<typeof mountBarFade> | undefined

    const draw = () => {
      current?.set('x', x.get())

      current?.set('width', width.get())
      current?.set('height', height.get())
      current?.set('y', y.get())

      fadeOwner?.draw()
    }

    let target = geometry
    let currentBar = bar
    let currentIndex = index
    const geometryValues = { x, width, height, y }
    const axes = ['x', 'width', 'height', 'y'] as const

    const timing = () => {
      const configuredDuration = props().animationDuration ?? 1100
      const total = configuredDuration === 0 ? 1100 : configuredDuration
      const count = snapshot?.data.length ?? 0
      const stagger = currentBar.staggerDelay ?? (count > 1 ? (total * 0.4) / 1000 / count : 0)

      return { ...mountProgressOptions(props().enterTransition), delay: currentIndex * stagger }
    }

    const animate = (changed: ReadonlyArray<(typeof axes)[number]>) => {
      if (fade) {
        return
      }

      for (const axis of changed) {
        if (axis !== 'x' || !horizontal) {
          void animateSingleValue(geometryValues[axis], target[axis], timing())
        }
      }
    }

    if (fade) {
      fadeOwner = mountBarFade(node, timing())
    }

    draw()
    animate(axes.filter((axis) => geometryValues[axis].get() !== target[axis]))

    return {
      horizontal,
      fade,
      category,
      index,
      update(next: SceneRect, nextBar: BarProps, nextIndex: number) {
        const changed = axes.filter((axis) => next[axis] !== target[axis])
        currentBar = nextBar
        currentIndex = nextIndex

        target = next

        if (fade) {
          x.jump(next.x)
          width.jump(next.width)
          height.jump(next.height)
          y.jump(next.y)
        }

        animate(changed)

        draw()
      },
      destroy() {
        x.stop()
        width.stop()
        height.stop()
        y.stop()
        fadeOwner?.destroy()

        for (const release of subscriptions) {
          release()
        }

        x.destroy()
        width.destroy()
        height.destroy()
        y.destroy()
        current?.destroy()
      },
    }
  }

  const matchesActor = (entry: ReturnType<typeof acquire>, bar: BarProps, datum: BarDatum<Row>) =>
    entry.fade === (bar.animationType === 'fade') &&
    entry.horizontal === (props().orientation === 'horizontal') &&
    entry.category === datum.category &&
    entry.index === datum.index

  const refresh = () => {
    if (disposed || host === undefined || snapshot === undefined || state === undefined) {
      return
    }

    refreshDepth(state, snapshot)

    if (frontGeneration !== state.generation) {
      for (const entry of entries.values()) {
        entry.destroy()
      }

      entries.clear()
      frontGeneration = state.generation
    }

    const active = new Set<SVGRectElement>()

    if (entering(state)) {
      const series = resolveBarSeries(props().children)

      for (const geometry of rectangles(host.getScene().nodes)) {
        const datum = snapshot.datums.find((row) =>
          geometry.key.endsWith(`:${row.index}:${row.series}`),
        )

        const bar = series.find((item) => item.key === datum?.series)?.bar

        if (datum === undefined || bar === undefined || bar.animate === false) {
          continue
        }

        const node = element.querySelector<SVGRectElement>(`rect${keyIs(keyAttr(geometry.key))}`)

        if (node === null) {
          continue
        }

        if (geometry.className === undefined) {
          throw new Error('Bar front precision requires its authored class')
        }

        active.add(node)
        let previous = entries.get(node)

        if (previous !== undefined && !matchesActor(previous, bar, datum)) {
          previous.destroy()
          entries.delete(node)
          previous = undefined
        }

        if (previous === undefined) {
          entries.set(node, acquire(node, geometry, bar, datum, geometry.className))
        } else {
          previous.update(geometry, bar, datum.index)
        }
      }
    }

    for (const [node, entry] of entries) {
      if (!active.has(node)) {
        entry.destroy()
        entries.delete(node)
      }
    }
  }

  const schedule = () => {
    if (pending) {
      return
    }

    pending = true
    queueMicrotask(() => {
      pending = false
      refresh()
    })
  }

  return {
    attach(next: ChartRendererHost<BarDatum<Row>, BarValue, BarValue>) {
      host = next
      schedule()
    },
    draw(next: BarSnapshot<Row>) {
      snapshot = next
      schedule()
    },
    update(next: Interaction) {
      state = next
      schedule()
    },
    destroy() {
      disposed = true

      for (const entry of entries.values()) {
        entry.destroy()
      }

      entries.clear()
      currentRules.destroy()

      for (const entry of depthEntries.values()) {
        entry.destroy()
      }

      depthEntries.clear()
      depthSvg.remove()
    },
  }
}
