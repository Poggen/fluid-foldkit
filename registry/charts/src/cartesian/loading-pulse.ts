import { cartesianCssScope } from './css-scope'
import { createPulseClipMotion } from '../kit/loading/pulse-clip-motion'
import type { CartesianSnapshot } from './definition'
import type { Interaction } from './state'
import type { NativeObservation } from './native-resource'
import type { ResolvedSeries } from './series'
import type { LineLoadingPulseMode } from '../kit/motion/phase'
import { keyAttr } from './build-state'
import { keyStarts } from '../kit/renderer-dom'

const NS = 'http://www.w3.org/2000/svg'

/** Physical pulse ownership is separate from the series' independently visible markers. */
export function loadingPulses<Row>(element: HTMLElement, id: string, observe: NativeObservation) {
  element.dataset.bkmPhysicalPulses = ''
  const root = document.createElementNS(NS, 'svg')
  root.setAttribute('width', '0')
  root.setAttribute('height', '0')
  root.setAttribute('aria-hidden', 'true')
  root.classList.add('absolute')
  const defs = document.createElementNS(NS, 'defs')
  const stylesheet = document.createElement('style')
  root.append(defs)
  element.append(root, stylesheet)

  interface Entry {
    readonly clip: SVGClipPathElement
    readonly gradient: SVGLinearGradientElement
    readonly motion: ReturnType<typeof createPulseClipMotion>
    readonly stops: ReadonlyArray<SVGStopElement>
    readonly paintId: string
    series: ResolvedSeries
    mode: LineLoadingPulseMode
    epoch: number
    pause: number | undefined
    generation: number | undefined
  }

  const entries = new Map<string, Entry>()
  let state: Interaction | undefined
  let snapshot: CartesianSnapshot<Row> | undefined
  let nextId = 0
  let disposed = false

  const updateEntry = (entry: Entry) => {
    if (snapshot === undefined || entry.series.loading === undefined) {
      return
    }

    const { loading } = entry.series
    entry.mode = loading.followsPhase && state?.phase === 'exiting' ? 'exit' : loading.mode
    entry.generation = state?.phase === 'exiting' ? state.generation : undefined
    const { margin, innerWidth, innerHeight } = snapshot
    entry.gradient.setAttribute('x1', String(margin.left))
    entry.gradient.setAttribute('x2', String(margin.left + innerWidth))

    for (const stop of entry.stops) {
      stop.setAttribute('stop-color', loading.stroke)
    }

    entry.motion.update({
      width: innerWidth,
      height: innerHeight,
      left: margin.left,
      top: margin.top,
      mode: entry.mode,
      epoch: entry.epoch,
      callbackKey: loading.onCycleComplete,
    })
  }

  const createEntry = (series: ResolvedSeries): Entry => {
    const paintId = `${id}-pulse-${nextId}`
    nextId += 1
    const clip = document.createElementNS(NS, 'clipPath')
    clip.id = `${paintId}-clip`
    clip.setAttribute('clipPathUnits', 'userSpaceOnUse')
    const rect = document.createElementNS(NS, 'rect')
    clip.append(rect)
    const gradient = document.createElementNS(NS, 'linearGradient')
    gradient.id = `${paintId}-gradient`
    gradient.setAttribute('gradientUnits', 'userSpaceOnUse')
    gradient.setAttribute('y1', '0')
    gradient.setAttribute('y2', '0')

    const stops = [0, 0.15, 0.85, 1].map((offset, index) => {
      const stop = document.createElementNS(NS, 'stop')
      stop.setAttribute('offset', `${offset * 100}%`)
      stop.setAttribute('stop-opacity', index === 0 || index === 3 ? '0' : '1')
      gradient.append(stop)

      return stop
    })

    defs.append(clip, gradient)

    const entry: Entry = {
      clip,
      gradient,
      stops,
      paintId,
      series,
      mode: 'loop',
      epoch: 0,
      pause: undefined,
      generation: undefined,
      motion: createPulseClipMotion(rect, () => {
        if (disposed || entries.get(series.id) !== entry) {
          return
        }

        entry.series.loading?.onCycleComplete?.()

        if (entry.mode === 'loop') {
          entry.pause = window.setTimeout(() => {
            entry.pause = undefined
            entry.epoch += 1
            updateEntry(entry)
          }, 280)
        } else if (entry.generation !== undefined && state?.generation === entry.generation) {
          observe.deadline(entry.generation)
        }
      }),
    }

    return entry
  }

  const removeEntry = (entry: Entry) => {
    window.clearTimeout(entry.pause)
    entry.motion.destroy()
    entry.clip.remove()
    entry.gradient.remove()
  }

  const render = () => {
    if (snapshot === undefined) {
      return
    }

    const series = snapshot.series.filter((item) => item.loading?.style === 'pulse')

    for (const [key, entry] of entries) {
      if (!series.some((item) => item.id === key)) {
        removeEntry(entry)
        entries.delete(key)
      }
    }

    for (const item of series) {
      let entry = entries.get(item.id)

      if (entry === undefined) {
        entry = createEntry(item)
        entries.set(item.id, entry)
      }

      entry.series = item
      updateEntry(entry)
    }

    const scope = cartesianCssScope(id).selector

    const css = [...entries.values()]
      .map((entry) => {
        const selector = `${scope} g${keyStarts(keyAttr(`${entry.series.id}:loading`))}`

        return `${selector}{--bkm-loading-clip-path:url(#${entry.paintId}-clip);--bkm-loading-opacity:${entry.series.loading?.strokeOpacity ?? 0.5};--bkm-loading-pointer-events:none}${selector} path{--bkm-loading-stroke:url(#${entry.paintId}-gradient)}`
      })
      .join('')

    if (stylesheet.textContent !== css) {
      stylesheet.textContent = css
    }
  }

  return {
    prepare(next: Interaction) {
      state = next
    },
    draw(next: CartesianSnapshot<Row>) {
      snapshot = next
      render()
    },
    update(next: Interaction) {
      state = next
      render()
    },
    schedule(next: Interaction) {
      return next.phase === 'exiting' && entries.size > 0
    },
    destroy() {
      disposed = true

      for (const entry of entries.values()) {
        removeEntry(entry)
      }

      entries.clear()
      root.remove()
      stylesheet.remove()
      delete element.dataset.bkmPhysicalPulses
    },
  }
}
